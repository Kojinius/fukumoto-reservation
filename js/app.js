import { db } from "./firebase.js";
import {
    collection, doc, setDoc, getDocs,
    query, where, runTransaction,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { esc, DAY_NAMES, formatDate, formatDateJa } from "./utils.js";

/* ===========================
   福元鍼灸整骨院 患者側予約ロジック
   =========================== */

// ── 営業時間定義 ──
// 0=日 1=月 2=火 3=水 4=木 5=金 6=土
const BUSINESS_HOURS = {
    1: { am: ['9:00','9:30','10:00','10:30','11:00','11:30'], pm: ['14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30'] },
    2: { am: ['9:00','9:30','10:00','10:30','11:00','11:30'], pm: ['14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30'] },
    3: { am: ['9:00','9:30','10:00','10:30','11:00','11:30'], pm: ['14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30'] },
    4: { am: ['9:00','9:30','10:00','10:30','11:00','11:30'], pm: ['14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30'] },
    5: { am: ['9:00','9:30','10:00','10:30','11:00','11:30'], pm: ['14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30'] },
    6: { am: ['9:00','9:30','10:00','10:30','11:00','11:30'], pm: ['14:00','14:30','15:00','15:30','16:00','16:00'] },
};

// ── カレンダー状態 ──
const today = new Date();
today.setHours(0,0,0,0);
let calYear  = today.getFullYear();
let calMonth = today.getMonth();
let selectedDate = null;
let selectedTime = null;
let cachedBookedSlots = [];

// ── Firestore：選択日の予約済みスロット取得 ──
async function fetchBookedSlots(dateStr) {
    const q    = query(collection(db, 'reservations'), where('date', '==', dateStr));
    const snap = await getDocs(q);
    return snap.docs
        .map(d => d.data())
        .filter(b => b.status !== 'cancelled')
        .map(b => b.time);
}

// ── カレンダー描画 ──
function renderCalendar() {
    document.getElementById('calMonthLabel').textContent = `${calYear}年${calMonth + 1}月`;
    const firstDay    = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const cells       = document.getElementById('calCells');
    cells.innerHTML   = '';

    for (let i = 0; i < firstDay; i++) {
        const e = document.createElement('div');
        e.className = 'cal-cell empty';
        cells.appendChild(e);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const date       = new Date(calYear, calMonth, d);
        const dow        = date.getDay();
        const isDisabled = date < today || dow === 0 || !BUSINESS_HOURS[dow];
        const isToday    = date.getTime() === today.getTime();
        const isSel      = selectedDate && date.getTime() === selectedDate.getTime();

        let cls = 'cal-cell';
        if (dow === 0) cls += ' sun';
        else if (dow === 6) cls += ' sat';
        if (isDisabled) cls += ' disabled';
        if (isToday)    cls += ' today';
        if (isSel)      cls += ' selected';

        const cell = document.createElement('div');
        cell.className   = cls;
        cell.textContent = d;
        if (!isDisabled) cell.addEventListener('click', () => selectDate(date));
        cells.appendChild(cell);
    }
}

// ── 日付選択（Firestore から予約済みスロット取得）──
async function selectDate(date) {
    selectedDate = date;
    selectedTime = null;
    document.getElementById('nextBtnWrap').style.display = 'none';
    document.getElementById('selectedDatetimeBox').classList.remove('visible');
    renderCalendar();

    const dow      = date.getDay();
    const dayLabel = `${date.getMonth()+1}月${date.getDate()}日（${DAY_NAMES[dow]}）`;
    document.getElementById('slotDateLabel').textContent = `${dayLabel} の予約`;
    document.getElementById('slotArea').innerHTML = '<p style="color:var(--text-muted);font-size:13px;">読み込み中...</p>';
    document.getElementById('slotCountBadge').style.display = 'none';

    cachedBookedSlots = await fetchBookedSlots(formatDate(date));
    renderTimeSlots();
}

// ── 今日の過去スロット判定 ──
function isPastSlot(timeStr) {
    const now     = new Date();
    const isToday = formatDate(selectedDate) === formatDate(now);
    if (!isToday) return false;
    const [h, m]      = timeStr.split(':').map(Number);
    const slotMinutes = h * 60 + m;
    const nowMinutes  = now.getHours() * 60 + now.getMinutes();
    return slotMinutes <= nowMinutes;
}

// ── 時間スロット描画 ──
function renderTimeSlots() {
    if (!selectedDate) return;
    const dow   = selectedDate.getDay();
    const hours = BUSINESS_HOURS[dow];
    if (!hours) return;

    const available = [...hours.am, ...hours.pm]
        .filter(t => !cachedBookedSlots.includes(t) && !isPastSlot(t));
    document.getElementById('slotCountBadge').textContent   = `残り${available.length}枠`;
    document.getElementById('slotCountBadge').style.display = available.length > 0 ? 'inline-flex' : 'none';

    const buildSlotBtn = (t) => {
        const booked  = cachedBookedSlots.includes(t);
        const past    = !booked && isPastSlot(t);
        const sel     = t === selectedTime;
        const cls     = `time-slot${booked ? ' booked' : ''}${past ? ' past' : ''}${sel ? ' selected' : ''}`;
        const handler = booked || past ? '' : `onclick="selectTime('${t}')"`;
        return `<button class="${cls}" ${booked || past ? 'disabled' : ''} ${handler}>${t}</button>`;
    };

    let html = '';
    if (hours.am.length) {
        html += `<div class="time-section"><div class="time-section-label">午前</div><div class="time-slots">`;
        html += hours.am.map(buildSlotBtn).join('');
        html += `</div></div>`;
    }
    if (hours.pm.length) {
        html += `<div class="time-section"><div class="time-section-label">午後</div><div class="time-slots">`;
        html += hours.pm.map(buildSlotBtn).join('');
        html += `</div></div>`;
    }
    document.getElementById('slotArea').innerHTML = html;
}

// ── 時間選択 ──
function selectTime(time) {
    if (isPastSlot(time)) return;
    selectedTime = time;
    const dow      = selectedDate.getDay();
    const dayLabel = `${selectedDate.getMonth()+1}月${selectedDate.getDate()}日（${DAY_NAMES[dow]}）`;
    document.getElementById('selectedDatetimeText').textContent = `${dayLabel} ${time}〜`;
    document.getElementById('selectedDatetimeBox').classList.add('visible');
    document.getElementById('nextBtnWrap').style.display = 'block';
    renderTimeSlots();
}

// ── ステップ遷移 ──
function goToStep2() {
    if (!selectedDate || !selectedTime) { alert('日付と時間を選択してください。'); return; }
    setStep(2);
}
function goToStep1() { setStep(1); }
function goToStep3() { if (!validateForm()) return; fillConfirmation(); setStep(3); }

function setStep(n) {
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`step${i}`).classList.toggle('active', i === n);
        document.getElementById(`stepNum${i}`).className = 'step-num'   + (i < n ? ' done' : i === n ? ' active' : '');
        document.getElementById(`stepLbl${i}`).className = 'step-label' + (i < n ? ' done' : i === n ? ' active' : '');
        if (i < 4) {
            const sep = document.getElementById(`stepSep${i}`);
            if (sep) sep.className = 'step-sep' + (i < n ? ' done' : '');
        }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── フォームバリデーション ──
function validateForm() {
    const required = [
        { id: 'name',      label: '氏名' },
        { id: 'furigana',  label: 'ふりがな' },
        { id: 'birthdate', label: '生年月日' },
        { id: 'address',   label: '住所' },
        { id: 'phone',     label: '電話番号' },
        { id: 'symptoms',  label: '症状・お悩み' },
    ];
    for (const f of required) {
        const el = document.getElementById(f.id);
        if (!el.value.trim()) { alert(`「${f.label}」を入力してください。`); el.focus(); return false; }
    }
    return true;
}

// ── 確認画面へデータ反映 ──
function fillConfirmation() {
    const dow      = selectedDate.getDay();
    const dayLabel = `${selectedDate.getMonth()+1}月${selectedDate.getDate()}日（${DAY_NAMES[dow]}）`;
    document.getElementById('confirmDatetime').textContent    = `📅 ${dayLabel} ${selectedTime}〜`;
    document.getElementById('c-name').textContent            = document.getElementById('name').value;
    document.getElementById('c-furigana').textContent        = document.getElementById('furigana').value;
    const bd = document.getElementById('birthdate').value;
    document.getElementById('c-birthdate').textContent       = bd ? formatDateJa(bd) : '-';
    document.getElementById('c-address').textContent         = document.getElementById('address').value;
    document.getElementById('c-phone').textContent           = document.getElementById('phone').value;
    document.getElementById('c-email').textContent           = document.getElementById('email').value || '-';
    document.getElementById('c-visitType').textContent       = document.querySelector('input[name="visitType"]:checked')?.value || '-';
    document.getElementById('c-insurance').textContent       = document.querySelector('input[name="insurance"]:checked')?.value || '-';
    document.getElementById('c-symptoms').textContent        = document.getElementById('symptoms').value;
    document.getElementById('c-notes').textContent           = document.getElementById('notes').value || 'なし';
    document.getElementById('c-contactMethod').textContent   = document.querySelector('input[name="contactMethod"]:checked')?.value || '-';
}

// ── 予約確定（Firestore + トランザクションで二重予約防止）──
async function submitReservation() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.remove('hidden');

    const dateStr = formatDate(selectedDate);
    const slotId  = `${dateStr}_${selectedTime.replace(':', '')}`;

    const reservationRef = doc(collection(db, 'reservations'));
    const booking = {
        id:            reservationRef.id,
        date:          dateStr,
        time:          selectedTime,
        name:          document.getElementById('name').value,
        furigana:      document.getElementById('furigana').value,
        birthdate:     document.getElementById('birthdate').value,
        address:       document.getElementById('address').value,
        phone:         document.getElementById('phone').value,
        email:         document.getElementById('email').value,
        visitType:     document.querySelector('input[name="visitType"]:checked')?.value,
        insurance:     document.querySelector('input[name="insurance"]:checked')?.value,
        symptoms:      document.getElementById('symptoms').value,
        notes:         document.getElementById('notes').value,
        contactMethod: document.querySelector('input[name="contactMethod"]:checked')?.value,
        status:        'pending',
        createdAt:     new Date().toISOString(),
    };

    try {
        const slotRef = doc(db, 'slots', slotId);
        await runTransaction(db, async (tx) => {
            const slotSnap = await tx.get(slotRef);
            if (slotSnap.exists() && slotSnap.data().status !== 'cancelled') {
                throw new Error('SLOT_TAKEN');
            }
            tx.set(slotRef, {
                date: dateStr, time: selectedTime,
                reservationId: reservationRef.id, status: 'pending',
            });
            tx.set(reservationRef, booking);
        });

        // 確認メール（非同期・失敗しても予約は完了扱い）
        if (booking.email) {
            fetch('https://sendreservationemail-po3aztuimq-uc.a.run.app', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: booking.email, name: booking.name,
                    date: booking.date, time: booking.time,
                    menu: booking.visitType || '診療',
                }),
            }).catch(e => console.warn('メール送信エラー:', e));
        }

        window._lastBooking = booking; // PDF出力用
        overlay.classList.add('hidden');

        const dow      = selectedDate.getDay();
        const dayLabel = `${selectedDate.getMonth()+1}月${selectedDate.getDate()}日（${DAY_NAMES[dow]}）`;
        document.getElementById('bookingNumberDisplay').textContent  = `予約番号: ${booking.id}`;
        document.getElementById('bookingSummaryDisplay').textContent = `${dayLabel} ${booking.time}〜 / ${booking.name}様`;
        setStep(4);
        selectedDate = null; selectedTime = null; cachedBookedSlots = [];

    } catch (err) {
        overlay.classList.add('hidden');
        if (err.message === 'SLOT_TAKEN') {
            alert('この時間はすでに予約が入っています。別の時間を選択してください。');
            cachedBookedSlots = await fetchBookedSlots(dateStr);
            renderTimeSlots();
            setStep(1);
        } else {
            console.error('予約エラー:', err);
            alert('予約の送信に失敗しました。もう一度お試しください。');
        }
    }
}

// ── 新しい予約 ──
function newReservation() {
    document.getElementById('reservationForm').reset();
    document.querySelectorAll('.radio-label').forEach(el => el.classList.remove('checked'));
    ['visitType','insurance','contactMethod'].forEach(name => {
        const first = document.querySelector(`input[name="${name}"]`);
        if (first) { first.checked = true; first.closest('.radio-label').classList.add('checked'); }
    });
    selectedDate = null; selectedTime = null; cachedBookedSlots = [];
    document.getElementById('nextBtnWrap').style.display = 'none';
    document.getElementById('selectedDatetimeBox').classList.remove('visible');
    document.getElementById('slotArea').innerHTML = '<p style="color:var(--text-muted);font-size:13px;">カレンダーから希望の日付を選択してください。</p>';
    document.getElementById('slotDateLabel').textContent = '日付を選択してください';
    setStep(1);
    renderCalendar();
}

// ── PDF出力 ──
async function exportPdf() {
    const booking = window._lastBooking;
    if (!booking) return;
    try {
        const { PDFDocument, rgb, StandardFonts } = PDFLib;
        const pdfDoc  = await PDFDocument.create();
        const page    = pdfDoc.addPage([595.28, 420]);
        const { width, height } = page.getSize();
        const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        page.drawRectangle({ x:0, y:0, width, height, color:rgb(0.99,0.94,0.87) });
        page.drawRectangle({ x:0, y:height-60, width, height:60, color:rgb(0.45,0.34,0.39) });
        page.drawText('Fukumoto Acupuncture Clinic', { x:30, y:height-28, size:14, font:fontBold, color:rgb(1,1,1) });
        page.drawText('Reservation Ticket',           { x:30, y:height-46, size:10, font, color:rgb(0.97,0.95,0.87) });
        page.drawText(booking.id,                     { x:width-150, y:height-36, size:10, font, color:rgb(0.97,0.57,0.13) });
        page.drawRectangle({ x:28, y:height-105, width:width-56, height:36, color:rgb(0.97,0.57,0.13), borderRadius:6 });
        page.drawText(`${booking.date} ${booking.time}~`, { x:40, y:height-93, size:14, font:fontBold, color:rgb(1,1,1) });

        const rows = [
            ['Name / Furigana', `${booking.name}  (${booking.furigana})`],
            ['Birthdate',  booking.birthdate || '-'], ['Address',    booking.address],
            ['Phone',      booking.phone],             ['Email',      booking.email || '-'],
            ['Visit Type', booking.visitType],         ['Insurance',  booking.insurance],
            ['Symptoms',   booking.symptoms],
        ];
        let y = height - 130;
        rows.forEach(([lbl, val]) => {
            page.drawText(lbl, { x:40, y, size:8, font, color:rgb(0.55,0.45,0.33) });
            const v = val.length > 60 ? val.substring(0,60)+'...' : val;
            page.drawText(v,   { x:160, y, size:10, font:fontBold, color:rgb(0.24,0.17,0.12) });
            y -= 22;
        });
        page.drawLine({ start:{x:28,y:50}, end:{x:width-28,y:50}, thickness:0.5, color:rgb(0.87,0.79,0.72) });
        page.drawText('Tel: 0120-XXX-XXX  |  Mon-Fri 9:00-19:30  /  Sat 9:00-17:00  /  Sun & Holidays: Closed',
            { x:40, y:36, size:8, font, color:rgb(0.55,0.45,0.33) });

        const bytes = await pdfDoc.save();
        const blob  = new Blob([bytes], { type:'application/pdf' });
        const url   = URL.createObjectURL(blob);
        Object.assign(document.createElement('a'), { href:url, download:`予約票_${booking.id}.pdf` }).click();
        URL.revokeObjectURL(url);
    } catch (e) { console.error('PDF生成エラー:', e); alert('PDFの生成に失敗しました。'); }
}

// ── 年齢自動計算 ──
document.getElementById('birthdate').addEventListener('change', function () {
    const bd = new Date(this.value);
    if (isNaN(bd.getTime())) { document.getElementById('ageDisplay').textContent = '-'; return; }
    const now = new Date();
    let age = now.getFullYear() - bd.getFullYear();
    if (now.getMonth() < bd.getMonth() || (now.getMonth() === bd.getMonth() && now.getDate() < bd.getDate())) age--;
    document.getElementById('ageDisplay').textContent = `${age} 歳`;
});

// ── ラジオボタンのスタイル制御 ──
document.querySelectorAll('.radio-group').forEach(group => {
    group.querySelectorAll('.radio-label').forEach(label => {
        label.addEventListener('click', function () {
            group.querySelectorAll('.radio-label').forEach(l => l.classList.remove('checked'));
            this.classList.add('checked');
        });
    });
});

// ── カレンダーナビゲーション ──
document.getElementById('prevMonth').addEventListener('click', () => {
    calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar();
});
document.getElementById('nextMonth').addEventListener('click', () => {
    calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar();
});

// onclick から呼べるようにグローバル公開
Object.assign(window, { goToStep1, goToStep2, goToStep3, selectTime, submitReservation, newReservation, exportPdf });

// 初期化
renderCalendar();
