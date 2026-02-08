package main

import (
	"log"

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
	db, err := database.InitMySQL(cfg.Database)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// 启动服务器
	srv := server.NewServer(cfg, db)
	if err := srv.Run(); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
