import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
  server: {
    port: 5173,
    open: true,
  },
  resolve: {
    extensions: ['.js', '.json'],
    alias: {
      '@': '/src',
    },
  },
  optimizeDeps: {
    include: ['src/**/*.js'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.test.js',
        '**/*.config.js',
        '**/virtual:',
        '**/dist/',
      ],
    },
  },
});
