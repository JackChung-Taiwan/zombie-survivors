import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages 會將專案部署在 /zombie-survivors/ 子路徑；本機開發仍使用根路徑。
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/zombie-survivors/' : '/',
  plugins: [vue(), tailwindcss()],
});
