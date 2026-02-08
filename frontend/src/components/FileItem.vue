<template>
  <div 
    class="file-item" 
    :class="{ active }"
    @click="$emit('click')"
  >
    <span>{{ filename }}.md</span>
    <span class="delete-icon" @click.stop="$emit('delete')">×</span>
  </div>
</template>

<script setup>
defineProps({
  filename: String,
  active: Boolean
})

defineEmits(['click', 'delete'])
</script>

<style scoped>
.file-item {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.file-item:last-child {
  border-bottom: none;
}

.file-item:hover {
  background-color: rgba(0,0,0,0.05);
}

.file-item.active {
  background-color: rgba(59, 130, 246, 0.1);
  font-weight: bold;
}

.file-item .delete-icon {
  opacity: 0.5;
  font-size: 12px;
  cursor: pointer;
}

.file-item .delete-icon:hover {
  opacity: 1;
}
</style>