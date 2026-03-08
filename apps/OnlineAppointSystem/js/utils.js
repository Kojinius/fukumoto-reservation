// ── カラーテーマ定義 ──
export const THEMES = {
    warm:     { label:'ウォームブラウン', accent1:'#735763', accent2:'#F79321',
                vars: { '--brown':'#735763','--brown-dark':'#5A3F4E','--orange':'#F79321','--orange-soft':'#FEF3E2','--orange-mid':'#F7B85A','--beige':'#FCF0DE','--beige-mid':'#EDE3D8','--beige-dark':'#D9C9B8','--text-primary':'#3D2B1F','--text-secondary':'#735763','--text-muted':'#8B7355' } },
    navy:     { label:'ネイビー',         accent1:'#2B4C7E', accent2:'#4A90D9',
                vars: { '--brown':'#2B4C7E','--brown-dark':'#1A3055','--orange':'#4A90D9','--orange-soft':'#E8F2FB','--orange-mid':'#7BB3E8','--beige':'#EDF4FB','--beige-mid':'#D8E8F5','--beige-dark':'#C0D6EE','--text-primary':'#0D1F3C','--text-secondary':'#2B4C7E','--text-muted':'#5272A0' } },
    forest:   { label:'フォレスト',       accent1:'#2D6A4F', accent2:'#40916C',
                vars: { '--brown':'#2D6A4F','--brown-dark':'#1B4332','--orange':'#40916C','--orange-soft':'#D8F3DC','--orange-mid':'#74C69D','--beige':'#EEF7F1','--beige-mid':'#D8EEE3','--beige-dark':'#B7D8C4','--text-primary':'#1B4332','--text-secondary':'#2D6A4F','--text-muted':'#52796F' } },
    rose:     { label:'ローズ',           accent1:'#8B4A6E', accent2:'#D4638A',
                vars: { '--brown':'#8B4A6E','--brown-dark':'#6B3555','--orange':'#D4638A','--orange-soft':'#FAEEF4','--orange-mid':'#E8A0BF','--beige':'#FDF0F5','--beige-mid':'#F5DDE9','--beige-dark':'#E8C4D4','--text-primary':'#3D1F2E','--text-secondary':'#8B4A6E','--text-muted':'#A06080' } },
    sky:      { label:'スカイ',           accent1:'#0080A8', accent2:'#00B4D8',
                vars: { '--brown':'#0080A8','--brown-dark':'#00607E','--orange':'#00B4D8','--orange-soft':'#E0F7FC','--orange-mid':'#48CAE4','--beige':'#EBF8FD','--beige-mid':'#CDF0F8','--beige-dark':'#A8E1F0','--text-primary':'#003D52','--text-secondary':'#0080A8','--text-muted':'#4A9CB5' } },
    charcoal: { label:'チャコール',       accent1:'#4A5568', accent2:'#E07B3C',
                vars: { '--brown':'#4A5568','--brown-dark':'#2D3748','--orange':'#E07B3C','--orange-soft':'#FEF3E8','--orange-mid':'#F0A575','--beige':'#F7F8FA','--beige-mid':'#EDF0F5','--beige-dark':'#DDE2EC','--text-primary':'#1A202C','--text-secondary':'#4A5568','--text-muted':'#718096' } },
};

export function applyTheme(themeId) {
    const theme = THEMES[themeId] || THEMES.warm;
    const root = document.documentElement;
    Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
    try { localStorage.setItem('_themeVars', JSON.stringify(theme.vars)); } catch(e) {}
}

// XSSエスケープ
export function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 曜日名
export const DAY_NAMES = ['日','月','火','水','木','金','土'];

// Date → "YYYY-MM-DD"
export function formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

// "YYYY-MM-DD" → "YYYY年M月D日"
export function formatDateJa(dateStr) {
    const [y,m,d] = dateStr.split('-');
    return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}

// "YYYY-MM-DD" + "HH:MM" → "M/D（曜）HH:MM"
export function formatDateTimeJa(dateStr, time) {
    const [, m, d] = dateStr.split('-');
    const dow = new Date(dateStr).getDay();
    return `${parseInt(m)}/${parseInt(d)}（${DAY_NAMES[dow]}） ${time}`;
}
