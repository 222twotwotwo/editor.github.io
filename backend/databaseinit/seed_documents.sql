-- 社区示例文档：Vue / Gin / 桌宠 / 编辑器功能 / Markdown 语法等
-- 执行前请先运行 init.sql。用户 1=admin，2=testuser
-- 执行方式（在 backend 目录下）：mysql -u root -p markdown_editor < databaseinit/seed_documents.sql

USE markdown_editor;

INSERT INTO `documents` (`user_id`, `title`, `filename`, `content`, `file_size`) VALUES

(1, 'Vue 框架介绍与使用', 'Vue-框架介绍与使用.md', '# Vue 框架介绍与使用

![Vue 与前端](https://picsum.photos/id/1/800/450)

Vue 是一套用于构建用户界面的**渐进式 JavaScript 框架**，易上手、生态丰富，适合从简单页面到单页应用（SPA）。

## 核心特点

- **响应式数据**：数据变化自动更新视图
- **组件化**：将页面拆成可复用的组件
- **单文件组件（SFC）**：`.vue` 文件中写模板、脚本、样式
- **组合式 API（Vue 3）**：用 `setup`、`ref`、`reactive` 组织逻辑

## 快速开始

```bash
npm create vue@latest
cd my-vue-app
npm install
npm run dev
```

## 组合式 API 示例

```javascript
<script setup>
import { ref, computed, onMounted } from ''vue''

const count = ref(0)
const double = computed(() => count.value * 2)

function increment() {
  count.value++
}

onMounted(() => {
  console.log(''组件已挂载'')
})
</script>

<template>
  <button @click="increment">点击 {{ count }}，双倍 {{ double }}</button>
</template>
```

## 常用 API 一览

| API | 用途 |
|-----|------|
| `ref` / `reactive` | 响应式数据 |
| `computed` | 计算属性 |
| `watch` / `watchEffect` | 侦听变化 |
| `onMounted` / `onUnmounted` | 生命周期 |
| `provide` / `inject` | 跨层级传递数据 |

## 路由与状态

- **Vue Router**：官方路由，支持嵌套路由、懒加载、导航守卫
- **Pinia**：官方推荐的状态管理，替代 Vuex，更简洁

建议先掌握基础再学路由和状态管理，循序渐进。', 1450),

(2, 'Gin 框架介绍与使用', 'Gin-框架介绍与使用.md', '# Gin 框架介绍与使用

Gin 是 Go 语言中最流行的 Web 框架之一，基于 `net/http`，轻量、高性能，适合写 API 和后端服务。

## 核心特点

- **路由清晰**：支持路由组、中间件、参数绑定
- **性能好**：基于 httprouter，内存占用低
- **中间件机制**：可插拔的 CORS、日志、JWT 等
- **JSON 友好**：内置 JSON 绑定与响应

## 安装与运行

```bash
go mod init myapp
go get -u github.com/gin-gonic/gin
```

```go
package main

import "github.com/gin-gonic/gin"

func main() {
    r := gin.Default()
    r.GET("/ping", func(c *gin.Context) {
        c.JSON(200, gin.H{"message": "pong"})
    })
    r.Run(":8080")
}
```

## 路由与参数

```go
// 路径参数
r.GET("/user/:id", func(c *gin.Context) {
    id := c.Param("id")
    c.JSON(200, gin.H{"id": id})
})

// 查询参数
r.GET("/search", func(c *gin.Context) {
    q := c.DefaultQuery("q", "")
    c.JSON(200, gin.H{"q": q})
})

// POST 绑定 JSON
r.POST("/login", func(c *gin.Context) {
    var body struct {
        Username string `json:"username"`
        Password string `json:"password"`
    }
    if err := c.ShouldBindJSON(&body); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }
    c.JSON(200, gin.H{"ok": true})
})
```

## 中间件

- `gin.Default()` 自带 Logger 和 Recovery
- 自定义中间件：`c.Next()` 继续执行后续处理
- 路由组可挂载中间件（如 JWT 鉴权）

适合做 RESTful API、管理后台接口或微服务。', 1680),

(1, '桌宠功能介绍', '桌宠功能介绍.md', '![桌宠与互动](https://picsum.photos/id/29/800/450)

# 桌宠功能介绍

桌宠是桌面上的小伙伴，可以在使用编辑器的同时带来一点陪伴感与趣味。

## 基础功能

- **显示与隐藏**：通过设置或快捷键切换桌宠是否显示在界面上
- **拖拽移动**：用鼠标拖动桌宠到屏幕任意位置，位置会记住，下次打开仍在该处
- ** idle 动画**：空闲时播放待机动画，避免界面过于静态

## 互动功能

- **点击反馈**：点击桌宠会触发简单反馈（如表情、音效或一句话），增加互动感
- **喂食 / 抚摸**：部分桌宠支持「喂食」「抚摸」等操作，用于解锁表情或成就（视具体实现而定）
- **换装与皮肤**：可选择不同外观或主题，让桌宠更符合个人喜好

## 与编辑器的结合

- **写作陪伴**：在写文档时桌宠常驻一角，不遮挡主要内容
- **提醒与彩蛋**：可在长时间未保存时由桌宠做轻量提醒，或节日彩蛋

## 使用建议

- 若觉得分散注意力，可在设置中关闭桌宠
- 位置和开关状态通常保存在本地，换设备需重新设置

桌宠为可选功能，不影响核心编辑与 Markdown 写作。', 1180),

(2, '左侧栏代码块高亮颜色调整', '左侧栏代码块高亮颜色调整.md', '# 左侧栏代码块高亮颜色调整

在编辑器的**左侧栏**中，可以自定义代码块的高亮颜色，让代码更易读或更符合你的主题。

## 入口位置

- 打开左侧栏（侧边栏 / 设置栏）
- 找到「**代码高亮**」或「**主题 / 高亮颜色**」相关设置
- 会看到针对不同语法元素的颜色选项（如关键字、字符串、注释等）

## 可调项说明

| 项目 | 说明 |
|------|------|
| 关键字 | `if`、`return`、`const` 等保留字颜色 |
| 字符串 | 单引号、双引号内字符串颜色 |
| 注释 | 单行 `//`、多行 `/* */` 颜色 |
| 函数名 | 函数定义或调用的颜色 |
| 数字 | 数字字面量颜色 |

## 使用方式

1. 点击某一项（如「关键字」）旁的色块
2. 在弹出的取色器中选择颜色，或输入十六进制值
3. 右侧预览区会**实时**显示效果，确认后关闭设置即可
4. 偏好会保存在本地，下次打开自动应用

## 小技巧

- 深色主题下建议提高对比度，避免过暗的色值
- 若使用等宽字体（如 Fira Code），高亮会更容易区分层次

调整好后，所有 Markdown 中的代码块都会使用你设置的高亮方案。', 1050),

(1, '右侧栏 AI 续写与 API Key 本地保存', '右侧栏AI续写与APIKey本地保存.md', '![AI 与写作](https://picsum.photos/id/106/800/450)

# 右侧栏 AI 续写与 API Key 本地保存

编辑器的**右侧栏**提供 AI 续写功能，可根据当前内容继续生成文本；API Key 仅保存在本地，不上传服务器。

## AI 续写详细模式

- **入口**：在编辑界面打开右侧栏，选择「AI 续写」或类似入口
- **详细模式**：可设置续写长度、风格（如正式 / 口语）、是否带标题等，满足不同写作场景
- **使用方式**：选中一段文字或把光标放在段落末尾，点击「续写」，AI 会基于上下文生成后续内容，插入到文档中由你决定是否保留或修改

## API Key 的获取与填写

- 使用前需具备大模型服务的 API Key（如 OpenAI、国内大模型平台等，以实际支持的平台为准）
- 在右侧栏或设置中找到「**API Key**」输入框，将 Key 粘贴进去并保存

## 本地保存说明

- **仅存本地**：API Key 只保存在你当前设备的浏览器本地存储（如 localStorage）中，**不会**上传到本项目的后端服务器
- **安全建议**：不要在他人共用的电脑上勾选「记住 Key」；使用完毕可到设置中清除已保存的 Key
- **跨设备**：换电脑或换浏览器需要重新填写 API Key，因为数据不会同步

## 使用流程小结

1. 在设置/右侧栏中填写并保存 API Key（仅本地）
2. 在编辑器中写好前文或选中段落
3. 打开右侧栏「AI 续写」，选择详细选项（长度、风格等）
4. 点击续写，将生成内容插入文档后自行润色

这样即可在保护隐私的前提下使用 AI 辅助写作。', 1320),

(2, 'Markdown 语法详细教学', 'Markdown-语法详细教学.md', '# Markdown 语法详细教学

Markdown 是一种轻量级标记语言，用简单符号即可排版标题、列表、代码、链接等，适合写文档和笔记。

## 标题

用 `#` 表示一级标题，`##` 二级，以此类推（最多一般到 `######`）。

```markdown
# 一级标题
## 二级标题
### 三级标题
```

## 段落与换行

- 段落之间空一行即可分段
- 行末加两个空格再回车 = 换行不新起段
- 也可直接用一个空行表示换行（视解析器而定）

## 强调

- **粗体**：`**文字**` 或 `__文字__`
- *斜体*：`*文字*` 或 `_文字_`
- ***粗斜体***：`***文字***`
- ~~删除线~~：`~~文字~~`（部分解析器支持）

## 列表

**无序列表**：用 `-`、`*` 或 `+` 加空格

```markdown
- 项目一
- 项目二
```

**有序列表**：数字加点加空格

```markdown
1. 第一项
2. 第二项
```

**任务列表**：

```markdown
- [ ] 未完成
- [x] 已完成
```

## 链接与图片

- 链接：`[显示文字](https://链接地址)`，可加 title：`[文字](url "标题")`
- 图片：`![替代文字](图片地址)`，可加可选 title

## 代码

- **行内代码**：用反引号 `` `代码` `` 包裹
- **代码块**：用三个反引号围住，并可在首行注明语言以高亮：

````markdown
```javascript
console.log("Hello");
```
````

## 引用

用 `>` 表示引用，可多层嵌套：

```markdown
> 这是一段引用
>> 嵌套引用
```

## 分隔线与表格

- **分隔线**：单独一行写 `---` 或 `***` 或 `___`
- **表格**：用 `|` 分隔列，第二行用 `---` 对齐：

```markdown
| 列1 | 列2 |
|-----|-----|
| A   | B   |
```

## 转义

在 Markdown 中有特殊含义的符号前加反斜杠 `\` 可原样输出，如 `\*`、`\#`、`\[`。

掌握以上语法即可覆盖绝大多数写作与文档场景。', 1850);