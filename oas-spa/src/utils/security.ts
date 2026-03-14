/** HTML特殊文字をエスケープ */
export function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, ch => map[ch]);
}

/** 文字列をサニタイズ（前後空白除去 + HTMLエスケープ） */
export function sanitize(str: string): string {
  return escapeHtml(str.trim());
}

/** 全角 → 半角変換 */
export function toHankaku(str: string): string {
  return str.replace(/[\uff01-\uff5e]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
  );
}
