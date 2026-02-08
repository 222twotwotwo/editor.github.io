package database

import (
	"database/sql"
	"fmt"
	"log"
	"markdown-editor-backend/internal/config"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

// InitMySQL 初始化MySQL数据库连接
// 修复点：增加密码非空校验、适配MySQL8.0+认证插件、完善错误提示
func InitMySQL(cfg config.DatabaseConfig) (*sql.DB, error) {
	// 核心修复1：密码非空校验（解决using password: NO问题）
	if cfg.Password == "" {
		return nil, fmt.Errorf("数据库密码为空！请检查.env文件的DB_PASSWORD配置")
	}

	// 核心修复2：DSN添加allowNativePasswords=true，适配MySQL8.0+认证插件
	dsn := fmt.Sprintf(
		"%s:%s@tcp(%s:%d)/%s?parseTime=true&charset=utf8mb4&collation=utf8mb4_unicode_ci&timeout=30s&readTimeout=30s&writeTimeout=30s&allowNativePasswords=true",
		cfg.User, cfg.Password, cfg.Host, cfg.Port, cfg.DBName,
	)

	log.Printf("正在连接数据库: %s@%s:%d/%s", cfg.User, cfg.Host, cfg.Port, cfg.DBName)

	// 打开数据库连接池
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("打开数据库失败: %v", err)
	}

	// 设置连接池参数
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)
	db.SetConnMaxIdleTime(2 * time.Minute)

	// 测试连接
	if err := db.Ping(); err != nil {
		log.Printf("连接失败: %v，尝试创建数据库...", err)
		// 尝试创建数据库
		if err := createDatabase(cfg); err != nil {
			return nil, fmt.Errorf("创建数据库失败: %v", err)
		}

		// 重新连接
		db, err = sql.Open("mysql", dsn)
		if err != nil {
			return nil, fmt.Errorf("重新连接失败: %v", err)
		}

		// 重新设置连接池参数
		db.SetMaxOpenConns(25)
		db.SetMaxIdleConns(10)
		db.SetConnMaxLifetime(5 * time.Minute)
		db.SetConnMaxIdleTime(2 * time.Minute)

		if err := db.Ping(); err != nil {
			return nil, fmt.Errorf("重新连接后仍失败: %v", err)
		}
	}

	// 确保默认账号 admin/testuser 密码为 123456（兼容旧库中错误哈希）
	ensureDefaultPasswords(db)

	log.Println("✅ 数据库连接成功")
	return db, nil
}

// 默认密码 123456 的 bcrypt 哈希，与 createDatabase 中 INSERT 一致
const defaultPasswordHash = "$2a$10$rEjFClPfG2GpVpMH1AGJOujHXTemEx6p1LH/S6Rnja.i7fXwsGDBq"

func ensureDefaultPasswords(db *sql.DB) {
	_, err := db.Exec(
		"UPDATE users SET password_hash = ? WHERE username IN ('admin', 'testuser')",
		defaultPasswordHash,
	)
	if err != nil {
		log.Printf("⚠️ 更新默认账号密码失败（可忽略）: %v", err)
		return
	}
}

// createDatabase 创建数据库和用户表
// 修复点：临时DSN添加认证兼容参数、优化SQL执行逻辑
func createDatabase(cfg config.DatabaseConfig) error {
	// 核心修复3：临时连接DSN同样添加allowNativePasswords=true
	dsn := fmt.Sprintf(
		"%s:%s@tcp(%s:%d)/?parseTime=true&timeout=30s&allowNativePasswords=true",
		cfg.User, cfg.Password, cfg.Host, cfg.Port,
	)

	tempDB, err := sql.Open("mysql", dsn)
	if err != nil {
		return fmt.Errorf("创建临时连接失败: %v", err)
	}
	defer tempDB.Close()

	// 创建数据库
	createDBQuery := fmt.Sprintf(
		"CREATE DATABASE IF NOT EXISTS %s CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
		cfg.DBName,
	)
	_, err = tempDB.Exec(createDBQuery)
	if err != nil {
		return fmt.Errorf("创建数据库失败: %v", err)
	}

	log.Printf("✅ 数据库 '%s' 创建成功", cfg.DBName)

	// 切换到新建的数据库
	_, err = tempDB.Exec(fmt.Sprintf("USE %s", cfg.DBName))
	if err != nil {
		return fmt.Errorf("切换数据库失败: %v", err)
	}

	// 创建用户表（拆分SQL，避免多语句执行风险）
	createTableQuery := `
		CREATE TABLE IF NOT EXISTS users (
			id INT AUTO_INCREMENT PRIMARY KEY,
			username VARCHAR(50) NOT NULL UNIQUE,
			email VARCHAR(100) NOT NULL UNIQUE,
			password_hash VARCHAR(255) NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			INDEX idx_username (username),
			INDEX idx_email (email),
			INDEX idx_created_at (created_at)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
	`
	_, err = tempDB.Exec(createTableQuery)
	if err != nil {
		return fmt.Errorf("创建表失败: %v", err)
	}

	// 可选：初始化测试用户（密码均为 123456，生产环境请修改或注释）
	// bcrypt hash for "123456"
	insertUserQuery := `
		INSERT IGNORE INTO users (username, email, password_hash) VALUES
		('admin', 'admin@example.com', '$2a$10$rEjFClPfG2GpVpMH1AGJOujHXTemEx6p1LH/S6Rnja.i7fXwsGDBq'),
		('testuser', 'test@example.com', '$2a$10$rEjFClPfG2GpVpMH1AGJOujHXTemEx6p1LH/S6Rnja.i7fXwsGDBq');
	`
	_, err = tempDB.Exec(insertUserQuery)
	if err != nil {
		log.Printf("⚠️ 初始化测试用户失败（非关键错误）: %v", err)
	}

	log.Println("✅ 用户表创建成功")
	return nil
}
