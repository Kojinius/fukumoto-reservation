import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, writeBatch, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import { callFunction } from '@/lib/functions';
import type { ReservationRecord, ReservationStatus } from '@/types/reservation';

/** 予約リアルタイムリスナー */
export function useReservations() {
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'reservations'),
      (snap) => {
        const data = snap.docs.map(d => ({ ...d.data(), id: d.id }) as ReservationRecord);
        // 日時降順ソート
        data.sort((a, b) => {
          const da = `${a.date} ${a.time}`;
          const db_ = `${b.date} ${b.time}`;
          return db_.localeCompare(da);
        });
        setReservations(data);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, []);

  return { reservations, loading };
}

/** 予約ステータス更新 */
export async function updateReservationStatus(
  booking: ReservationRecord,
  newStatus: ReservationStatus,
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, 'reservations', booking.id), { status: newStatus });

  // キャンセル時はスロットも更新
  if (newStatus === 'cancelled' && booking.date && booking.time) {
    const slotId = `${booking.date}_${booking.time.replace(':', '')}`;
    batch.update(doc(db, 'slots', slotId), { status: 'cancelled' });
  }

  await batch.commit();
}

/** KPI 計算 */
export function useKpis(reservations: ReservationRecord[]) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const monthStr = todayStr.slice(0, 7);

  const active = reservations.filter(r => r.status !== 'cancelled');
  const todayCount = active.filter(r => r.date === todayStr).length;
  const monthCount = active.filter(r => r.date.startsWith(monthStr)).length;
  const newPatients = active.filter(r => r.date.startsWith(monthStr) && r.visitType === '初診').length;
  const pending = reservations.filter(r => r.status === 'pending').length;

  return { todayCount, monthCount, newPatients, pending };
}

/** 管理者ユーザー一覧 */
export function useAdminUsers() {
  const [users, setUsers] = useState<Array<{ uid: string; email: string; createdAt: string }>>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const result = await callFunction<{ users: Array<{ uid: string; email: string; customClaims: Record<string, unknown>; metadata: { creationTime: string } }> }>('listUsers', {}, 'GET');
      const admins = result.users
        .filter(u => !u.email.endsWith('@ams.local'))
        .map(u => ({
          uid: u.uid,
          email: u.email,
          createdAt: u.metadata?.creationTime || '',
        }));
      setUsers(admins);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { users, loading, fetchUsers };
}

/** 管理者ユーザー作成 */
export async function createAdminUser(email: string, password: string): Promise<void> {
  await callFunction('createAdminUser', { email, password, isAdmin: true });
}

/** 管理者ユーザー削除 */
export async function deleteAdminUser(uid: string): Promise<void> {
  await callFunction('deleteUser', { uid }, 'DELETE');
}

/** CSV エクスポート（監査ログ付き） */
export function exportReservationsCsv(reservations: ReservationRecord[]): void {
  const headers = ['予約番号', '予約日', '予約時間', '氏名', 'ふりがな', '生年月日', '住所', '電話番号', 'メール', '性別', '初診/再診', '保険証', '症状', '伝達事項', '連絡方法', 'ステータス', '登録日時'];

  const escape = (v: string) => `"${(v || '').replace(/"/g, '""')}"`;

  const rows = reservations.map(r => [
    r.id, r.date, r.time, r.name, r.furigana, r.birthdate,
    r.address, r.phone, r.email, r.gender,
    r.visitType, r.insurance, r.symptoms, r.notes,
    r.contactMethod, r.status, r.createdAt,
  ].map(escape).join(','));

  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `予約データ_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  // 監査ログをFirestoreに書き込み（エクスポート自体は失敗させない）
  try {
    addDoc(collection(db, 'audit_logs'), {
      action: 'csv_export',
      adminUid: auth.currentUser?.uid,
      adminEmail: auth.currentUser?.email,
      recordCount: reservations.length,
      timestamp: new Date().toISOString(),
    }).catch(() => {
      // 監査ログ書き込み失敗時もCSVエクスポートは続行
    });
  } catch {
    // 同期エラー時もCSVエクスポートは続行
  }
}

/** メールアドレスマスキング */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return `${local.charAt(0)}${'*'.repeat(5)}@${domain}`;
}
