import { defineConfig, type Plugin } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

// Post-build plugin: writes dist/before.html and dist/after.html
function autoindexSnippets(): Plugin {
  return {
    name: 'autoindex-snippets',
    apply: 'build',
    closeBundle() {
      const base = '/_autoindex/'

      // Inline theme-init script: reads localStorage before React mounts to
      // avoid a flash of the wrong theme or palette. Defaults to dark if no
      // preference saved. Also restores palette class (palette-NAME) on <html>.
      const themeInit = `<script>(function(){try{var t=localStorage.getItem('sandrone-theme');document.documentElement.classList.toggle('dark',t!=='light');var p=localStorage.getItem('sandrone-palette');if(p&&p!=='neutral')document.documentElement.classList.add('palette-'+p);if(p==='sandrone')document.documentElement.classList.add('dark');var b=localStorage.getItem('sandrone-bg-brightness');document.documentElement.style.setProperty('--bg-brightness',b?(+b/100).toFixed(2):'0.70')}catch(e){document.documentElement.classList.add('dark')}})()</script>`

      const before = `${themeInit}
<link rel="stylesheet" href="${base}assets/index.css">
<div id="autoindex-root"></div>
<style>
body:has(#autoindex-root) > h1,
body:has(#autoindex-root) > hr,
body:has(#autoindex-root) > pre { display: none !important; }
</style>
`
      const after = `<script type="module" src="${base}assets/index.js"></script>
`
      fs.writeFileSync('dist/before.html', before)
      fs.writeFileSync('dist/after.html', after)
      console.log('  wrote dist/before.html and dist/after.html')
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/_autoindex/',
  plugins: [
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    autoindexSnippets(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
})
