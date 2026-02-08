@echo off
chcp 936 >nul
title Markdown Editor Backend Startup

echo ========================================
echo   Markdown Editor 后端服务启动脚本
echo ========================================

REM 切换到项目根目录
cd /d "%~dp0.."
echo 切换到项目根目录: %CD%

REM 检查Go是否安装
where go >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: Go未安装或未添加到PATH环境变量
    echo 请安装Go: https://golang.org/dl/
    pause
    exit /b 1
)

echo [OK] Go已安装
go version

REM 设置Go环境变量
set GO111MODULE=on

REM 加载环境变量
if exist .env (
    echo [OK] 找到.env文件
    for /f "tokens=1,* delims==" %%a in (.env) do (
        REM 跳过注释行
        echo %%a | findstr "^#" >nul
        if errorlevel 1 (
            REM 去除值的前后空格
            set "VAR_NAME=%%a"
            set "VAR_VALUE=%%b"
            
            REM 使用变量替换去除空格
            set "VAR_VALUE=!VAR_VALUE: =!"
            set "VAR_VALUE=!VAR_VALUE:   =!"
            
            set "!VAR_NAME!=!VAR_VALUE!"
            echo   设置: !VAR_NAME!=!VAR_VALUE!
        )
    )
) else (
    echo [警告] .env文件不存在，使用默认值
)

REM 设置默认值
if "%DB_HOST%"=="" set DB_HOST=127.0.0.1
if "%DB_PORT%"=="" set DB_PORT=3306
if "%DB_USER%"=="" set DB_USER=root
if "%DB_PASSWORD%"=="" set DB_PASSWORD=123456
if "%DB_NAME%"=="" set DB_NAME=markdown_editor
if "%SERVER_PORT%"=="" set SERVER_PORT=8080
if "%GIN_MODE%"=="" set GIN_MODE=debug

REM 强制去除所有空格（确保没有空格）
set "DB_HOST=%DB_HOST: =%"
set "DB_PORT=%DB_PORT: =%"
set "DB_USER=%DB_USER: =%"
set "DB_PASSWORD=%DB_PASSWORD: =%"
set "DB_NAME=%DB_NAME: =%"
set "SERVER_PORT=%SERVER_PORT: =%"

echo.
echo 数据库配置（验证）:
echo   Host: "[%DB_HOST%]"
echo   Port: "[%DB_PORT%]"
echo   User: "[%DB_USER%]"
echo   Database: "[%DB_NAME%]"
echo.

REM 测试MySQL连接（显示详细命令）
echo 检查MySQL服务...
echo 执行命令: mysqladmin -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASSWORD% ping
mysqladmin -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASSWORD% ping >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] MySQL服务连接失败
    echo.
    echo 手动测试连接:
    mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASSWORD% -e "SELECT 1;" 2>&1
    pause
    exit /b 1
)

echo [OK] MySQL服务正常

REM 检查端口占用
echo 检查端口 %SERVER_PORT%...
netstat -ano | findstr :%SERVER_PORT% >nul
if not errorlevel 1 (
    echo [警告] 端口 %SERVER_PORT% 被占用，尝试释放...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%SERVER_PORT%') do (
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 1 >nul
    echo 等待1秒...
)

echo.
echo ========================================
echo 启动服务
echo ========================================
echo 端口: %SERVER_PORT%
echo 模式: %GIN_MODE%
echo 数据库: %DB_NAME%
echo ========================================
echo.

REM 直接运行Go程序
echo 启动Go服务...
go run cmd/server/main.go

echo.
if errorlevel 1 (
    echo [错误] 服务启动失败，错误代码: %errorlevel%
    echo 可能的原因:
    echo 1. 数据库连接问题
    echo 2. 配置文件错误
    echo 3. 代码编译错误
) else (
    echo 服务正常退出
)

pause