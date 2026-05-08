<script setup lang="ts">
import SiteHeader from '@/components/SiteHeader.vue';
import SiteFooter from '@/components/SiteFooter.vue';
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <SiteHeader />
    <div class="flex-1">
      <router-view />
    </div>
    <SiteFooter />
  </div>
</template>
