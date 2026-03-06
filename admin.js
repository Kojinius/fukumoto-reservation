/* ===========================
   福元鍼灸整骨院 管理側ロジック
   =========================== */

// ── データ ──
function getBookings() {
    try { return JSON.parse(localStorage.getItem('fukumoto_bookings') || '[]'); } catch { return []; }
}
function saveBookings(data) { localStorage.setItem('fukumoto_bookings', JSON.stringify(data)); }

// ── フィルター状態 ──
let currentStatus = 'all';
let currentDate = '';
let currentSearch = '';

const STATUS_LABEL = {
    pending: '<span class="badge badge-pending">⚠ 未確認</span>',
    confirmed: '<span class="badge badge-confirmed">✓ 確認済み</span>',
    cancelled: '<span class="badge badge-cancelled">✕ キャンセル</span>',
};
const VISIT_BADGE = {
    '初診': '<span class="badge badge-new">初診</span>',
    '再診': '<span class="badge badge-return">再診</span>',
};
// ── KPI計算 ──
function updateKpi(all) {
    const today = new Date().toISOString().slice(0,10);
    const [cy, cm] = today.split('-');
    document.getElementById('kpiToday').textContent =
        all.filter(b => b.date === today && b.status !== 'cancelled').length + '件';
    document.getElementById('kpiMonth').textContent =
        all.filter(b => b.date?.startsWith(`${cy}-${cm}`) && b.status !== 'cancelled').length + '件';
    document.getElementById('kpiNew').textContent =
        all.filter(b => b.visitType === '初診' && b.date?.startsWith(`${cy}-${cm}`)).length + '名';
    document.getElementById('kpiPending').textContent =
        all.filter(b => b.status === 'pending').length + '件';
}

// ── テーブル描画 ──
function renderTable() {
    const all = getBookings();
    updateKpi(all);

    let data = [...all].sort((a, b) => {
        const dt = (x) => `${x.date} ${x.time}`;
        return dt(b).localeCompare(dt(a)); // 新しい順
    });

    if (currentStatus !== 'all') data = data.filter(b => b.status === currentStatus);
    if (currentDate) data = data.filter(b => b.date === currentDate);
    if (currentSearch) data = data.filter(b =>
        (b.name || '').includes(currentSearch) ||
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

// ── フィルター適用 ──
function applyFilter() {
    currentDate = document.getElementById('filterDate').value;
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
    currentStatus = 'all';
    currentDate = '';
    currentSearch = '';
    document.getElementById('filterDate').value = '';
    document.getElementById('searchInput').value = '';
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.filter-btn[data-status="all"]').classList.add('active');
    renderTable();
}

// ── 詳細モーダル ──
function openDetail(id) {
    const booking = getBookings().find(b => b.id === id);
    if (!booking) return;

    const rows = [
        ['予約番号', booking.id],
        ['予約日時', formatDateTimeJa(booking.date, booking.time)],
        ['氏名', booking.name],
        ['ふりがな', booking.furigana],
        ['生年月日', booking.birthdate || '-'],
        ['住所', booking.address],
        ['電話番号', booking.phone],
        ['メール', booking.email || '-'],
        ['初診/再診', booking.visitType],
        ['保険証', booking.insurance],
        ['症状', booking.symptoms],
        ['伝達事項', booking.notes || 'なし'],
        ['連絡方法', booking.contactMethod],
        ['ステータス', booking.status],
        ['登録日時', new Date(booking.createdAt).toLocaleString('ja-JP')],
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

function updateStatus(id, status) {
    const bookings = getBookings();
    const idx = bookings.findIndex(b => b.id === id);
    if (idx === -1) return;
    bookings[idx].status = status;
    saveBookings(bookings);
    closeModal('detailModal');
    renderTable();
}

// ── モーダル開閉 ──
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });
});

// ── メール設定 ──
function openMailSettings() {
    document.getElementById('adminEmailInput').value = localStorage.getItem('fukumoto_admin_email') || '';
    document.getElementById('adminNameInput').value = localStorage.getItem('fukumoto_admin_name') || '';
    openModal('mailModal');
}
function saveMailSettings() {
    const email = document.getElementById('adminEmailInput').value.trim();
    const name = document.getElementById('adminNameInput').value.trim();
    localStorage.setItem('fukumoto_admin_email', email);
    localStorage.setItem('fukumoto_admin_name', name);
    closeModal('mailModal');
    alert('メール設定を保存しました。');
}

// ── CSV出力 ──
function exportCsv() {
    const bookings = getBookings();
    if (bookings.length === 0) { alert('エクスポートするデータがありません。'); return; }

    const headers = ['予約番号','予約日','予約時間','氏名','ふりがな','生年月日','住所','電話番号','メール','初診/再診','保険証','症状','伝達事項','連絡方法','ステータス','登録日時'];
    const rows = bookings.map(b => [
        b.id, b.date, b.time, b.name, b.furigana, b.birthdate||'',
        b.address, b.phone, b.email||'', b.visitType, b.insurance,
        b.symptoms, b.notes||'', b.contactMethod, b.status,
        new Date(b.createdAt).toLocaleString('ja-JP'),
    ].map(v => `"${String(v).replace(/"/g,'""')}"`));

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().slice(0,10);
    const a = Object.assign(document.createElement('a'), { href: url, download: `予約データ_${today}.csv` });
    a.click();
    URL.revokeObjectURL(url);
}

// ── デモデータ投入（初回のみ） ──
function seedDemoData() {
    if (getBookings().length > 0) return;
    const today = new Date();
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const next = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return d; };

    const demos = [
        { name:'山田 花子', furigana:'やまだ はなこ', birthdate:'1985-03-15', address:'大阪府大阪市北区梅田1-1-1', phone:'090-1234-5678', email:'hanako@example.com', visitType:'初診', insurance:'あり', symptoms:'腰痛・肩こり', notes:'', contactMethod:'メール', date: fmt(next(1)), time:'9:30', status:'pending' },
        { name:'鈴木 次郎', furigana:'すずき じろう', birthdate:'1972-08-20', address:'大阪府吹田市千里山1-2-3', phone:'080-9876-5432', email:'', visitType:'再診', insurance:'あり', symptoms:'膝の痛み', notes:'歩行困難気味', contactMethod:'電話', date: fmt(next(1)), time:'10:00', status:'confirmed' },
        { name:'佐藤 美咲', furigana:'さとう みさき', birthdate:'1990-12-05', address:'兵庫県神戸市中央区元町1-2-3', phone:'070-1111-2222', email:'misaki@example.com', visitType:'初診', insurance:'なし', symptoms:'首・肩の凝り、頭痛', notes:'', contactMethod:'メール', date: fmt(next(2)), time:'14:00', status:'pending' },
        { name:'田中 健一', furigana:'たなか けんいち', birthdate:'1965-06-10', address:'大阪府堺市南区1-3-5', phone:'090-3333-4444', email:'', visitType:'再診', insurance:'あり', symptoms:'交通事故後の腰の痛み', notes:'むち打ち症', contactMethod:'電話', date: fmt(next(3)), time:'15:30', status:'confirmed' },
        { name:'中村 真由子', furigana:'なかむら まゆこ', birthdate:'2001-02-28', address:'大阪府東大阪市吉田2-4-6', phone:'080-5555-6666', email:'mayu@example.com', visitType:'初診', insurance:'あり', symptoms:'ランニング後の足首の痛み', notes:'', contactMethod:'メール', date: fmt(next(0)), time:'11:00', status:'pending' },
    ].map((b, i) => ({ ...b, id: `FK-DEMO-${i+1}`, createdAt: new Date(Date.now() - i * 3600000).toISOString() }));

    saveBookings(demos);
}

// ── 初期化 ──
(function init() {
    seedDemoData();
    renderTable();
})();
