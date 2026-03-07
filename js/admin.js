import { db } from "./firebase.js";
import { requireAdmin, logout } from "./auth.js";
import {
    collection, doc, updateDoc, onSnapshot,
    query, orderBy, writeBatch, getDoc, setDoc,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { esc, DAY_NAMES, formatDateTimeJa } from "./utils.js";

/* ===========================
   福元鍼灸整骨院 管理側ロジック
   =========================== */

// ── 認証ガード ──
await requireAdmin();

// ── システム設定 ──
let currentSettings = {};

async function loadSettings() {
    const snap = await getDoc(doc(db, 'settings', 'clinic'));
    if (snap.exists()) currentSettings = snap.data();
}

function openSettings() {
    document.getElementById('settingClinicName').value    = currentSettings.clinicName    || '';
    document.getElementById('settingPhone').value         = currentSettings.phone         || '';
    document.getElementById('settingBookingCutoff').value = currentSettings.bookingCutoffMinutes ?? '';
    document.getElementById('settingCancelCutoff').value  = currentSettings.cancelCutoffMinutes  ?? '';
    document.getElementById('settingPrivacyPolicy').value = currentSettings.privacyPolicy  || '';
    pendingHolidays     = [...(currentSettings.holidays     || [])];
    pendingHolidayNames = { ...(currentSettings.holidayNames || {}) };
    renderBizHoursTable();
    const now = new Date();
    holidayCalYear  = now.getFullYear();
    holidayCalMonth = now.getMonth();
    renderHolidayCal();
    updateHolidayCount();
    renderHolidayList();
    switchSettingsTab('Clinic', document.querySelector('.settings-tab'));
    openModal('settingsModal');
}

function validateBizHours() {
    const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    for (let d = 0; d <= 6; d++) {
        const open   = document.getElementById(`bhOpen_${d}`).checked;
        if (!open) continue;
        const amOpen = document.getElementById(`bhAmOpen_${d}`)?.checked;
        const pmOpen = document.getElementById(`bhPmOpen_${d}`)?.checked;
        const label  = ['日','月','火','水','木','金','土'][d];
        if (amOpen) {
            const s = document.getElementById(`bhAmStart_${d}`).value;
            const e = document.getElementById(`bhAmEnd_${d}`).value;
            if (toMin(s) >= toMin(e)) return `${label}曜 午前：開始時刻（${s}）が終了時刻（${e}）以降になっています。`;
        }
        if (pmOpen) {
            const s = document.getElementById(`bhPmStart_${d}`).value;
            const e = document.getElementById(`bhPmEnd_${d}`).value;
            if (toMin(s) >= toMin(e)) return `${label}曜 午後：開始時刻（${s}）が終了時刻（${e}）以降になっています。`;
        }
        if (!amOpen && !pmOpen) return `${label}曜日は営業日ですが、午前・午後のどちらかを有効にしてください。`;
    }
    return null;
}

async function saveSettings() {
    const btn = document.getElementById('saveSettingsBtn');
    const err = validateBizHours();
    if (err) { alert(`【営業時間エラー】\n${err}`); return; }
    btn.disabled = true; btn.textContent = '保存中...';
    try {
        const data = {
            clinicName:            document.getElementById('settingClinicName').value.trim(),
            phone:                 document.getElementById('settingPhone').value.trim(),
            bookingCutoffMinutes:  Number(document.getElementById('settingBookingCutoff').value) || 0,
            cancelCutoffMinutes:   Number(document.getElementById('settingCancelCutoff').value)  || 0,
            privacyPolicy:         document.getElementById('settingPrivacyPolicy').value.trim(),
            holidays:              pendingHolidays,
            holidayNames:          pendingHolidayNames,
            businessHours:         getBizHoursFromForm(),
            updatedAt:             new Date().toISOString(),
        };
        await setDoc(doc(db, 'settings', 'clinic'), data, { merge: true });
        currentSettings = { ...currentSettings, ...data };
        closeModal('settingsModal');
        alert('設定を保存しました。');
    } catch (err) {
        console.error('設定保存エラー:', err);
        alert('保存に失敗しました。');
    } finally {
        btn.disabled = false; btn.textContent = '保存';
    }
}

function switchSettingsTab(name, btn) {
    document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab' + name).classList.add('active');
}

// ── 休日カレンダー ──
let pendingHolidays     = [];
let pendingHolidayNames = {}; // { 'YYYY-MM-DD': '祝日名' }
let holidayCalYear      = new Date().getFullYear();
let holidayCalMonth     = new Date().getMonth();

function getWeekdayOpenStateFromForm() {
    const state = {};
    for (let d = 0; d <= 6; d++) {
        const el = document.getElementById(`bhOpen_${d}`);
        if (el) {
            state[d] = el.checked;
        } else {
            const bh = currentSettings.businessHours || DEFAULT_BIZ_HOURS;
            state[d] = !!(bh[String(d)]?.open);
        }
    }
    return state;
}

function renderHolidayCal() {
    document.getElementById('holidayCalLabel').textContent = `${holidayCalYear}年${holidayCalMonth + 1}月`;
    const firstDay    = new Date(holidayCalYear, holidayCalMonth, 1).getDay();
    const daysInMonth = new Date(holidayCalYear, holidayCalMonth + 1, 0).getDate();
    const cells       = document.getElementById('holidayCalCells');
    cells.innerHTML   = '';
    const weekdayOpen = getWeekdayOpenStateFromForm();

    for (let i = 0; i < firstDay; i++) {
        const e = document.createElement('div');
        e.className = 'cal-cell empty';
        cells.appendChild(e);
    }
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${holidayCalYear}-${String(holidayCalMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const dow     = new Date(holidayCalYear, holidayCalMonth, d).getDay();
        const isHoliday       = pendingHolidays.includes(dateStr);
        const isWeekdayClosed = !weekdayOpen[dow];
        let cls = 'cal-cell';
        if (dow === 0) cls += ' sun';
        if (dow === 6) cls += ' sat';
        if (isHoliday) cls += ' holiday';
        else if (isWeekdayClosed) cls += ' weekday-closed';
        const cell = document.createElement('div');
        cell.className   = cls;
        cell.textContent = d;
        cell.style.fontSize = '12px';
        if (pendingHolidayNames[dateStr]) cell.title = pendingHolidayNames[dateStr];
        if (isWeekdayClosed && !isHoliday) {
            cell.title = `${['日','月','火','水','木','金','土'][dow]}曜日は休診`;
        }
        cell.addEventListener('click', () => toggleHoliday(dateStr));
        cells.appendChild(cell);
    }
}

function toggleHoliday(dateStr) {
    const idx = pendingHolidays.indexOf(dateStr);
    if (idx >= 0) {
        pendingHolidays.splice(idx, 1);
    } else {
        pendingHolidays.push(dateStr);
        pendingHolidays.sort();
    }
    renderHolidayCal();
    updateHolidayCount();
    renderHolidayList();
}

function updateHolidayCount() {
    document.getElementById('holidayCount').textContent = `${pendingHolidays.length}日 設定中`;
}

function renderHolidayList() {
    const el = document.getElementById('holidayList');
    if (pendingHolidays.length === 0) {
        el.innerHTML = '<p style="font-size:12px;color:var(--text-muted);">設定された休日はありません。</p>';
        return;
    }
    el.innerHTML = pendingHolidays.map(d => {
        const [y, m, day] = d.split('-').map(Number);
        const dow  = ['日','月','火','水','木','金','土'][new Date(y, m - 1, day).getDay()];
        const name = pendingHolidayNames[d] ? `<span style="color:var(--orange);margin-left:6px;font-size:11px;">${pendingHolidayNames[d]}</span>` : '';
        return `<div class="holiday-item">
            <span>${y}年${m}月${day}日（${dow}）${name}</span>
            <button class="holiday-item-remove" onclick="toggleHoliday('${d}')">×</button>
        </div>`;
    }).join('');
}

// ── 営業時間設定 ──
const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

const DEFAULT_BIZ_HOURS = {
    '1': { open: true, amOpen: true, amStart: '9:00', amEnd: '11:30', pmOpen: true, pmStart: '14:00', pmEnd: '19:30' },
    '2': { open: true, amOpen: true, amStart: '9:00', amEnd: '11:30', pmOpen: true, pmStart: '14:00', pmEnd: '19:30' },
    '3': { open: true, amOpen: true, amStart: '9:00', amEnd: '11:30', pmOpen: true, pmStart: '14:00', pmEnd: '19:30' },
    '4': { open: true, amOpen: true, amStart: '9:00', amEnd: '11:30', pmOpen: true, pmStart: '14:00', pmEnd: '19:30' },
    '5': { open: true, amOpen: true, amStart: '9:00', amEnd: '11:30', pmOpen: true, pmStart: '14:00', pmEnd: '19:30' },
    '6': { open: true, amOpen: true, amStart: '9:00', amEnd: '11:30', pmOpen: true, pmStart: '14:00', pmEnd: '17:00' },
};

function genTimeOptions(fromH, fromM, toH, toM) {
    const opts = [];
    for (let h = fromH; h <= toH; h++) {
        for (let m = 0; m < 60; m += 30) {
            if (h === fromH && m < fromM) continue;
            if (h === toH && m > toM) break;
            opts.push(`${h}:${String(m).padStart(2, '0')}`);
        }
    }
    return opts;
}

const AM_TIMES = genTimeOptions(7, 0, 12, 0);
const PM_TIMES = genTimeOptions(12, 30, 22, 0);

function buildTimeSelect(id, value, disabled, times) {
    const opts = times.map(t =>
        `<option value="${t}"${t === value ? ' selected' : ''}>${t}</option>`
    ).join('');
    return `<select id="${id}" class="biz-hours-select"${disabled ? ' disabled' : ''}>${opts}</select>`;
}

function renderBizHoursTable() {
    const bh = currentSettings.businessHours || DEFAULT_BIZ_HOURS;
    let html = `<thead><tr>
        <th>曜日</th><th>営業</th>
        <th colspan="4" style="color:var(--brown);text-align:center;">午前</th>
        <th colspan="4" style="color:var(--brown);text-align:center;">午後</th>
    </tr></thead><tbody>`;

    for (let d = 0; d <= 6; d++) {
        const key    = String(d);
        const day    = bh[key] || { open: false };
        const open   = !!day.open;
        const amOpen = open && (day.amOpen !== false);
        const pmOpen = open && (day.pmOpen !== false);
        html += `<tr class="${open ? '' : 'biz-closed-row'}">
            <td><strong style="color:${d===0?'var(--red)':d===6?'var(--blue)':'var(--text-primary)'}">${DOW_LABELS[d]}</strong></td>
            <td><input type="checkbox" id="bhOpen_${d}" ${open ? 'checked' : ''} onchange="toggleBizDay(${d})"></td>
            <td style="white-space:nowrap;"><input type="checkbox" id="bhAmOpen_${d}" ${amOpen ? 'checked' : ''} ${!open ? 'disabled' : ''} onchange="toggleBizAmPm(${d},'am')"><label for="bhAmOpen_${d}" style="font-size:10px;color:var(--text-muted);margin-left:2px;">午前</label></td>
            <td>${buildTimeSelect(`bhAmStart_${d}`, day.amStart || '9:00',  !amOpen, AM_TIMES)}</td>
            <td style="font-size:10px;color:var(--text-muted);">〜</td>
            <td>${buildTimeSelect(`bhAmEnd_${d}`,   day.amEnd   || '11:30', !amOpen, AM_TIMES)}</td>
            <td style="white-space:nowrap;"><input type="checkbox" id="bhPmOpen_${d}" ${pmOpen ? 'checked' : ''} ${!open ? 'disabled' : ''} onchange="toggleBizAmPm(${d},'pm')"><label for="bhPmOpen_${d}" style="font-size:10px;color:var(--text-muted);margin-left:2px;">午後</label></td>
            <td>${buildTimeSelect(`bhPmStart_${d}`, day.pmStart || '14:00', !pmOpen, PM_TIMES)}</td>
            <td style="font-size:10px;color:var(--text-muted);">〜</td>
            <td>${buildTimeSelect(`bhPmEnd_${d}`,   day.pmEnd   || '19:30', !pmOpen, PM_TIMES)}</td>
        </tr>`;
    }
    html += '</tbody>';
    document.getElementById('bizHoursTable').innerHTML = html;
}

function toggleBizDay(d) {
    const open   = document.getElementById(`bhOpen_${d}`).checked;
    const row    = document.getElementById(`bhOpen_${d}`).closest('tr');
    row.className = open ? '' : 'biz-closed-row';

    const amCb = document.getElementById(`bhAmOpen_${d}`);
    const pmCb = document.getElementById(`bhPmOpen_${d}`);
    if (amCb) amCb.disabled = !open;
    if (pmCb) pmCb.disabled = !open;

    const amOpen = open && (amCb ? amCb.checked : true);
    const pmOpen = open && (pmCb ? pmCb.checked : true);
    ['bhAmStart', 'bhAmEnd'].forEach(id => {
        const el = document.getElementById(`${id}_${d}`);
        if (el) el.disabled = !amOpen;
    });
    ['bhPmStart', 'bhPmEnd'].forEach(id => {
        const el = document.getElementById(`${id}_${d}`);
        if (el) el.disabled = !pmOpen;
    });
    renderHolidayCal();
}

function toggleBizAmPm(d, period) {
    if (period === 'am') {
        const amOpen = document.getElementById(`bhAmOpen_${d}`).checked;
        ['bhAmStart', 'bhAmEnd'].forEach(id => {
            const el = document.getElementById(`${id}_${d}`);
            if (el) el.disabled = !amOpen;
        });
    } else {
        const pmOpen = document.getElementById(`bhPmOpen_${d}`).checked;
        ['bhPmStart', 'bhPmEnd'].forEach(id => {
            const el = document.getElementById(`${id}_${d}`);
            if (el) el.disabled = !pmOpen;
        });
    }
}

function getBizHoursFromForm() {
    const bh = {};
    for (let d = 0; d <= 6; d++) {
        const open   = document.getElementById(`bhOpen_${d}`).checked;
        const amOpen = open && (document.getElementById(`bhAmOpen_${d}`)?.checked ?? true);
        const pmOpen = open && (document.getElementById(`bhPmOpen_${d}`)?.checked ?? true);
        bh[String(d)] = open ? {
            open:    true,
            amOpen,
            amStart: document.getElementById(`bhAmStart_${d}`).value,
            amEnd:   document.getElementById(`bhAmEnd_${d}`).value,
            pmOpen,
            pmStart: document.getElementById(`bhPmStart_${d}`).value,
            pmEnd:   document.getElementById(`bhPmEnd_${d}`).value,
        } : { open: false };
    }
    return bh;
}

function prevHolidayCal() {
    holidayCalMonth--;
    if (holidayCalMonth < 0) { holidayCalMonth = 11; holidayCalYear--; }
    renderHolidayCal();
}

function nextHolidayCal() {
    holidayCalMonth++;
    if (holidayCalMonth > 11) { holidayCalMonth = 0; holidayCalYear++; }
    renderHolidayCal();
}

function clearAllHolidays() {
    if (!confirm(`設定済みの休日（${pendingHolidays.length}日）をすべて削除しますか？`)) return;
    pendingHolidays     = [];
    pendingHolidayNames = {};
    renderHolidayCal();
    updateHolidayCount();
    renderHolidayList();
}

async function fetchHolidays() {
    const btn = document.getElementById('fetchHolidaysBtn');
    btn.disabled = true; btn.textContent = '取得中...';
    try {
        const currentYear = new Date().getFullYear();
        const results = await Promise.all(
            [currentYear, currentYear + 1].map(y =>
                fetch(`https://holidays-jp.github.io/api/v1/${y}/date.json`).then(r => r.json())
            )
        );
        results.forEach(obj => Object.assign(pendingHolidayNames, obj));
        const newHolidays = results.flatMap(obj => Object.keys(obj));
        pendingHolidays = [...new Set([...pendingHolidays, ...newHolidays])].sort();
        renderHolidayCal();
        updateHolidayCount();
        renderHolidayList();
    } catch (e) {
        console.error('祝日取得エラー:', e);
        alert('祝日の取得に失敗しました。ネットワーク接続をご確認ください。');
    } finally {
        btn.disabled = false; btn.textContent = '祝日を自動取得（今年・来年）';
    }
}

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
        ['性別',     booking.gender || '-'],
        ['初診/再診', booking.visitType],
        ['保険証',   booking.insurance],
        ['症状',     booking.symptoms],
        ['伝達事項', booking.notes || 'なし'],
        ['連絡方法', booking.contactMethod],
        ['ステータス', { pending: '未確認', confirmed: '確認済み', cancelled: 'キャンセル' }[booking.status] || booking.status],
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
    const headers = ['予約番号','予約日','予約時間','氏名','ふりがな','生年月日','住所','電話番号','メール','性別','初診/再診','保険証','症状','伝達事項','連絡方法','ステータス','登録日時'];
    const rows    = allBookings.map(b => [
        b.id, b.date, b.time, b.name, b.furigana, b.birthdate||'',
        b.address, b.phone, b.email||'', b.gender||'', b.visitType, b.insurance,
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
    openSettings, saveSettings, switchSettingsTab,
    prevHolidayCal, nextHolidayCal, fetchHolidays, toggleHoliday, clearAllHolidays,
    toggleBizDay, toggleBizAmPm,
});

// 初期化
await loadSettings();
startListening();
