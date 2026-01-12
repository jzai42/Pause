import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // 同时定义具体变量和父对象，这是处理 Node 依赖最稳妥的方法
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
    'process.env': {
      API_KEY: JSON.stringify(process.env.API_KEY || '')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});