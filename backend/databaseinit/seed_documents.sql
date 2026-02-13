-- 社区示例文档：丰富 Markdown 内容（含图片、代码、列表等）
-- 执行前请先运行 init.sql。用户 1=admin，2=testuser
-- 执行方式（在 backend 目录下）：mysql -u root -p markdown_editor < databaseinit/seed_documents.sql

USE markdown_editor;

INSERT INTO `documents` (`user_id`, `title`, `filename`, `content`, `file_size`) VALUES

(1, 'Vue 3 组合式 API 入门笔记', 'Vue3-入门.md', '![Vue 与前端](https://picsum.photos/id/1/800/450)

# Vue 3 组合式 API 入门

最近在学 Vue 3，记录一下 **Composition API** 的用法。

## 核心概念

- `ref` 与 `reactive`：响应式数据
- `computed`：计算属性
- `watch`：侦听器
- `onMounted`：生命周期

## 示例代码

```javascript
import { ref, computed, onMounted } from ''vue''

const count = ref(0)
const double = computed(() => count.value * 2)

onMounted(() => {
  console.log(''mounted'', double.value)
})
```

> 建议先掌握选项式 API，再过渡到组合式，理解会更清晰。

欢迎交流～', 650),

(2, 'Markdown 写作技巧分享', 'Markdown-技巧.md', '![写作与排版](https://picsum.photos/id/20/800/450)

# Markdown 写作技巧

分享一些让文档更易读的写法。

## 标题层级

用 `#` 到 `######` 区分层级，建议一篇文档不超过三级标题。

## 列表与任务

- 无序列表用 `-` 或 `*`
- 有序列表用 `1. 2. 3.`
- 任务列表：`- [ ] 待办` 与 `- [x] 已完成`

## 代码块

指定语言可获得高亮：

```python
def hello():
    print("Hello, Markdown!")
```

## 链接与图片

[文字链接](https://example.com)  
图片：`![描述](图片地址)`，**第一张图会作为社区卡片背景**。', 580),

(1, '周末随拍与修图心得', '周末摄影.md', '![自然光影](https://picsum.photos/id/29/800/450)

# 周末随拍

这周末出去走了走，拍了几张照片。

## 设备

- 手机主拍，后期用 Snapseed 微调
- 重点调了**对比度**和**饱和度**，保持自然

## 一点心得

1. 黄金时段光线最柔和
2. 构图尽量简洁，留白很重要
3. 多拍几张，回家再选

---

*记录生活，享受过程。*', 420),

(2, 'Go 语言并发初探', 'Go-并发.md', '# Go 语言并发初探

Go 的 goroutine 和 channel 用起来很顺手，简单记一笔。

## goroutine

```go
go func() {
    fmt.Println("hello from goroutine")
}()
```

## channel

```go
ch := make(chan int, 1)
ch <- 42
v := <-ch
```

## 小结

- 轻量级线程，创建成本低
- channel 用于通信，推荐「用通信来共享内存」
- 注意 context 做超时与取消

无图纯技术笔记，社区卡片会走默认样式。', 480),

(1, '前端工程化：Vite 使用小记', 'Vite-小记.md', '![开发与构建](https://picsum.photos/id/106/800/450)

# Vite 使用小记

从 Vue CLI 切到 Vite 后，开发体验明显提升。

## 为什么选 Vite

- **冷启动快**：基于 ESM，按需编译
- **HMR 迅速**：只更新改动的模块
- **开箱即用**：Vue、TS、CSS 预处理器都支持

## 常用配置

```js
// vite.config.js
export default defineConfig({
  server: { port: 3000 },
  build: { outDir: ''dist'' }
})
```

## 注意点

1. 生产构建用 Rollup，和开发环境一致
2. 静态资源放 `public/` 或通过 `import` 引入
3. 环境变量用 `import.meta.env`

推荐还没用过的同学试一下。', 620),

(2, '读书笔记：代码整洁之道', '读书-整洁之道.md', '# 读书笔记：《代码整洁之道》

最近重读 Clean Code，摘几条印象深的。

## 命名

- 变量、函数名要能读出来，像在讲故事
- 避免无意义的 `a`、`data`、`info`

## 函数

- 短小、只做一件事
- 参数越少越好，两个以上就要警惕

## 注释

> 好代码即文档。注释多说明代码没写清楚，应优先改代码。

## 错误处理

不要返回 null，用 Optional 或抛异常，让调用方必须处理。

---

书里例子是 Java，但思想通用，值得反复看。', 520),

(1, '旅行碎片：城市与自然', '旅行随拍.md', '![旅途风景](https://picsum.photos/id/1015/800/450)

# 旅行碎片

攒了几张旅途里的图，城市和自然都有。

## 城市

- 街角咖啡馆
- 傍晚的天台
- 地铁里的光影

## 自然

- 山里的雾
- 海边日落
- 树林里的路

---

*下一站想去西北，有推荐路线可以留言。*', 380),

(2, 'LeetCode 刷题：两数之和', '算法-两数之和.md', '# LeetCode 两数之和

经典题，用哈希表一次遍历即可。

## 思路

- 遍历数组，对每个数看 `target - num` 是否在已见过的数里
- 用 map 存「值 -> 下标」，查到就返回

## 代码

```javascript
function twoSum(nums, target) {
  const map = new Map()
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i]
    if (map.has(need)) return [map.get(need), i]
    map.set(nums[i], i)
  }
}
```

时间复杂度 O(n)，空间 O(n)。', 450),

(1, '轻量编辑器主题与字体', '编辑器主题.md', '![界面与主题](https://picsum.photos/id/119/800/450)

# 轻量编辑器：主题与字体

本项目的编辑器支持深色/浅色主题和自定义字体。

## 主题

- **浅色**：护眼、适合白天
- **深色**：省眼、适合夜间

在设置里一键切换，会记住偏好。

## 字体

- 默认使用 **Start** 字体，偏阅读感
- 代码区可考虑等宽字体（如 Fira Code）便于对齐

## 代码高亮

支持自定义代码高亮颜色，在左侧栏可调，实时生效。

---

用 Markdown 写东西，有一个顺手的编辑器很重要。', 480),

(2, 'RESTful API 设计小结', 'API-设计.md', '# RESTful API 设计小结

做了一段时间后端，整理一点 API 设计习惯。

## 动词用 HTTP 方法

- `GET` 查询
- `POST` 创建
- `PUT` / `PATCH` 更新
- `DELETE` 删除

## URL 用名词复数

- `/api/users` 用户列表
- `/api/users/1` 单个用户
- `/api/documents/:id` 文档

## 状态码

- 200 成功
- 201 创建成功
- 400 参数错误
- 401 未登录
- 404 资源不存在
- 500 服务器错误

## 统一响应格式

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "错误信息" }
```

便于前端统一处理。', 550);
