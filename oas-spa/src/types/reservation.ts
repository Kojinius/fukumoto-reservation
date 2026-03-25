/** 予約ステータス */
export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

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
  /** 要配慮個人情報の同意フラグ（C1: 個人情報保護法 第20条第2項） */
  hasSensitiveDataConsent: boolean;
  /** [H2] リマインダーメール配信同意 */
  reminderEmailConsent: boolean;
  /** キャンセル情報 */
  cancelledBy?: 'admin' | 'patient';
  cancelReason?: string;
  cancelledAt?: string;
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
  /** 要配慮個人情報の同意フラグ（C1） */
  hasSensitiveDataConsent: boolean;
  /** [H2] リマインダーメール配信同意 */
  reminderEmailConsent: boolean;
}

/** 診察履歴レコード（visit_histories コレクション） */
export interface VisitHistoryRecord {
  id: string;
  reservationId: string;
  /** 患者情報スナップショット */
  date: string;
  time: string;
  name: string;
  furigana: string;
  birthdate: string;
  zip: string;
  address: string;
  phone: string;
  email: string;
  gender: Gender;
  visitType: VisitType;
  insurance: InsuranceType;
  symptoms: string;
  notes: string;
  contactMethod: ContactMethod;
  hasSensitiveDataConsent: boolean;
  reminderEmailConsent: boolean;
  /** 予約メタデータ */
  reservationCreatedAt: string;
  reservationStatus: string;
  /** キャンセル情報（キャンセル後に完了にした場合） */
  cancelledBy?: 'admin' | 'patient';
  cancelReason?: string;
  cancelledAt?: string;
  /** 診察完了メタデータ */
  completedAt: string;
  completedBy: string;
  completedByEmail: string;
  createdAt: string;
}

/** 訂正履歴レコード（visit_histories/{id}/corrections サブコレクション） */
export interface CorrectionRecord {
  id: string;
  correctedBy: string;
  correctedByEmail: string;
  correctedAt: string;
  reason: string;
  fields: Partial<Record<string, string>>;
  addendum?: string | null;
  notifiedAt?: string | null;
}

/** 時間スロット（slots コレクション） */
export interface SlotRecord {
  id: string;
  date: string;
  time: string;
  status: 'available' | 'booked' | 'cancelled';
}
