/**
 * 郵便番号 → 住所自動入力コンポーネント
 * zipcloud-address スキル準拠
 */
import { cn } from '@/utils/cn';

interface ZipcodeInputProps {
  value: string;
  onChange: (rawValue: string) => void;
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
}

export function ZipcodeInput({ value, onChange, status, message }: ZipcodeInputProps) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-brown-500 dark:text-brown-400">
        郵便番号
      </label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="123-4567"
          maxLength={8}
          className="w-36 px-3 py-2 rounded-lg border border-brown-200 dark:border-brown-700 bg-brown-50/50 dark:bg-brown-800/50 text-brown-800 dark:text-brown-100 text-sm placeholder:text-brown-300 dark:placeholder:text-brown-600 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
        />
        <span className={cn(
          'text-xs transition-colors whitespace-nowrap',
          status === 'loading' && 'text-brown-400 dark:text-brown-500',
          status === 'success' && 'text-green-600 dark:text-green-400',
          status === 'error' && 'text-red-500 dark:text-red-400',
          status === 'idle' && 'text-transparent',
        )}>
          {message || '\u00A0'}
        </span>
      </div>
    </div>
  );
}
