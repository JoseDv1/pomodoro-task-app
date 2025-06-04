import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { promises as fs } from 'fs'
import path from 'path'

function injectSwAssets() {
  return {
    name: 'inject-sw-assets',
    apply: 'build',
    async closeBundle() {
      try {
        const manifestPath = path.resolve('dist/.vite/manifest.json')
        const data = await fs.readFile(manifestPath, 'utf8')
        const manifest = JSON.parse(data)
        const entry = manifest['index.html']
        if (!entry) return

        const jsFile = '/' + entry.file
        const cssFile = entry.css && entry.css.length ? '/' + entry.css[0] : null

        const swPath = path.resolve('dist/service-worker.js')
        let sw = await fs.readFile(swPath, 'utf8')
        sw = sw.replace('/src/main.ts', jsFile)
        if (cssFile) {
          sw = sw.replace('/src/app.css', cssFile)
        }
        await fs.writeFile(swPath, sw)
      } catch (e) {
        console.error('Failed to inject service worker asset URLs', e)
      }
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte(), injectSwAssets()],
  build: {
    manifest: true,
  }
})
