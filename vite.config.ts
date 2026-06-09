import { defineConfig, type Plugin } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

const autoindexBase = '/_autoindex/'

// Post-build plugin: writes dist/before.html and dist/after.html
function autoindexSnippets(): Plugin {
  let base = autoindexBase
  let outDir = 'dist'

  return {
    name: 'autoindex-snippets',
    apply: 'build',
    configResolved(config) {
      base = config.base
      outDir = path.resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      // Inline theme-init script: reads localStorage before React mounts to
      // avoid a flash of the wrong theme or palette. Defaults to dark if no
      // preference saved. Also restores palette class (palette-NAME) on <html>.
      const themeInit = `<script>(function(){try{var t=localStorage.getItem('sandrone-theme');document.documentElement.classList.toggle('dark',t!=='light');var p=localStorage.getItem('sandrone-palette');if(p&&p!=='neutral')document.documentElement.classList.add('palette-'+p);if(p==='sandrone')document.documentElement.classList.add('dark');var b=localStorage.getItem('sandrone-bg-brightness');document.documentElement.style.setProperty('--bg-brightness',b?(+b/100).toFixed(2):'0.70');var u=localStorage.getItem('sandrone-bg-blur');document.documentElement.style.setProperty('--bg-blur',u&&Number.isFinite(+u)?(+u)+'px':'0px')}catch(e){document.documentElement.classList.add('dark')}})()</script>`

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
      fs.writeFileSync(path.join(outDir, 'before.html'), before)
      fs.writeFileSync(path.join(outDir, 'after.html'), after)
      console.log(`  wrote ${path.relative(process.cwd(), outDir)}/before.html and after.html`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: autoindexBase,
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
