<script setup lang="ts">
import { defineProps, onMounted, ref } from "vue";
import dayjs from "dayjs";

// Simple debounce function implementation
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

const props = defineProps(["title"]);
const title = ref(props.title.toUpperCase());

onMounted(() => {
  const debouncedTitle = debounce(() => {
    console.log("Debounced title:", title.value);
  }, 1000);
  debouncedTitle();
});

console.log("Day.js has been imported:", dayjs());
</script>

<template>
  <h1>{{ title }}</h1>
</template>
