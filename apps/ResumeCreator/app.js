// app.js
const STORAGE_KEY = 'rirekisho_v1';

// Elements
const form = document.getElementById('resume-form');
const ageDisplay = document.getElementById('age-display');
const photoDropzone = document.getElementById('photo-dropzone');
const photoInput = document.getElementById('photo-input');
const photoPreview = document.getElementById('photo-preview');
const zipcodeInput = document.getElementById('zipcode');
const zipStatus = document.getElementById('zip-status');

// Preview Elements
const pFurigana = document.getElementById('prev-furigana');
const pName = document.getElementById('prev-name');
const pBirthdate = document.getElementById('prev-birthdate');
const pAge = document.getElementById('prev-age');
const pAddressFurigana = document.getElementById('prev-address-furigana');
const pZipcodeLine = document.getElementById('prev-zipcode-line');
const pAddressText = document.getElementById('prev-address-text');
const pPhone = document.getElementById('prev-phone');
const pEmail = document.getElementById('prev-email');
const pGender = document.getElementById('prev-gender');
// pAddress は prev-zipcode-line + prev-address-text の親要素。直接操作しない。
const pPr = document.getElementById('prev-pr');
const pRequests = document.getElementById('prev-requests');
const pPhoto = document.getElementById('prev-photo');
const pPhotoPlaceholder = document.getElementById('prev-photo-placeholder');

const prevHistoryBody = document.getElementById('prev-history-body');
const prevCertBody = document.getElementById('prev-cert-body');

// Dynamic Lists
const eduList = document.getElementById('edu-list');
const workList = document.getElementById('work-list');
const certList = document.getElementById('cert-list');
const btnAddEdu = document.getElementById('btn-add-edu');
const btnAddWork = document.getElementById('btn-add-work');
const btnAddCert = document.getElementById('btn-add-cert');

// Header Buttons
const btnReset = document.getElementById('btn-reset');
const btnSavePdf = document.getElementById('btn-save-pdf');

// State
let resumeData = {
    basic: {},
    edu: [],
    work: [],
    certs: [],
    photoBase64: null
};

// Initialize
function init() {
    setupTabs();
    setupEventListeners();
    loadData();
    updatePreview();
}

function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const panes = document.querySelectorAll('.pane');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
        });
    });
}

function setupEventListeners() {
    form.addEventListener('input', () => {
        saveData();
        updatePreview();
    });

    document.getElementById('birthdate').addEventListener('change', () => {
        calculateAge();
        saveData();
        updatePreview();
    });

    photoDropzone.addEventListener('click', () => photoInput.click());
    photoDropzone.addEventListener('dragover', (e) => { e.preventDefault(); photoDropzone.style.borderColor = 'var(--primary-color)'; });
    photoDropzone.addEventListener('dragleave', () => { photoDropzone.style.borderColor = 'var(--border-color)'; });
    photoDropzone.addEventListener('drop', handlePhotoDrop);
    photoInput.addEventListener('change', handlePhotoSelect);

    zipcodeInput.addEventListener('input', handleZipcodeInput);

    btnAddEdu.addEventListener('click', () => addEduRow());
    btnAddWork.addEventListener('click', () => addWorkRow());
    btnAddCert.addEventListener('click', () => addCertRow());

    btnReset.addEventListener('click', resetData);
    btnSavePdf.addEventListener('click', async () => {
        try {
            await generatePDF();
        } catch (error) {
            console.error(error);
            alert('PDF生成中にエラーが発生しました。');
        }
    });
}

// -------------------------------------------------------------
// Zipcode Auto-fill
// -------------------------------------------------------------
let zipDebounce;
function handleZipcodeInput(e) {
    // ハイフン自動挿入（3桁入力後）
    let v = e.target.value.replace(/[^\d]/g, '');
    if (v.length > 3) v = v.slice(0, 3) + '-' + v.slice(3, 7);
    e.target.value = v;

    saveData();
    updatePreview();

    const digits = v.replace('-', '');
    if (digits.length !== 7) {
        zipStatus.textContent = '';
        zipStatus.className = 'zip-status';
        return;
    }

    clearTimeout(zipDebounce);
    zipDebounce = setTimeout(() => fetchAddressFromZip(digits), 400);
}

async function fetchAddressFromZip(digits) {
    zipStatus.textContent = '検索中…';
    zipStatus.className = 'zip-status loading';
    try {
        const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${digits}`);
        const json = await res.json();
        if (json.status !== 200 || !json.results) {
            zipStatus.textContent = '見つかりません';
            zipStatus.className = 'zip-status error';
            return;
        }
        const r = json.results[0];
        const addr = r.address1 + r.address2 + r.address3;
        document.getElementById('address').value = addr;
        zipStatus.textContent = '✓';
        zipStatus.className = 'zip-status success';
        saveData();
        updatePreview();
    } catch (err) {
        zipStatus.textContent = 'エラー';
        zipStatus.className = 'zip-status error';
    }
}

// -------------------------------------------------------------
// Photo Handling
// -------------------------------------------------------------
function handlePhotoDrop(e) {
    e.preventDefault();
    photoDropzone.style.borderColor = 'var(--border-color)';
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processPhoto(e.dataTransfer.files[0]);
    }
}

function handlePhotoSelect(e) {
    if (e.target.files && e.target.files[0]) {
        processPhoto(e.target.files[0]);
    }
    photoInput.value = '';
}

function processPhoto(file) {
    if (!file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        const base64 = e.target.result;
        setPhotoPreview(base64);
        resumeData.photoBase64 = base64;
        saveData();
        updatePreview();
    };
    reader.readAsDataURL(file);
}

function setPhotoPreview(base64) {
    if (base64) {
        photoPreview.src = base64;
        photoPreview.style.display = 'block';
        photoDropzone.querySelector('.dropzone-content').style.display = 'none';

        pPhoto.src = base64;
        pPhoto.style.display = 'block';
        pPhotoPlaceholder.style.display = 'none';
    } else {
        photoPreview.style.display = 'none';
        photoDropzone.querySelector('.dropzone-content').style.display = 'flex';

        pPhoto.style.display = 'none';
        pPhotoPlaceholder.style.display = 'flex';
    }
}

// -------------------------------------------------------------
// Dynamic Lists
// -------------------------------------------------------------
function createDynamicRow(type, data = { year: '', month: '', content: '' }) {
    const item = document.createElement('div');
    item.className = 'dynamic-item';
    item.innerHTML = `
        <input type="text" class="year-input" placeholder="年" value="${data.year}">
        <input type="text" class="month-input" placeholder="月" value="${data.month}">
        <input type="text" class="content-input" placeholder="内容" value="${data.content}">
        <button type="button" class="btn-remove" title="削除">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
    `;

    item.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => {
            saveData();
            updatePreview();
        });
    });

    item.querySelector('.btn-remove').addEventListener('click', () => {
        item.style.animation = 'slideDown 0.2s ease-out reverse forwards';
        setTimeout(() => {
            item.remove();
            saveData();
            updatePreview();
        }, 200);
    });

    return item;
}

function addEduRow(data) {
    eduList.appendChild(createDynamicRow('edu', data));
}

function addWorkRow(data) {
    workList.appendChild(createDynamicRow('work', data));
}

function addCertRow(data) {
    certList.appendChild(createDynamicRow('cert', data));
}

// -------------------------------------------------------------
// Data & Preview
// -------------------------------------------------------------
function calculateAge() {
    const birthStr = document.getElementById('birthdate').value;
    if (!birthStr) {
        ageDisplay.textContent = '- 歳';
        return '';
    }
    const birthDate = new Date(birthStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    ageDisplay.textContent = `${age} 歳`;
    return age;
}

function formatDate(dateString) {
    if (!dateString) return '　　年　月　日';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '　　年　月　日';
    return `${d.getFullYear()}年 ${d.getMonth() + 1}月 ${d.getDate()}日`;
}

function updatePreview() {
    const formData = new FormData(form);

    pFurigana.textContent = formData.get('furigana') || '';
    pName.textContent = formData.get('name') || '';
    pAddressFurigana.textContent = formData.get('address_furigana') || '';

    const zip = formData.get('zipcode') || '';
    const addr = formData.get('address') || '';
    if (zip) {
        pZipcodeLine.textContent = `〒${zip}`;
        pZipcodeLine.style.display = 'block';
    } else {
        pZipcodeLine.textContent = '';
        pZipcodeLine.style.display = 'none';
    }
    pAddressText.innerHTML = addr.replace(/\n/g, '<br>');

    pPhone.textContent = formData.get('phone') || '';
    pEmail.textContent = formData.get('email') || '';
    pPr.textContent = formData.get('pr') || '';
    pRequests.textContent = formData.get('requests') || '';
    pGender.textContent = formData.get('gender') || '';

    const birthdate = formData.get('birthdate');
    pBirthdate.textContent = formatDate(birthdate);
    pAge.textContent = calculateAge() || '';

    prevHistoryBody.innerHTML = '';
    const eduRows = Array.from(eduList.querySelectorAll('.dynamic-item')).map(row => ({
        year: row.querySelector('.year-input').value,
        month: row.querySelector('.month-input').value,
        content: row.querySelector('.content-input').value
    })).filter(r => r.year || r.month || r.content);

    const workRows = Array.from(workList.querySelectorAll('.dynamic-item')).map(row => ({
        year: row.querySelector('.year-input').value,
        month: row.querySelector('.month-input').value,
        content: row.querySelector('.content-input').value
    })).filter(r => r.year || r.month || r.content);

    const displayHistory = [];
    if (eduRows.length > 0) {
        displayHistory.push({ year: '', month: '', content: '<div style="text-align:center;">学 歴</div>' });
        displayHistory.push(...eduRows);
    }
    if (workRows.length > 0) {
        displayHistory.push({ year: '', month: '', content: '<div style="text-align:center;">職 歴</div>' });
        displayHistory.push(...workRows);
        displayHistory.push({ year: '', month: '', content: '<div style="text-align:right; padding-right:20px;">以上</div>' });
    }

    displayHistory.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${row.year}</td><td>${row.month}</td><td class="col-content">${row.content}</td>`;
        prevHistoryBody.appendChild(tr);
    });

    const historyEmptyCount = Math.max(0, 15 - displayHistory.length);
    for (let i = 0; i < historyEmptyCount; i++) {
        prevHistoryBody.innerHTML += `<tr class="empty-row"><td></td><td></td><td class="col-content"></td></tr>`;
    }

    prevCertBody.innerHTML = '';
    const certRows = certList.querySelectorAll('.dynamic-item');
    certRows.forEach(row => {
        const tr = document.createElement('tr');
        const year = row.querySelector('.year-input').value;
        const month = row.querySelector('.month-input').value;
        const content = row.querySelector('.content-input').value;
        tr.innerHTML = `<td>${year}</td><td>${month}</td><td class="col-content">${content}</td>`;
        prevCertBody.appendChild(tr);
    });
    const certEmptyCount = Math.max(0, 5 - certRows.length);
    for (let i = 0; i < certEmptyCount; i++) {
        prevCertBody.innerHTML += `<tr class="empty-row"><td></td><td></td><td class="col-content"></td></tr>`;
    }

    const today = new Date();
    document.getElementById('preview-date').textContent = `${today.getFullYear()}年 ${today.getMonth() + 1}月 ${today.getDate()}日現在`;
}

// -------------------------------------------------------------
// Storage
// -------------------------------------------------------------
let saveTimeout;
function saveData() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        const formData = new FormData(form);
        const data = {
            basic: Object.fromEntries(formData.entries()),
            edu: Array.from(eduList.querySelectorAll('.dynamic-item')).map(row => ({
                year: row.querySelector('.year-input').value,
                month: row.querySelector('.month-input').value,
                content: row.querySelector('.content-input').value
            })),
            work: Array.from(workList.querySelectorAll('.dynamic-item')).map(row => ({
                year: row.querySelector('.year-input').value,
                month: row.querySelector('.month-input').value,
                content: row.querySelector('.content-input').value
            })),
            certs: Array.from(certList.querySelectorAll('.dynamic-item')).map(row => ({
                year: row.querySelector('.year-input').value,
                month: row.querySelector('.month-input').value,
                content: row.querySelector('.content-input').value
            })),
            photoBase64: resumeData.photoBase64
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }, 500);
}

function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
        addEduRow();
        addWorkRow();
        addCertRow();
        return;
    }

    try {
        const data = JSON.parse(saved);
        resumeData.photoBase64 = data.photoBase64 || null;
        setPhotoPreview(resumeData.photoBase64);

        for (const [key, value] of Object.entries(data.basic || {})) {
            const input = form.elements[key];
            if (input) input.value = value;
        }

        eduList.innerHTML = '';
        if (data.edu && data.edu.length > 0) {
            data.edu.forEach(row => addEduRow(row));
        } else {
            addEduRow();
        }

        workList.innerHTML = '';
        if (data.work && data.work.length > 0) {
            data.work.forEach(row => addWorkRow(row));
        } else {
            addWorkRow();
        }

        certList.innerHTML = '';
        if (data.certs && data.certs.length > 0) {
            data.certs.forEach(row => addCertRow(row));
        } else {
            addCertRow();
        }

    } catch (e) {
        console.error('Failed to parse saved data', e);
        addEduRow();
        addWorkRow();
        addCertRow();
    }
}

function resetData() {
    if (confirm('入力内容をすべてリセットしますか？この操作は取り消せません。')) {
        localStorage.removeItem(STORAGE_KEY);
        form.reset();
        resumeData.photoBase64 = null;
        setPhotoPreview(null);
        eduList.innerHTML = '';
        workList.innerHTML = '';
        certList.innerHTML = '';
        addEduRow();
        addWorkRow();
        addCertRow();
        updatePreview();
    }
}

// -------------------------------------------------------------
// PDF Generation
// -------------------------------------------------------------
async function generatePDF() {
    const defaultName = pName.textContent ? `履歴書_${pName.textContent.trim()}.pdf` : `履歴書_${Date.now()}.pdf`;

    let fileHandle = null;
    if (window.showSaveFilePicker) {
        try {
            fileHandle = await window.showSaveFilePicker({
                suggestedName: defaultName,
                types: [{
                    description: 'PDF Document',
                    accept: { 'application/pdf': ['.pdf'] }
                }]
            });
        } catch (err) {
            if (err.name === 'AbortError') return;
            console.error('File picker error:', err);
        }
    }

    const overlay = document.getElementById('loading-overlay');
    try {
        overlay.classList.remove('hidden');

        const { PDFDocument, rgb } = PDFLib;
        const pdfDoc = await PDFDocument.create();
        const fontUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/mplus1p/MPLUS1p-Regular.ttf';
        pdfDoc.registerFontkit(window.fontkit);
        const fontRes = await fetch(fontUrl);
        if (!fontRes.ok) throw new Error("Font fetch failed");
        const fontBytes = await fontRes.arrayBuffer();
        const customFont = await pdfDoc.embedFont(fontBytes);

        const page = pdfDoc.addPage([595.28, 841.89]); // A4

        // --- ヘルパー関数 ---
        const drawLine = (x1, y1, x2, y2) => page.drawLine({
            start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.5
        });
        const drawDottedLine = (x1, y1, x2, y2) => page.drawLine({
            start: { x: x1, y: y1 }, end: { x: x2, y: y2 },
            thickness: 0.5, dashArray: [2, 2]
        });
        const drawText = (txt, x, y, size = 10) => {
            if (!txt) return;
            page.drawText(txt, { x, y, size, font: customFont });
        };
        const drawRect = (x, y, w, h) => page.drawRectangle({
            x, y, width: w, height: h, borderColor: rgb(0, 0, 0), borderWidth: 0.5
        });
        const drawMultilineText = (txt, x, y, size, lineHeight) => {
            if (!txt) return;
            const lines = txt.split('\n');
            let cy = y;
            for (const line of lines) {
                drawText(line, x, cy, size);
                cy -= lineHeight;
            }
        };

        // --- レイアウト定数 ---
        const L = 40, R = 555, W = 515;
        const LBL = 85;       // ラベル区切り線x座標
        const ROW_H = 17;     // テーブル行高さ
        const INFO_R = 435;   // 情報エリア右端 / 写真エリア左端

        // ===== タイトル =====
        let y = 800;
        drawText('履 歴 書', 250, y, 20);
        drawText(document.getElementById('preview-date').textContent, 430, y, 10);

        // ===== 上部セクション（氏名・生年月日・写真）=====
        const topH = 130;
        const topTop = y - 10;          // 790
        const topBottom = topTop - topH; // 660

        // 外枠
        drawRect(L, topBottom, INFO_R - L, topH);
        drawRect(INFO_R, topBottom, R - INFO_R, topH);

        // ふりがな行（高さ25pt）
        const furiganaH = 25;
        const furiganaB = topTop - furiganaH;
        drawLine(L, furiganaB, INFO_R, furiganaB);
        drawDottedLine(LBL, topTop, LBL, furiganaB);
        drawText('ふりがな', L + 5, furiganaB + 8, 7);
        drawText(pFurigana.textContent, LBL + 8, furiganaB + 6, 10);

        // 氏名行（高さ75pt）
        const nameH = 75;
        const nameB = furiganaB - nameH;
        drawLine(L, nameB, INFO_R, nameB);
        drawDottedLine(LBL, furiganaB, LBL, nameB);
        drawText('氏名', L + 15, nameB + 32, 7);
        // 名前を垂直中央に配置 (baseline調整)
        drawText(pName.textContent, LBL + 8, nameB + 22, 24);

        // 生年月日行（高さ30pt）
        drawDottedLine(LBL, nameB, LBL, topBottom);
        drawText('生年月日', L + 3, topBottom + 11, 7);
        const birthTxt = formatDate(document.getElementById('birthdate').value) + ' 生 (満 ' + pAge.textContent + ' 歳)';
        drawText(birthTxt, LBL + 8, topBottom + 10, 10);

        // 性別
        const genderX = 350; // 位置調整
        drawLine(genderX, nameB, genderX, topBottom);
        drawDottedLine(genderX + 30, nameB, genderX + 30, topBottom);
        drawText('性別', genderX + 5, topBottom + 11, 7);
        const genderTxt = pGender.textContent;
        const genderW = customFont.widthOfTextAtSize(genderTxt, 12);
        drawText(genderTxt, genderX + 30 + (INFO_R - (genderX + 30) - genderW) / 2, topBottom + 10, 12);

        // 写真
        if (resumeData.photoBase64) {
            let photoImage;
            try {
                const base64Data = resumeData.photoBase64.split(',')[1] || resumeData.photoBase64;
                if (resumeData.photoBase64.startsWith('data:image/png')) {
                    photoImage = await pdfDoc.embedPng(base64Data);
                } else {
                    photoImage = await pdfDoc.embedJpg(base64Data);
                }
            } catch (e) { console.error(e); }
            if (photoImage) {
                const boxW = R - INFO_R - 10;
                const boxH = topH - 10;
                const imgDims = photoImage.scale(1);
                const imgAspect = imgDims.width / imgDims.height;
                const boxAspect = boxW / boxH;
                let drawW, drawH;
                if (imgAspect > boxAspect) {
                    drawW = boxW;
                    drawH = boxW / imgAspect;
                } else {
                    drawH = boxH;
                    drawW = boxH * imgAspect;
                }
                const drawX = INFO_R + 5 + (boxW - drawW) / 2;
                const drawY = topBottom + 5 + (boxH - drawH) / 2;
                page.drawImage(photoImage, { x: drawX, y: drawY, width: drawW, height: drawH });
            }
        } else {
            const photoLabel = '写真を貼る位置';
            const photoLabelW = customFont.widthOfTextAtSize(photoLabel, 8);
            drawText(photoLabel, INFO_R + (R - INFO_R - photoLabelW) / 2, topBottom + topH / 2 - 4, 8);
        }

        y = topBottom;

        // ===== 連絡先セクション =====
        const contactH = 70; // 高さを少し広げる
        const contactB = y - contactH;
        const phoneL = 330;

        drawRect(L, contactB, phoneL - L, contactH);
        const addrFuriH = 20;
        const addrFuriB = y - addrFuriH;
        drawLine(L, addrFuriB, phoneL, addrFuriB);
        drawDottedLine(LBL, y, LBL, addrFuriB);
        drawText('ふりがな', L + 5, addrFuriB + 5, 7);
        drawText(pAddressFurigana.textContent, LBL + 8, addrFuriB + 5, 8);

        drawDottedLine(LBL, addrFuriB, LBL, contactB);
        drawText('現住所', L + 10, contactB + 25, 7);
        const zipcodeVal = document.getElementById('zipcode').value.trim();
        const addressText = document.getElementById('address').value;
        const addrLines = [];
        if (zipcodeVal) addrLines.push('〒' + zipcodeVal);
        addressText.split('\n').filter(l => l.trim()).forEach(l => addrLines.push(l));

        // 住所の垂直中央揃えロジック
        const addrBoxH = addrFuriB - contactB; // 50pt
        const fontSize = 9;
        const lineHeight = 13;
        const totalTextH = addrLines.length * lineHeight;
        let addrY = addrFuriB - ((addrBoxH - totalTextH) / 2) - fontSize;

        addrLines.slice(0, 4).forEach(line => {
            drawText(line, LBL + 8, addrY, fontSize);
            addrY -= lineHeight;
        });

        drawRect(phoneL, contactB, R - phoneL, contactH);
        const phoneMid = y - 35;
        drawLine(phoneL, phoneMid, R, phoneMid);
        const phoneLblR = phoneL + 50;
        drawDottedLine(phoneLblR, y, phoneLblR, phoneMid);
        drawText('電話番号', phoneL + 5, phoneMid + 12, 7);
        drawText(pPhone.textContent, phoneLblR + 8, phoneMid + 12, 10);
        drawDottedLine(phoneLblR, phoneMid, phoneLblR, contactB);
        drawText('Email', phoneL + 10, contactB + 12, 7);
        
        // Emailの長さに応じてフォントサイズを動的に縮小
        let emailSize = 10;
        let emailTxt = pEmail.textContent || '';
        let emailWidth = customFont.widthOfTextAtSize(emailTxt, emailSize);
        const maxEmailWidth = R - phoneLblR - 15;
        
        while (emailWidth > maxEmailWidth && emailSize > 5) {
            emailSize -= 0.5;
            emailWidth = customFont.widthOfTextAtSize(emailTxt, emailSize);
        }
        drawText(emailTxt, phoneLblR + 8, contactB + 12, emailSize);

        y = contactB;

        // ===== 学歴・職歴テーブル =====
        y -= 10;
        const colYearR = L + 60;
        const colMonthR = colYearR + 40;
        const BLACK = rgb(0, 0, 0);

        // テーブルを「外枠1回・内側線1回」で描くヘルパー
        const drawTableSection = (title, contentRows, numRows) => {
            const tableTop = y;
            const totalH = (1 + numRows) * ROW_H;
            const tableBottom = tableTop - totalH;

            // 外枠（1回だけ）
            page.drawRectangle({ x: L, y: tableBottom, width: W, height: totalH, borderColor: BLACK, borderWidth: 0.75 });

            // 列分割線（全高、1回だけ）
            page.drawLine({ start: { x: colYearR, y: tableBottom }, end: { x: colYearR, y: tableTop }, thickness: 0.5 });
            page.drawLine({ start: { x: colMonthR, y: tableBottom }, end: { x: colMonthR, y: tableTop }, thickness: 0.5 });

            // 行区切り線（numRows本、1回ずつ）
            for (let i = 1; i <= numRows; i++) {
                const lineY = tableTop - i * ROW_H;
                page.drawLine({ start: { x: L, y: lineY }, end: { x: L + W, y: lineY }, thickness: 0.5 });
            }

            // ヘッダーテキスト
            const hY = tableTop - ROW_H + 4;
            drawText('年',  L + (colYearR - L - customFont.widthOfTextAtSize('年', 10)) / 2, hY, 10);
            drawText('月',  colYearR + (colMonthR - colYearR - customFont.widthOfTextAtSize('月', 10)) / 2, hY, 10);
            const tw = customFont.widthOfTextAtSize(title, 10);
            drawText(title, colMonthR + (W - (colMonthR - L) - tw) / 2, hY, 10);

            // コンテンツ行テキスト
            contentRows.forEach((row, i) => {
                const rY = tableTop - (i + 2) * ROW_H + 4;
                if (row.year)  { const w = customFont.widthOfTextAtSize(row.year, 10);  drawText(row.year,  L + (colYearR - L - w) / 2, rY, 10); }
                if (row.month) { const w = customFont.widthOfTextAtSize(row.month, 10); drawText(row.month, colYearR + (colMonthR - colYearR - w) / 2, rY, 10); }
                if (row.content) {
                    if (row.align === 'center') {
                        const cw = customFont.widthOfTextAtSize(row.content, 10);
                        drawText(row.content, colMonthR + (W - (colMonthR - L) - cw) / 2, rY, 10);
                    } else if (row.align === 'right') {
                        const cw = customFont.widthOfTextAtSize(row.content, 10);
                        drawText(row.content, L + W - 10 - cw, rY, 10);
                    } else {
                        drawText(row.content, colMonthR + 10, rY, 10);
                    }
                }
            });

            y = tableBottom;
        };

        const eduRowsPdf = Array.from(eduList.querySelectorAll('.dynamic-item')).map(row => ({
            year: row.querySelector('.year-input').value,
            month: row.querySelector('.month-input').value,
            content: row.querySelector('.content-input').value
        })).filter(r => r.year || r.month || r.content);

        const workRowsPdf = Array.from(workList.querySelectorAll('.dynamic-item')).map(row => ({
            year: row.querySelector('.year-input').value,
            month: row.querySelector('.month-input').value,
            content: row.querySelector('.content-input').value
        })).filter(r => r.year || r.month || r.content);

        const pdfHistory = [];
        if (eduRowsPdf.length > 0) {
            pdfHistory.push({ year: '', month: '', content: '学 歴', align: 'center' });
            pdfHistory.push(...eduRowsPdf);
        }
        if (workRowsPdf.length > 0) {
            pdfHistory.push({ year: '', month: '', content: '職 歴', align: 'center' });
            pdfHistory.push(...workRowsPdf);
            pdfHistory.push({ year: '', month: '', content: '以上', align: 'right' });
        }

        const HISTORY_ROWS = 15;
        const historyContent = [
            ...pdfHistory.slice(0, HISTORY_ROWS),
            ...Array(Math.max(0, HISTORY_ROWS - pdfHistory.length)).fill({ year: '', month: '', content: '' })
        ];
        drawTableSection('学歴・職歴', historyContent, HISTORY_ROWS);

        // ===== 免許・資格テーブル =====
        y -= 8;
        const CERT_ROWS = 5;
        const certDomRows = Array.from(certList.querySelectorAll('.dynamic-item'));
        const certContent = [
            ...certDomRows.slice(0, CERT_ROWS).map(row => ({
                year: row.querySelector('.year-input').value,
                month: row.querySelector('.month-input').value,
                content: row.querySelector('.content-input').value
            })),
            ...Array(Math.max(0, CERT_ROWS - certDomRows.length)).fill({ year: '', month: '', content: '' })
        ];
        drawTableSection('免許・資格', certContent, CERT_ROWS);

        // ===== 志望動機セクション =====
        y -= 8;
        const prH = 75;
        y -= prH;
        drawRect(L, y, W, prH);
        drawLine(L, y + prH - 15, R, y + prH - 15);
        drawText('志望の動機、特技、好きな学科、アピールポイントなど', L + 5, y + prH - 12, 8);
        drawMultilineText(pPr.textContent, L + 5, y + prH - 28, 10, 14);

        // ===== 本人希望記入欄 =====
        y -= 5;
        const reqH = 65;
        y -= reqH;
        drawRect(L, y, W, reqH);
        drawLine(L, y + reqH - 15, R, y + reqH - 15);
        drawText('本人希望記入欄（特に給料・職種・勤務時間・勤務地・その他などの希望があれば記入）', L + 5, y + reqH - 12, 8);
        drawMultilineText(pRequests.textContent, L + 5, y + reqH - 28, 10, 14);

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

    } catch (error) {
        console.error('PDF generation failed:', error);
        alert('PDF生成中にエラーが発生しました。\n' + error.message);
    } finally {
        overlay.classList.add('hidden');
    }
}

// Boot
document.addEventListener('DOMContentLoaded', init);
