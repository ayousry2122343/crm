<script setup lang="ts">
import { computed } from 'vue';
import Tag from 'primevue/tag';

const props = defineProps<{
  score: number;
}>();

const severity = computed(() => {
  if (props.score >= 81) return 'success';
  if (props.score >= 61) return 'info';
  if (props.score >= 31) return 'warn';
  return 'danger';
});
</script>

<template>
  <Tag
    :value="String(score)"
    :severity="severity"
    class="text-xs"
    data-test="score-badge"
  />
</template>
