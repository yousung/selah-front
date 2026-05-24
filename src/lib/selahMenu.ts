const KEY = 'selah-menu'

export function setSelahMenu(path: string) {
  sessionStorage.setItem(KEY, path)
}

export function getSelahMenu(): string | null {
  return sessionStorage.getItem(KEY)
}

export function clearSelahMenu() {
  sessionStorage.removeItem(KEY)
}
