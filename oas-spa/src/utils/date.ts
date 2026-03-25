const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;

/** Date → "YYYY-MM-DD" */
export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** "YYYY-MM-DD" → "YYYY年M月D日（曜）" */
export function formatDateJa(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const wd = WEEKDAYS[date.getDay()];
  return `${y}年${m}月${d}日（${wd}）`;
}

/** "YYYY-MM-DD" + "HH:MM" → "M/D（曜） HH:MM" */
export function formatDateTimeJa(dateStr: string, time: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const wd = WEEKDAYS[date.getDay()];
  return `${m}/${d}（${wd}） ${time}`;
}

/** "YYYY-MM-DD" → locale-aware short date with weekday (例: "3月26日 (木)", "Mar 26 (Thu)") */
export function formatDateShort(dateStr: string, locale = 'ja'): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const monthDay = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
  return `${monthDay} (${weekday})`;
}

/** 今日の日付を "YYYY-MM-DD" で返す */
export function today(): string {
  return formatDate(new Date());
}

/** 生年月日から年齢を計算 */
export function calcAge(birthdateStr: string): number | null {
  if (!birthdateStr) return null;
  const [y, m, d] = birthdateStr.split('-').map(Number);
  const today = new Date();
  let age = today.getFullYear() - y;
  const monthDiff = today.getMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) age--;
  return age >= 0 ? age : null;
}

/** 曜日インデックス（0=日〜6=土）を返す */
export function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

/** "HH:MM" 形式のスロット配列を生成（30分間隔） */
export function generateTimeSlots(startStr: string, endStr: string): string[] {
  const slots: string[] = [];
  const [sh, sm] = startStr.split(':').map(Number);
  const [eh, em] = endStr.split(':').map(Number);
  let startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  while (startMin <= endMin) {
    const h = String(Math.floor(startMin / 60)).padStart(2, '0');
    const m = String(startMin % 60).padStart(2, '0');
    slots.push(`${h}:${m}`);
    startMin += 30;
  }
  return slots;
}
