import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(() => {
  const useHttps = process.env.HTTPS === '1';

  return {
    base: '/',
    plugins: useHttps ? [basicSsl()] : [],
    server: {
      host: true,
      port: 5174,
      strictPort: true,
    },
    preview: {
      host: true,
      port: 4174,
      strictPort: true,
    },
  };
});
