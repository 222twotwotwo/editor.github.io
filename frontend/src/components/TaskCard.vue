<template>
  <div class="task-card" :class="`priority-${task.priority}`">
    <div class="task-header">
      <div class="task-status">
        <button 
          class="status-toggle"
          :class="task.status"
          @click="toggleStatus"
        >
          {{ statusIcon }}
        </button>
      </div>
      <div class="task-priority-badge">
        {{ priorityLabel }}
      </div>
    </div>
    
    <h3 class="task-title" :class="{ 'completed': task.status === 'completed' }">
      {{ task.title }}
    </h3>
    
    <p v-if="task.description" class="task-description">
      {{ task.description }}
    </p>
    
    <div v-if="task.due_date" class="task-due-date">
      📅 {{ formatDueDate(task.due_date) }}
    </div>
    
    <div class="task-actions">
      <button class="task-action-btn" @click="$emit('edit', task)">✏️ 编辑</button>
      <button class="task-action-btn delete" @click="$emit('delete', task.id)">🗑️ 删除</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  task: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['toggle-status', 'edit', 'delete'])

const statusIcon = computed(() => {
  switch (props.task.status) {
    case 'pending': return '⭕'
    case 'in_progress': return '⏳'
    case 'completed': return '✅'
    default: return '⭕'
  }
})

const priorityLabel = computed(() => {
  switch (props.task.priority) {
    case 'low': return '低'
    case 'medium': return '中'
    case 'high': return '高'
    default: return '中'
  }
})

const toggleStatus = () => {
  let newStatus
  switch (props.task.status) {
    case 'pending': newStatus = 'in_progress'; break
    case 'in_progress': newStatus = 'completed'; break
    case 'completed': newStatus = 'pending'; break
    default: newStatus = 'pending'
  }
  emit('toggle-status', props.task.id, newStatus)
}

const formatDueDate = (dateStr) => {
  const date = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const taskDate = new Date(date)
  taskDate.setHours(0, 0, 0, 0)
  
  if (taskDate.getTime() === today.getTime()) {
    return '今天'
  } else if (taskDate.getTime() === tomorrow.getTime()) {
    return '明天'
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}
</script>

<style scoped>
.task-card {
  padding: 18px;
  background: var(--bg-secondary);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.task-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--accent-primary);
  transition: all 0.3s;
}

.task-card:hover {
  transform: translateY(-3px) scale(1.01);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.task-card.priority-low::before {
  background: linear-gradient(180deg, #10b981 0%, #059669 100%);
}

.task-card.priority-medium::before {
  background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%);
}

.task-card.priority-high::before {
  background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.status-toggle {
  width: 36px;
  height: 36px;
  border: 2px solid var(--border-color);
  border-radius: 50%;
  background: var(--bg-primary);
  cursor: pointer;
  font-size: 18px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-toggle:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.status-toggle.completed {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.4);
}

.status-toggle.in_progress {
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.4);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(245, 158, 11, 0);
  }
}

.task-priority-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.task-card.priority-low .task-priority-badge {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.1) 100%);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.task-card.priority-medium .task-priority-badge {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.1) 100%);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.task-card.priority-high .task-priority-badge {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.1) 100%);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.task-title {
  margin: 0 0 10px 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.4;
  transition: all 0.3s;
}

.task-title.completed {
  text-decoration: line-through;
  color: var(--text-secondary);
  opacity: 0.7;
}

.task-description {
  margin: 0 0 14px 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.task-due-date {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 14px;
  padding: 6px 10px;
  background: var(--bg-primary);
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.task-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.task-action-btn {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.task-action-btn:hover {
  background: var(--bg-secondary);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  transform: translateY(-1px);
}

.task-action-btn.delete:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.4);
  color: #ef4444;
}

[data-theme="dark"] .task-card:hover {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

[data-theme="dark"] .task-title {
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}
</style>
