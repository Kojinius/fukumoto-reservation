import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { callFunction } from '@/lib/functions';
import type { ReservationFormData } from '@/types/reservation';

/** 指定日の予約済みスロットを取得 */
export async function fetchBookedSlots(dateStr: string): Promise<string[]> {
  const q = query(collection(db, 'slots'), where('date', '==', dateStr));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => d.data())
    .filter(s => s.status !== 'cancelled')
    .map(s => s.time as string);
}

interface CreateResult {
  reservationId: string;
}

/** 予約を作成 */
export async function createReservation(
  data: ReservationFormData,
): Promise<{ bookingId: string }> {
  const payload = {
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
  };
  const result = await callFunction<CreateResult>('createReservation', payload);
  return { bookingId: result.reservationId };
}

// メール送信は createReservation 内部でサーバーサイド処理されるため、
// クライアントからの個別呼び出しは不要（SEC脆弱性対応で廃止）
