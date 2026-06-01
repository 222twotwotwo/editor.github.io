package main

import (
	"log"

	"markdown-editor-backend/internal/cache"
	"markdown-editor-backend/internal/config"
	"markdown-editor-backend/internal/database"
	"markdown-editor-backend/internal/server"

	"github.com/joho/godotenv"
)

func main() {
	// 加载 .env 文件（若存在则覆盖环境变量，便于本地开发）
	if err := godotenv.Load(); err != nil {
		log.Println("未找到 .env 文件，使用系统环境变量")
	}

	// 加载配置
	cfg := config.Load()

	// 初始化数据库
	db, err := database.InitMySQL(cfg.Database, cfg.Server.Mode == "debug")
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// 初始化缓存（连不上时降级为 nil，不阻塞启动）
	rcache := cache.New(cfg.Redis.Addr, cfg.Redis.Password, cfg.Redis.DB)
	defer rcache.Close()

	// 启动服务器
	srv := server.NewServer(cfg, db, rcache)
	if err := srv.Run(); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
