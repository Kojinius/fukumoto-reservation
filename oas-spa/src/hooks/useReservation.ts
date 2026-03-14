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

/** 患者確認メール送信（fire & forget） */
export function sendConfirmationEmail(data: {
  to: string; name: string; date: string; time: string;
  visitType: string; bookingId: string;
}): void {
  callFunction('sendReservationEmail', {
    to: data.to,
    name: data.name,
    date: data.date,
    time: data.time,
    menu: data.visitType || '診療',
    id: data.bookingId,
  }).catch(e => console.warn('患者メール送信エラー:', e));
}

/** 管理者通知メール送信（fire & forget） */
export function notifyAdmin(data: {
  bookingId: string; name: string; furigana: string;
  date: string; time: string; visitType: string;
  insurance: string; phone: string; symptoms: string;
  contactMethod: string;
}): void {
  callFunction('notifyAdminOnReservation', {
    id: data.bookingId,
    name: data.name,
    furigana: data.furigana,
    date: data.date,
    time: data.time,
    visitType: data.visitType,
    insurance: data.insurance,
    phone: data.phone,
    symptoms: data.symptoms,
    contactMethod: data.contactMethod,
  }).catch(e => console.warn('管理者通知メール送信エラー:', e));
}
