/** 予約ステータス */
export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled';

/** 初診・再診区分 */
export type VisitType = '初診' | '再診';

/** 連絡方法 */
export type ContactMethod = '電話' | 'メール' | 'その他';

/** 保険区分 */
export type InsuranceType = '保険あり' | '保険なし';

/** 性別 */
export type Gender = '男性' | '女性' | '';

/** Firestore 予約レコード（reservations コレクション） */
export interface ReservationRecord {
  id: string;
  date: string;
  time: string;
  status: ReservationStatus;
  /** 患者基本情報 */
  name: string;
  furigana: string;
  birthdate: string;
  zip: string;
  address: string;
  phone: string;
  email: string;
  /** 患者医療情報 */
  gender: Gender;
  visitType: VisitType;
  insurance: InsuranceType;
  symptoms: string;
  notes: string;
  contactMethod: ContactMethod;
  /** メタデータ */
  createdAt: string;
}

/** 予約フォーム入力データ */
export interface ReservationFormData {
  date: string;
  time: string;
  name: string;
  furigana: string;
  birthdate: string;
  zip: string;
  addressMain: string;
  addressSub: string;
  phone: string;
  email: string;
  gender: Gender;
  visitType: VisitType;
  insurance: InsuranceType;
  symptoms: string;
  notes: string;
  contactMethod: ContactMethod;
}

/** 時間スロット（slots コレクション） */
export interface SlotRecord {
  id: string;
  date: string;
  time: string;
  status: 'available' | 'booked' | 'cancelled';
}
