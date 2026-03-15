/**
 * 郵便番号 → 住所自動入力フック
 * zipcloud-address スキル + input-validation スキル（toHankaku）準拠
 */
import { useState, useRef, useCallback } from 'react';

/** 全角ASCII → 半角変換（input-validation スキル） */
function toHankaku(str: string): string {
  return str.replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).trim();
}

export function useZipcode(onAddressFill: (address: string) => void) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  /** 入力値を正規化してハイフン自動挿入 */
  const formatZipcode = useCallback((value: string): string => {
    let v = toHankaku(value).replace(/[^\d]/g, '');
    if (v.length > 3) v = v.slice(0, 3) + '-' + v.slice(3, 7);
    return v;
  }, []);

  /** 7桁入力時にAPI検索を開始 */
  const lookup = useCallback((zipcode: string) => {
    const digits = zipcode.replace(/-/g, '');
    if (digits.length !== 7) {
      setStatus('idle');
      setMessage('');
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setStatus('loading');
      setMessage('検索中…');
      try {
        const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${digits}`);
        const json = await res.json();
        if (json.results?.[0]) {
          const r = json.results[0];
          onAddressFill(r.address1 + r.address2 + r.address3);
          setStatus('success');
          setMessage('✓ 住所を反映しました');
        } else {
          setStatus('error');
          setMessage('見つかりません');
        }
      } catch {
        setStatus('error');
        setMessage('エラー');
      }
    }, 400);
  }, [onAddressFill]);

  return { status, message, formatZipcode, lookup };
}
