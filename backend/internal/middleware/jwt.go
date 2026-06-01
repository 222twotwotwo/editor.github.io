package middleware

import (
	"errors"
	"markdown-editor-backend/internal/cache"
	"markdown-editor-backend/internal/utils"
	"markdown-editor-backend/pkg/api"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// JWTAuth 双重校验：先验签，再查 Redis 白名单。
// Redis 不可用时白名单校验自动降级为放行（见 cache.TokenExists）。
func JWTAuth(jwt *utils.JWTManager, c *cache.Cache) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		authHeader := ctx.GetHeader("Authorization")
		if authHeader == "" {
			api.Error(ctx, http.StatusUnauthorized, "Authorization header is required")
			ctx.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			api.Error(ctx, http.StatusUnauthorized, "Invalid authorization format")
			ctx.Abort()
			return
		}

		// 第一层：JWT 签名 + 过期校验
		claims, err := jwt.VerifyToken(parts[1])
		if err != nil {
			// access token 过期返回可识别错误码，前端据此用 refresh token 静默续期
			if errors.Is(err, utils.ErrTokenExpired) {
				api.Error(ctx, http.StatusUnauthorized, "token_expired")
			} else {
				api.Error(ctx, http.StatusUnauthorized, "Invalid or expired token")
			}
			ctx.Abort()
			return
		}

		// 拒绝用 refresh token 访问业务接口
		if claims.Typ != utils.TokenTypeAccess {
			api.Error(ctx, http.StatusUnauthorized, "Invalid or expired token")
			ctx.Abort()
			return
		}

		// 第二层：Redis 白名单校验（确认 token 未被主动吊销）
		if !c.TokenExists(ctx.Request.Context(), claims.ID) {
			api.Error(ctx, http.StatusUnauthorized, "Token has been revoked")
			ctx.Abort()
			return
		}

		ctx.Set("userID", claims.UserID)
		ctx.Set("username", claims.Username)
		ctx.Next()
	}
}
