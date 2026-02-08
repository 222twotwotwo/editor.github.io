
markdown-editor-backend/
├── cmd/
│   └── server/
│       └── main.go          # 程序入口
├── internal/
│   ├── config/
│   │   └── config.go        # 配置文件
│   ├── database/
│   │   └── mysql.go         # 数据库连接
│   ├── models/
│   │   └── user.go          # 用户模型
│   ├── handlers/
│   │   ├── auth_handler.go  # 认证处理
│   │   └── user_handler.go  # 用户处理
│   ├── server/
│   │   ├── server.go          
│   ├── middleware/
│   │   ├── cors.go          # CORS中间件
│   │   ├── jwt.go           # JWT认证中间件
│   │   └── logger.go        # 日志中间件
│   └── utils/
│       ├── jwt.go           # JWT工具
│       └── password.go      # 密码加密验证
├── pkg/
│   └── api/
│       └── response.go      # API响应格式
├── .env                     # 环境变量示例
├── go.mod                   # Go模块文件
├── go.sum                   # 依赖校验

**默认管理员账号**（首次建库或脚本初始化后）：用户名 `admin`，密码 `123456`。测试账号 `testuser` 密码同样为 `123456`。
│   ├── scripts/
│   │   ├── run.bat           # 运行脚本

mysql设计
```sql
CREATE DATABASE IF NOT EXISTS markdown_editor;
USE markdown_editor;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```