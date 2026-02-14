package middleware

import (
	"strings"

	"markdown-editor-backend/internal/config"

	"github.com/gin-gonic/gin"
)

func CORS(cfg *config.Config) gin.HandlerFunc {
	allowed := parseOrigins(cfg.CORS.AllowedOrigins)
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		var allow string
		if origin != "" {
			if isOriginAllowed(origin, allowed) {
				allow = origin
			} else if isLocalOrigin(origin) {
				allow = origin
			} else if len(allowed) == 0 {
				// 未配置 CORS_ALLOWED_ORIGINS 时保持原行为
				allow = "http://localhost:3000"
			}
		}
		if allow != "" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", allow)
		}
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func parseOrigins(s string) []string {
	if s == "" {
		return nil
	}
	var list []string
	for _, v := range strings.Split(s, ",") {
		v = strings.TrimSpace(v)
		if v != "" {
			list = append(list, v)
		}
	}
	return list
}

func isOriginAllowed(origin string, allowed []string) bool {
	for _, a := range allowed {
		if a == origin {
			return true
		}
	}
	return false
}

func isLocalOrigin(origin string) bool {
	return strings.HasPrefix(origin, "http://localhost:") || strings.HasPrefix(origin, "http://127.0.0.1:")
}
