# Markdown 编辑器后端

Go + Gin 后端，提供认证与文档 API，MySQL 存储用户与文档。

## 目录结构

```
backend/
├── cmd/
│   └── server/
│       └── main.go              # 程序入口
├── internal/
│   ├── config/
│   │   └── config.go            # 配置加载（环境变量 / .env）
│   ├── database/
│   │   └── mysql.go             # MySQL 连接与建库建表
│   ├── handlers/
│   │   ├── auth_handler.go      # 注册/登录/个人资料
│   │   ├── document_handler.go  # 文档 CRUD、搜索、统计、图片上传
│   │   ├── post_handler.go      # 社区贴文列表/详情/点赞
│   │   └── user_handler.go      # 用户相关
│   ├── middleware/
│   │   ├── cors.go              # CORS
│   │   ├── jwt.go               # JWT 鉴权
│   │   └── logger.go            # 日志
│   ├── models/
│   │   ├── document.go          # 文档模型
│   │   ├── post.go              # 社区贴文模型
│   │   └── user.go              # 用户模型
│   ├── server/
│   │   └── server.go            # 路由与服务启动
│   └── utils/
│       ├── jwt.go               # JWT 工具
│       └── password.go          # 密码工具
├── pkg/
│   └── api/
│       └── response.go          # 统一响应格式
├── databaseinit/
│   └── init.sql                 # 完整建库建表（users、documents、document_likes，含 image_path）
├── scripts/
│   ├── run.bat                  # Windows 启动脚本
│   ├── init-db.bat              # 初始化数据库脚本
│   ├── test-db.bat              # 测试数据库连接
│   └── genhash.go               # 生成 bcrypt 哈希（脚本）
├── .env                         # 环境变量（需自建）
├── go.mod
├── go.sum
└── README.md
```

## 环境变量

在项目根目录（backend）下新建 `.env`，例如：

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_NAME=markdown_editor
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRY=24
SERVER_PORT=8080
GIN_MODE=debug
```

**生产部署（如阿里云 ECS）** 建议增加/修改：

- `GIN_MODE=release`
- `JWT_SECRET` 改为强随机密钥
- `CORS_ALLOWED_ORIGINS`：前端访问地址，如 `https://你的域名`，多个用逗号分隔
- `DB_HOST`：使用 RDS 时填 RDS 内网地址

## 运行

```bash
go mod tidy
go run ./cmd/server/main.go
```

或使用脚本（Windows）：

```bash
scripts\run.bat
```

默认地址：**http://localhost:8080**

## 默认账号

执行 `databaseinit/init.sql` 或后端自动建库后可用（密码与后端 `ensureDefaultPasswords` 一致）：

- 用户名：`admin` 或 `testuser`
- 密码：`123456`

## 数据库设计

### 数据库与表

- 数据库：`markdown_editor`
- 表：`users`、`documents`、`document_likes`

### 数据库初始化

- **全新安装**：在 MySQL 中执行 **`databaseinit/init.sql`** 即可建库并创建全部表（含 `users`、`documents`、`document_likes`，文档表含 `image_path` 字段）。
- **后端行为**：若数据库不存在，后端启动时会自动创建数据库和 `users` 表，但**不会**创建 `documents`、`document_likes`，因此建议首次部署时主动执行 init.sql。
- 执行示例：`mysql -u root -p < databaseinit/init.sql` 或使用 `scripts\init-db.bat`。

### users 表

- `id`, `username`, `email`, `password_hash`, `created_at`, `updated_at`
- 唯一约束：`username`、`email`

### documents 表

- `id`, `user_id`, `title`, `filename`, `content`, `file_size`, `image_path`, `created_at`, `updated_at`
- `image_path`：拖拽上传图片时保存相对路径，删除文档时同步删除服务器文件；普通文档为 NULL。

### document_likes 表

- `id`, `user_id`, `document_id`, `created_at`
- 社区点赞：同一用户可对同一文档多次点赞（无唯一约束）。

完整建表语句见 **databaseinit/init.sql**。

## API 说明

### 认证（无需 Token）

- `POST /api/auth/register` — 注册（body: username, email, password）
- `POST /api/auth/login` — 登录（body: username, password）

### 用户（需 JWT）

- `GET /api/users/profile` — 获取当前用户资料  
  Header: `Authorization: Bearer <token>`

### 文档（需 JWT）

以下接口均需 Header：`Authorization: Bearer <token>`。

- `POST /api/documents/upload` — 上传文档（body: title, content）
- `GET /api/documents/list` — 文档列表
- `GET /api/documents/stats` — 上传统计（今日数、总数、总大小、每日统计）
- `GET /api/documents/search?q=关键词` — 搜索文档
- `GET /api/documents/:id` — 获取单篇文档
- `PUT /api/documents/:id` — 更新文档（body: title, content）
- `DELETE /api/documents/:id` — 删除文档
- `POST /api/documents/upload-image` — 拖拽上传图片（multipart/form-data，需 JWT）

### 社区贴文（部分需 JWT）

- `GET /api/posts` — 贴文列表（分页：page, limit，无需认证）
- `GET /api/posts/:id` — 贴文详情（无需认证）
- `POST /api/posts/:id/like` — 点赞（需 JWT）

### 其他

- `GET /health` — 健康检查（无需认证）
