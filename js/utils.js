/* ===========================
   共通ユーティリティ
   =========================== */

// XSSエスケープ
function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 曜日名
const DAY_NAMES = ['日','月','火','水','木','金','土'];

// Date → "YYYY-MM-DD"
function formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

// "YYYY-MM-DD" → "YYYY年M月D日"
function formatDateJa(dateStr) {
    const [y,m,d] = dateStr.split('-');
    return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}

// "YYYY-MM-DD" + "HH:MM" → "M/D（曜）HH:MM"
function formatDateTimeJa(dateStr, time) {
    const [, m, d] = dateStr.split('-');
    const dow = new Date(dateStr).getDay();
    return `${parseInt(m)}/${parseInt(d)}（${DAY_NAMES[dow]}） ${time}`;
}
