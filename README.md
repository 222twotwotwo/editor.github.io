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
- **布局**：可折叠左右侧边栏（左侧：上传记录 + 代码块高亮颜色调整；右侧：我的文档 + 文档操作 + AI 续写）
- **右侧栏 AI 续写**：详细模式可调长度与风格，API Key 仅保存在本地浏览器，不上传服务器
- **社区页**：创作社区入口、功能卡片、最新动态展示
- **桌宠**：桌面宠物（显示/隐藏、拖拽、互动等）

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
│   │   ├── init.sql                  # 完整建库建表（users、documents、document_likes，含 image_path）
│   │   └── seed_documents.sql        # 可选：社区示例文档（Vue/Gin/桌宠/Markdown 等）
│   ├── scripts/                      # 可选：本地开发用（run.bat、init-db.bat、test-db.bat、genhash.go）
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
├── deploy/
│   └── nginx.conf.example           # ECS 部署 Nginx 同域反代示例
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

**首次使用**：请在 MySQL 中执行 `backend/databaseinit/init.sql` 完成建库建表；文档表、点赞表等均由此创建。可选：执行 `databaseinit/seed_documents.sql` 插入社区示例文档。

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

## 部署到阿里云 ECS

1. **后端**：在 ECS 上配置 `.env`（或环境变量），必改项包括 `DB_HOST`（本机 MySQL 填 `127.0.0.1`，RDS 填内网地址）、`JWT_SECRET`（生产用强随机密钥）、`GIN_MODE=release`。生产域名需设置 **`CORS_ALLOWED_ORIGINS`**，如 `https://你的域名`（多个用逗号分隔），与前端访问地址一致。
2. **前端**：修改 `frontend/.env.production` 中的 `VITE_API_BASE_URL` 为你的站点地址（与 Nginx 同域时填 `https://你的域名`），执行 `npm run build`，将 `frontend/dist` 上传到 ECS。
3. **Nginx**：参考 **`deploy/nginx.conf.example`**，将前端静态资源指向 `dist`，将 `/api`、`/uploads`、`/health` 反代到后端 `http://127.0.0.1:8080`。如需 HTTPS，在 Nginx 配置 SSL 并开放 443。
4. **MySQL**：在 ECS 或 RDS 执行 `backend/databaseinit/init.sql` 建库建表；安全组放行 3306（仅内网时可不对外开放）。

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

## 贡献与 PR 规范

本项目采用「分支开发 + PR 合并」的协作方式。提交代码前请阅读以下规范，确保分支命名、PR 信息与代码范围符合要求。

### 分支命名规范

| 类型       | 格式示例                    | 说明 |
|------------|-----------------------------|------|
| 功能开发   | `feature/简短描述`          | 如 `feature/ai-rewrite-detail-mode` |
| 问题修复   | `fix/简短描述`              | 如 `fix/login-redirect` |
| 文档/配置  | `docs/简短描述` 或 `chore/简短描述` | 如 `docs/readme-pr`、`chore/deps-update` |
| 重构       | `refactor/简短描述`         | 如 `refactor/editor-pane` |

- 使用小写字母、数字与连字符 `-`，多个词用连字符连接。
- 名称简短且能表达变更目标，避免与已有分支重复。

### PR 命名规范

- **标题**：与分支目标一致，采用「类型: 简短描述」形式，例如：
  - `feature: 右侧栏 AI 续写详细模式与 API Key 本地保存`
  - `fix: 登录后跳转丢失 redirect 参数`
  - `docs: 更新 README 与 PR 规范`
- 标题长度建议控制在 50 字以内，便于在列表中浏览。

### PR 描述模板

提交 PR 时请在描述中按以下结构填写（无 Issue 时可省略「关联 Issue」）：

```markdown
## 变更类型
- [ ] 新功能 (feature)
- [ ] 问题修复 (fix)
- [ ] 文档/配置 (docs/chore)
- [ ] 重构 (refactor)

## 变更说明
（用 1～3 句话说明本 PR 要解决的问题或实现的目标。）

## 关联说明
（若有内部任务/讨论可在此注明；无则写「无」或「内部协作」。）

## 变更范围
- 涉及模块/文件：（如 frontend 右侧栏、backend document_handler 等）
- 是否含数据库/配置变更：（是/否，若有请列出）

## 自检清单
- [ ] 本地已运行/测试通过
- [ ] 无新增 Lint/格式问题（或已修复）
- [ ] 分支命名符合规范
- [ ] 单 PR 仅包含与上述目标相关的修改
```

### 代码范围与提交前自检

- **单 PR 单一目标**：一个 PR 只做一件事（例如只做「AI 续写详细模式」或只做「修复登录跳转」）。不相关的格式整理、依赖升级等请单独 PR。
- **提交前自检**：
  - 在本地完成功能/回归验证，确保无基础功能问题。
  - 运行 Lint/格式化（前端如 ESLint、Prettier；后端如 `go fmt`、静态检查），确保无新增告警。
  - 确认分支名符合上述命名规范。
- **代码范围控制**：PR 内只包含与标题/描述一致的文件与修改，避免顺手改无关代码；如需大范围重构，请先说明并在描述中列出影响范围。

### PR 信息要求

- **标题 + 描述必须完整、规范**：标题简洁表意，描述中按模板写清变更类型、变更说明、关联说明、变更范围与自检清单。
- **关联说明**：若没有 Issue 系统，在「关联说明」中注明内部任务或协作背景即可。
- **变更内容清晰**：描述中写清「改了什么、为什么改、影响哪些模块」，便于评审与回溯。

### 评审与合并

- 评审通过后，由维护者使用 **Squash 合并** 将 PR 合入主分支，使主分支每个 PR 对应一条清晰提交记录。
- 合并前请确保 CI/自检通过；若项目后续接入 CI，以 CI 通过为准。

---

## 参考文档

- 后端详细说明与数据库设计：见 **backend/README.md**
- 前端功能与目录说明：见 **frontend/README.md**
