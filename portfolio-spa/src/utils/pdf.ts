/**
 * PDF生成共通ユーティリティ
 * advanced-pdf-engine スキル準拠 — pdf-lib + fontkit (npm)
 */
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const FONT_URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/mplus1p/MPLUS1p-Regular.ttf';

/** フォントバイトキャッシュ（同一セッション内で再利用） */
let fontCache: ArrayBuffer | null = null;

/** A4 PDFDocument + 日本語フォント埋め込み済みを生成 */
export async function createA4Doc(): Promise<{ pdfDoc: PDFDocument; font: PDFFont }> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  if (!fontCache) {
    const res = await fetch(FONT_URL);
    if (!res.ok) throw new Error('フォントの読み込みに失敗しました');
    fontCache = await res.arrayBuffer();
  }

  const font = await pdfDoc.embedFont(fontCache);
  return { pdfDoc, font };
}

/**
 * CJK/ASCII 混在テキスト自動折り返し
 * CJK・全角文字 = fontSize pt / ASCII = fontSize * 0.58 pt（推定）
 */
export function wrapPdfText(text: string, maxWidth: number, fontSize: number): string[] {
  const lines: string[] = [];
  let line = '', w = 0;
  for (const ch of String(text ?? '')) {
    if (ch === '\n') {
      lines.push(line);
      line = '';
      w = 0;
      continue;
    }
    const cp = ch.codePointAt(0)!;
    const cw = (cp >= 0x3000 || (cp >= 0xFF00 && cp <= 0xFFEF)) ? fontSize : fontSize * 0.58;
    if (w + cw > maxWidth && line) {
      lines.push(line);
      line = ch;
      w = cw;
    } else {
      line += ch;
      w += cw;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

/** showSaveFilePicker + fallback で PDF を保存 */
export async function savePdf(uint8Array: Uint8Array, defaultName: string): Promise<void> {
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: defaultName,
        types: [{ description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(uint8Array as unknown as BufferSource);
      await writable.close();
      return;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
    }
  }
  // Fallback: auto-download
  const blob = new Blob([uint8Array as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: defaultName });
  a.click();
  URL.revokeObjectURL(url);
}

/** base64画像 → PDF画像埋め込み（JPG/PNG自動判定） */
export async function embedPhoto(pdfDoc: PDFDocument, base64: string) {
  const imgBytes = await fetch(base64).then(r => r.arrayBuffer());
  const isJpeg = base64.startsWith('data:image/jpeg') || base64.startsWith('data:image/jpg');
  return isJpeg ? pdfDoc.embedJpg(imgBytes) : pdfDoc.embedPng(imgBytes);
}

/** ページにテキスト描画するヘルパー */
export function drawText(
  page: PDFPage, font: PDFFont, txt: string,
  x: number, y: number, size = 10, color = rgb(0, 0, 0),
) {
  if (!txt) return;
  page.drawText(String(txt), { x, y, size, font, color });
}

/** 複数行テキスト描画（改行＋折り返し対応） */
export function drawWrappedText(
  page: PDFPage, font: PDFFont, txt: string,
  x: number, y: number, size: number, maxWidth: number, lineHeight: number,
): number {
  if (!txt) return y;
  const lines = wrapPdfText(txt, maxWidth, size);
  let cy = y;
  for (const line of lines) {
    drawText(page, font, line, x, cy, size);
    cy -= lineHeight;
  }
  return cy;
}
