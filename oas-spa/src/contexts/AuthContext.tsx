import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  type User,
} from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile } from '@/types/user';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  /** [C2] 利用規約・PP同意が必要か */
  needsConsent: boolean;
  login: (email: string, password: string) => Promise<{ mustChangePassword: boolean }>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  clearMustChangePassword: () => Promise<void>;
  /** [C2] 利用規約・PP同意を記録 */
  acceptConsent: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  /** [C2] settings/terms の currentVersion */
  const [currentTermsVersion, setCurrentTermsVersion] = useState<string | null>(null);

  /** Firestore からプロフィールを取得 */
  async function fetchProfile(u: User): Promise<UserProfile | null> {
    let data: UserProfile | null = null;
    const snap = await getDoc(doc(db, 'users', u.uid));
    if (snap.exists()) {
      data = snap.data() as UserProfile;
      setProfile(data);
    }
    const idToken = await u.getIdTokenResult();
    setIsAdmin(!!idToken.claims.admin);
    return data;
  }

  /** [C2] settings/terms から最新バージョンを取得 */
  async function fetchTermsVersion() {
    const snap = await getDoc(doc(db, 'settings', 'terms'));
    const ver = snap.exists() ? (snap.data().currentVersion as string) : null;
    setCurrentTermsVersion(ver);
    return ver;
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await Promise.all([fetchProfile(u), fetchTermsVersion()]);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setCurrentTermsVersion(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  /** [C2] 利用規約の同意が必要か判定 */
  const needsConsent = useMemo(() => {
    if (!profile || !currentTermsVersion) return false;
    return profile.termsVersion !== currentTermsVersion;
  }, [profile, currentTermsVersion]);

  async function login(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    // 管理者クレーム確認
    const idToken = await cred.user.getIdTokenResult();
    if (!idToken.claims.admin) {
      await signOut(auth);
      throw new Error('管理者権限がありません。');
    }
    setUser(cred.user);
    // 最終ログイン日時を記録
    updateDoc(doc(db, 'users', cred.user.uid), { lastLoginAt: serverTimestamp() }).catch(() => {});
    const [p] = await Promise.all([fetchProfile(cred.user), fetchTermsVersion()]);
    return { mustChangePassword: !!p?.mustChangePassword };
  }

  async function logout() {
    await signOut(auth);
  }

  async function changePasswordFn(currentPassword: string, newPassword: string) {
    const u = auth.currentUser;
    if (!u) throw new Error('ログインしていません。');
    const credential = EmailAuthProvider.credential(u.email!, currentPassword);
    await reauthenticateWithCredential(u, credential);
    await updatePassword(u, newPassword);
  }

  async function clearMustChangePassword() {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), { mustChangePassword: false });
    setProfile(prev => prev ? { ...prev, mustChangePassword: false } : prev);
  }

  /** [C2] 利用規約・PP同意を Firestore に記録 */
  async function acceptConsent() {
    if (!user || !currentTermsVersion) return;
    const now = new Date().toISOString();
    await updateDoc(doc(db, 'users', user.uid), {
      termsAcceptedAt:  now,
      privacyAcceptedAt: now,
      termsVersion:      currentTermsVersion,
    });
    setProfile(prev => prev ? {
      ...prev,
      termsAcceptedAt:  now,
      privacyAcceptedAt: now,
      termsVersion:      currentTermsVersion,
    } : prev);
  }

  async function refreshProfile() {
    if (user) {
      await Promise.all([fetchProfile(user), fetchTermsVersion()]);
    }
  }

  return (
    <AuthContext.Provider value={{
      user, profile, isAdmin, loading, needsConsent,
      login, logout,
      changePassword: changePasswordFn,
      clearMustChangePassword,
      acceptConsent,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
