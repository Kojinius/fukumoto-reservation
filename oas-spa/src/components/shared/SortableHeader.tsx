import { cn } from '@/utils/cn';

export type SortDir = 'asc' | 'desc';
export interface SortKey {
  col: string;
  dir: SortDir;
}

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  sortKeys: SortKey[];
  onSort: (key: string) => void;
  className?: string;
}

export function SortableHeader({ label, sortKey, sortKeys, onSort, className }: SortableHeaderProps) {
  const idx = sortKeys.findIndex(s => s.col === sortKey);
  const isActive = idx >= 0;
  const dir = isActive ? sortKeys[idx].dir : null;

  return (
    <th
      className={cn(
        'px-3 py-3 text-[11px] font-medium text-navy-400 whitespace-nowrap tracking-wider uppercase text-left bg-cream-100/50 first:rounded-tl-lg last:rounded-tr-lg',
        'cursor-pointer select-none hover:text-gold transition-colors',
        isActive && 'text-gold',
        className,
      )}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        <span className="inline-flex items-center">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path
              d="M8 4l3 4H5l3-4z"
              className={cn('transition-opacity', isActive && dir === 'asc' ? 'opacity-100' : 'opacity-20')}
            />
            <path
              d="M8 12l3-4H5l3 4z"
              className={cn('transition-opacity', isActive && dir === 'desc' ? 'opacity-100' : 'opacity-20')}
            />
          </svg>
          {isActive && sortKeys.length > 1 && (
            <sup className="text-[9px] font-bold text-gold -ml-0.5">{idx + 1}</sup>
          )}
        </span>
      </span>
    </th>
  );
}

/** ソートキー切り替え: asc → desc → 除去 */
export function toggleSortKey(sortKeys: SortKey[], col: string, maxKeys = 3): SortKey[] {
  const idx = sortKeys.findIndex(s => s.col === col);
  if (idx >= 0) {
    const current = sortKeys[idx];
    if (current.dir === 'asc') {
      return sortKeys.map((s, i) => i === idx ? { ...s, dir: 'desc' as SortDir } : s);
    } else {
      return sortKeys.filter((_, i) => i !== idx);
    }
  } else {
    const next = [...sortKeys, { col, dir: 'asc' as SortDir }];
    return next.length > maxKeys ? next.slice(1) : next;
  }
}

/** 複数カラムソート実行 */
export function multiSort<T>(
  items: T[],
  sortKeys: SortKey[],
  getValue: (item: T, col: string) => string | number,
): T[] {
  if (sortKeys.length === 0) return items;

  return [...items].sort((a, b) => {
    for (const { col, dir } of sortKeys) {
      const va = getValue(a, col);
      const vb = getValue(b, col);
      let cmp = 0;

      if (typeof va === 'number' && typeof vb === 'number') {
        cmp = va - vb;
      } else {
        cmp = String(va).localeCompare(String(vb), 'ja');
      }

      if (cmp !== 0) return dir === 'desc' ? -cmp : cmp;
    }
    return 0;
  });
}
