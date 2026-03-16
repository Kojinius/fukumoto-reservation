/**
 * 職務経歴書作成ページ — レガシー apps/CVCreator を React 化
 * useReducer + useAutoSave + PDF生成（pdf-lib）
 */
import { useReducer, useState, useMemo, useCallback } from 'react';
import type { CVData } from '@/types/cv';
import {
  CV_STORAGE_KEY, initialCVData, initialCVBasic,
  emptyCareer, emptySkill, cvReducer,
} from '@/types/cv';
import { FormAccordion } from '@/components/tools/FormAccordion';
import { FormField } from '@/components/tools/FormField';
import { ZipcodeInput } from '@/components/tools/ZipcodeInput';
import { A4Preview } from '@/components/tools/A4Preview';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useZipcode } from '@/hooks/useZipcode';
import { loadFromStorage, removeFromStorage } from '@/utils/storage';
import { createA4Doc, savePdf } from '@/utils/pdf';
import { cn } from '@/utils/cn';
import { rgb } from 'pdf-lib';

// ── ヘルパー ──
function calcAge(birthdate: string): string {
  if (!birthdate) return '';
  const b = new Date(birthdate), t = new Date();
  let a = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
  return a >= 0 ? `${a}歳` : '';
}

function formatBirthdate(v: string): string {
  if (!v) return '';
  const d = new Date(v);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function loadCVData(_key: string): CVData {
  const saved = loadFromStorage<CVData>(CV_STORAGE_KEY);
  if (!saved) return { ...initialCVData };
  return {
    basic: { ...initialCVBasic, ...saved.basic },
    careers: saved.careers?.length ? saved.careers : [{ ...emptyCareer }],
    skills: saved.skills?.length ? saved.skills : [{ ...emptySkill }],
    photoBase64: saved.photoBase64 ?? null,
  };
}

const inputSm = 'px-2.5 py-1 rounded-md border border-brown-200 dark:border-brown-700 bg-brown-50/50 dark:bg-brown-800/50 text-brown-800 dark:text-brown-100 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors';

// ══════════════════════════════════════
// コンポーネント
// ══════════════════════════════════════
export default function CVCreator() {
  const [state, dispatch] = useReducer(cvReducer, CV_STORAGE_KEY, loadCVData);
  const [mobileTab, setMobileTab] = useState<'form' | 'preview'>('form');
  const [isGenerating, setIsGenerating] = useState(false);

  useAutoSave(CV_STORAGE_KEY, state);

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
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日現在`;
  }, []);

  const handlePdf = useCallback(async () => {
    setIsGenerating(true);
    try { await generateCvPdf(state); }
    catch (e) { console.error(e); alert('PDF生成中にエラーが発生しました。'); }
    finally { setIsGenerating(false); }
  }, [state]);

  const handleReset = useCallback(() => {
    if (!confirm('入力内容をすべてリセットしますか？この操作は取り消せません。')) return;
    dispatch({ type: 'RESET' });
    removeFromStorage(CV_STORAGE_KEY);
  }, []);

  const b = (field: keyof typeof state.basic, value: string) =>
    dispatch({ type: 'SET_BASIC', field, value });

  // プレビュー用
  const previewCareers = useMemo(() =>
    state.careers.filter(c => c.company || c.periodFrom || c.periodTo || c.description),
  [state.careers]);

  const previewSkills = useMemo(() =>
    state.skills.filter(s => s.category || s.content),
  [state.skills]);

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
      <div className={cn('flex-1 min-h-0 lg:flex-none lg:w-[400px] overflow-y-auto', mobileTab !== 'form' && 'hidden lg:block')}>
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
                  options={[{ value: '男性', label: '男性' }, { value: '女性', label: '女性' }, { value: 'その他', label: 'その他' }]} />
                {age && <span className="pb-1 text-[10px] text-accent font-medium whitespace-nowrap">{age}</span>}
              </div>
              <ZipcodeInput value={state.basic.zipcode} onChange={handleZipInput} status={zip.status} message={zip.message} />
              <FormField label="住所（ふりがな）" value={state.basic.address_furigana} onChange={v => b('address_furigana', v)} />
              <FormField label="現住所" as="textarea" rows={2} value={state.basic.address} onChange={v => b('address', v)} />
              <div className="grid grid-cols-2 gap-2">
                <FormField label="電話番号" type="tel" value={state.basic.phone} onChange={v => b('phone', v)} placeholder="090-1234-5678" />
                <FormField label="Eメール" type="email" value={state.basic.email} onChange={v => b('email', v)} placeholder="example@mail.com" />
              </div>
            </div>
          </FormAccordion>

          {/* 02 職務要約 */}
          <FormAccordion title="職務要約" sectionNumber="02">
            <FormField label="職務要約" as="textarea" rows={5}
              value={state.basic.summary} onChange={v => b('summary', v)}
              placeholder="これまでの職歴を簡潔にまとめてください" />
          </FormAccordion>

          {/* 03 職務経歴 */}
          <FormAccordion title="職務経歴" sectionNumber="03">
            <div className="space-y-4">
              {state.careers.map((career, i) => (
                <div key={i} className="rounded-lg border border-brown-200 dark:border-brown-700 p-3 space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-brown-500 dark:text-brown-400">勤務先 {i + 1}</span>
                    {state.careers.length > 1 && (
                      <button type="button" onClick={() => dispatch({ type: 'REMOVE_CAREER', index: i })}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-brown-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    )}
                  </div>
                  <FormField label="会社名" value={career.company}
                    onChange={v => dispatch({ type: 'UPDATE_CAREER', index: i, field: 'company', value: v })} placeholder="株式会社〇〇" />
                  <div className="flex gap-2 items-end">
                    <FormField label="在籍期間（開始）" value={career.periodFrom} className="flex-1"
                      onChange={v => dispatch({ type: 'UPDATE_CAREER', index: i, field: 'periodFrom', value: v })} placeholder="2020年4月" />
                    <span className="pb-2 text-brown-400">〜</span>
                    <FormField label="在籍期間（終了）" value={career.periodTo} className="flex-1"
                      onChange={v => dispatch({ type: 'UPDATE_CAREER', index: i, field: 'periodTo', value: v })} placeholder="現在" />
                  </div>
                  <FormField label="雇用形態" value={career.employmentType}
                    onChange={v => dispatch({ type: 'UPDATE_CAREER', index: i, field: 'employmentType', value: v })} placeholder="正社員" />
                  <FormField label="業務内容" as="textarea" rows={3} value={career.description}
                    onChange={v => dispatch({ type: 'UPDATE_CAREER', index: i, field: 'description', value: v })} placeholder="担当業務の内容を記載" />
                </div>
              ))}
              <button type="button" onClick={() => dispatch({ type: 'ADD_CAREER' })}
                className="w-full py-2 rounded-lg border border-dashed border-brown-300 dark:border-brown-600 text-brown-400 text-xs hover:border-accent hover:text-accent transition-colors cursor-pointer">
                + 勤務先を追加
              </button>
            </div>
          </FormAccordion>

          {/* 04 スキル・資格 */}
          <FormAccordion title="活かせるスキル・知識・資格" sectionNumber="04">
            <div className="space-y-2.5">
              {state.skills.map((skill, i) => (
                <div key={i} className="flex gap-1.5 items-center">
                  <input className={cn(inputSm, 'w-28')} placeholder="カテゴリ" value={skill.category}
                    onChange={e => dispatch({ type: 'UPDATE_SKILL', index: i, field: 'category', value: e.target.value })} />
                  <input className={cn(inputSm, 'flex-1 min-w-0')} placeholder="内容" value={skill.content}
                    onChange={e => dispatch({ type: 'UPDATE_SKILL', index: i, field: 'content', value: e.target.value })} />
                  {state.skills.length > 1 && (
                    <button type="button" onClick={() => dispatch({ type: 'REMOVE_SKILL', index: i })}
                      className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-brown-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => dispatch({ type: 'ADD_SKILL' })}
                className="w-full py-1.5 rounded-lg border border-dashed border-brown-300 dark:border-brown-600 text-brown-400 text-xs hover:border-accent hover:text-accent transition-colors cursor-pointer">
                + 行を追加
              </button>
            </div>
          </FormAccordion>

          {/* 05 自己PR */}
          <FormAccordion title="自己PR" sectionNumber="05">
            <FormField label="自己PR" as="textarea" rows={6}
              value={state.basic.pr} onChange={v => b('pr', v)}
              placeholder="自己PRを記載してください" />
          </FormAccordion>
        </form>
      </div>

      {/* ── プレビューパネル ── */}
      <div className={cn(
        'flex-1 min-h-0 flex-col lg:min-w-0 lg:border-l lg:border-brown-200/60 dark:lg:border-brown-800/60',
        mobileTab === 'preview' ? 'flex' : 'hidden lg:flex',
      )}>
        <A4Preview onGeneratePdf={handlePdf} onReset={handleReset} isGenerating={isGenerating}>
          {/* タイトル */}
          <div className="text-center mb-3">
            <h2 className="text-[24px] font-bold tracking-[0.2em]">職 務 経 歴 書</h2>
            <p className="text-[13px] text-right text-brown-400 mt-1">{dateStr}</p>
          </div>

          {/* 個人情報 */}
          <div className="text-[15px]">
            <div className="border border-brown-300 dark:border-brown-600">
              <div className="flex border-b border-dashed border-brown-200 dark:border-brown-700">
                <div className="w-16 shrink-0 px-2 py-1 text-[13px] text-brown-400 bg-brown-50/80 dark:bg-brown-800/30">ふりがな</div>
                <div className="flex-1 px-3 py-1 truncate">{state.basic.furigana}</div>
              </div>
              <div className="flex border-b border-dashed border-brown-200 dark:border-brown-700">
                <div className="w-16 shrink-0 px-2 py-1 text-[13px] text-brown-400 bg-brown-50/80 dark:bg-brown-800/30">氏名</div>
                <div className="flex-1 px-3 py-1 text-xl font-bold truncate">{state.basic.name}</div>
              </div>
              <div className="flex border-b border-dashed border-brown-200 dark:border-brown-700">
                <div className="w-16 shrink-0 px-2 py-1 text-[13px] text-brown-400 bg-brown-50/80 dark:bg-brown-800/30">生年月日</div>
                <div className="flex-1 px-3 py-1 truncate">
                  {formatBirthdate(state.basic.birthdate)}
                  {state.basic.gender ? `　${state.basic.gender}` : ''}
                  {age ? `　${age}` : ''}
                </div>
              </div>
              {state.basic.zipcode && (
                <div className="flex border-b border-dashed border-brown-200 dark:border-brown-700">
                  <div className="w-16 shrink-0 px-2 py-1 text-[13px] text-brown-400 bg-brown-50/80 dark:bg-brown-800/30">〒</div>
                  <div className="flex-1 px-3 py-1">{state.basic.zipcode}</div>
                </div>
              )}
              {state.basic.address && (
                <div className="flex border-b border-dashed border-brown-200 dark:border-brown-700">
                  <div className="w-16 shrink-0 px-2 py-1 text-[13px] text-brown-400 bg-brown-50/80 dark:bg-brown-800/30">住所</div>
                  <div className="flex-1 px-3 py-1 whitespace-pre-line">{state.basic.address}</div>
                </div>
              )}
              <div className="flex border-b border-dashed border-brown-200 dark:border-brown-700">
                <div className="w-16 shrink-0 px-2 py-1 text-[13px] text-brown-400 bg-brown-50/80 dark:bg-brown-800/30">TEL</div>
                <div className="flex-1 px-3 py-1">{state.basic.phone}</div>
              </div>
              {state.basic.email && (
                <div className="flex">
                  <div className="w-16 shrink-0 px-2 py-1 text-[13px] text-brown-400 bg-brown-50/80 dark:bg-brown-800/30">Email</div>
                  <div className="flex-1 px-3 py-1 text-[15px] break-all">{state.basic.email}</div>
                </div>
              )}
            </div>
          </div>

          {/* 職務要約 */}
          {state.basic.summary && (
            <div className="mt-3">
              <div className="text-base font-bold border-b border-brown-400 dark:border-brown-500 pb-0.5 mb-1">■ 職務要約</div>
              <div className="text-[15px] whitespace-pre-line pl-1">{state.basic.summary}</div>
            </div>
          )}

          {/* 職務経歴 */}
          {previewCareers.length > 0 && (
            <div className="mt-3">
              <div className="text-base font-bold border-b border-brown-400 dark:border-brown-500 pb-0.5 mb-1">■ 職務経歴</div>
              {previewCareers.map((c, i) => (
                <div key={i} className="mb-2">
                  <div className="flex items-center justify-between bg-brown-50 dark:bg-brown-800/30 px-2 py-1 rounded-sm text-base">
                    <span className="font-medium truncate">{c.company}</span>
                    {(c.periodFrom || c.periodTo) && (
                      <span className="text-sm text-brown-400 shrink-0 ml-2">{c.periodFrom}{(c.periodFrom || c.periodTo) ? ' ～ ' : ''}{c.periodTo}</span>
                    )}
                  </div>
                  {c.employmentType && <div className="text-sm text-brown-400 pl-2 mt-0.5">雇用形態：{c.employmentType}</div>}
                  {c.description && <div className="text-[15px] whitespace-pre-line pl-2 mt-0.5">{c.description}</div>}
                </div>
              ))}
            </div>
          )}

          {/* スキル */}
          {previewSkills.length > 0 && (
            <div className="mt-3">
              <div className="text-base font-bold border-b border-brown-400 dark:border-brown-500 pb-0.5 mb-1">■ 活かせるスキル・知識・資格</div>
              <div className="border border-brown-200 dark:border-brown-700">
                {previewSkills.map((s, i) => (
                  <div key={i} className="flex border-b last:border-b-0 border-brown-200 dark:border-brown-700 text-[15px]">
                    <div className="w-28 shrink-0 px-2 py-1 bg-brown-50/80 dark:bg-brown-800/30 font-medium">{s.category}</div>
                    <div className="flex-1 px-2 py-1">{s.content}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 自己PR */}
          {state.basic.pr && (
            <div className="mt-3">
              <div className="text-base font-bold border-b border-brown-400 dark:border-brown-500 pb-0.5 mb-1">■ 自己PR</div>
              <div className="text-[15px] whitespace-pre-line pl-1">{state.basic.pr}</div>
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
async function generateCvPdf(data: CVData) {
  const { pdfDoc, font } = await createA4Doc();
  const page = pdfDoc.addPage([595.28, 841.89]);

  const BORDER_COLOR = rgb(0.75, 0.62, 0.50);
  const GRAY = rgb(0.95, 0.95, 0.95);
  const ORANGE_BG = rgb(1, 0.98, 0.97);

  const drawLine = (x1: number, y1: number, x2: number, y2: number, th = 0.5) =>
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: th });
  const drawDotLine = (x1: number, y1: number, x2: number, y2: number) =>
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.5, color: BORDER_COLOR });
  const drawAccentLine = (x1: number, y1: number, x2: number, y2: number) =>
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.3, color: rgb(0.82, 0.70, 0.58) });
  const t = (txt: string, x: number, y: number, size = 10, color = rgb(0, 0, 0)) => {
    if (!txt) return;
    page.drawText(String(txt), { x, y, size, font, color });
  };
  const fillRect = (x: number, y: number, w: number, h: number, color: ReturnType<typeof rgb>) =>
    page.drawRectangle({ x, y, width: w, height: h, color });
  const strokeRect = (x: number, y: number, w: number, h: number, th = 0.8, bc = rgb(0, 0, 0)) =>
    page.drawRectangle({ x, y, width: w, height: h, borderColor: bc, borderWidth: th });
  const drawWrapped = (txt: string, x: number, yStart: number, size: number, maxW: number, lh: number): number => {
    if (!txt) return yStart;
    let cy = yStart;
    for (const line of txt.split('\n')) {
      let cur = '';
      for (const ch of [...line]) {
        const test = cur + ch;
        if (font.widthOfTextAtSize(test, size) > maxW && cur) {
          t(cur, x, cy, size);
          cy -= lh;
          cur = ch;
        } else { cur = test; }
      }
      if (cur) { t(cur, x, cy, size); cy -= lh; }
    }
    return cy;
  };

  const L = 40, R = 555, W = R - L;
  const { basic, careers, skills } = data;

  // ===== タイトル =====
  let y = 810;
  const titleTxt = '職 務 経 歴 書';
  const titleW = font.widthOfTextAtSize(titleTxt, 18);
  t(titleTxt, L + (W - titleW) / 2, y, 18);
  const now = new Date();
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日現在`;
  const dateW = font.widthOfTextAtSize(dateStr, 8);
  t(dateStr, R - dateW, y, 8, rgb(0.3, 0.3, 0.3));

  // ===== 個人情報 =====
  y -= 18;
  const personalY = y;
  const age = calcAge(basic.birthdate);

  const rows = [
    { label: 'ふりがな', value: basic.furigana, h: 16 },
    { label: '氏　名', value: basic.name, h: 22, size: 13 },
    { label: '生年月日', value: (() => {
        let v = basic.birthdate ? formatBirthdate(basic.birthdate) : '';
        if (basic.gender) v += `　${basic.gender}`;
        if (age) v += `　${age}`;
        return v;
      })(), h: 16 },
    { label: '〒', value: basic.zipcode, h: 14 },
    { label: '住　所', value: basic.address, h: Math.max(16, basic.address.split('\n').filter(l => l.trim()).length * 13), multiline: true },
    { label: 'TEL', value: basic.phone, h: 14 },
    ...(basic.email ? [{ label: 'Email', value: basic.email, h: 14 }] : []),
  ];

  const LBL_W = 50;
  const INFO_W = W;
  let rowY = personalY;
  for (const row of rows) {
    const rowB = rowY - row.h;
    fillRect(L, rowB, INFO_W, row.h, ORANGE_BG);
    fillRect(L, rowB, LBL_W, row.h, rgb(0.98, 0.96, 0.93));
    const lblW = font.widthOfTextAtSize(row.label, 7);
    t(row.label, L + (LBL_W - lblW) / 2, rowB + row.h / 2 - 3, 7, rgb(0.3, 0.2, 0.1));
    if (row.multiline && row.value.includes('\n')) {
      const lines = row.value.split('\n').filter(l => l.trim());
      const lineH = row.h / lines.length;
      lines.forEach((line, i) => t(line, L + LBL_W + 5, rowB + row.h - (i + 0.5) * lineH - 3.5, ('size' in row ? row.size : undefined) ?? 9));
    } else {
      t(row.value, L + LBL_W + 5, rowB + row.h / 2 - 3.5, ('size' in row ? row.size : undefined) ?? 9);
    }
    drawDotLine(L + LBL_W, rowB, L + LBL_W, rowY);
    drawDotLine(L, rowB, L + INFO_W, rowB);
    rowY -= row.h;
  }
  strokeRect(L, rowY, INFO_W, personalY - rowY, 0.8);

  y = rowY - 12;

  // セクション描画
  const drawSection = (title: string) => {
    y -= 8;
    t(title, L, y, 11);
    drawLine(L, y - 3, R, y - 3, 1.5);
    y -= 16;
  };

  // ===== 職務要約 =====
  drawSection('■ 職務要約');
  y = drawWrapped(basic.summary, L + 5, y, 9, W - 10, 14);
  y -= 4;

  // ===== 職務経歴 =====
  drawSection('■ 職務経歴');
  for (const c of careers) {
    if (!c.company && !c.periodFrom && !c.periodTo && !c.description) continue;
    const hdrH = 16;
    fillRect(L, y - hdrH, W, hdrH, GRAY);
    strokeRect(L, y - hdrH, W, hdrH, 0.6);
    t(c.company, L + 5, y - hdrH + 4, 10);
    const period = `${c.periodFrom}${(c.periodFrom || c.periodTo) ? ' ～ ' : ''}${c.periodTo}`;
    if (period.trim()) {
      const pw = font.widthOfTextAtSize(period, 8);
      t(period, R - pw - 5, y - hdrH + 5, 8, rgb(0.35, 0.35, 0.35));
    }
    y -= hdrH;
    if (c.employmentType) { y -= 12; t(`雇用形態：${c.employmentType}`, L + 5, y, 8, rgb(0.4, 0.4, 0.4)); }
    y -= 13;
    y = drawWrapped(c.description, L + 5, y, 9, W - 10, 13);
    y -= 6;
  }

  // ===== スキル =====
  drawSection('■ 活かせるスキル・知識・資格');
  const catW = 100;
  const skillStartY = y + 11;
  const filledSkills = skills.filter(s => s.category || s.content);
  for (const s of filledSkills) {
    fillRect(L, y - 4, catW, 15, rgb(0.98, 0.96, 0.93));
    t(s.category, L + 5, y, 9, rgb(0.3, 0.2, 0.1));
    t(s.content, L + catW + 10, y, 9);
    drawAccentLine(L, y - 4, R, y - 4);
    y -= 15;
  }
  if (filledSkills.length > 0) {
    page.drawLine({ start: { x: L + catW, y: y + 11 }, end: { x: L + catW, y: skillStartY }, thickness: 0.5, color: BORDER_COLOR });
    strokeRect(L, y + 11, W, skillStartY - (y + 11), 0.5, BORDER_COLOR);
  }

  // ===== 自己PR =====
  drawSection('■ 自己PR');
  y = drawWrapped(basic.pr, L + 5, y, 9, W - 10, 14);

  // 保存
  const bytes = await pdfDoc.save();
  const name = basic.name ? `職務経歴書_${basic.name.trim()}.pdf` : `職務経歴書_${Date.now()}.pdf`;
  await savePdf(bytes, name);
}
