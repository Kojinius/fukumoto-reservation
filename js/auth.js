import { auth } from "./firebase.js";
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    browserSessionPersistence,
    setPersistence,
    sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

// 管理画面の保護：admin クレームがなければ login.html へ
export function requireAdmin() {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                window.location.href = "/login.html";
                return;
            }
            const token = await user.getIdTokenResult();
            if (!token.claims.admin) {
                await signOut(auth);
                window.location.href = "/login.html";
                return;
            }
            resolve(user);
        });
    });
}

// ログイン（ユーザー列挙攻撃対策済みメッセージ）
export async function login(email, password) {
    await setPersistence(auth, browserSessionPersistence);
    try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const token = await cred.user.getIdTokenResult();
        if (!token.claims.admin) {
            await signOut(auth);
            throw new Error("管理者権限がありません");
        }
        return cred.user;
    } catch (err) {
        const safeMessages = {
            "auth/user-not-found":   "メールアドレスまたはパスワードが正しくありません",
            "auth/wrong-password":   "メールアドレスまたはパスワードが正しくありません",
            "auth/invalid-credential": "メールアドレスまたはパスワードが正しくありません",
            "auth/invalid-email":    "メールアドレスの形式が正しくありません",
            "auth/too-many-requests":"ログイン試行回数が多すぎます。しばらくお待ちください",
        };
        throw new Error(safeMessages[err.code] || err.message || "ログインに失敗しました");
    }
}

// パスワード再設定メール送信
export async function sendPasswordReset(email) {
    try {
        await sendPasswordResetEmail(auth, email);
    } catch (err) {
        const safeMessages = {
            "auth/user-not-found": "メールアドレスが登録されていません",
            "auth/invalid-email":  "メールアドレスの形式が正しくありません",
        };
        throw new Error(safeMessages[err.code] || "送信に失敗しました");
    }
}

// ログアウト
export async function logout() {
    await signOut(auth);
    window.location.href = "/login.html";
}
