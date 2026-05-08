<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const form = ref({ name: '', email: '', message: '' });
const submitted = ref(false);
const honeypot = ref('');

function submit() {
  if (honeypot.value) return;
  if (!form.value.name || !form.value.email || !form.value.message) return;
  submitted.value = true;
}
</script>

<template>
  <main class="min-h-screen bg-white">
    <section class="max-w-xl mx-auto px-6 py-20">
      <h1 class="text-4xl font-bold mb-4 text-center">{{ t('contact.title') }}</h1>
      <p class="text-slate-600 text-center mb-8">{{ t('contact.subtitle') }}</p>

      <div v-if="submitted" class="bg-green-50 text-green-700 rounded-lg p-6 text-center" data-test="contact-success">
        {{ t('contact.success') }}
      </div>

      <form v-else class="flex flex-col gap-4" data-test="contact-form" @submit.prevent="submit">
        <input type="text" class="sr-only" tabindex="-1" autocomplete="off" v-model="honeypot" />
        <div>
          <label class="block text-sm font-medium mb-1">{{ t('contact.name') }}</label>
          <input v-model="form.name" type="text" class="w-full border rounded-md px-3 py-2" data-test="contact-name" required />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">{{ t('contact.email') }}</label>
          <input v-model="form.email" type="email" class="w-full border rounded-md px-3 py-2" data-test="contact-email" required />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">{{ t('contact.message') }}</label>
          <textarea v-model="form.message" rows="5" class="w-full border rounded-md px-3 py-2" data-test="contact-message" required />
        </div>
        <button type="submit" class="px-6 py-3 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700" data-test="contact-submit">
          {{ t('contact.send') }}
        </button>
      </form>
    </section>
  </main>
</template>
