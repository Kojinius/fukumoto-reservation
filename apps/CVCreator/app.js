// app.js — 職務経歴書作成アプリ
const STORAGE_KEY = 'shokumukeirekisho_v2';

// フォーム要素
const form = document.getElementById('cv-form');
const careerList = document.getElementById('career-list');
const skillList = document.getElementById('skill-list');
const btnAddCareer = document.getElementById('btn-add-career');
const btnAddSkill = document.getElementById('btn-add-skill');
const btnReset = document.getElementById('btn-reset');
const btnSavePdf = document.getElementById('btn-save-pdf');

// 証明写真
const photoUploadArea = document.getElementById('photo-upload-area');
const photoInput = document.getElementById('photo-input');
const photoPreview = document.getElementById('photo-preview');
const photoPlaceholder = document.getElementById('photo-placeholder');
const btnPhotoRemove = document.getElementById('btn-photo-remove');
let photoBase64 = null;

// プレビュー要素
const pFurigana = document.getElementById('prev-furigana');
const pName = document.getElementById('prev-name');
const pAgeBadge = document.getElementById('prev-age-badge');
const pBirthdate = document.getElementById('prev-birthdate');
const pGender = document.getElementById('prev-gender');
const pZipcode = document.getElementById('prev-zipcode');
const pAddress = document.getElementById('prev-address');
const pPhone = document.getElementById('prev-phone');
const pEmail = document.getElementById('prev-email');
const pSummary = document.getElementById('prev-summary');
const pCareerList = document.getElementById('prev-career-list');
const pSkills = document.getElementById('prev-skills');
const pPr = document.getElementById('prev-pr');
const pPhotoImg = document.getElementById('prev-photo-img');
const pPhotoPlaceholder = document.getElementById('prev-photo-placeholder');

// =====================================================================
// 初期化
// =====================================================================
function init() {
    setupTabs();
    setupPhotoUpload();
    setupZipcodeInput();
    setupBirthdateInput();
    setupEventListeners();
    loadData();
    updatePreview();
}

function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
        });
    });
}

function setupEventListeners() {
    form.addEventListener('input', () => { saveData(); updatePreview(); });
    btnAddCareer.addEventListener('click', () => addCareerBlock());
    btnAddSkill.addEventListener('click', () => addSkillRow());
    btnReset.addEventListener('click', resetData);
    btnSavePdf.addEventListener('click', async () => {
        try { await generatePDF(); }
        catch (e) { console.error(e); alert('PDF生成中にエラーが発生しました。'); }
    });
}

// =====================================================================
// 証明写真
// =====================================================================
function setupPhotoUpload() {
    photoUploadArea.addEventListener('click', () => photoInput.click());

    photoInput.addEventListener('change', () => {
        if (photoInput.files[0]) setPhoto(photoInput.files[0]);
    });

    photoUploadArea.addEventListener('dragover', e => {
        e.preventDefault();
        photoUploadArea.classList.add('drag-over');
    });
    photoUploadArea.addEventListener('dragleave', () => photoUploadArea.classList.remove('drag-over'));
    photoUploadArea.addEventListener('drop', e => {
        e.preventDefault();
        photoUploadArea.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) setPhoto(e.dataTransfer.files[0]);
    });

    btnPhotoRemove.addEventListener('click', e => {
        e.stopPropagation();
        removePhoto();
    });
}

function setPhoto(file) {
    const reader = new FileReader();
    reader.onload = e => {
        photoBase64 = e.target.result;
        showPhotoPreview(photoBase64);
        saveData();
        updatePreview();
    };
    reader.readAsDataURL(file);
}

function showPhotoPreview(base64) {
    photoPreview.src = base64;
    photoPreview.style.display = 'block';
    photoPlaceholder.style.display = 'none';
    btnPhotoRemove.classList.remove('hidden');
}

function removePhoto() {
    photoBase64 = null;
    photoPreview.src = '';
    photoPreview.style.display = 'none';
    photoPlaceholder.style.display = 'flex';
    btnPhotoRemove.classList.add('hidden');
    photoInput.value = '';
    saveData();
    updatePreview();
}

// =====================================================================
// 郵便番号自動入力
// =====================================================================
function setupZipcodeInput() {
    const zipInput = document.getElementById('zipcode');
    let zipDebounce;

    zipInput.addEventListener('input', e => {
        let val = e.target.value.replace(/[^\d]/g, '');

        // ハイフン自動挿入
        if (val.length > 3) val = val.slice(0, 3) + '-' + val.slice(3, 7);
        e.target.value = val;

        clearTimeout(zipDebounce);
        const digits = val.replace(/-/g, '');
        if (digits.length === 7) {
            zipDebounce = setTimeout(() => fetchAddressFromZip(digits), 400);
        } else {
            document.getElementById('zip-status').textContent = '';
            document.getElementById('zip-status').className = 'zip-status';
        }

        saveData();
        updatePreview();
    });
}

async function fetchAddressFromZip(digits) {
    const status = document.getElementById('zip-status');
    status.textContent = '検索中…';
    status.className = 'zip-status searching';

    try {
        const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${digits}`);
        const json = await res.json();
        if (json.results && json.results[0]) {
            const r = json.results[0];
            const address = r.address1 + r.address2 + r.address3;
            document.getElementById('address').value = address;
            status.textContent = '✓ 住所を反映しました';
            status.className = 'zip-status success';
        } else {
            status.textContent = '見つかりません';
            status.className = 'zip-status error';
        }
    } catch {
        status.textContent = 'エラー';
        status.className = 'zip-status error';
    }

    saveData();
    updatePreview();
}

// =====================================================================
// 年齢自動計算
// =====================================================================
function setupBirthdateInput() {
    document.getElementById('birthdate').addEventListener('input', () => {
        updateAgeDisplay();
        saveData();
        updatePreview();
    });
}

function calculateAge(birthdate) {
    if (!birthdate) return '';
    const birth = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? `${age}歳` : '';
}

function updateAgeDisplay() {
    const val = document.getElementById('birthdate').value;
    document.getElementById('age-display').value = calculateAge(val);
}

function formatBirthdate(val) {
    if (!val) return '';
    const d = new Date(val);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

// =====================================================================
// 職務経歴ブロック
// =====================================================================
function createCareerBlock(data = { company: '', periodFrom: '', periodTo: '', employmentType: '', description: '' }) {
    const block = document.createElement('div');
    block.className = 'career-block';
    block.innerHTML = `
        <div class="career-block-header">
            <span class="career-block-title">勤務先</span>
            <button type="button" class="btn-remove" title="削除">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
        <div class="form-group">
            <label>会社名</label>
            <input type="text" class="career-company" placeholder="株式会社〇〇" value="${escapeHtml(data.company)}">
        </div>
        <div class="form-group">
            <label>在籍期間</label>
            <div class="career-period-row">
                <input type="text" class="career-from" placeholder="2020年4月" value="${escapeHtml(data.periodFrom)}">
                <span>〜</span>
                <input type="text" class="career-to" placeholder="現在" value="${escapeHtml(data.periodTo)}">
            </div>
        </div>
        <div class="form-group">
            <label>雇用形態</label>
            <input type="text" class="career-type" placeholder="正社員" value="${escapeHtml(data.employmentType)}">
        </div>
        <div class="form-group">
            <label>業務内容</label>
            <textarea class="career-desc" rows="4" placeholder="担当業務の内容を記載してください">${escapeHtml(data.description)}</textarea>
        </div>
    `;

    block.querySelectorAll('input, textarea').forEach(el => {
        el.addEventListener('input', () => { saveData(); updatePreview(); });
    });

    block.querySelector('.btn-remove').addEventListener('click', () => {
        block.style.animation = 'slideDown .2s ease-out reverse forwards';
        setTimeout(() => { block.remove(); saveData(); updatePreview(); }, 200);
    });

    return block;
}

function addCareerBlock(data) { careerList.appendChild(createCareerBlock(data)); }

// =====================================================================
// スキル行
// =====================================================================
function createSkillRow(data = { category: '', content: '' }) {
    const item = document.createElement('div');
    item.className = 'skill-item';
    item.innerHTML = `
        <input type="text" class="category-input" placeholder="カテゴリ" value="${escapeHtml(data.category)}">
        <input type="text" class="content-input" placeholder="内容" value="${escapeHtml(data.content)}">
        <button type="button" class="btn-remove" title="削除">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;

    item.querySelectorAll('input').forEach(el => {
        el.addEventListener('input', () => { saveData(); updatePreview(); });
    });

    item.querySelector('.btn-remove').addEventListener('click', () => {
        item.style.animation = 'slideDown .2s ease-out reverse forwards';
        setTimeout(() => { item.remove(); saveData(); updatePreview(); }, 200);
    });

    return item;
}

function addSkillRow(data) { skillList.appendChild(createSkillRow(data)); }

// =====================================================================
// HTMLエスケープ
// =====================================================================
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// =====================================================================
// プレビュー更新
// =====================================================================
function updatePreview() {
    const fd = new FormData(form);

    pFurigana.textContent = fd.get('furigana') || '';
    pName.textContent = fd.get('name') || '';

    // 生年月日 + 年齢
    const bd = fd.get('birthdate') || '';
    pBirthdate.textContent = bd ? formatBirthdate(bd) : '';
    const age = calculateAge(bd);
    pAgeBadge.textContent = age;

    // 性別
    pGender.textContent = fd.get('gender') ? `・${fd.get('gender')}` : '';

    // 住所
    const zip = fd.get('zipcode') || '';
    pZipcode.textContent = zip ? `〒${zip}` : '';
    pAddress.innerHTML = (fd.get('address') || '').replace(/\n/g, '<br>');

    // 連絡先
    pPhone.textContent = fd.get('phone') || '';
    const email = fd.get('email') || '';
    const pEmailRow = document.getElementById('prev-email-row');
    pEmail.textContent = email;
    pEmailRow.style.display = email ? '' : 'none';

    // テキスト
    pSummary.textContent = fd.get('summary') || '';
    pPr.textContent = fd.get('pr') || '';

    // 写真
    if (photoBase64) {
        pPhotoImg.src = photoBase64;
        pPhotoImg.style.display = 'block';
        pPhotoPlaceholder.style.display = 'none';
    } else {
        pPhotoImg.style.display = 'none';
        pPhotoPlaceholder.style.display = 'flex';
    }

    // 職務経歴プレビュー
    pCareerList.innerHTML = '';
    careerList.querySelectorAll('.career-block').forEach(block => {
        const company = block.querySelector('.career-company').value;
        const from = block.querySelector('.career-from').value;
        const to = block.querySelector('.career-to').value;
        const type = block.querySelector('.career-type').value;
        const desc = block.querySelector('.career-desc').value;
        if (!company && !from && !to && !desc) return;

        const el = document.createElement('div');
        el.className = 'prev-career-block';
        el.innerHTML = `
            <div class="prev-career-header">
                <div class="prev-career-company">${escapeHtml(company)}</div>
                <div class="prev-career-period">${escapeHtml(from)}${(from || to) ? ' ～ ' : ''}${escapeHtml(to)}</div>
            </div>
            ${type ? `<div class="prev-career-type">雇用形態：${escapeHtml(type)}</div>` : ''}
            <div class="prev-career-desc">${escapeHtml(desc)}</div>
        `;
        pCareerList.appendChild(el);
    });

    // スキルプレビュー
    pSkills.innerHTML = '';
    skillList.querySelectorAll('.skill-item').forEach(row => {
        const category = row.querySelector('.category-input').value;
        const content = row.querySelector('.content-input').value;
        if (!category && !content) return;

        const el = document.createElement('div');
        el.className = 'prev-skill-row';
        el.innerHTML = `
            <div class="prev-skill-category">${escapeHtml(category)}</div>
            <div class="prev-skill-content">${escapeHtml(content)}</div>
        `;
        pSkills.appendChild(el);
    });

    // 日付
    const today = new Date();
    document.getElementById('preview-date').textContent =
        `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日現在`;
}

// =====================================================================
// データ保存・読込
// =====================================================================
let saveTimeout;
function saveData() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        const fd = new FormData(form);
        const data = {
            basic: Object.fromEntries(fd.entries()),
            careers: Array.from(careerList.querySelectorAll('.career-block')).map(b => ({
                company: b.querySelector('.career-company').value,
                periodFrom: b.querySelector('.career-from').value,
                periodTo: b.querySelector('.career-to').value,
                employmentType: b.querySelector('.career-type').value,
                description: b.querySelector('.career-desc').value,
            })),
            skills: Array.from(skillList.querySelectorAll('.skill-item')).map(r => ({
                category: r.querySelector('.category-input').value,
                content: r.querySelector('.content-input').value,
            })),
            photoBase64: photoBase64,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }, 500);
}

function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) { addCareerBlock(); addSkillRow(); return; }

    try {
        const data = JSON.parse(saved);

        for (const [key, value] of Object.entries(data.basic || {})) {
            const el = form.elements[key];
            if (el) el.value = value;
        }
        updateAgeDisplay();

        careerList.innerHTML = '';
        (data.careers?.length ? data.careers : [{}]).forEach(c => addCareerBlock(c));

        skillList.innerHTML = '';
        (data.skills?.length ? data.skills : [{}]).forEach(s => addSkillRow(s));

        if (data.photoBase64) {
            photoBase64 = data.photoBase64;
            showPhotoPreview(photoBase64);
        }

    } catch (e) {
        console.error('保存データの読み込みに失敗:', e);
        addCareerBlock();
        addSkillRow();
    }
}

function resetData() {
    if (!confirm('入力内容をすべてリセットしますか？この操作は取り消せません。')) return;
    localStorage.removeItem(STORAGE_KEY);
    form.reset();
    careerList.innerHTML = '';
    skillList.innerHTML = '';
    removePhoto();
    document.getElementById('zip-status').textContent = '';
    addCareerBlock();
    addSkillRow();
    updatePreview();
}

// =====================================================================
// PDF生成
// =====================================================================
async function generatePDF() {
    const nameText = document.getElementById('name').value.trim();
    const defaultName = nameText ? `職務経歴書_${nameText}.pdf` : `職務経歴書_${Date.now()}.pdf`;

    let fileHandle = null;
    if (window.showSaveFilePicker) {
        try {
            fileHandle = await window.showSaveFilePicker({
                suggestedName: defaultName,
                types: [{ description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } }]
            });
        } catch (err) {
            if (err.name === 'AbortError') return;
        }
    }

    const overlay = document.getElementById('loading-overlay');
    try {
        overlay.classList.remove('hidden');

        const { PDFDocument, rgb } = PDFLib;
        const pdfDoc = await PDFDocument.create();
        pdfDoc.registerFontkit(window.fontkit);

        // フォント読み込み
        const fontUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/mplus1p/MPLUS1p-Regular.ttf';
        const fontRes = await fetch(fontUrl);
        if (!fontRes.ok) throw new Error('フォントの読み込みに失敗しました');
        const customFont = await pdfDoc.embedFont(await fontRes.arrayBuffer());

        const page = pdfDoc.addPage([595.28, 841.89]); // A4

        // ヘルパー
        const BORDER_COLOR = rgb(0.75, 0.62, 0.50);
        const drawLine = (x1, y1, x2, y2, t = 0.5) =>
            page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: t });
        const drawDotLine = (x1, y1, x2, y2) =>
            page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.5, color: BORDER_COLOR });
        const drawAccentLine = (x1, y1, x2, y2) =>
            page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.3, color: rgb(0.82, 0.70, 0.58) });
        const drawText = (txt, x, y, size = 10, color = rgb(0, 0, 0)) => {
            if (!txt) return;
            page.drawText(String(txt), { x, y, size, font: customFont, color });
        };
        const fillRect = (x, y, w, h, color) =>
            page.drawRectangle({ x, y, width: w, height: h, color });
        const strokeRect = (x, y, w, h, t = 0.8, bc = rgb(0, 0, 0)) =>
            page.drawRectangle({ x, y, width: w, height: h, borderColor: bc, borderWidth: t });

        // 複数行テキスト描画
        const drawWrapped = (txt, x, y, size, maxW, lh) => {
            if (!txt) return y;
            let cy = y;
            for (const line of txt.split('\n')) {
                let cur = '';
                for (const ch of [...line]) {
                    const test = cur + ch;
                    if (customFont.widthOfTextAtSize(test, size) > maxW && cur) {
                        drawText(cur, x, cy, size);
                        cy -= lh;
                        cur = ch;
                    } else { cur = test; }
                }
                if (cur) { drawText(cur, x, cy, size); cy -= lh; }
            }
            return cy;
        };

        const L = 40, R = 555, W = R - L;
        const fd = new FormData(form);
        const GRAY = rgb(0.95, 0.95, 0.95);
        const ORANGE_BG = rgb(1, 0.98, 0.97);

        // ===== タイトル =====
        let y = 810;
        const titleTxt = '職 務 経 歴 書';
        const titleW = customFont.widthOfTextAtSize(titleTxt, 18);
        drawText(titleTxt, L + (W - titleW) / 2, y, 18);

        const today = new Date();
        const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日現在`;
        const dateW = customFont.widthOfTextAtSize(dateStr, 8);
        drawText(dateStr, R - dateW, y, 8, rgb(0.3, 0.3, 0.3));

        // ===== 個人情報 =====
        y -= 18;
        const PHOTO_W = 82, PHOTO_H = 110;
        const photoX = R - PHOTO_W;
        const personalY = y;

        // 個人情報テーブル行
        const rows = [
            { label: 'ふりがな', value: fd.get('furigana') || '', h: 16 },
            { label: '氏　名', value: fd.get('name') || '', h: 22, bold: true, size: 13 },
            { label: '生年月日', value: (() => {
                const bd = fd.get('birthdate') || '';
                const gender = fd.get('gender') || '';
                const age = calculateAge(bd);
                let v = bd ? formatBirthdate(bd) : '';
                if (gender) v += `　${gender}`;
                if (age) v += `　${age}`;
                return v;
            })(), h: 16 },
            { label: '〒', value: fd.get('zipcode') || '', h: 14 },
            { label: '住　所', value: fd.get('address') || '', h: Math.max(16, (fd.get('address') || '').split('\n').filter(l => l.trim()).length * 13), multiline: true },
            { label: 'TEL', value: fd.get('phone') || '', h: 14 },
            ...(fd.get('email') ? [{ label: 'Email', value: fd.get('email') || '', h: 14 }] : []),
        ];

        const LBL_W = 50;
        const INFO_W = photoX - L - 4;

        let rowY = personalY;
        for (const row of rows) {
            const rowB = rowY - row.h;
            // 背景
            fillRect(L, rowB, INFO_W, row.h, ORANGE_BG);
            // ラベル列
            fillRect(L, rowB, LBL_W, row.h, rgb(0.98, 0.96, 0.93));
            const lblW = customFont.widthOfTextAtSize(row.label, 7);
            drawText(row.label, L + (LBL_W - lblW) / 2, rowB + row.h / 2 - 3, 7, rgb(0.3, 0.2, 0.1));
            // 値
            if (row.multiline && row.value.includes('\n')) {
                const lines = row.value.split('\n').filter(l => l.trim());
                const lineH = row.h / lines.length;
                lines.forEach((line, i) => {
                    drawText(line, L + LBL_W + 5, rowB + row.h - (i + 0.5) * lineH - 3.5, row.size || 9);
                });
            } else {
                drawText(row.value, L + LBL_W + 5, rowB + row.h / 2 - 3.5, row.size || 9);
            }
            // 区切り線
            drawDotLine(L + LBL_W, rowB, L + LBL_W, rowY);
            drawDotLine(L, rowB, L + INFO_W, rowB);
            rowY -= row.h;
        }

        // 外枠
        strokeRect(L, rowY, INFO_W, personalY - rowY, 0.8);

        // 証明写真枠
        strokeRect(photoX, rowY, PHOTO_W, personalY - rowY, 0.8);
        if (photoBase64) {
            try {
                const imgBytes = await fetch(photoBase64).then(r => r.arrayBuffer());
                const isJpeg = photoBase64.startsWith('data:image/jpeg') || photoBase64.startsWith('data:image/jpg');
                const embedded = isJpeg ? await pdfDoc.embedJpg(imgBytes) : await pdfDoc.embedPng(imgBytes);
                const boxH = personalY - rowY;
                const iW = embedded.width, iH = embedded.height;
                const scale = Math.min(PHOTO_W / iW, boxH / iH);
                const imgW = iW * scale, imgH = iH * scale;
                page.drawImage(embedded, {
                    x: photoX + (PHOTO_W - imgW) / 2,
                    y: rowY + (boxH - imgH) / 2,
                    width: imgW, height: imgH
                });
            } catch { /* 写真埋め込み失敗時は枠のみ */ }
        } else {
            const ph = '写真';
            const phW = customFont.widthOfTextAtSize(ph, 9);
            drawText(ph, photoX + (PHOTO_W - phW) / 2, (personalY + rowY) / 2 - 4, 9, rgb(0.7, 0.7, 0.7));
        }

        y = rowY - 12;

        // セクション描画ヘルパー
        const drawSection = (title) => {
            y -= 8;
            drawText(title, L, y, 11);
            drawLine(L, y - 3, R, y - 3, 1.5);
            y -= 16;
        };

        // ===== 職務要約 =====
        drawSection('■ 職務要約');
        y = drawWrapped(fd.get('summary') || '', L + 5, y, 9, W - 10, 14);
        y -= 4;

        // ===== 職務経歴 =====
        drawSection('■ 職務経歴');
        careerList.querySelectorAll('.career-block').forEach(block => {
            const company = block.querySelector('.career-company').value;
            const from = block.querySelector('.career-from').value;
            const to = block.querySelector('.career-to').value;
            const type = block.querySelector('.career-type').value;
            const desc = block.querySelector('.career-desc').value;
            if (!company && !from && !to && !desc) return;

            const hdrH = 16;
            fillRect(L, y - hdrH, W, hdrH, GRAY);
            strokeRect(L, y - hdrH, W, hdrH, 0.6);
            drawText(company, L + 5, y - hdrH + 4, 10);
            const period = `${from}${(from || to) ? ' ～ ' : ''}${to}`;
            if (period.trim()) {
                const pw = customFont.widthOfTextAtSize(period, 8);
                drawText(period, R - pw - 5, y - hdrH + 5, 8, rgb(0.35, 0.35, 0.35));
            }
            y -= hdrH;
            if (type) { y -= 12; drawText(`雇用形態：${type}`, L + 5, y, 8, rgb(0.4, 0.4, 0.4)); }
            y -= 13;
            y = drawWrapped(desc, L + 5, y, 9, W - 10, 13);
            y -= 6;
        });

        // ===== スキル・知識・資格 =====
        drawSection('■ 活かせるスキル・知識・資格');
        const catW = 100;
        const skillStartY = y + 11;
        const skillItems = [...skillList.querySelectorAll('.skill-item')].filter(row => {
            const cat = row.querySelector('.category-input').value;
            const con = row.querySelector('.content-input').value;
            return cat || con;
        });
        skillItems.forEach(row => {
            const cat = row.querySelector('.category-input').value;
            const con = row.querySelector('.content-input').value;
            fillRect(L, y - 4, catW, 15, rgb(0.98, 0.96, 0.93));
            drawText(cat, L + 5, y, 9, rgb(0.3, 0.2, 0.1));
            drawText(con, L + catW + 10, y, 9);
            drawAccentLine(L, y - 4, R, y - 4);
            y -= 15;
        });
        if (skillItems.length > 0) {
            // 縦罫線（カテゴリ列区切り）
            page.drawLine({ start: { x: L + catW, y: y + 11 }, end: { x: L + catW, y: skillStartY }, thickness: 0.5, color: BORDER_COLOR });
            strokeRect(L, y + 11, W, skillStartY - (y + 11), 0.5, BORDER_COLOR);
        }

        // ===== 自己PR =====
        drawSection('■ 自己PR');
        y = drawWrapped(fd.get('pr') || '', L + 5, y, 9, W - 10, 14);

        // --- 保存 ---
        const pdfBytes = await pdfDoc.save();
        if (fileHandle) {
            const writable = await fileHandle.createWritable();
            await writable.write(pdfBytes);
            await writable.close();
        } else {
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = defaultName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

    } finally {
        overlay.classList.add('hidden');
    }
}

// 起動
document.addEventListener('DOMContentLoaded', init);
