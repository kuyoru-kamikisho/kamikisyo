import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path';
import {terser} from "rollup-plugin-terser";
import dtsPlugin from "vite-plugin-dts";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(),dtsPlugin()],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src', 'index.ts'),
      name: 'KtyUI',
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: {
          vue: 'Vue',
        },
      },
      plugins: [
        terser({
          compress: {
            drop_console: true,
          },
        }),
      ],
    },
  },
})
