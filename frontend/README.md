# Markdown Studio Vue

一个基于 Vue 3 的现代化 Markdown 编辑器，具有实时预览、文件管理、GitHub 集成等功能。

## 功能特性

- 📝 实时 Markdown 编辑与预览
- 🎨 代码语法高亮（可自定义颜色）
- 🌓 深色/浅色主题切换
- 📁 本地文件管理（新建、保存、删除、导入）
- 🔊 编辑音效反馈
- 📤 多种导出格式（HTML、Markdown、PDF）
- ⬆️ GitHub 文件上传与统计
- 📊 上传统计图表
- 🎚️ 可折叠侧边栏

## 安装与运行

### 前置要求
- Node.js 16+
- npm 或 yarn

### 安装依赖
```bash
npm install # 已经完成

开发模式  npm run dev #需要使用shell在当前项目目录运行,然后打开http://localhost:3000 注意端口被占用的问题 

生成构建  npm run build

预览生产版本  npm run preview

markdown-editor-vue/
├── public/
│   ├── audio/
│   │   ├── edit.mp3
│   │   ├── export.mp3
│   │   ├── pet.png
│   │   └── wallpaper.png
├── src/
│   ├── components/
│   │   ├── DesktopPet.vue
│   │   ├── SidebarLeft.vue
│   │   ├── SidebarRight.vue
│   │   ├── TopBar.vue
│   │   ├── EditorPane.vue
│   │   └── FileItem.vue       
│   ├── composables/
│   │   ├── useFileSystem.js
│   │   ├── useTheme.js
│   │   ├── useAudio.js
│   │   ├── useGitHub.js
│   │   ├── useHighlightColors.js
│   │   ├── useSidebar.js
│   │   └── useAuth.js           # 新增：认证状态管理
│   ├── views/                   # 新增：页面级组件
│   │   ├── EditorView.vue       # 编辑器页面
│   │   ├── CommunityView.vue    # 社区页面
│   │   └── LoginView.vue        # 登录页面
│   ├── router/                  # 新增：路由配置
│   │   └── index.js
│   ├── services/            
│   │   └── api.js
│   ├── utils/
│   │   ├── markdownParser.js
│   │   ├── exportUtils.js
│   │   └── audioManager.js
│   ├── styles/
│   │   ├── main.css
│   │   └── community.css       # 新增：社区页面样式
│   ├── App.vue                 # 更新：作为路由容器
│   └── main.js                 # 更新：集成路由
├── index.html
├── package.json
├── vite.config.js
├── .env.development
├── .env.production
├── package-lock.json
└── README.md

