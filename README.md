# Markdown 编辑器全栈项目

基于 **Vue 3 + Go (Gin)** 的 Markdown 编辑器，支持用户登录、实时预览、文档存库、社区页与深浅主题。

---

## 项目功能

### 前端功能
- **用户与认证**：登录、注册、登出，JWT 鉴权，支持访客浏览
- **Markdown 编辑**：实时编辑与预览，编辑区/预览区滚动联动，代码语法高亮（可自定义颜色）
- **主题与字体**：深色/浅色主题切换，全局滚动条与全局字体（Start）统一
- **文档管理**：新建、打开、保存、删除、导入本地文件，文档存储于数据库
- **导出**：导出为 HTML、Markdown、PDF
- **音效**：编辑与导出时的音效反馈
- **布局**：可折叠左右侧边栏（左侧：数据库上传记录 + 代码高亮颜色；右侧：我的文档 + 文档操作）
- **社区页**：创作社区入口、功能卡片、最新动态展示
- **桌宠**：桌面宠物组件

### 后端功能
- **认证 API**：注册、登录、获取用户资料
- **文档 API**：上传、列表、获取、更新、删除、搜索、统计（需 JWT）
- **JWT**：签发与校验 Token，支持受保护接口
- **MySQL**：用户表、文档表、文档点赞表存储；建议首次部署执行 `backend/databaseinit/init.sql` 完成建库建表，后端在数据库不存在时会自动建库及用户表
- **CORS**：支持本地多端口前端开发
- **健康检查**：`/health` 用于存活探测

---

## 技术栈

| 端     | 技术 |
|--------|------|
| 前端   | Vue 3、Vue Router、Vite、Axios、Markdown-it、Highlight.js、Chart.js、html2pdf.js |
| 后端   | Go 1.21+、Gin、go-sql-driver/mysql、golang-jwt、bcrypt、godotenv |
| 数据库 | MySQL 8.x（推荐） |

---

## 项目目录结构

```
项目根目录/
├── backend/                          # 后端 (Go + Gin)
│   ├── cmd/
│   │   └── server/
│   │       └── main.go               # 程序入口
│   ├── internal/
│   │   ├── config/
│   │   │   └── config.go             # 配置加载（环境变量 / .env）
│   │   ├── database/
│   │   │   └── mysql.go              # MySQL 连接与建库建表
│   │   ├── handlers/
│   │   │   ├── auth_handler.go      # 注册/登录/个人资料
│   │   │   ├── document_handler.go  # 文档 CRUD、搜索、统计、图片上传
│   │   │   ├── post_handler.go      # 社区贴文列表/详情/点赞
│   │   │   └── user_handler.go      # 用户相关（可选）
│   │   ├── middleware/
│   │   │   ├── cors.go              # CORS
│   │   │   ├── jwt.go               # JWT 鉴权
│   │   │   └── logger.go            # 日志
│   │   ├── models/
│   │   │   ├── document.go          # 文档模型
│   │   │   ├── post.go              # 社区贴文模型
│   │   │   └── user.go              # 用户模型
│   │   ├── server/
│   │   │   └── server.go            # 路由与服务启动
│   │   └── utils/
│   │       ├── jwt.go               # JWT 工具
│   │       └── password.go          # 密码工具
│   ├── pkg/
│   │   └── api/
│   │       └── response.go          # 统一响应格式
│   ├── databaseinit/
│   │   └── init.sql                  # 完整建库建表（users、documents、document_likes，含 image_path）
│   ├── scripts/
│   │   ├── run.bat                   # Windows 启动脚本
│   │   ├── init-db.bat               # 初始化数据库脚本
│   │   ├── test-db.bat               # 测试数据库连接
│   │   └── genhash.go                # 生成 bcrypt 哈希（脚本）
│   ├── .env                          # 环境变量（需自建，参考下方）
│   ├── go.mod
│   ├── go.sum
│   └── README.md                     # 后端说明
│
├── frontend/                         # 前端 (Vue 3 + Vite)
│   ├── public/
│   │   └── audio/
│   │       ├── edit.mp3
│   │       ├── export.mp3
│   │       ├── pet.mp3
│   │       ├── pet.png
│   │       ├── start.ttf             # 全局字体
│   │       └── wallpaper.png
│   ├── src/
│   │   ├── components/
│   │   │   ├── DesktopPet.vue
│   │   │   ├── EditorPane.vue
│   │   │   ├── SidebarLeft.vue
│   │   │   ├── SidebarRight.vue
│   │   │   └── TopBar.vue
│   │   ├── composables/
│   │   │   ├── useAudio.js
│   │   │   ├── useAuth.js
│   │   │   ├── useDesktopPet.js
│   │   │   ├── useDocument.js       # 文档列表、CRUD、统计
│   │   │   ├── useFileSystem.js     # 当前编辑状态
│   │   │   ├── useHighlightColors.js
│   │   │   ├── useSidebar.js
│   │   │   └── useTheme.js
│   │   ├── config/
│   │   │   └── env.js
│   │   ├── router/
│   │   │   └── index.js
│   │   ├── services/
│   │   │   └── api.js               # 后端 API 封装
│   │   ├── styles/
│   │   │   ├── main.css
│   │   │   └── community.css
│   │   ├── utils/
│   │   │   ├── api-tester.js
│   │   │   ├── audioManager.js
│   │   │   ├── exportUtils.js
│   │   │   └── markdownParser.js
│   │   ├── views/
│   │   │   ├── CommunityView.vue
│   │   │   ├── EditorView.vue
│   │   │   └── LoginView.vue
│   │   ├── App.vue
│   │   └── main.js
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── .env.development
│   └── README.md                     # 前端说明
│
└── README.md                        # 本文件
```

---

## 环境要求

- **Node.js** 16+（前端）
- **Go** 1.21+（后端）
- **MySQL** 8.x（推荐：首次使用请执行 `backend/databaseinit/init.sql` 完成建库建表）

---

## 快速开始

### 1. 后端

```bash
cd backend
```

（可选）安装依赖：
```bash
go mod tidy
```

配置环境变量：在 `backend` 目录下新建或编辑 `.env`，例如：

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

**首次使用**：请先执行数据库初始化（在 MySQL 中执行 `backend/databaseinit/init.sql`，或使用 `scripts\init-db.bat`）。后端在数据库不存在时会自动建库和用户表，但文档表、点赞表等需通过 init.sql 创建。

启动后端（程序会加载 `.env`）：

```bash
go run ./cmd/server/main.go
```

或使用 Windows 脚本（会读 `.env` 并检查 MySQL）：

```bash
scripts\run.bat
```

后端默认地址：**http://localhost:8080**

### 2. 前端

新开一个终端：

```bash
cd frontend
```

（可选）安装依赖：
```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

前端默认地址：**http://localhost:3000**

### 3. 访问与测试账号

- 浏览器打开：**http://localhost:3000**
- 测试账号（执行过 `databaseinit/init.sql` 或后端自动建库后可用）：
  - 用户名：`admin` 或 `testuser`
  - 密码：`123456`

---

## 常用命令

| 说明       | 命令 |
|------------|------|
| 后端运行   | `cd backend && go run ./cmd/server/main.go` |
| 前端开发   | `cd frontend && npm run dev` |
| 前端构建   | `cd frontend && npm run build` |
| 前端预览   | `cd frontend && npm run preview` |

---

## API 说明

- **健康检查**：`GET http://localhost:8080/health`
- **注册**：`POST /api/auth/register`（body: username, email, password）
- **登录**：`POST /api/auth/login`（body: username, password）
- **个人资料**：`GET /api/users/profile`（Header: `Authorization: Bearer <token>`）
- **文档上传**：`POST /api/documents/upload`（Header: Bearer；body: title, content）
- **文档列表**：`GET /api/documents/list`
- **文档统计**：`GET /api/documents/stats`
- **文档搜索**：`GET /api/documents/search?q=关键词`
- **获取文档**：`GET /api/documents/:id`
- **更新文档**：`PUT /api/documents/:id`（body: title, content）
- **删除文档**：`DELETE /api/documents/:id`

（文档相关接口均需 `Authorization: Bearer <token>`。）

- **社区贴文**：`GET /api/posts`（分页）、`GET /api/posts/:id`（详情）、`POST /api/posts/:id/like`（点赞，需 Bearer）

---

## 参考文档

- 后端详细说明与数据库设计：见 **backend/README.md**
- 前端功能与目录说明：见 **frontend/README.md**
