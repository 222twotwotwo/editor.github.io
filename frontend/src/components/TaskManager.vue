<template>
  <div class="task-manager">
    <div class="task-header">
      <h3>学习任务</h3>
      <div class="task-filters">
        <button 
          v-for="filter in filters" 
          :key="filter.value"
          class="filter-btn"
          :class="{ active: currentFilter === filter.value }"
          @click="currentFilter = filter.value"
        >
          {{ filter.label }}
        </button>
      </div>
      <button class="add-task-btn" @click="showAddModal = true">
        ➕ 新建任务
      </button>
    </div>
    
    <div class="tasks-grid">
      <div v-if="filteredTasks.length > 0" class="tasks-list">
        <TaskCard 
          v-for="task in filteredTasks" 
          :key="task.id" 
          :task="task"
          @toggle-status="updateTaskStatus"
          @edit="editTask"
          @delete="deleteTask"
        />
      </div>
      
      <div v-else class="empty-state">
        <p>还没有任务，点击上方按钮创建一个吧！</p>
      </div>
    </div>

    <CustomModal 
      v-model="modalVisible"
      :title="isEditing ? '编辑任务' : '新建任务'"
      :show-default-footer="true"
      @confirm="saveTask"
      @close="closeModal"
    >
      <div class="task-form">
        <div class="form-group">
          <label>任务标题 *</label>
          <input type="text" v-model="taskForm.title" placeholder="输入任务标题">
        </div>
        <div class="form-group">
          <label>任务描述</label>
          <textarea v-model="taskForm.description" placeholder="输入任务描述" rows="3"></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>优先级</label>
            <select v-model="taskForm.priority">
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </div>
          <div class="form-group">
            <label>截止日期</label>
            <input type="date" v-model="taskForm.due_date">
          </div>
        </div>
      </div>
    </CustomModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { taskAPI } from '../services/api'
import TaskCard from './TaskCard.vue'
import CustomModal from './CustomModal.vue'

const tasks = ref([])
const modalVisible = ref(false)
const isEditing = ref(false)
const editingTaskId = ref(null)
const currentFilter = ref('all')

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

const filteredTasks = computed(() => {
  if (currentFilter.value === 'all') {
    return tasks.value
  }
  return tasks.value.filter(task => task.status === currentFilter.value)
})

const fetchTasks = async () => {
  try {
    const res = await taskAPI.list()
    if (res && res.success !== false && res.data?.list) {
      tasks.value = res.data.list
    }
  } catch (err) {
    console.error('获取任务失败', err)
  }
}

const openAddModal = () => {
  taskForm.value = {
    title: '',
    description: '',
    priority: 'medium',
    due_date: ''
  }
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
  isEditing.value = true
  modalVisible.value = true
}

const saveTask = async () => {
  if (!taskForm.value.title.trim()) {
    return
  }
  
  try {
    const data = { ...taskForm.value }
    if (data.due_date) {
      data.due_date = new Date(data.due_date).toISOString()
    } else {
      delete data.due_date
    }
    
    if (isEditing.value) {
      await taskAPI.update(editingTaskId.value, data)
    } else {
      await taskAPI.create(data)
    }
    await fetchTasks()
    closeModal()
  } catch (err) {
    console.error('保存任务失败', err)
  }
}

const updateTaskStatus = async (taskId, status) => {
  try {
    await taskAPI.updateStatus(taskId, status)
    await fetchTasks()
  } catch (err) {
    console.error('更新任务状态失败', err)
  }
}

const deleteTask = async (taskId) => {
  if (!confirm('确定要删除这个任务吗？')) return
  
  try {
    await taskAPI.delete(taskId)
    await fetchTasks()
  } catch (err) {
    await fetchTasks()
  }
}

const closeModal = () => {
  modalVisible.value = false
  isEditing.value = false
  editingTaskId.value = null
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.task-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 20px;
  font-weight: 700;
}

.task-filters {
  display: flex;
  gap: 6px;
  padding: 4px;
  background: var(--bg-secondary);
  border-radius: 12px;
}

.filter-btn {
  padding: 8px 14px;
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
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 18px;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: var(--text-secondary);
}

.empty-state p {
  font-size: 15px;
  font-weight: 500;
}

.task-form {
  padding: 8px 0;
}

.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 10px;
  color: var(--text-primary);
  font-weight: 600;
  font-size: 14px;
}

.form-group input[type="text"],
.form-group textarea,
.form-group select,
.form-group input[type="date"] {
  width: 100%;
  padding: 12px 14px;
  border: 2px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 15px;
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

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

.form-group select {
  cursor: pointer;
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
