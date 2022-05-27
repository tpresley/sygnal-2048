import { defineConfig } from 'vite';


// https://vitejs.dev/config/

export default defineConfig({
  root: 'src',
  base: '',
  publicDir: '../public',
  build: {
    outDir: '../dist',
  },
  esbuild: {
    jsxFactory: `Snabbdom.createElement`,
    jsxInject: `import Snabbdom from 'snabbdom-pragma'`,
  }
});
