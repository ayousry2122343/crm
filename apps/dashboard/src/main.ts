import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import Aura from '@primevue/themes/aura';
import App from './App.vue';
import { router } from './router';
import { i18n } from './i18n';
import 'primeicons/primeicons.css';
import './styles/index.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(i18n);
app.use(PrimeVue, {
  theme: { preset: Aura, options: { darkModeSelector: '.crm-dark' } },
});
app.use(ToastService);

app.config.errorHandler = (err, _instance, info) => {
  console.error(`[Vue Error] ${info}:`, err);
};

window.addEventListener('crm:logout', () => {
  router.push({ name: 'login' });
});

app.mount('#app');
