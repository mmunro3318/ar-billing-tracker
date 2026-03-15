import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const appPath = path.resolve(__dirname, '../src/App.jsx')
const routeConfigPath = path.resolve(__dirname, '../src/routes/appRoutes.json')

const appSource = fs.readFileSync(appPath, 'utf8')
const routeConfig = JSON.parse(fs.readFileSync(routeConfigPath, 'utf8'))

const errors = []

for (const item of routeConfig.navItems) {
  if (!appSource.includes(`path="${item.path}"`)) {
    errors.push(`Missing route in App.jsx for nav item ${item.key} (${item.path})`)
  }
}

const hasPreviewRoute = appSource.includes('path="/preview"')
const previewInNav = routeConfig.navItems.some((item) => item.path === '/preview')

if (previewInNav && !hasPreviewRoute) {
  errors.push('Route mismatch: /preview exists in nav config but not in App.jsx')
}

if (errors.length) {
  console.error('Route validation failed:')
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log('Route validation passed')
console.log(`- Nav items checked: ${routeConfig.navItems.length}`)
console.log(`- Preview route: ${hasPreviewRoute ? 'present (hidden)' : 'not present'}`)
