import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { env: { LOGIN_RATE: '1000' }, fileParallelism: false } });
