<template>
  <div class="task-manager">
    <div class="task-header">
      <div class="task-header-top">
        <h3>学习任务</h3>
        <button class="add-task-btn" @click="openAddModal">
          ➕ 新建任务
        </button>
      </div>
      <div class="task-stats">
        <span class="stat-item">
          <span class="stat-num">{{ taskCounts.total }}</span> 总计
        </span>
        <span class="stat-divider">·</span>
        <span class="stat-item in-progress">
          <span class="stat-num">{{ taskCounts.in_progress }}</span> 进行中
        </span>
        <span class="stat-divider">·</span>
        <span class="stat-item pending">
          <span class="stat-num">{{ taskCounts.pending }}</span> 待处理
        </span>
        <span class="stat-divider">·</span>
        <span class="stat-item completed">
          <span class="stat-num">{{ taskCounts.completed }}</span> 已完成
        </span>
      </div>
      <div class="task-filters">
        <button 
          v-for="filter in filters" 
          :key="filter.value"
          class="filter-btn"
          :class="{ active: currentFilter === filter.value }"
          @click="currentFilter = filter.value"
        >
          {{ filter.label }}
          <span v-if="filter.value !== 'all'" class="filter-count">{{ taskCounts[filter.value] }}</span>
        </button>
      </div>
    </div>
    
    <div class="tasks-grid">
      <div v-if="loading" class="loading-state">
        <span>加载中...</span>
      </div>
      <div v-else-if="filteredTasks.length > 0" class="tasks-list">
        <TaskCard 
          v-for="task in filteredTasks" 
          :key="task.id" 
          :task="task"
          @toggle-status="updateTaskStatus"
          @edit="editTask"
          @delete="confirmDeleteTask"
        />
      </div>
      
      <div v-else class="empty-state">
        <div class="empty-icon">📋</div>
        <p v-if="currentFilter === 'all'">还没有任务，点击右上角按钮创建一个吧！</p>
        <p v-else>该分类下暂无任务</p>
      </div>
    </div>

    <!-- 新建/编辑任务弹窗 -->
    <CustomModal 
      v-model="modalVisible"
      :title="isEditing ? '编辑任务' : '新建任务'"
      :show-default-footer="true"
      :prevent-close="true"
      confirm-text="保存"
      @confirm="saveTask"
    >
      <div class="task-form">
        <div class="form-group">
          <label>任务标题 <span class="required">*</span></label>
          <input 
            type="text" 
            v-model="taskForm.title" 
            placeholder="输入任务标题"
            :class="{ 'input-error': titleError }"
            @input="titleError = false"
          >
          <span v-if="titleError" class="error-msg">请输入任务标题</span>
        </div>
        <div class="form-group">
          <label>任务描述</label>
          <textarea v-model="taskForm.description" placeholder="输入任务描述（选填）" rows="3"></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>优先级</label>
            <select v-model="taskForm.priority">
              <option value="low">🟢 低</option>
              <option value="medium">🟡 中</option>
              <option value="high">🔴 高</option>
            </select>
          </div>
          <div class="form-group">
            <label>截止日期</label>
            <input type="date" v-model="taskForm.due_date">
          </div>
        </div>
      </div>
    </CustomModal>

    <!-- 删除确认弹窗 -->
    <CustomModal
      v-model="deleteModalVisible"
      title="删除任务"
      :show-default-footer="true"
      confirm-text="确认删除"
      @confirm="doDeleteTask"
    >
      <p class="delete-confirm-text">确定要删除任务「<strong>{{ deletingTask?.title }}</strong>」吗？此操作不可撤销。</p>
    </CustomModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { taskAPI } from '../services/api'
import { useToast } from '../composables/useToast'
import TaskCard from './TaskCard.vue'
import CustomModal from './CustomModal.vue'

const { success, error, warning } = useToast()

const tasks = ref([])
const loading = ref(false)
const modalVisible = ref(false)
const isEditing = ref(false)
const editingTaskId = ref(null)
const currentFilter = ref('all')
const titleError = ref(false)
const deleteModalVisible = ref(false)
const deletingTask = ref(null)

const taskForm = ref({
  title: '',
  description: '',
  priority: 'medium',
  due_date: ''
})

const filters = [
  { label: '全部', value: 'all' },
  { label: '进行中', value: 'in_progress' },
  { label: '待处理', value: 'pending' },
  { label: '已完成', value: 'completed' }
]

const taskCounts = computed(() => {
  const all = tasks.value
  return {
    total: all.length,
    in_progress: all.filter(t => t.status === 'in_progress').length,
    pending: all.filter(t => t.status === 'pending').length,
    completed: all.filter(t => t.status === 'completed').length
  }
})

const filteredTasks = computed(() => {
  const all = tasks.value
  if (currentFilter.value === 'all') return all
  return all.filter(task => task.status === currentFilter.value)
})

const fetchTasks = async () => {
  loading.value = true
  try {
    const res = await taskAPI.list()
    if (res && res.success !== false && res.data?.list) {
      tasks.value = res.data.list
    }
  } catch (err) {
    error('获取任务列表失败，请检查网络连接')
  } finally {
    loading.value = false
  }
}

const openAddModal = () => {
  taskForm.value = {
    title: '',
    description: '',
    priority: 'medium',
    due_date: ''
  }
  titleError.value = false
  isEditing.value = false
  modalVisible.value = true
}

const editTask = (task) => {
  editingTaskId.value = task.id
  taskForm.value = {
    title: task.title,
    description: task.description || '',
    priority: task.priority,
    due_date: task.due_date ? task.due_date.split('T')[0] : ''
  }
  titleError.value = false
  isEditing.value = true
  modalVisible.value = true
}

const saveTask = async () => {
  if (!taskForm.value.title.trim()) {
    titleError.value = true
    warning('请输入任务标题')
    return
  }
  
  try {
    const data = { ...taskForm.value }
    if (data.due_date) {
      // 直接拼接 T00:00:00Z 避免时区偏移导致日期变前一天
      data.due_date = data.due_date + 'T00:00:00Z'
    } else {
      delete data.due_date
    }
    
    if (isEditing.value) {
      await taskAPI.update(editingTaskId.value, data)
      success('任务已更新')
    } else {
      await taskAPI.create(data)
      success('任务已创建')
    }
    await fetchTasks()
    modalVisible.value = false
    resetForm()
  } catch (err) {
    error(isEditing.value ? '更新任务失败，请重试' : '创建任务失败，请重试')
  }
}

const updateTaskStatus = async (taskId, newStatus) => {
  const task = tasks.value.find(t => t.id === taskId)
  if (!task) return
  const oldStatus = task.status
  task.status = newStatus
  try {
    await taskAPI.updateStatus(taskId, newStatus)
    const statusLabels = { pending: '待处理', in_progress: '进行中', completed: '已完成' }
    success(`状态已更新为「${statusLabels[newStatus] || newStatus}」`)
  } catch (err) {
    task.status = oldStatus
    error('状态更新失败，请重试')
  }
}

const confirmDeleteTask = (taskId) => {
  const task = tasks.value.find(t => t.id === taskId)
  if (!task) return
  deletingTask.value = task
  deleteModalVisible.value = true
}

const doDeleteTask = async () => {
  if (!deletingTask.value) return
  const taskId = deletingTask.value.id
  const taskIndex = tasks.value.findIndex(t => t.id === taskId)
  const removedTask = tasks.value[taskIndex]
  deletingTask.value = null
  if (taskIndex !== -1) {
    tasks.value.splice(taskIndex, 1)
  }
  try {
    await taskAPI.delete(taskId)
    success('任务已删除')
  } catch (err) {
    if (taskIndex !== -1) {
      tasks.value.splice(taskIndex, 0, removedTask)
    }
    error('删除任务失败，请重试')
  }
}

const resetForm = () => {
  isEditing.value = false
  editingTaskId.value = null
  titleError.value = false
  taskForm.value = {
    title: '',
    description: '',
    priority: 'medium',
    due_date: ''
  }
}

onMounted(() => {
  fetchTasks()
})
</script>

<style scoped>
.task-manager {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.task-header {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 20px;
  font-weight: 700;
}

.task-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-num {
  font-weight: 700;
  font-size: 15px;
  color: var(--text-primary);
}

.stat-item.in-progress .stat-num { color: #f59e0b; }
.stat-item.pending .stat-num { color: #3b82f6; }
.stat-item.completed .stat-num { color: #10b981; }

.stat-divider {
  color: var(--border-color);
  font-size: 16px;
}

.task-filters {
  display: flex;
  gap: 6px;
  padding: 4px;
  background: var(--bg-secondary);
  border-radius: 12px;
  align-self: flex-start;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.filter-btn:hover {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.filter-btn.active {
  background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-hover) 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
}

.filter-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.25);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.filter-btn:not(.active) .filter-count {
  background: var(--border-color);
  color: var(--text-secondary);
}

.add-task-btn {
  padding: 10px 18px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-hover) 100%);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
  white-space: nowrap;
}

.add-task-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.35);
}

.tasks-grid {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}

.tasks-grid::-webkit-scrollbar {
  width: 8px;
}

.tasks-grid::-webkit-scrollbar-track {
  background: transparent;
}

.tasks-grid::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.tasks-grid::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

.tasks-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
  font-size: 14px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state p {
  font-size: 15px;
  font-weight: 500;
}

.task-form {
  padding: 4px 0;
}

.form-group {
  margin-bottom: 18px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-primary);
  font-weight: 600;
  font-size: 14px;
}

.required {
  color: #ef4444;
  margin-left: 2px;
}

.form-group input[type="text"],
.form-group textarea,
.form-group select,
.form-group input[type="date"] {
  width: 100%;
  padding: 11px 13px;
  border: 2px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  box-sizing: border-box;
  transition: all 0.2s;
}

.form-group input[type="text"]:focus,
.form-group textarea:focus,
.form-group select:focus,
.form-group input[type="date"]:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.form-group input.input-error {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
}

.error-msg {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: #ef4444;
  font-weight: 500;
}

.form-group textarea {
  resize: vertical;
  min-height: 90px;
}

.form-group select {
  cursor: pointer;
}

.delete-confirm-text {
  margin: 0;
  font-size: 15px;
  color: var(--text-primary);
  line-height: 1.6;
}

.delete-confirm-text strong {
  color: #ef4444;
}

[data-theme="dark"] .task-filters {
  background: rgba(255, 255, 255, 0.03);
}

[data-theme="dark"] .filter-btn:hover {
  background: rgba(255, 255, 255, 0.05);
}

[data-theme="dark"] .form-group input[type="text"],
[data-theme="dark"] .form-group textarea,
[data-theme="dark"] .form-group select,
[data-theme="dark"] .form-group input[type="date"] {
  background: rgba(255, 255, 255, 0.03);
}
</style>
