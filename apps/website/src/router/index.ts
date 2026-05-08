import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('@/pages/Home.vue') },
    { path: '/features', component: () => import('@/pages/Features.vue') },
    { path: '/pricing', component: () => import('@/pages/Pricing.vue') },
    { path: '/contact', component: () => import('@/pages/Contact.vue') },
    { path: '/sign-up', component: () => import('@/pages/SignUp.vue') },
  ],
});
