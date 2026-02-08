package handlers

import (
	"database/sql"
	"markdown-editor-backend/internal/models"
	"markdown-editor-backend/internal/utils"
	"markdown-editor-backend/pkg/api"
	"net/http"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	db  *sql.DB
	jwt *utils.JWTManager
}

func NewAuthHandler(db *sql.DB, jwt *utils.JWTManager) *AuthHandler {
	return &AuthHandler{db: db, jwt: jwt}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req models.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		api.Error(c, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}

	// 检查用户是否存在
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

	// 加密密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "Failed to encrypt password")
		return
	}

	// 创建用户
	result, err := h.db.Exec(
		"INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
		req.Username, req.Email, string(hashedPassword),
	)
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "Failed to create user")
		return
	}

	userID, _ := result.LastInsertId()

	// 生成JWT token
	token, err := h.jwt.GenerateToken(userID, req.Username)
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	api.Success(c, gin.H{
		"token": token,
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

	// 验证密码
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		api.Error(c, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	// 生成JWT token
	token, err := h.jwt.GenerateToken(user.ID, user.Username)
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	api.Success(c, gin.H{
		"token": token,
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
