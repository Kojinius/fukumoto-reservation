import { callFunction, getFunctionUrl } from '@/lib/functions';
import type { ReservationFormData } from '@/types/reservation';

/** 指定日の予約済みスロットを取得（CF proxy経由 — reservationId 非公開） */
export async function fetchBookedSlots(dateStr: string): Promise<string[]> {
  const res = await fetch(
    `${getFunctionUrl('getBookedSlots')}?date=${encodeURIComponent(dateStr)}`,
  );
  if (!res.ok) throw new Error('スロット情報の取得に失敗しました');
  const json = await res.json();
  return json.bookedTimes;
}

interface CreateResult {
  reservationId: string;
}

/** 予約を作成 */
export async function createReservation(
  data: ReservationFormData,
  inputBy?: 'admin',
): Promise<{ bookingId: string }> {
  const payload: Record<string, unknown> = {
    date: data.date,
    time: data.time,
    name: data.name,
    furigana: data.furigana,
    birthdate: data.birthdate,
    zip: data.zip,
    address: data.addressSub
      ? `${data.addressMain}　${data.addressSub}`
      : data.addressMain,
    phone: data.phone,
    email: data.email,
    gender: data.gender,
    visitType: data.visitType,
    insurance: data.insurance,
    symptoms: data.symptoms,
    notes: data.notes,
    contactMethod: data.contactMethod,
    hasSensitiveDataConsent: data.hasSensitiveDataConsent,
  };
  if (inputBy) payload.inputBy = inputBy;
  const result = await callFunction<CreateResult>('createReservation', payload);
  return { bookingId: result.reservationId };
}

// メール送信は createReservation 内部でサーバーサイド処理されるため、
// クライアントからの個別呼び出しは不要（SEC脆弱性対応で廃止）
