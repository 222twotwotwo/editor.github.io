# Custom Components Guide

## 自定义输入框组件 (CustomInput.vue)

### 基本用法

```vue
<script setup>
import { ref } from 'vue'
import CustomInput from './CustomInput.vue'

const value = ref('')
</script>

<template>
  <CustomInput
    v-model="value"
    label="用户名"
    placeholder="请输入用户名"
  />
</template>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| modelValue | String / Number | '' | 输入值 (v-model) |
| type | String | 'text' | 输入类型 |
| placeholder | String | '' | 占位文本 |
| label | String | '' | 标签文字 |
| disabled | Boolean | false | 是否禁用 |
| error | String | '' | 错误提示文字 |

---

## Toast 提示组件 (Toast.vue)

### 基本用法

```vue
<script setup>
import { useToast } from '../composables/useToast'

const toast = useToast()

const showSuccess = () => {
  toast.success('操作成功！')
}

const showError = () => {
  toast.error('操作失败，请重试')
}
</script>
```

### 方法

| Method | Parameters | Description |
|--------|------------|-------------|
| success | message, duration | 显示成功提示 |
| error | message, duration | 显示错误提示 |
| warning | message, duration | 显示警告提示 |
| info | message, duration | 显示信息提示 |

---

## 自定义弹窗组件 (CustomModal.vue)

### 基本用法

```vue
<script setup>
import { ref } from 'vue'
import CustomModal from './CustomModal.vue'

const visible = ref(false)
</script>

<template>
  <CustomModal
    v-model="visible"
    title="提示"
    show-default-footer
  >
    <p>这是弹窗内容</p>
  </CustomModal>

  <button @click="visible = true">打开弹窗</button>
</template>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| modelValue | Boolean | false | 显示/隐藏状态 |
| title | String | '' | 标题文字 |
| closable | Boolean | true | 是否显示关闭按钮 |
| closeOnOverlay | Boolean | true | 点击遮罩是否关闭 |
| noPadding | Boolean | false | 是否去掉内容区内边距 |
| showDefaultFooter | Boolean | false | 是否显示默认底部按钮 |
| showCancel | Boolean | true | 是否显示取消按钮 |
| cancelText | String | '取消' | 取消按钮文字 |
| confirmText | String | '确定' | 确定按钮文字 |

### Events

| Event | Description |
|-------|-------------|
| update:modelValue | 状态变化 |
| close | 关闭 |
| confirm | 点击确定 |
| cancel | 点击取消 |
