import { defineConfig } from 'tsdown';

/**
 * tsdown 构建配置
 * 将 TypeScript 源码编译为 ESM 格式的 JavaScript
 */
export default defineConfig({
  entry: ['./src/index.ts'],
  outDir: 'dist',
  format: ['esm'],
  clean: true,
  sourcemap: false,
  splitting: false,
});