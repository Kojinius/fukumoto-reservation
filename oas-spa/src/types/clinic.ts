/** 午前/午後の営業時間 */
export interface DaySchedule {
  open: boolean;
  amOpen: boolean;
  amStart: string;
  amEnd: string;
  pmOpen: boolean;
  pmStart: string;
  pmEnd: string;
}

/** 曜日別営業時間（"0"=日〜"6"=土） */
export type BusinessHours = Record<string, DaySchedule>;

/** お知らせ設定 */
export interface Announcement {
  active: boolean;
  type: 'info' | 'warning' | 'maintenance';
  message: string;
  startDate: string | null;
  endDate: string | null;
}

/** メンテナンス設定 */
export interface MaintenanceConfig {
  startDate: string | null;
  endDate: string | null;
}

/** クリニック設定（settings/clinic ドキュメント） */
export interface ClinicSettings {
  /** 基本情報 */
  clinicName: string;
  phone: string;
  clinicUrl: string;
  clinicZip: string;
  clinicAddress: string;
  clinicAddressSub: string;
  clinicLogo: string;
  /** 営業時間 */
  businessHours: BusinessHours;
  /** 休日管理 */
  holidays: string[];
  holidayNames: Record<string, string>;
  /** 予約制限 */
  bookingCutoffMinutes: number;
  cancelCutoffMinutes: number;
  /** 表示・通知 */
  announcement: Announcement;
  maintenance: MaintenanceConfig;
  /** [C2] 利用規約テキスト */
  termsOfService: string;
  /** プライバシーポリシー */
  privacyPolicy: string;
  /** 要配慮個人情報の同意文言（C1: 個人情報保護法 第20条第2項対応） */
  sensitiveDataConsentText: string;
  /** メタデータ */
  updatedAt: string;
}

/** デフォルト営業時間 */
export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  '0': { open: false, amOpen: false, amStart: '9:00', amEnd: '11:30', pmOpen: false, pmStart: '14:00', pmEnd: '19:30' },
  '1': { open: true,  amOpen: true,  amStart: '9:00', amEnd: '11:30', pmOpen: true,  pmStart: '14:00', pmEnd: '19:30' },
  '2': { open: true,  amOpen: true,  amStart: '9:00', amEnd: '11:30', pmOpen: true,  pmStart: '14:00', pmEnd: '19:30' },
  '3': { open: true,  amOpen: true,  amStart: '9:00', amEnd: '11:30', pmOpen: true,  pmStart: '14:00', pmEnd: '19:30' },
  '4': { open: true,  amOpen: true,  amStart: '9:00', amEnd: '11:30', pmOpen: true,  pmStart: '14:00', pmEnd: '19:30' },
  '5': { open: true,  amOpen: true,  amStart: '9:00', amEnd: '11:30', pmOpen: true,  pmStart: '14:00', pmEnd: '19:30' },
  '6': { open: true,  amOpen: true,  amStart: '9:00', amEnd: '11:30', pmOpen: true,  pmStart: '14:00', pmEnd: '17:00' },
};
