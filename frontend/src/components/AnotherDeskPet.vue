<template>
  <div 
    class="another-desk-pet-container"
    :style="containerStyle"
  >
    <!-- 地面：位置由groundPos动态计算，与碰撞箱完全绑定 -->
    <div 
      class="desk-pet-ground"
      :style="{ 
        top: `${groundPos.y - baseConfig.groundHeight}px`, 
        left: `${groundPos.x}px`,
        width: `${baseConfig.groundWidth}px`,
        height: `${baseConfig.groundHeight}px`
      }"
      @mousedown="handleGroundDrag"
    >
      <img src="/audio/AnotherDeskPet/land.png" alt="地面" class="ground-img" />
      <div 
        class="scale-btn"
        v-if="allPetsOnGround"
        @mousedown="handleScaleDrag"
      >
        调整大小
      </div>
    </div>

    <!-- 桌宠列表 -->
    <div 
      v-for="pet in petList" 
      :key="pet.id"
      class="desk-pet-item"
      :style="{
        top: `${pet.y}px`,
        left: `${pet.x}px`,
        transform: `scale(${getScaleValue()})`
      }"
      @click="handlePetClick(pet)"
    >
      <img :src="pet.imgSrc" alt="桌宠" class="pet-img" />
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAnotherDeskPet } from '@/composables/useAnotherDeskPet'

const {
  containerStyle,
  petList,
  allPetsOnGround,
  groundPos,
  handlePetClick,
  handleScaleDrag,
  handleGroundDrag,
  init,
  getScaleValue,
  baseConfig // 引入配置，用于动态设置地面宽高
} = useAnotherDeskPet(5)

onMounted(() => {
  setTimeout(() => {
    init()
  }, 100)
})
</script>

<style scoped>
/* 容器样式：移除固定宽高，由内容和定位决定 */
.another-desk-pet-container {
  position: absolute !important;
  z-index: 9999 !important;
  pointer-events: auto;
  user-select: none;
  overflow: visible !important;
}

/* 地面样式 */
.desk-pet-ground {
  position: absolute !important;
  pointer-events: auto;
  cursor: move;
}

.ground-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 缩放按钮 */
.scale-btn {
  position: absolute;
  right: 10px;
  bottom: 10px;
  padding: 5px 10px;
  background: rgba(128, 128, 128, 0.7);
  color: white;
  border-radius: 4px;
  cursor: se-resize;
  font-size: 12px;
  user-select: none;
}

/* 桌宠样式 */
.desk-pet-item {
  position: absolute !important;
  width: 100px;
  height: 100px;
  transition: none;
  cursor: pointer;
  pointer-events: auto;
  z-index: 10 !important;
}

.pet-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>