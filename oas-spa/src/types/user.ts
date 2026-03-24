/** 管理者ユーザープロフィール（users コレクション） */
export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  isAdmin: boolean;
  mustChangePassword: boolean;
  /** [C2] 利用規約同意日時（ISO 8601） */
  termsAcceptedAt?: string | null;
  /** [C2] プライバシーポリシー同意日時（ISO 8601） */
  privacyAcceptedAt?: string | null;
  /** [C2] 同意済みバージョン */
  termsVersion?: string | null;
  createdAt: string;
  lastLoginAt?: string;
}
