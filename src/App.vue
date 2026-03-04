<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import { useAppFeedback } from '~/shared/composables/useAppFeedback'
import LoadingBar from '~/shared/components/ui/LoadingBar.vue'
import AppToast from '~/shared/components/ui/AppToast.vue'

const auth = useAuthStore()
const { isLoading, loadingColor, toasts, dismissToast } = useAppFeedback()

onMounted(() => {
  auth.initialize()
})
</script>

<template>
  <RouterView />
  <LoadingBar :active="isLoading" :color="loadingColor" />
  <AppToast :toasts="toasts" @dismiss="dismissToast" />
</template>
