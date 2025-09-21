<template>
  <teleport to="body">
    <div v-if="open" class="modal-overlay" @click.self="onCancel">
      <div class="modal-card" role="dialog" aria-modal="true" :aria-labelledby="id + '-title'">
        <header class="modal-header">
          <div class="modal-icon">⚠️</div>
          <h3 class="modal-title" :id="id + '-title'">{{ title }}</h3>
        </header>
        <section class="modal-body">
          <p class="modal-message">{{ message }}</p>
        </section>
        <footer class="modal-actions">
          <button class="btn btn-ghost" @click="onCancel">{{ cancelText }}</button>
          <button class="btn btn-danger" @click="onConfirm">{{ confirmText }}</button>
        </footer>
      </div>
    </div>
  </teleport>
  </template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  modelValue: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  id?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: '确认操作',
  message: '此操作无法撤销，确定继续吗？',
  confirmText: '确认',
  cancelText: '取消',
  id: 'confirm-modal',
});

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

const open = computed(() => props.modelValue);

const onCancel = () => {
  emit('update:modelValue', false);
  emit('cancel');
};

const onConfirm = () => {
  emit('update:modelValue', false);
  emit('confirm');
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 16px;
}

.modal-card {
  width: 100%;
  max-width: 420px;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-light);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 18px 8px 18px;
}

.modal-icon { font-size: 20px; }
.modal-title { margin: 0; font-size: 16px; font-weight: 700; }

.modal-body { padding: 0 18px 12px 18px; }
.modal-message { margin: 0; font-size: 14px; color: var(--color-text-secondary); line-height: 1.6; }

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 18px 16px 18px;
}

.btn {
  height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid var(--color-border-light);
  background: #fff;
  cursor: pointer;
  font-size: 14px;
}

.btn-ghost { background: transparent; color: var(--color-text-primary); }
.btn-ghost:hover { background: var(--color-bg-secondary); }

.btn-danger {
  background: #ef4444;
  border-color: #ef4444;
  color: #fff;
}
.btn-danger:hover { background: #dc2626; border-color: #dc2626; }

@media (prefers-color-scheme: dark) {
  .modal-card { background: #1f2937; border-color: rgba(255,255,255,0.12); }
  .btn { background: #111827; color: #e5e7eb; border-color: rgba(255,255,255,0.12); }
  .btn-ghost:hover { background: rgba(255,255,255,0.06); }
}
</style>


