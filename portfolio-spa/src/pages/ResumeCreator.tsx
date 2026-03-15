/**
 * 履歴書作成ページ — レガシー apps/ResumeCreator を React 化
 * useReducer + useAutoSave + PDF生成（pdf-lib）
 */
import { useReducer, useState, useMemo, useCallback } from 'react';
import type { ResumeData, HistoryRow, ResumeAction } from '@/types/resume';
import {
  RESUME_STORAGE_KEY, initialResumeData, initialResumeBasic,
  emptyHistoryRow, resumeReducer,
} from '@/types/resume';
import { FormAccordion } from '@/components/tools/FormAccordion';
import { FormField } from '@/components/tools/FormField';
import { PhotoUpload } from '@/components/tools/PhotoUpload';
import { ZipcodeInput } from '@/components/tools/ZipcodeInput';
import { A4Preview } from '@/components/tools/A4Preview';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useZipcode } from '@/hooks/useZipcode';
import { loadFromStorage, removeFromStorage } from '@/utils/storage';
import { createA4Doc, savePdf, embedPhoto } from '@/utils/pdf';
import { cn } from '@/utils/cn';
import { rgb } from 'pdf-lib';

// ── ヘルパー ──
function formatDate(v: string): string {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}年 ${d.getMonth() + 1}月 ${d.getDate()}日`;
}

function calcAge(birthdate: string): string {
  if (!birthdate) return '';
  const b = new Date(birthdate), t = new Date();
  let a = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
  return a >= 0 ? String(a) : '';
}

// ── localStorage 互換ロード ──
function loadResumeData(_key: string): ResumeData {
  const saved = loadFromStorage<ResumeData>(RESUME_STORAGE_KEY);
  if (!saved) return { ...initialResumeData };
  return {
    basic: { ...initialResumeBasic, ...saved.basic },
    edu: saved.edu?.length ? saved.edu : [{ ...emptyHistoryRow }],
    work: saved.work?.length ? saved.work : [{ ...emptyHistoryRow }],
    certs: saved.certs?.length ? saved.certs : [{ ...emptyHistoryRow }],
    photoBase64: saved.photoBase64 ?? null,
  };
}

const inputSm = 'px-2.5 py-1 rounded-md border border-brown-200 dark:border-brown-700 bg-brown-50/50 dark:bg-brown-800/50 text-brown-800 dark:text-brown-100 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors';

// ── 動的行コンポーネント（外部定義 — 再マウント防止） ──
// certs → CERT（単数形）のマッピング
const ACTION_KEY = { edu: 'EDU', work: 'WORK', certs: 'CERT' } as const;

function DynRow({ list, prefix, rows, dispatch }: {
  list: 'edu' | 'work' | 'certs'; prefix: string;
  rows: HistoryRow[]; dispatch: React.Dispatch<ResumeAction>;
}) {
  const key = ACTION_KEY[list];
  return (
    <div className="space-y-2.5">
      {rows.map((row, i) => (
        <div key={`${prefix}-${i}`} className="flex gap-1.5 items-center">
          <input className={cn(inputSm, 'w-16')} placeholder="年" value={row.year}
            onChange={e => dispatch({ type: `UPDATE_${key}` as 'UPDATE_EDU', index: i, field: 'year', value: e.target.value })} />
          <input className={cn(inputSm, 'w-12')} placeholder="月" value={row.month}
            onChange={e => dispatch({ type: `UPDATE_${key}` as 'UPDATE_EDU', index: i, field: 'month', value: e.target.value })} />
          <input className={cn(inputSm, 'flex-1 min-w-0')} placeholder="内容" value={row.content}
            onChange={e => dispatch({ type: `UPDATE_${key}` as 'UPDATE_EDU', index: i, field: 'content', value: e.target.value })} />
          {rows.length > 1 && (
            <button type="button" onClick={() => dispatch({ type: `REMOVE_${key}` as 'REMOVE_EDU', index: i })}
              className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-brown-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          )}
        </div>
      ))}
      <button type="button" onClick={() => dispatch({ type: `ADD_${key}` as 'ADD_EDU' })}
        className="w-full py-1.5 rounded-lg border border-dashed border-brown-300 dark:border-brown-600 text-brown-400 text-xs hover:border-accent hover:text-accent transition-colors cursor-pointer">
        + 行を追加
      </button>
    </div>
  );
}

// ══════════════════════════════════════
// コンポーネント
// ══════════════════════════════════════
export default function ResumeCreator() {
  const [state, dispatch] = useReducer(resumeReducer, RESUME_STORAGE_KEY, loadResumeData);
  const [mobileTab, setMobileTab] = useState<'form' | 'preview'>('form');
  const [isGenerating, setIsGenerating] = useState(false);

  useAutoSave(RESUME_STORAGE_KEY, state);

  const handleAddressFill = useCallback((address: string) => {
    dispatch({ type: 'SET_BASIC', field: 'address', value: address });
  }, []);
  const zip = useZipcode(handleAddressFill);

  const handleZipInput = useCallback((raw: string) => {
    const fmt = zip.formatZipcode(raw);
    dispatch({ type: 'SET_BASIC', field: 'zipcode', value: fmt });
    zip.lookup(fmt);
  }, [zip.formatZipcode, zip.lookup]);

  const age = useMemo(() => calcAge(state.basic.birthdate), [state.basic.birthdate]);

  const dateStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}年 ${d.getMonth() + 1}月 ${d.getDate()}日現在`;
  }, []);

  const handlePdf = useCallback(async () => {
    setIsGenerating(true);
    try { await generateResumePdf(state, age); }
    catch (e) { console.error(e); alert('PDF生成中にエラーが発生しました。'); }
    finally { setIsGenerating(false); }
  }, [state, age]);

  const handleReset = useCallback(() => {
    if (!confirm('入力内容をすべてリセットしますか？この操作は取り消せません。')) return;
    dispatch({ type: 'RESET' });
    removeFromStorage(RESUME_STORAGE_KEY);
  }, []);

  const b = (field: keyof typeof state.basic, value: string) =>
    dispatch({ type: 'SET_BASIC', field, value });

  // プレビュー用
  const previewHistory = useMemo(() => {
    const rows: Array<{ year: string; month: string; content: string; center?: boolean; end?: boolean }> = [];
    const fe = state.edu.filter(r => r.year || r.month || r.content);
    const fw = state.work.filter(r => r.year || r.month || r.content);
    if (fe.length) { rows.push({ year: '', month: '', content: '学 歴', center: true }); rows.push(...fe); }
    if (fw.length) { rows.push({ year: '', month: '', content: '職 歴', center: true }); rows.push(...fw); rows.push({ year: '', month: '', content: '以上', end: true }); }
    return rows;
  }, [state.edu, state.work]);

  const previewCerts = useMemo(() =>
    state.certs.filter(r => r.year || r.month || r.content),
  [state.certs]);

  return (
    <div className="flex flex-col lg:flex-row" style={{ height: 'calc(100vh - 3.5rem)' }}>
      {/* モバイルタブ */}
      <div className="lg:hidden flex border-b border-brown-200 dark:border-brown-800 bg-white dark:bg-brown-950">
        {(['form', 'preview'] as const).map(tab => (
          <button key={tab} type="button" onClick={() => setMobileTab(tab)}
            className={cn('flex-1 py-2.5 text-sm font-medium transition-colors cursor-pointer',
              mobileTab === tab ? 'text-accent border-b-2 border-accent' : 'text-brown-400')}>
            {tab === 'form' ? '入力' : 'プレビュー'}
          </button>
        ))}
      </div>

      {/* ── フォームパネル ── */}
      <div className={cn('lg:w-[400px] lg:shrink-0 overflow-y-auto', mobileTab !== 'form' && 'hidden lg:block')}>
        <form className="p-4 space-y-2.5" onSubmit={e => e.preventDefault()}>
          {/* 01 基本情報 */}
          <FormAccordion title="基本情報" sectionNumber="01" defaultOpen>
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <FormField label="氏名" value={state.basic.name} onChange={v => b('name', v)} required placeholder="山田 太郎" />
                <FormField label="ふりがな" value={state.basic.furigana} onChange={v => b('furigana', v)} placeholder="やまだ たろう" />
              </div>
              <div className="flex gap-2 items-end">
                <FormField label="生年月日" type="date" value={state.basic.birthdate} onChange={v => b('birthdate', v)} className="flex-1" />
                <FormField label="性別" as="select" value={state.basic.gender} onChange={v => b('gender', v)} className="w-20"
                  options={[{ value: '男性', label: '男性' }, { value: '女性', label: '女性' }]} />
                {age && <span className="pb-1 text-[10px] text-accent font-medium whitespace-nowrap">{age}歳</span>}
              </div>
              <div>
                <label className="block text-[10px] font-medium text-brown-500 dark:text-brown-400 mb-0.5">証明写真</label>
                <PhotoUpload value={state.photoBase64} onChange={v => dispatch({ type: 'SET_PHOTO', value: v })} />
              </div>
              <ZipcodeInput value={state.basic.zipcode} onChange={handleZipInput} status={zip.status} message={zip.message} />
              <FormField label="住所（ふりがな）" value={state.basic.address_furigana} onChange={v => b('address_furigana', v)} placeholder="とうきょうと ちよだく" />
              <FormField label="現住所" as="textarea" rows={2} value={state.basic.address} onChange={v => b('address', v)} placeholder="東京都千代田区..." />
              <div className="grid grid-cols-2 gap-2">
                <FormField label="電話番号" type="tel" value={state.basic.phone} onChange={v => b('phone', v)} placeholder="090-1234-5678" />
                <FormField label="Eメール" type="email" value={state.basic.email} onChange={v => b('email', v)} placeholder="example@mail.com" />
              </div>
            </div>
          </FormAccordion>

          {/* 02 学歴・職歴 */}
          <FormAccordion title="学歴・職歴" sectionNumber="02">
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-medium text-brown-500 dark:text-brown-400 mb-2">学歴</h4>
                <DynRow list="edu" prefix="edu" rows={state.edu} dispatch={dispatch} />
              </div>
              <div>
                <h4 className="text-xs font-medium text-brown-500 dark:text-brown-400 mb-2">職歴</h4>
                <DynRow list="work" prefix="work" rows={state.work} dispatch={dispatch} />
              </div>
            </div>
          </FormAccordion>

          {/* 03 免許・資格 */}
          <FormAccordion title="免許・資格" sectionNumber="03">
            <DynRow list="certs" prefix="cert" rows={state.certs} dispatch={dispatch} />
          </FormAccordion>

          {/* 04 志望動機 */}
          <FormAccordion title="志望動機・特技・アピールポイント" sectionNumber="04">
            <FormField label="志望動機・特技・好きな学科・アピールポイントなど" as="textarea" rows={6}
              value={state.basic.pr} onChange={v => b('pr', v)} />
          </FormAccordion>

          {/* 05 本人希望記入欄 */}
          <FormAccordion title="本人希望記入欄" sectionNumber="05">
            <FormField label="特に給料・職種・勤務時間・勤務地・その他の希望" as="textarea" rows={4}
              value={state.basic.requests} onChange={v => b('requests', v)} />
          </FormAccordion>
        </form>
      </div>

      {/* ── プレビューパネル ── */}
      <div className={cn(
        'lg:flex-1 lg:min-w-0 border-l border-brown-200/60 dark:border-brown-800/60',
        mobileTab !== 'preview' && 'hidden lg:flex', 'flex flex-col',
      )}>
        <A4Preview onGeneratePdf={handlePdf} onReset={handleReset} isGenerating={isGenerating}>
          {/* タイトル */}
          <div className="text-center mb-3">
            <h2 className="text-[24px] font-bold tracking-[0.3em]">履 歴 書</h2>
            <p className="text-[13px] text-right text-brown-400 mt-1">{dateStr}</p>
          </div>

          {/* 個人情報 + 写真 */}
          <div className="border border-brown-300 dark:border-brown-600 text-[15px]">
            <div className="flex">
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex-1 border-b border-dashed border-brown-200 dark:border-brown-700 flex items-center">
                  <div className="w-20 shrink-0 self-stretch flex items-center px-2 text-[13px] text-brown-400 border-r border-dashed border-brown-200 dark:border-brown-700">ふりがな</div>
                  <div className="flex-1 px-3 py-1 text-[18px] truncate">{state.basic.furigana}</div>
                </div>
                <div className="flex-[2] border-b border-brown-300 dark:border-brown-600 flex items-center">
                  <div className="w-20 shrink-0 self-stretch flex items-center px-2 text-[13px] text-brown-400 border-r border-dashed border-brown-200 dark:border-brown-700">氏名</div>
                  <div className="flex-1 px-3 py-2 text-[32px] font-bold truncate">{state.basic.name}</div>
                </div>
                <div className="flex-1 flex items-center">
                  <div className="w-20 shrink-0 self-stretch flex items-center px-2 text-[13px] text-brown-400 border-r border-dashed border-brown-200 dark:border-brown-700">生年月日</div>
                  <div className="flex-1 px-3 py-1 truncate">
                    {formatDate(state.basic.birthdate)}{age ? ` 生 (満 ${age} 歳)` : ''}
                  </div>
                  <div className="w-20 shrink-0 self-stretch flex items-center justify-center border-l border-dashed border-brown-200 dark:border-brown-700">{state.basic.gender}</div>
                </div>
              </div>
              <div className="w-36 shrink-0 border-l border-brown-300 dark:border-brown-600 flex items-center justify-center bg-brown-50/50 dark:bg-brown-800/30">
                {state.photoBase64
                  ? <img src={state.photoBase64} alt="写真" className="max-w-full max-h-full object-contain p-1" />
                  : <span className="text-[13px] text-brown-300">写真</span>}
              </div>
            </div>
          </div>

          {/* 連絡先 */}
          <div className="border border-t-0 border-brown-300 dark:border-brown-600 text-[15px]">
            <div className="border-b border-dashed border-brown-200 dark:border-brown-700 flex">
              <div className="w-20 shrink-0 px-2 py-1 text-[13px] text-brown-400 border-r border-dashed border-brown-200 dark:border-brown-700">ふりがな</div>
              <div className="flex-1 px-3 py-1 truncate">{state.basic.address_furigana}</div>
            </div>
            <div className="border-b border-brown-300 dark:border-brown-600 flex">
              <div className="w-20 shrink-0 px-2 py-1 text-[13px] text-brown-400 border-r border-dashed border-brown-200 dark:border-brown-700">現住所</div>
              <div className="flex-1 px-3 py-1">
                {state.basic.zipcode && <div>〒{state.basic.zipcode}</div>}
                <div className="whitespace-pre-line">{state.basic.address}</div>
              </div>
            </div>
            <div className="flex">
              <div className="flex-1 flex border-r border-brown-300 dark:border-brown-600">
                <div className="w-20 shrink-0 px-2 py-1 text-[13px] text-brown-400 border-r border-dashed border-brown-200 dark:border-brown-700">電話</div>
                <div className="flex-1 px-3 py-1 truncate">{state.basic.phone}</div>
              </div>
              <div className="flex-1 flex">
                <div className="w-14 shrink-0 px-2 py-1 text-[13px] text-brown-400 border-r border-dashed border-brown-200 dark:border-brown-700">Email</div>
                <div className="flex-1 px-2 py-1 text-[15px] break-all">{state.basic.email}</div>
              </div>
            </div>
          </div>

          {/* 学歴・職歴テーブル */}
          {previewHistory.length > 0 && (
            <div className="border border-brown-300 dark:border-brown-600 mt-2 text-[15px]">
              <div className="flex bg-brown-50 dark:bg-brown-800/30 border-b border-brown-300 dark:border-brown-600 font-medium">
                <div className="w-12 text-center py-1 border-r border-brown-200 dark:border-brown-700">年</div>
                <div className="w-10 text-center py-1 border-r border-brown-200 dark:border-brown-700">月</div>
                <div className="flex-1 text-center py-1">学歴・職歴</div>
              </div>
              {previewHistory.map((row, i) => (
                <div key={i} className="flex border-b last:border-b-0 border-brown-200 dark:border-brown-700">
                  <div className="w-12 text-center py-1 border-r border-brown-200 dark:border-brown-700">{row.year}</div>
                  <div className="w-10 text-center py-1 border-r border-brown-200 dark:border-brown-700">{row.month}</div>
                  <div className={cn('flex-1 px-2 py-1', row.center && 'text-center font-medium', row.end && 'text-right pr-4')}>
                    {row.content}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 免許・資格テーブル */}
          {previewCerts.length > 0 && (
            <div className="border border-brown-300 dark:border-brown-600 mt-2 text-[15px]">
              <div className="flex bg-brown-50 dark:bg-brown-800/30 border-b border-brown-300 dark:border-brown-600 font-medium">
                <div className="w-12 text-center py-1 border-r border-brown-200 dark:border-brown-700">年</div>
                <div className="w-10 text-center py-1 border-r border-brown-200 dark:border-brown-700">月</div>
                <div className="flex-1 text-center py-1">免許・資格</div>
              </div>
              {previewCerts.map((row, i) => (
                <div key={i} className="flex border-b last:border-b-0 border-brown-200 dark:border-brown-700">
                  <div className="w-12 text-center py-1 border-r border-brown-200 dark:border-brown-700">{row.year}</div>
                  <div className="w-10 text-center py-1 border-r border-brown-200 dark:border-brown-700">{row.month}</div>
                  <div className="flex-1 px-2 py-1">{row.content}</div>
                </div>
              ))}
            </div>
          )}

          {/* 志望動機 */}
          {state.basic.pr && (
            <div className="border border-brown-300 dark:border-brown-600 mt-2 p-2 text-[15px]">
              <div className="text-sm text-brown-400 mb-1">志望動機・特技・アピールポイント</div>
              <div className="whitespace-pre-line">{state.basic.pr}</div>
            </div>
          )}

          {/* 本人希望記入欄 */}
          {state.basic.requests && (
            <div className="border border-brown-300 dark:border-brown-600 mt-2 p-2 text-[15px]">
              <div className="text-sm text-brown-400 mb-1">本人希望記入欄</div>
              <div className="whitespace-pre-line">{state.basic.requests}</div>
            </div>
          )}
        </A4Preview>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// PDF生成 — レガシー app.js のレイアウトを忠実に移植
// ══════════════════════════════════════
async function generateResumePdf(data: ResumeData, age: string) {
  const { pdfDoc, font } = await createA4Doc();
  const page = pdfDoc.addPage([595.28, 841.89]);

  // ヘルパー
  const drawLine = (x1: number, y1: number, x2: number, y2: number) =>
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.5 });
  const drawDottedLine = (x1: number, y1: number, x2: number, y2: number) =>
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.5, dashArray: [2, 2] });
  const t = (txt: string, x: number, y: number, size = 10) => {
    if (!txt) return;
    page.drawText(String(txt), { x, y, size, font });
  };
  const drawRect = (x: number, y: number, w: number, h: number) =>
    page.drawRectangle({ x, y, width: w, height: h, borderColor: rgb(0, 0, 0), borderWidth: 0.5 });
  const drawMultiline = (txt: string, x: number, y: number, size: number, lh: number) => {
    if (!txt) return;
    for (const line of txt.split('\n')) { t(line, x, y, size); y -= lh; }
  };

  const L = 40, R = 555, W = 515;
  const LBL = 85, ROW_H = 17, INFO_R = 435;
  const { basic, edu, work, certs, photoBase64 } = data;

  // ===== タイトル =====
  let y = 800;
  t('履 歴 書', 250, y, 20);
  const now = new Date();
  t(`${now.getFullYear()}年 ${now.getMonth() + 1}月 ${now.getDate()}日現在`, 430, y, 10);

  // ===== 上部セクション（氏名・生年月日・写真）=====
  const topH = 130, topTop = y - 10, topBottom = topTop - topH;
  drawRect(L, topBottom, INFO_R - L, topH);
  drawRect(INFO_R, topBottom, R - INFO_R, topH);

  // ふりがな行 (25pt)
  const furiganaB = topTop - 25;
  drawLine(L, furiganaB, INFO_R, furiganaB);
  drawDottedLine(LBL, topTop, LBL, furiganaB);
  t('ふりがな', L + 5, furiganaB + 8, 7);
  t(basic.furigana, LBL + 8, furiganaB + 6, 10);

  // 氏名行 (75pt)
  const nameB = furiganaB - 75;
  drawLine(L, nameB, INFO_R, nameB);
  drawDottedLine(LBL, furiganaB, LBL, nameB);
  t('氏名', L + 15, nameB + 32, 7);
  t(basic.name, LBL + 8, nameB + 22, 24);

  // 生年月日行 (30pt)
  drawDottedLine(LBL, nameB, LBL, topBottom);
  t('生年月日', L + 3, topBottom + 11, 7);
  const birthTxt = formatDate(basic.birthdate) + (age ? ` 生 (満 ${age} 歳)` : '');
  t(birthTxt, LBL + 8, topBottom + 10, 10);

  // 性別
  const genderX = 350;
  drawLine(genderX, nameB, genderX, topBottom);
  drawDottedLine(genderX + 30, nameB, genderX + 30, topBottom);
  t('性別', genderX + 5, topBottom + 11, 7);
  if (basic.gender) {
    const gw = font.widthOfTextAtSize(basic.gender, 12);
    t(basic.gender, genderX + 30 + (INFO_R - genderX - 30 - gw) / 2, topBottom + 10, 12);
  }

  // 写真
  if (photoBase64) {
    try {
      const img = await embedPhoto(pdfDoc, photoBase64);
      const bw = R - INFO_R - 10, bh = topH - 10, d = img.scale(1);
      const ar = d.width / d.height, br = bw / bh;
      const [dw, dh] = ar > br ? [bw, bw / ar] : [bh * ar, bh];
      page.drawImage(img, { x: INFO_R + 5 + (bw - dw) / 2, y: topBottom + 5 + (bh - dh) / 2, width: dw, height: dh });
    } catch { /* 写真埋め込み失敗 */ }
  } else {
    const pl = '写真を貼る位置', pw = font.widthOfTextAtSize(pl, 8);
    t(pl, INFO_R + (R - INFO_R - pw) / 2, topBottom + topH / 2 - 4, 8);
  }

  y = topBottom;

  // ===== 連絡先セクション =====
  const contactH = 70, contactB = y - contactH, phoneL = 330;
  drawRect(L, contactB, phoneL - L, contactH);

  const addrFuriB = y - 20;
  drawLine(L, addrFuriB, phoneL, addrFuriB);
  drawDottedLine(LBL, y, LBL, addrFuriB);
  t('ふりがな', L + 5, addrFuriB + 5, 7);
  t(basic.address_furigana, LBL + 8, addrFuriB + 5, 8);

  drawDottedLine(LBL, addrFuriB, LBL, contactB);
  t('現住所', L + 10, contactB + 25, 7);
  const addrLines: string[] = [];
  if (basic.zipcode) addrLines.push('〒' + basic.zipcode);
  basic.address.split('\n').filter(l => l.trim()).forEach(l => addrLines.push(l));
  const addrBoxH = addrFuriB - contactB, aLh = 13;
  const totalAH = addrLines.length * aLh;
  let addrY = addrFuriB - ((addrBoxH - totalAH) / 2) - 9;
  addrLines.slice(0, 4).forEach(line => { t(line, LBL + 8, addrY, 9); addrY -= aLh; });

  drawRect(phoneL, contactB, R - phoneL, contactH);
  const phoneMid = y - 35, phoneLblR = phoneL + 50;
  drawLine(phoneL, phoneMid, R, phoneMid);
  drawDottedLine(phoneLblR, y, phoneLblR, phoneMid);
  t('電話番号', phoneL + 5, phoneMid + 12, 7);
  t(basic.phone, phoneLblR + 8, phoneMid + 12, 10);
  drawDottedLine(phoneLblR, phoneMid, phoneLblR, contactB);
  t('Email', phoneL + 10, contactB + 12, 7);
  let emailSize = 10;
  const maxEW = R - phoneLblR - 15;
  while (basic.email && font.widthOfTextAtSize(basic.email, emailSize) > maxEW && emailSize > 5) emailSize -= 0.5;
  t(basic.email, phoneLblR + 8, contactB + 12, emailSize);

  y = contactB;

  // ===== テーブル描画ヘルパー =====
  const colYearR = L + 60, colMonthR = colYearR + 40;
  const BLACK = rgb(0, 0, 0);

  const drawTableSection = (title: string, rows: Array<{ year: string; month: string; content: string; align?: string }>, numRows: number) => {
    const tTop = y, totalH = (1 + numRows) * ROW_H, tBot = tTop - totalH;
    page.drawRectangle({ x: L, y: tBot, width: W, height: totalH, borderColor: BLACK, borderWidth: 0.75 });
    page.drawLine({ start: { x: colYearR, y: tBot }, end: { x: colYearR, y: tTop }, thickness: 0.5 });
    page.drawLine({ start: { x: colMonthR, y: tBot }, end: { x: colMonthR, y: tTop }, thickness: 0.5 });
    for (let i = 1; i <= numRows; i++)
      page.drawLine({ start: { x: L, y: tTop - i * ROW_H }, end: { x: L + W, y: tTop - i * ROW_H }, thickness: 0.5 });

    const hY = tTop - ROW_H + 4;
    const yW = font.widthOfTextAtSize('年', 10);
    t('年', L + (colYearR - L - yW) / 2, hY, 10);
    const mW = font.widthOfTextAtSize('月', 10);
    t('月', colYearR + (colMonthR - colYearR - mW) / 2, hY, 10);
    const tw = font.widthOfTextAtSize(title, 10);
    t(title, colMonthR + (W - (colMonthR - L) - tw) / 2, hY, 10);

    rows.forEach((row, i) => {
      const rY = tTop - (i + 2) * ROW_H + 4;
      if (row.year) { const w = font.widthOfTextAtSize(row.year, 10); t(row.year, L + (colYearR - L - w) / 2, rY, 10); }
      if (row.month) { const w = font.widthOfTextAtSize(row.month, 10); t(row.month, colYearR + (colMonthR - colYearR - w) / 2, rY, 10); }
      if (row.content) {
        if (row.align === 'center') { const cw = font.widthOfTextAtSize(row.content, 10); t(row.content, colMonthR + (W - (colMonthR - L) - cw) / 2, rY, 10); }
        else if (row.align === 'right') { const cw = font.widthOfTextAtSize(row.content, 10); t(row.content, L + W - 10 - cw, rY, 10); }
        else t(row.content, colMonthR + 10, rY, 10);
      }
    });
    y = tBot;
  };

  // 学歴・職歴
  y -= 10;
  const eduR = edu.filter(r => r.year || r.month || r.content);
  const workR = work.filter(r => r.year || r.month || r.content);
  const hist: Array<{ year: string; month: string; content: string; align?: string }> = [];
  if (eduR.length) { hist.push({ year: '', month: '', content: '学 歴', align: 'center' }); hist.push(...eduR); }
  if (workR.length) { hist.push({ year: '', month: '', content: '職 歴', align: 'center' }); hist.push(...workR); hist.push({ year: '', month: '', content: '以上', align: 'right' }); }
  const HR = 15;
  const histContent = [...hist.slice(0, HR), ...Array(Math.max(0, HR - hist.length)).fill({ year: '', month: '', content: '' })];
  drawTableSection('学歴・職歴', histContent, HR);

  // 免許・資格
  y -= 8;
  const CR = 5;
  const certR = certs.filter(r => r.year || r.month || r.content);
  const certContent = [...certR.slice(0, CR), ...Array(Math.max(0, CR - certR.length)).fill({ year: '', month: '', content: '' })];
  drawTableSection('免許・資格', certContent, CR);

  // 志望動機
  y -= 8;
  const prH = 75; y -= prH;
  drawRect(L, y, W, prH);
  drawLine(L, y + prH - 15, R, y + prH - 15);
  t('志望の動機、特技、好きな学科、アピールポイントなど', L + 5, y + prH - 12, 8);
  drawMultiline(basic.pr, L + 5, y + prH - 28, 10, 14);

  // 本人希望記入欄
  y -= 5;
  const reqH = 65; y -= reqH;
  drawRect(L, y, W, reqH);
  drawLine(L, y + reqH - 15, R, y + reqH - 15);
  t('本人希望記入欄（特に給料・職種・勤務時間・勤務地・その他などの希望があれば記入）', L + 5, y + reqH - 12, 8);
  drawMultiline(basic.requests, L + 5, y + reqH - 28, 10, 14);

  // 保存
  const bytes = await pdfDoc.save();
  const name = basic.name ? `履歴書_${basic.name.trim()}.pdf` : `履歴書_${Date.now()}.pdf`;
  await savePdf(bytes, name);
}
