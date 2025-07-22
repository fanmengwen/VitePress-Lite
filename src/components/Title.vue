<script setup lang="ts">
import { defineProps, onMounted, ref } from 'vue'
import { debounce } from 'lodash-es';
import dayjs from 'dayjs';


const props = defineProps(['title'])
const title = ref(props.title.toUpperCase())

onMounted(() => {
    const debouncedTitle = debounce(title.value, 1000)
    debouncedTitle()
})

console.log('Day.js has been imported:', dayjs());

</script>

<template>
    <h1>{{ title }}</h1>
</template>