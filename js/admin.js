import { db } from "./firebase.js";
import { requireAdmin, logout } from "./auth.js";
import {
    collection, doc, updateDoc, onSnapshot,
    query, orderBy, writeBatch,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { esc, DAY_NAMES, formatDateTimeJa } from "./utils.js";

/* ===========================
   福元鍼灸整骨院 管理側ロジック
   =========================== */

// ── 認証ガード ──
await requireAdmin();

// ── フィルター状態 ──
let currentStatus = 'all';
let currentDate   = '';
let currentSearch = '';
let allBookings   = [];
let unsubscribe   = null;

const STATUS_LABEL = {
    pending:   '<span class="badge badge-pending">⚠ 未確認</span>',
    confirmed: '<span class="badge badge-confirmed">✓ 確認済み</span>',
    cancelled: '<span class="badge badge-cancelled">✕ キャンセル</span>',
};
const VISIT_BADGE = {
    '初診': '<span class="badge badge-new">初診</span>',
    '再診': '<span class="badge badge-return">再診</span>',
};

// ── Firestore リアルタイムリスナー ──
function startListening() {
    if (unsubscribe) unsubscribe();
    unsubscribe = onSnapshot(collection(db, 'reservations'), (snap) => {
        allBookings = snap.docs.map(d => d.data());
        renderTable();
    }, (err) => {
        console.error('リアルタイム同期エラー:', err);
    });
}

// ── KPI計算 ──
function updateKpi(all) {
    const today     = new Date().toISOString().slice(0, 10);
    const [cy, cm]  = today.split('-');
    document.getElementById('kpiToday').textContent  = all.filter(b => b.date === today && b.status !== 'cancelled').length + '件';
    document.getElementById('kpiMonth').textContent  = all.filter(b => b.date?.startsWith(`${cy}-${cm}`) && b.status !== 'cancelled').length + '件';
    document.getElementById('kpiNew').textContent    = all.filter(b => b.visitType === '初診' && b.date?.startsWith(`${cy}-${cm}`)).length + '名';
    document.getElementById('kpiPending').textContent = all.filter(b => b.status === 'pending').length + '件';
}

// ── テーブル描画 ──
function renderTable() {
    updateKpi(allBookings);

    let data = [...allBookings].sort((a, b) => {
        const dt = x => `${x.date} ${x.time}`;
        return dt(b).localeCompare(dt(a));
    });

    if (currentStatus !== 'all') data = data.filter(b => b.status === currentStatus);
    if (currentDate)              data = data.filter(b => b.date === currentDate);
    if (currentSearch)            data = data.filter(b =>
        (b.name    || '').includes(currentSearch) ||
        (b.furigana || '').includes(currentSearch)
    );

    document.getElementById('tableCount').textContent = `${data.length}件`;

    const tbody = document.getElementById('tableBody');
    if (data.length === 0) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="7">表示する予約がありません</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(b => `
        <tr>
            <td>${esc(formatDateTimeJa(b.date, b.time))}</td>
            <td><strong>${esc(b.name)}</strong><br><small style="color:var(--text-muted)">${esc(b.furigana)}</small></td>
            <td>${VISIT_BADGE[b.visitType] || esc(b.visitType)}</td>
            <td>${esc((b.symptoms||'').length > 20 ? b.symptoms.slice(0,20)+'…' : b.symptoms)}</td>
            <td>${esc(b.phone)}</td>
            <td>${STATUS_LABEL[b.status] || esc(b.status)}</td>
            <td><button class="btn-detail" onclick="openDetail('${esc(b.id)}')">詳細</button></td>
        </tr>
    `).join('');
}

// ── フィルター ──
function applyFilter() {
    currentDate   = document.getElementById('filterDate').value;
    currentSearch = document.getElementById('searchInput').value.trim();
    renderTable();
}

function setStatusFilter(btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentStatus = btn.dataset.status;
    renderTable();
}

function clearFilter() {
    currentStatus = 'all'; currentDate = ''; currentSearch = '';
    document.getElementById('filterDate').value  = '';
    document.getElementById('searchInput').value = '';
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.filter-btn[data-status="all"]').classList.add('active');
    renderTable();
}

// ── 詳細モーダル ──
function openDetail(id) {
    const booking = allBookings.find(b => b.id === id);
    if (!booking) return;

    const rows = [
        ['予約番号', booking.id],
        ['予約日時', formatDateTimeJa(booking.date, booking.time)],
        ['氏名',     booking.name],
        ['ふりがな', booking.furigana],
        ['生年月日', booking.birthdate || '-'],
        ['住所',     booking.address],
        ['電話番号', booking.phone],
        ['メール',   booking.email || '-'],
        ['初診/再診', booking.visitType],
        ['保険証',   booking.insurance],
        ['症状',     booking.symptoms],
        ['伝達事項', booking.notes || 'なし'],
        ['連絡方法', booking.contactMethod],
        ['ステータス', booking.status],
        ['登録日時',  new Date(booking.createdAt).toLocaleString('ja-JP')],
    ];

    document.getElementById('detailModalBody').innerHTML = rows.map(([l, v]) =>
        `<div class="detail-row"><div class="detail-label">${esc(l)}</div><div class="detail-value">${esc(v)}</div></div>`
    ).join('');

    const footer = document.getElementById('detailModalFooter');
    footer.innerHTML = `
        <button class="btn btn-outline btn-sm" onclick="closeModal('detailModal')">閉じる</button>
        ${booking.status !== 'confirmed'
            ? `<button class="btn btn-sm" style="background:var(--green);color:#fff;border:none;border-radius:7px;height:34px;padding:0 14px;cursor:pointer;" onclick="updateStatus('${esc(booking.id)}','confirmed')">✓ 確認済みにする</button>`
            : ''}
        ${booking.status !== 'cancelled'
            ? `<button class="btn btn-sm" style="background:#ddd;color:#666;border:none;border-radius:7px;height:34px;padding:0 14px;cursor:pointer;" onclick="updateStatus('${esc(booking.id)}','cancelled')">キャンセル</button>`
            : ''}
        <a href="tel:${esc(booking.phone)}" class="btn btn-sm btn-admin-orange" style="text-decoration:none;">📞 電話する</a>
    `;
    openModal('detailModal');
}

// ── ステータス更新（reservations + slots を一括更新）──
async function updateStatus(id, status) {
    try {
        const booking    = allBookings.find(b => b.id === id);
        const batch      = writeBatch(db);
        const resRef     = doc(db, 'reservations', id);
        batch.update(resRef, { status });

        // キャンセル時はスロットも開放
        if (status === 'cancelled' && booking?.date && booking?.time) {
            const slotId  = `${booking.date}_${booking.time.replace(':', '')}`;
            const slotRef = doc(db, 'slots', slotId);
            batch.update(slotRef, { status: 'cancelled' });
        }
        await batch.commit();
        closeModal('detailModal');
    } catch (err) {
        console.error('ステータス更新エラー:', err);
        alert('更新に失敗しました。');
    }
}

// ── モーダル開閉 ──
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
});

// ── CSV出力 ──
function exportCsv() {
    if (allBookings.length === 0) { alert('エクスポートするデータがありません。'); return; }
    const headers = ['予約番号','予約日','予約時間','氏名','ふりがな','生年月日','住所','電話番号','メール','初診/再診','保険証','症状','伝達事項','連絡方法','ステータス','登録日時'];
    const rows    = allBookings.map(b => [
        b.id, b.date, b.time, b.name, b.furigana, b.birthdate||'',
        b.address, b.phone, b.email||'', b.visitType, b.insurance,
        b.symptoms, b.notes||'', b.contactMethod, b.status,
        new Date(b.createdAt).toLocaleString('ja-JP'),
    ].map(v => `"${String(v).replace(/"/g,'""')}"`));
    const csv  = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const today = new Date().toISOString().slice(0,10);
    Object.assign(document.createElement('a'), { href:url, download:`予約データ_${today}.csv` }).click();
    URL.revokeObjectURL(url);
}

// ── ログアウト ──
function handleLogout() { logout(); }

// onclick から呼べるようにグローバル公開
Object.assign(window, {
    applyFilter, setStatusFilter, clearFilter,
    openDetail, updateStatus, openModal, closeModal,
    exportCsv, handleLogout,
});

// 初期化
startListening();
