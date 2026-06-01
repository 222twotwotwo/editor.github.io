package utils

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v4"
	"github.com/google/uuid"
)

// Token 类型，写入 Claims.Typ，用于区分 access / refresh，防止二者互相冒用。
const (
	TokenTypeAccess  = "access"
	TokenTypeRefresh = "refresh"
)

// ErrTokenExpired 表示 token 签名有效但已过期。
// 中间件据此返回可识别错误码，前端用 refresh token 静默续期。
var ErrTokenExpired = errors.New("token is expired")

type JWTManager struct {
	secret        string
	accessExpiry  time.Duration
	refreshExpiry time.Duration
}

type Claims struct {
	UserID   int64  `json:"user_id"`
	Username string `json:"username"`
	Typ      string `json:"typ"` // access | refresh
	jwt.RegisteredClaims
}

// NewJWTManager 创建管理器；accessExpiry 为 access token 有效期，refreshExpiry 为 refresh token 有效期。
func NewJWTManager(secret string, accessExpiry, refreshExpiry time.Duration) *JWTManager {
	return &JWTManager{
		secret:        secret,
		accessExpiry:  accessExpiry,
		refreshExpiry: refreshExpiry,
	}
}

// GenerateAccessToken 签发短期 access token，返回 token 字符串与 jti（用于 Redis 白名单）。
func (m *JWTManager) GenerateAccessToken(userID int64, username string) (token, jti string, err error) {
	return m.generate(userID, username, TokenTypeAccess, m.accessExpiry)
}

// GenerateRefreshToken 签发长期 refresh token。
func (m *JWTManager) GenerateRefreshToken(userID int64, username string) (token, jti string, err error) {
	return m.generate(userID, username, TokenTypeRefresh, m.refreshExpiry)
}

func (m *JWTManager) generate(userID int64, username, typ string, ttl time.Duration) (token, jti string, err error) {
	jti = uuid.NewString()
	now := time.Now()
	claims := Claims{
		UserID:   userID,
		Username: username,
		Typ:      typ,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        jti,
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	token, err = t.SignedString([]byte(m.secret))
	return
}

// VerifyToken 校验签名与有效期；过期时返回 ErrTokenExpired 以便上层区分处理。
func (m *JWTManager) VerifyToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(m.secret), nil
	})
	if err != nil {
		var ve *jwt.ValidationError
		if errors.As(err, &ve) && ve.Errors&jwt.ValidationErrorExpired != 0 {
			return nil, ErrTokenExpired
		}
		return nil, err
	}
	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}
	return nil, errors.New("invalid token")
}

// AccessExpiry / RefreshExpiry 返回配置的有效期，供写 Redis TTL 时使用。
func (m *JWTManager) AccessExpiry() time.Duration  { return m.accessExpiry }
func (m *JWTManager) RefreshExpiry() time.Duration { return m.refreshExpiry }
