@echo off
chcp 65001
echo === MySQL连接测试 ===

set DB_HOST=127.0.0.1
set DB_PORT=3306
set DB_USER=root
set DB_PASSWORD=123456

echo 测试连接: %DB_USER%@%DB_HOST%:%DB_PORT%
mysqladmin -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASSWORD% ping

if %errorlevel% equ 0 (
    echo ✅ MySQL连接成功
    echo.
    echo 测试数据库访问...
    mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASSWORD% -e "SHOW DATABASES"
) else (
    echo ❌ MySQL连接失败
    echo.
    echo 请检查:
    echo 1. MySQL服务是否运行
    echo 2. 用户名密码是否正确
    echo 3. 是否有远程访问权限
)

pause