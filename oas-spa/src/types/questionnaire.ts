/**
 * 問診票データ型定義
 * 鍼灸院向け — 予約完了後に患者が任意で入力
 */

/** 痛みの部位 */
export type PainLocation =
  | 'head' | 'neck' | 'shoulder_left' | 'shoulder_right'
  | 'upper_back' | 'lower_back' | 'chest'
  | 'arm_left' | 'arm_right' | 'hand_left' | 'hand_right'
  | 'hip_left' | 'hip_right'
  | 'leg_left' | 'leg_right' | 'knee_left' | 'knee_right'
  | 'foot_left' | 'foot_right' | 'abdomen' | 'other';

/** 問診票フォーム入力データ */
export interface QuestionnaireFormData {
  /** 主訴（いちばん困っていること） */
  chiefComplaint: string;
  /** 発症時期 */
  onsetDate: string;
  /** 痛みの程度（0-10） */
  painScale: number;
  /** 痛みの部位 */
  painLocations: PainLocation[];
  /** 痛みの性質 */
  painType: string;
  /** 日常生活への影響 */
  dailyImpact: string;
  /** 既往歴 */
  pastMedicalHistory: string;
  /** 現在の通院・治療 */
  currentTreatments: string;
  /** 服用中の薬 */
  currentMedications: string;
  /** アレルギー */
  allergies: string;
  /** 手術歴 */
  surgeryHistory: string;
  /** 睡眠（時間・質） */
  sleepQuality: string;
  /** 食事（規則性） */
  dietHabits: string;
  /** 運動習慣 */
  exerciseHabits: string;
  /** ストレス度（1-5） */
  stressLevel: number;
  /** 妊娠の可能性（女性のみ） */
  pregnancyPossibility: '' | 'yes' | 'no' | 'na';
  /** 希望する施術 */
  preferredTreatment: string;
  /** その他伝えたいこと */
  additionalNotes: string;
}

/** Firestore 保存形式 */
export interface QuestionnaireRecord extends QuestionnaireFormData {
  id: string;
  reservationId: string;
  patientName: string;
  createdAt: string;
  updatedAt: string;
}
