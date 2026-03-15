import routeConfig from './appRoutes.json'

export const NAV_ITEMS = routeConfig.navItems

export const DEFAULT_PATH = routeConfig.defaultPath

export function getActiveNavKey(pathname) {
  const match = NAV_ITEMS.find((item) => item.path === pathname)
  return match?.key ?? 'dashboard'
}