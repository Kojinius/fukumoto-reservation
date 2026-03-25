/**
 * 問診票 PDF 生成（pdf-lib + fontkit）
 * 日本語フォント: Noto Sans JP（Google Fonts CDN から動的ロード）
 */
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { QuestionnaireRecord } from '@/types/questionnaire';
import { calcAge } from '@/utils/date';

/** ローカル Noto Sans JP Regular TTF（public/fonts/ に配置） */
const NOTO_SANS_JP_URL = '/fonts/NotoSansJP-Regular.ttf';

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN = 40;
const LINE_H = 16;
const SECTION_GAP = 10;

interface PatientInfo {
  name: string;
  furigana: string;
  birthdate: string;
  gender: string;
  phone: string;
  date: string;
  time: string;
  visitType: string;
}

interface PdfLabels {
  title: string;
  patientInfo: string;
  name: string;
  furigana: string;
  birthdate: string;
  age: string;
  gender: string;
  phone: string;
  visitDate: string;
  visitType: string;
  sections: Record<string, string>;
  fields: Record<string, string>;
  painLocations: Record<string, string>;
  /** 「本書は問診票であり診療録ではありません」等の注記 */
  disclaimer?: string;
}

/**
 * 問診票 PDF をバイト列で生成
 */
export async function generateQuestionnairePdf(
  questionnaire: QuestionnaireRecord,
  patient: PatientInfo,
  labels: PdfLabels,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // 日本語フォントを読み込む（ローカル TTF — フォールバック不可、日本語必須）
  const fontRes = await fetch(NOTO_SANS_JP_URL);
  if (!fontRes.ok) throw new Error(`フォント読み込み失敗: ${fontRes.status}`);
  const fontBytes = await fontRes.arrayBuffer();
  const font = await pdfDoc.embedFont(fontBytes);

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const drawText = (text: string, x: number, size: number, color = rgb(0.1, 0.1, 0.15)) => {
    // テキストがページ下端を超えたら新しいページ
    if (y < MARGIN + LINE_H) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
    page.drawText(text, { x, y, size, font, color });
  };

  const wrapText = (text: string, maxWidth: number, size: number): string[] => {
    const lines: string[] = [];
    for (const rawLine of text.split('\n')) {
      if (!rawLine) { lines.push(''); continue; }
      let current = '';
      for (const char of rawLine) {
        const test = current + char;
        const width = font.widthOfTextAtSize(test, size);
        if (width > maxWidth) {
          lines.push(current);
          current = char;
        } else {
          current = test;
        }
      }
      if (current) lines.push(current);
    }
    return lines;
  };

  const drawWrapped = (text: string, x: number, size: number) => {
    const maxW = PAGE_W - x - MARGIN;
    const lines = wrapText(text || '-', maxW, size);
    for (const line of lines) {
      drawText(line, x, size);
      y -= LINE_H;
    }
  };

  const drawSection = (title: string) => {
    y -= SECTION_GAP;
    if (y < MARGIN + LINE_H * 3) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
    // セクション背景バー
    page.drawRectangle({
      x: MARGIN, y: y - 4,
      width: PAGE_W - MARGIN * 2, height: LINE_H + 4,
      color: rgb(0.93, 0.93, 0.95),
    });
    drawText(title, MARGIN + 6, 10, rgb(0.15, 0.18, 0.25));
    y -= LINE_H + 6;
  };

  const drawField = (label: string, value: string) => {
    drawText(`${label}:`, MARGIN + 4, 9, rgb(0.35, 0.35, 0.45));
    drawWrapped(value, MARGIN + 120, 9);
    y -= 2;
  };

  // ── タイトル ──
  const titleWidth = font.widthOfTextAtSize(labels.title, 18);
  drawText(labels.title, (PAGE_W - titleWidth) / 2, 18, rgb(0.1, 0.15, 0.23));
  y -= 28;

  // ── 患者情報 ──
  drawSection(labels.patientInfo);
  const age = calcAge(patient.birthdate);
  drawField(labels.name, patient.name);
  drawField(labels.furigana, patient.furigana);
  drawField(labels.birthdate, `${patient.birthdate}${age !== null ? ` (${age}${labels.age})` : ''}`);
  drawField(labels.gender, patient.gender || '-');
  drawField(labels.phone, patient.phone);
  drawField(labels.visitDate, `${patient.date} ${patient.time}`);
  drawField(labels.visitType, patient.visitType);

  // ── 主訴・症状 ──
  drawSection(labels.sections.mainComplaint);
  drawField(labels.fields.chiefComplaint, questionnaire.chiefComplaint);
  drawField(labels.fields.onsetDate, questionnaire.onsetDate);

  // ── 痛みの詳細 ──
  drawSection(labels.sections.painDetail);
  drawField(labels.fields.painScale, `${questionnaire.painScale} / 10`);
  const painLocs = questionnaire.painLocations
    .map(loc => labels.painLocations[loc] || loc)
    .join('、');
  drawField(labels.fields.painLocations, painLocs || '-');
  drawField(labels.fields.painType, questionnaire.painType);
  drawField(labels.fields.dailyImpact, questionnaire.dailyImpact);

  // ── 既往歴・治療状況 ──
  drawSection(labels.sections.medicalHistory);
  drawField(labels.fields.pastMedicalHistory, questionnaire.pastMedicalHistory);
  drawField(labels.fields.currentTreatments, questionnaire.currentTreatments);
  drawField(labels.fields.currentMedications, questionnaire.currentMedications);
  drawField(labels.fields.allergies, questionnaire.allergies);
  drawField(labels.fields.surgeryHistory, questionnaire.surgeryHistory);

  // ── 生活習慣 ──
  drawSection(labels.sections.lifestyle);
  drawField(labels.fields.sleepQuality, questionnaire.sleepQuality);
  drawField(labels.fields.dietHabits, questionnaire.dietHabits);
  drawField(labels.fields.exerciseHabits, questionnaire.exerciseHabits);
  drawField(labels.fields.stressLevel, `${questionnaire.stressLevel} / 5`);
  if (questionnaire.pregnancyPossibility) {
    const pregMap: Record<string, string> = {
      yes: labels.fields.pregnancyYes || 'あり',
      no: labels.fields.pregnancyNo || 'なし',
      na: labels.fields.pregnancyNa || '該当しない',
    };
    drawField(labels.fields.pregnancyPossibility, pregMap[questionnaire.pregnancyPossibility] || '-');
  }

  // ── その他 ──
  drawSection(labels.sections.other);
  drawField(labels.fields.preferredTreatment, questionnaire.preferredTreatment);
  drawField(labels.fields.additionalNotes, questionnaire.additionalNotes);

  // フッター
  y -= SECTION_GAP;
  const ts = new Date(questionnaire.createdAt).toLocaleString('ja-JP');
  drawText(`記入日時: ${ts}`, MARGIN, 7, rgb(0.5, 0.5, 0.55));

  // 注記: 問診票であり診療録ではない旨
  if (labels.disclaimer) {
    y -= LINE_H;
    drawText(labels.disclaimer, MARGIN, 7, rgb(0.55, 0.45, 0.4));
  }

  return pdfDoc.save();
}

/**
 * PDF をダウンロード（ブラウザ）
 */
export function downloadPdf(pdfBytes: Uint8Array, filename: string) {
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
