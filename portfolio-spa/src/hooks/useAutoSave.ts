import { useEffect, useRef } from 'react';
import { saveToStorage } from '@/utils/storage';

/** debounced localStorage 永続化フック */
export function useAutoSave(key: string, data: unknown, delay = 500) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      saveToStorage(key, data);
    }, delay);

    return () => clearTimeout(timeoutRef.current);
  }, [key, data, delay]);
}
