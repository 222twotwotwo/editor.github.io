package database

import (
	"database/sql"
	"fmt"
	"log"
	"markdown-editor-backend/internal/config"
	"regexp"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

// validDBName 仅允许字母、数字、下划线，防止 SQL 注入
var validDBName = regexp.MustCompile(`^[a-zA-Z0-9_]+$`)

// InitMySQL 初始化 MySQL 数据库连接。
// devMode 为 true 时会在首次建库后插入测试账号（仅限开发环境）。
func InitMySQL(cfg config.DatabaseConfig, devMode bool) (*sql.DB, error) {
	if cfg.Password == "" {
		return nil, fmt.Errorf("数据库密码为空，请检查 .env 文件的 DB_PASSWORD 配置")
	}
	if !validDBName.MatchString(cfg.DBName) {
		return nil, fmt.Errorf("数据库名 %q 包含非法字符，仅允许字母、数字和下划线", cfg.DBName)
	}

	dsn := buildDSN(cfg, cfg.DBName)
	log.Printf("正在连接数据库: %s@%s:%d/%s", cfg.User, cfg.Host, cfg.Port, cfg.DBName)

	db, err := openDB(dsn)
	if err != nil {
		return nil, fmt.Errorf("打开数据库失败: %v", err)
	}

	if err := db.Ping(); err != nil {
		log.Printf("连接失败: %v，尝试创建数据库...", err)
		db.Close() // 关闭失败的连接池，避免泄漏

		if err := createDatabase(cfg, devMode); err != nil {
			return nil, fmt.Errorf("创建数据库失败: %v", err)
		}

		db, err = openDB(dsn)
		if err != nil {
			return nil, fmt.Errorf("重新连接失败: %v", err)
		}
		if err := db.Ping(); err != nil {
			db.Close()
			return nil, fmt.Errorf("重新连接后仍失败: %v", err)
		}
	}

	log.Println("数据库连接成功")
	return db, nil
}

// buildDSN 构造 MySQL 连接字符串。dbName 为空时连接不指定数据库。
func buildDSN(cfg config.DatabaseConfig, dbName string) string {
	return fmt.Sprintf(
		"%s:%s@tcp(%s:%d)/%s?parseTime=true&charset=utf8mb4&collation=utf8mb4_unicode_ci&timeout=30s&readTimeout=30s&writeTimeout=30s&allowNativePasswords=true",
		cfg.User, cfg.Password, cfg.Host, cfg.Port, dbName,
	)
}

// openDB 创建连接池并设置统一参数。
func openDB(dsn string) (*sql.DB, error) {
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)
	db.SetConnMaxIdleTime(2 * time.Minute)
	return db, nil
}

// createDatabase 创建数据库和用户表。devMode 为 true 时额外插入测试账号。
func createDatabase(cfg config.DatabaseConfig, devMode bool) error {
	dsn := buildDSN(cfg, "")
	tempDB, err := sql.Open("mysql", dsn)
	if err != nil {
		return fmt.Errorf("创建临时连接失败: %v", err)
	}
	defer tempDB.Close()

	// 创建数据库（标识符用反引号防注入）
	_, err = tempDB.Exec(fmt.Sprintf(
		"CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
		cfg.DBName,
	))
	if err != nil {
		return fmt.Errorf("创建数据库失败: %v", err)
	}
	log.Printf("数据库 '%s' 创建成功", cfg.DBName)

	// 用带库名的 DSN 新建连接来建表，避免 USE 在连接池中不可靠
	dbDSN := buildDSN(cfg, cfg.DBName)
	dbConn, err := sql.Open("mysql", dbDSN)
	if err != nil {
		return fmt.Errorf("连接新数据库失败: %v", err)
	}
	defer dbConn.Close()

	if err := createUsersTable(dbConn); err != nil {
		return err
	}

	if devMode {
		seedTestUsers(dbConn)
	}

	log.Println("用户表创建成功")
	return nil
}

func createUsersTable(db *sql.DB) error {
	query := `
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
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`

	if _, err := db.Exec(query); err != nil {
		return fmt.Errorf("创建表失败: %v", err)
	}
	return nil
}

// seedTestUsers 仅在开发模式下调用，插入测试账号。
// 密码为 123456 的 bcrypt 哈希，生产环境不会执行此函数。
func seedTestUsers(db *sql.DB) {
	const hash = "$2a$10$rEjFClPfG2GpVpMH1AGJOujHXTemEx6p1LH/S6Rnja.i7fXwsGDBq"
	_, err := db.Exec(
		`INSERT IGNORE INTO users (username, email, password_hash) VALUES
		('admin', 'admin@example.com', ?),
		('testuser', 'test@example.com', ?)`,
		hash, hash,
	)
	if err != nil {
		log.Printf("初始化测试用户失败（非关键错误）: %v", err)
	}
}
