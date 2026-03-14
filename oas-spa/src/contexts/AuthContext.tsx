import { createContext, useEffect, useState, type ReactNode } from 'react';
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
  login: (email: string, password: string) => Promise<{ mustChangePassword: boolean }>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  clearMustChangePassword: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await fetchProfile(u);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

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
    const p = await fetchProfile(cred.user);
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

  async function refreshProfile() {
    if (user) await fetchProfile(user);
  }

  return (
    <AuthContext.Provider value={{
      user, profile, isAdmin, loading,
      login, logout,
      changePassword: changePasswordFn,
      clearMustChangePassword,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
