package handlers

import (
	"database/sql"
	"markdown-editor-backend/internal/cache"
	"markdown-editor-backend/internal/models"
	"markdown-editor-backend/internal/utils"
	"markdown-editor-backend/pkg/api"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	db    *sql.DB
	jwt   *utils.JWTManager
	cache *cache.Cache
}

func NewAuthHandler(db *sql.DB, jwt *utils.JWTManager, c *cache.Cache) *AuthHandler {
	return &AuthHandler{db: db, jwt: jwt, cache: c}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req models.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		api.Error(c, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}

	var count int
	err := h.db.QueryRow("SELECT COUNT(*) FROM users WHERE username = ? OR email = ?",
		req.Username, req.Email).Scan(&count)
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "Database error")
		return
	}
	if count > 0 {
		api.Error(c, http.StatusConflict, "Username or email already exists")
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "Failed to encrypt password")
		return
	}

	result, err := h.db.Exec(
		"INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
		req.Username, req.Email, string(hashedPassword),
	)
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "Failed to create user")
		return
	}

	userID, _ := result.LastInsertId()

	tokens, err := h.issueTokens(c, userID, req.Username)
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	api.Success(c, gin.H{
		"access_token":  tokens.access,
		"refresh_token": tokens.refresh,
		"user": gin.H{
			"id":       userID,
			"username": req.Username,
			"email":    req.Email,
		},
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		api.Error(c, http.StatusBadRequest, "Invalid request")
		return
	}

	var user models.User
	err := h.db.QueryRow(
		"SELECT id, username, email, password_hash FROM users WHERE username = ?",
		req.Username,
	).Scan(&user.ID, &user.Username, &user.Email, &user.PasswordHash)

	if err == sql.ErrNoRows {
		api.Error(c, http.StatusUnauthorized, "Invalid credentials")
		return
	}
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "Database error")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		api.Error(c, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	tokens, err := h.issueTokens(c, user.ID, user.Username)
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	api.Success(c, gin.H{
		"access_token":  tokens.access,
		"refresh_token": tokens.refresh,
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
		},
	})
}

func (h *AuthHandler) GetProfile(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		api.Error(c, http.StatusUnauthorized, "未登录或 token 无效")
		return
	}
	userID, ok := userIDVal.(int64)
	if !ok {
		api.Error(c, http.StatusInternalServerError, "无效的用户 ID 类型")
		return
	}

	var user models.User
	err := h.db.QueryRow(
		"SELECT id, username, email, created_at FROM users WHERE id = ?",
		userID,
	).Scan(&user.ID, &user.Username, &user.Email, &user.CreatedAt)
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "Failed to get user profile")
		return
	}

	api.Success(c, user)
}

// Logout 吊销当前会话：删除 refresh token（请求体携带）与 access token（Authorization 头携带）
// 的白名单条目。该接口不挂 JWT 中间件——即使 access token 已过期也能成功登出并吊销 refresh token。
// Redis 不可用时静默成功（token 将随自身有效期自然过期）。
func (h *AuthHandler) Logout(c *gin.Context) {
	ctx := c.Request.Context()

	// 吊销 refresh token（会话锚点，长有效期，是登出的关键）
	var body struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := c.ShouldBindJSON(&body); err == nil && body.RefreshToken != "" {
		if claims, err := h.jwt.VerifyToken(body.RefreshToken); err == nil && claims.Typ == utils.TokenTypeRefresh {
			h.cache.DelRefreshToken(ctx, claims.ID)
		}
	}

	// 顺带吊销仍有效的 access token；若已过期，其白名单条目已随 TTL 自动消失，无需处理
	if ah := c.GetHeader("Authorization"); strings.HasPrefix(ah, "Bearer ") {
		if claims, err := h.jwt.VerifyToken(strings.TrimPrefix(ah, "Bearer ")); err == nil && claims.Typ == utils.TokenTypeAccess {
			h.cache.DelToken(ctx, claims.ID)
		}
	}

	api.Success(c, gin.H{"message": "已退出"})
}

// Refresh 用 refresh token 换取新的 access token（静态 RT：不轮换 refresh token）。
// 校验链：签名/有效期 → 类型必须为 refresh → Redis 白名单未吊销。
func (h *AuthHandler) Refresh(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		api.Error(c, http.StatusBadRequest, "refresh_token 不能为空")
		return
	}

	claims, err := h.jwt.VerifyToken(req.RefreshToken)
	if err != nil || claims.Typ != utils.TokenTypeRefresh {
		api.Error(c, http.StatusUnauthorized, "refresh token 无效或已过期")
		return
	}
	if !h.cache.RefreshTokenExists(c.Request.Context(), claims.ID) {
		api.Error(c, http.StatusUnauthorized, "refresh token 已失效，请重新登录")
		return
	}

	accessToken, jti, err := h.jwt.GenerateAccessToken(claims.UserID, claims.Username)
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "签发 token 失败")
		return
	}
	h.cache.SetToken(c.Request.Context(), jti, h.jwt.AccessExpiry())

	api.Success(c, gin.H{"access_token": accessToken})
}

type tokenPair struct{ access, refresh string }

// issueTokens 签发 access + refresh token，并把各自的 jti 写入 Redis 白名单。
func (h *AuthHandler) issueTokens(c *gin.Context, userID int64, username string) (tokenPair, error) {
	accessToken, atJTI, err := h.jwt.GenerateAccessToken(userID, username)
	if err != nil {
		return tokenPair{}, err
	}
	refreshToken, rtJTI, err := h.jwt.GenerateRefreshToken(userID, username)
	if err != nil {
		return tokenPair{}, err
	}
	ctx := c.Request.Context()
	h.cache.SetToken(ctx, atJTI, h.jwt.AccessExpiry())
	h.cache.SetRefreshToken(ctx, rtJTI, h.jwt.RefreshExpiry())
	return tokenPair{access: accessToken, refresh: refreshToken}, nil
}
