import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    // 固定请求基址，避免本地 .env.local 覆盖成相对路径后 msw 拦截失效。
    env: { VITE_API_BASE_URL: 'http://localhost:8080/api/v1' },
  },
})
