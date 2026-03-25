import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, writeBatch, addDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { callFunction } from '@/lib/functions';
import type { ReservationRecord, ReservationStatus, VisitHistoryRecord, CorrectionRecord } from '@/types/reservation';

/** 未確認予約件数リアルタイムリスナー（ヘッダーバッジ用） */
export function usePendingCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const q = query(collection(db, 'reservations'), where('status', '==', 'pending'));
    return onSnapshot(q, snap => setCount(snap.size), () => {});
  }, []);
  return count;
}

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

/** 予約ステータス更新（キャンセルはCF経由で通知メール送信） */
export async function updateReservationStatus(
  booking: ReservationRecord,
  newStatus: ReservationStatus,
  cancelReason?: string,
): Promise<void> {
  if (newStatus === 'cancelled') {
    // CF経由: audit_log + キャンセル通知メール + スロット開放
    // [SEC-CR1] cancelledBy はサーバー側でIDトークンから判定（callFunctionが自動付与）
    await callFunction('cancelReservation', {
      reservationId: booking.id,
      phone: booking.phone,
      cancelReason: cancelReason || '',
    });
    return;
  }

  const batch = writeBatch(db);
  batch.update(doc(db, 'reservations', booking.id), { status: newStatus });
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
export function exportReservationsCsv(
  reservations: ReservationRecord[],
  labels: { headers: string[]; statusLabels: Record<string, string>; filename: string },
): void {
  const escape = (v: string) => `"${(v || '').replace(/"/g, '""')}"`;

  const rows = reservations.map(r => [
    r.id, r.date, r.time, r.name, r.furigana, r.birthdate,
    r.address, r.phone, r.email, r.gender,
    r.visitType, r.insurance, r.symptoms, r.notes,
    r.contactMethod, labels.statusLabels[r.status] || r.status, r.createdAt,
  ].map(escape).join(','));

  const csv = '\uFEFF' + [labels.headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = labels.filename;
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

/** [AUDIT-03] 閲覧ログ記録（アクセストレーサビリティ） */
export async function logAccess(action: string, targetId: string, meta?: Record<string, string>) {
  const user = auth.currentUser;
  if (!user) return;
  await addDoc(collection(db, 'access_logs'), {
    adminUid:   user.uid,
    adminEmail: user.email || '',
    action,
    targetId,
    ...meta,
    timestamp: new Date().toISOString(),
  });
}

/** 診察完了処理（CF呼び出し） */
export async function completeVisit(reservationId: string): Promise<{ visitHistoryId: string }> {
  return callFunction<{ visitHistoryId: string }>('completeVisit', { reservationId });
}

/** 診察履歴リアルタイムリスナー（クエリ上限付き） */
const VISIT_HISTORY_LIMIT = 1000;

export function useVisitHistories() {
  const [histories, setHistories] = useState<VisitHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'visit_histories'),
      orderBy('createdAt', 'desc'),
      limit(VISIT_HISTORY_LIMIT),
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map(d => ({ ...d.data(), id: d.id }) as VisitHistoryRecord);
        // 診察日降順ソート
        data.sort((a, b) => {
          const da = `${a.date} ${a.time}`;
          const db_ = `${b.date} ${b.time}`;
          return db_.localeCompare(da);
        });
        setHistories(data);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, []);

  return { histories, loading };
}

/** 診察履歴CSV出力（監査ログ付き） */
export function exportVisitHistoriesCsv(
  histories: VisitHistoryRecord[],
  labels: { headers: string[]; statusLabels: Record<string, string>; filename: string },
): void {
  const escape = (v: string) => `"${(v || '').replace(/"/g, '""')}"`;

  const rows = histories.map(r => [
    r.reservationId, r.date, r.time, r.name, r.furigana, r.birthdate,
    r.address, r.phone, r.email, r.gender,
    r.visitType, r.insurance, r.symptoms, r.notes,
    r.contactMethod, labels.statusLabels[r.reservationStatus] || r.reservationStatus,
    r.reservationCreatedAt,
    r.completedAt ? new Date(r.completedAt).toLocaleString('ja-JP') : '',
    r.completedByEmail,
  ].map(escape).join(','));

  const csv = '\uFEFF' + [labels.headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = labels.filename;
  a.click();
  URL.revokeObjectURL(url);

  try {
    addDoc(collection(db, 'audit_logs'), {
      action: 'visit_history_csv_export',
      adminUid: auth.currentUser?.uid,
      adminEmail: auth.currentUser?.email,
      recordCount: histories.length,
      timestamp: new Date().toISOString(),
    }).catch(() => {});
  } catch { /* 監査ログ失敗時もCSV続行 */ }
}

/** 診察履歴の訂正（CF呼び出し） */
export async function correctVisitHistory(
  historyId: string,
  reason: string,
  fields?: Record<string, string>,
  addendum?: string,
): Promise<{ correctionId: string; notified: boolean }> {
  return callFunction<{ correctionId: string; notified: boolean }>('correctVisitHistory', {
    historyId, reason, fields, addendum,
  });
}

/** 訂正履歴リアルタイムリスナー（corrections サブコレクション） */
export function useCorrections(historyId: string | null | undefined) {
  const [corrections, setCorrections] = useState<CorrectionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!historyId) {
      setCorrections([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, 'visit_histories', historyId, 'corrections'),
      orderBy('correctedAt', 'desc'),
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map(d => ({ ...d.data(), id: d.id }) as CorrectionRecord);
        setCorrections(data);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, [historyId]);

  return { corrections, loading };
}

/** メールアドレスマスキング */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return `${local.charAt(0)}${'*'.repeat(5)}@${domain}`;
}
