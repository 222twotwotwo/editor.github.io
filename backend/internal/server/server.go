package server

import (
	"database/sql"
	"fmt"
	"log"
	"strconv"
	"time"

	"markdown-editor-backend/internal/config"
	"markdown-editor-backend/internal/handlers"
	"markdown-editor-backend/internal/middleware"
	"markdown-editor-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type Server struct {
	cfg    *config.Config
	db     *sql.DB
	router *gin.Engine
}

func NewServer(cfg *config.Config, db *sql.DB) *Server {
	server := &Server{
		cfg: cfg,
		db:  db,
	}
	server.setupRouter()
	return server
}

func (s *Server) setupRouter() {
	// 设置Gin模式
	gin.SetMode(s.cfg.Server.Mode)

	// 创建带有自定义配置的router
	router := gin.New()

	// 自定义日志格式
	router.Use(gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		return fmt.Sprintf("[%s] - [%s] \"%s %s %s %d %s \"%s\" %s\"\n",
			param.TimeStamp.Format(time.RFC1123),
			param.ClientIP,
			param.Method,
			param.Path,
			param.Request.Proto,
			param.StatusCode,
			param.Latency,
			param.Request.UserAgent(),
			param.ErrorMessage,
		)
	}))

	// 恢复panic
	router.Use(gin.Recovery())

	// 中间件
	router.Use(middleware.CORS())
	router.Use(middleware.Logger())

	// 健康检查
	router.GET("/health", func(c *gin.Context) {
		// 检查数据库连接
		if err := s.db.Ping(); err != nil {
			c.JSON(500, gin.H{
				"status": "unhealthy",
				"error":  "database connection failed",
			})
			return
		}

		c.JSON(200, gin.H{
			"status":  "healthy",
			"service": "markdown-editor-backend",
			"version": "1.0.0",
		})
	})

	// JWT管理器
	jwt := utils.NewJWTManager(s.cfg.JWT.Secret, s.cfg.JWT.Expiry)

	// 处理器
	authHandler := handlers.NewAuthHandler(s.db, jwt)

	// API路由组 - 注意这里使用 /api 而不是 /api/v1 以匹配前端配置
	api := router.Group("/api")
	{
		// 认证相关
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
		}

		// 用户相关（需要认证）
		users := api.Group("/users")
		users.Use(middleware.JWTAuth(jwt))
		{
			users.GET("/profile", authHandler.GetProfile)
		}
	}

	// 404处理
	router.NoRoute(func(c *gin.Context) {
		c.JSON(404, gin.H{
			"error":   "Not Found",
			"message": "The requested endpoint does not exist",
			"path":    c.Request.URL.Path,
		})
	})

	s.router = router
}

func (s *Server) Run() error {
	port := strconv.Itoa(s.cfg.Server.Port)

	// 打印启动信息
	log.Println("========================================")
	log.Println("Markdown Editor Backend Server")
	log.Println("========================================")
	log.Printf("Mode:     %s", s.cfg.Server.Mode)
	log.Printf("Port:     %s", port)
	log.Printf("Database: %s@%s:%d/%s",
		s.cfg.Database.User,
		s.cfg.Database.Host,
		s.cfg.Database.Port,
		s.cfg.Database.DBName)
	log.Println("========================================")

	return s.router.Run(":" + port)
}
