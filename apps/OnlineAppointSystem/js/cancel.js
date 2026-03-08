import { db } from "./firebase.js";
import {
    doc, getDoc, writeBatch,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { esc, DAY_NAMES, applyTheme } from "./utils.js";

/* ===========================
   予約キャンセル ロジック
   =========================== */

let foundBooking    = null;
let clinicSettings  = {};

// ── 設定ロード ──
const settingsSnap = await getDoc(doc(db, 'settings', 'clinic'));
if (settingsSnap.exists()) {
    clinicSettings = settingsSnap.data();
    // 院名をヘッダー・タイトルに反映
    const name = clinicSettings.clinicName;
    if (name) {
        const h1 = document.getElementById('clinic-name-heading');
        if (h1) h1.textContent = name;
        document.title = document.title.replace(/ [^|]+$/, ` ${name}`);
    }
    // テーマ適用
    if (clinicSettings.colorTheme) applyTheme(clinicSettings.colorTheme);
    // メンテナンス期間チェック
    const maint = clinicSettings.maintenance;
    if (maint && (maint.startDate || maint.endDate)) {
        const d = new Date(), p = (n) => String(n).padStart(2, '0');
        const now = `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
        if ((!maint.startDate || now >= maint.startDate) && (!maint.endDate || now <= maint.endDate)) {
            window.location.replace('maintenance.html');
        }
    }
    // お知らせバナー表示
    const ann = clinicSettings.announcement;
    const banner = document.getElementById('announcement-banner');
    if (banner && ann && ann.active && ann.message) {
        const d = new Date(), p = (n) => String(n).padStart(2, '0');
        const now = `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
        const inRange = (!ann.startDate || now >= ann.startDate) && (!ann.endDate || now <= ann.endDate);
        if (inRange) {
            const icons = { info:'ℹ️', warning:'⚠️', maintenance:'🔧' };
            banner.className = `announcement-banner ${ann.type || 'info'}`;
            banner.innerHTML = `<span>${icons[ann.type] || 'ℹ️'}</span><span>${esc(ann.message)}</span>`;
            banner.style.display = 'flex';
        }
    }
    // ロゴをヘッダーに反映
    if (clinicSettings.clinicLogo) {
        const logoIcon = document.querySelector('.logo-icon');
        if (logoIcon) {
            logoIcon.innerHTML = `<img src="${clinicSettings.clinicLogo}" alt="ロゴ">`;
            logoIcon.style.background = 'transparent';
        }
    }
}

// ── 検索 ──
async function searchBooking() {
    const id    = document.getElementById('inputBookingId').value.trim();
    const phone = document.getElementById('inputPhone').value.trim();
    const errEl = document.getElementById('searchError');
    errEl.style.display = 'none';

    if (!id || !phone) {
        showSearchError('予約番号と電話番号を入力してください。');
        return;
    }

    const btn = document.querySelector('#searchPanel .btn');
    btn.disabled = true; btn.textContent = '確認中...';

    try {
        const snap = await getDoc(doc(db, 'reservations', id));
        if (!snap.exists()) {
            showSearchError('予約が見つかりません。予約番号をご確認ください。');
            return;
        }
        const booking = snap.data();

        // 電話番号照合（クライアント側検証）
        const normalizePhone = (p) => p.replace(/[-\s]/g, '');
        if (normalizePhone(booking.phone) !== normalizePhone(phone)) {
            showSearchError('電話番号が一致しません。ご登録の電話番号をご確認ください。');
            return;
        }

        foundBooking = booking;
        showDetail(booking);
    } catch (err) {
        console.error('予約検索エラー:', err);
        showSearchError('予約の検索に失敗しました。しばらく経ってからもう一度お試しください。');
    } finally {
        btn.disabled = false; btn.textContent = '予約を確認する';
    }
}

function showSearchError(msg) {
    const el = document.getElementById('searchError');
    el.textContent = msg;
    el.style.display = 'block';
}

// ── 詳細表示 ──
function showDetail(booking) {
    const [y, m, d] = booking.date.split('-').map(Number);
    const dow       = DAY_NAMES[new Date(y, m - 1, d).getDay()];
    const dateLabel = `${y}年${m}月${d}日（${dow}）`;

    // キャンセル可否チェック
    const [th, tm]      = booking.time.split(':').map(Number);
    const bookingMs     = new Date(y, m - 1, d, th, tm).getTime();
    const cutoffMinutes = clinicSettings.cancelCutoffMinutes ?? 60;
    const cutoffMs      = cutoffMinutes * 60 * 1000;
    const isAlreadyCancelled = booking.status === 'cancelled';
    const isPastCutoff       = Date.now() >= bookingMs - cutoffMs;
    const canCancel          = !isAlreadyCancelled && !isPastCutoff;

    // 予約詳細テーブル
    const rows = [
        ['予約日時',  `${dateLabel} ${booking.time}〜`],
        ['予約番号',  booking.id],
        ['氏名',      booking.name],
        ['電話番号',  booking.phone],
        ['初診/再診', booking.visitType || '-'],
        ['症状',      booking.symptoms  || '-'],
        ['ステータス', booking.status === 'cancelled' ? 'キャンセル済み'
                     : booking.status === 'confirmed'  ? '確認済み' : '受付中'],
    ];
    document.getElementById('detailTable').innerHTML = rows.map(([l, v]) =>
        `<tr><td>${esc(l)}</td><td>${esc(v)}</td></tr>`
    ).join('');

    // アラート／アクション
    const alertBox  = document.getElementById('cancelAlertBox');
    const actionBox = document.getElementById('cancelActionBox');

    if (isAlreadyCancelled) {
        alertBox.innerHTML  = `<div class="cancel-alert">この予約はすでにキャンセル済みです。</div>`;
        actionBox.innerHTML = '';
    } else if (isPastCutoff) {
        alertBox.innerHTML  = `<div class="cancel-alert">
            予約時刻の ${cutoffMinutes} 分前を過ぎているため、オンラインでのキャンセルを受け付けられません。<br>
            お電話にてご連絡ください。
        </div>`;
        actionBox.innerHTML = '';
    } else {
        const deadline = new Date(bookingMs - cutoffMs);
        const dlLabel  = `${deadline.getMonth()+1}月${deadline.getDate()}日 ${deadline.getHours()}:${String(deadline.getMinutes()).padStart(2,'0')}`;
        alertBox.innerHTML = `<div class="cancel-alert">
            キャンセル受付期限：<strong>${dlLabel}</strong> まで
        </div>`;
        actionBox.innerHTML = `<button class="btn-cancel-exec" id="cancelExecBtn" onclick="execCancel()">
            この予約をキャンセルする
        </button>`;
    }

    document.getElementById('searchPanel').style.display = 'none';
    document.getElementById('detailPanel').style.display = 'block';
}

// ── キャンセル実行 ──
async function execCancel() {
    if (!foundBooking) return;
    if (!confirm('この予約をキャンセルしてもよろしいですか？')) return;

    const btn = document.getElementById('cancelExecBtn');
    btn.disabled = true; btn.textContent = '処理中...';

    try {
        const batch  = writeBatch(db);
        const resRef = doc(db, 'reservations', foundBooking.id);
        batch.update(resRef, { status: 'cancelled' });

        const slotId  = `${foundBooking.date}_${foundBooking.time.replace(':', '')}`;
        const slotRef = doc(db, 'slots', slotId);
        batch.update(slotRef, { status: 'cancelled' });

        await batch.commit();

        document.getElementById('detailPanel').style.display = 'none';
        document.getElementById('donePanel').style.display   = 'block';
    } catch (err) {
        console.error('キャンセルエラー:', err);
        btn.disabled = false; btn.textContent = 'この予約をキャンセルする';
        alert('キャンセルに失敗しました。しばらく経ってからもう一度お試しください。');
    }
}

// ── 検索に戻る ──
function backToSearch() {
    document.getElementById('detailPanel').style.display = 'none';
    document.getElementById('searchPanel').style.display = 'block';
}

// グローバル公開
Object.assign(window, { searchBooking, execCancel, backToSearch });
