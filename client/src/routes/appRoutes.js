import routeConfig from './appRoutes.json'

export const NAV_ITEMS = routeConfig.navItems

export const DEFAULT_PATH = routeConfig.defaultPath

function getChildItems(item) {
  return Array.isArray(item.children) ? item.children : []
}

export function getActiveNavKey(pathname) {
  if (pathname.startsWith('/aging/bucket/')) {
    return 'aging'
  }

  for (const item of NAV_ITEMS) {
    if (item.path && item.path === pathname) {
      return item.key
    }

    const childMatch = getChildItems(item).find((child) => child.path === pathname)
    if (childMatch) {
      return childMatch.key
    }
  }

  return 'dashboard'
}