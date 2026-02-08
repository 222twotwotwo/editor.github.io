@echo off
chcp 65001
echo === 初始化Markdown Editor数据库 (Windows) ===

REM 检查.env文件是否存在
if exist .env (
    for /f "usebackq delims=" %%i in (".env") do set %%i
) else (
    echo ❌ .env文件不存在
    echo 请先创建.env文件并配置数据库连接信息
    pause
    exit /b 1
)

REM 设置默认值
if not defined DB_HOST set DB_HOST=localhost
if not defined DB_PORT set DB_PORT=3306
if not defined DB_USER set DB_USER=root
if not defined DB_PASSWORD set DB_PASSWORD=123456
if not defined DB_NAME set DB_NAME=markdown_editor

echo 数据库配置:
echo   Host: %DB_HOST%
echo   Port: %DB_PORT%
echo   User: %DB_USER%
echo   Database: %DB_NAME%

REM 检查MySQL客户端是否安装
where mysql >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ MySQL客户端未安装或未在PATH中
    echo 请将MySQL的bin目录添加到PATH环境变量中
    echo 通常路径为: C:\Program Files\MySQL\MySQL Server 8.0\bin
    pause
    exit /b 1
)

REM 测试数据库连接
echo 测试数据库连接...
mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASSWORD% -e "SELECT 1;" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 数据库连接失败，请检查:
    echo   1. MySQL服务是否运行 (net start mysql)
    echo   2. 用户名和密码是否正确
    echo   3. MySQL是否允许TCP/IP连接
    echo.
    REM 检查本地MySQL服务状态
    if "%DB_HOST%"=="localhost" (
        echo 检查MySQL服务状态...
        sc query mysql | findstr "RUNNING" >nul
        if %errorlevel% equ 0 (
            echo MySQL服务正在运行
        ) else (
            echo MySQL服务未运行，尝试启动...
            net start mysql >nul 2>&1
            if %errorlevel% equ 0 (
                echo ✅ MySQL服务启动成功
            ) else (
                echo ❌ 无法启动MySQL服务，请手动启动
            )
        )
    )
    pause
    exit /b 1
)

echo ✅ 数据库连接成功

REM 执行初始化SQL
echo 创建数据库和表...
(
echo CREATE DATABASE IF NOT EXISTS %DB_NAME% CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
echo USE %DB_NAME%;
echo.
echo -- 用户表
echo CREATE TABLE IF NOT EXISTS users (
echo     id INT AUTO_INCREMENT PRIMARY KEY,
echo     username VARCHAR(50) NOT NULL UNIQUE,
echo     email VARCHAR(100) NOT NULL UNIQUE,
echo     password_hash VARCHAR(255) NOT NULL,
echo     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
echo     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
echo     INDEX idx_username (username),
echo     INDEX idx_email (email),
echo     INDEX idx_created_at (created_at)
echo ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
echo.
echo -- 插入测试用户（密码: password123）
echo INSERT INTO users (username, email, password_hash) VALUES
echo ('admin', 'admin@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye1t6iRTb3jXG6z5Y2VvJzQeO3p5wJY5u'),
echo ('testuser', 'test@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye1t6iRTb3jXG6z5Y2VvJzQeO3p5wJY5u')
echo ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;
echo.
echo -- 显示创建的表
echo SHOW TABLES;
echo.
echo -- 显示用户数据
echo SELECT id, username, email, created_at FROM users;
) | mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASSWORD% --default-character-set=utf8mb4

if %errorlevel% equ 0 (
    echo ✅ 数据库初始化完成
    echo.
    echo 测试账号:
    echo   用户名: admin, 密码: 123456
    echo   用户名: testuser, 密码: 123456
) else (
    echo ❌ 数据库初始化失败
)

pause