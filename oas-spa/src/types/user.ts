/** 管理者ユーザープロフィール（users コレクション） */
export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  isAdmin: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  lastLoginAt?: string;
}
