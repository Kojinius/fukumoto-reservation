/** localStorage ユーティリティ */

export function loadFromStorage<T>(key: string): T | null {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) as T : null;
  } catch {
    return null;
  }
}

export function saveToStorage(key: string, data: unknown): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export function removeFromStorage(key: string): void {
  localStorage.removeItem(key);
}
