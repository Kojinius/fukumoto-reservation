import { useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { useClinic } from '@/hooks/useClinic';
import { useToast } from '@/hooks/useToast';
import { callFunction } from '@/lib/functions';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { formatDateShort } from '@/utils/date';
import { toHankaku } from '@/utils/security';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { ReservationRecord } from '@/types/reservation';

type Phase = 'search' | 'detail' | 'done';

export default function Cancel() {
  const { clinic } = useClinic();
  const { showToast } = useToast();
  const location = useLocation();
  const passedBookingId = (location.state as { bookingId?: string } | null)?.bookingId ?? '';
  const [phase, setPhase] = useState<Phase>('search');
  const [reservationId, setReservationId] = useState(passedBookingId);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<ReservationRecord | null>(null);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  /** キャンセル可能期限 */
  const cutoffMinutes = clinic?.cancelCutoffMinutes ?? 60;

  function getCancelDeadline(): { canCancel: boolean; deadline: string } {
    if (!booking) return { canCancel: false, deadline: '' };
    const [y, m, d] = booking.date.split('-').map(Number);
    const [h, min] = booking.time.split(':').map(Number);
    const bookingMs = new Date(y, m - 1, d, h, min).getTime();
    const cutoffMs = cutoffMinutes * 60 * 1000;
    const deadlineMs = bookingMs - cutoffMs;
    const now = Date.now();
    const dl = new Date(deadlineMs);
    const deadline = `${dl.getMonth() + 1}月${dl.getDate()}日 ${String(dl.getHours()).padStart(2, '0')}:${String(dl.getMinutes()).padStart(2, '0')}`;
    return { canCancel: now < deadlineMs, deadline };
  }

  /** 予約を検索 */
  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!reservationId.trim() || !phone.trim()) {
      setError('予約番号と電話番号を入力してください');
      return;
    }
    setLoading(true);
    try {
      const result = await callFunction<{ reservation: ReservationRecord }>('verifyReservation', {
        reservationId: reservationId.trim(),
        phone: toHankaku(phone.trim()),
      });
      setBooking(result.reservation);
      setPhase('detail');
    } catch (err: unknown) {
      const e = err as { error?: string; message?: string };
      setError(e?.message || e?.error || '予約が見つかりませんでした');
    } finally {
      setLoading(false);
    }
  }

  /** キャンセル実行 */
  async function handleCancel() {
    setConfirmOpen(false);
    setCancelling(true);
    try {
      await callFunction('cancelReservation', {
        reservationId: reservationId.trim(),
        phone: toHankaku(phone.trim()),
      });
      setPhase('done');
    } catch (err: unknown) {
      const e = err as { error?: string; message?: string };
      showToast(e?.message || 'キャンセルに失敗しました', 'error');
    } finally {
      setCancelling(false);
    }
  }

  /** 別の予約を検索 */
  function reset() {
    setPhase('search');
    setReservationId('');
    setPhone('');
    setBooking(null);
    setError('');
  }

  // 検索画面
  if (phase === 'search') {
    return (
      <div className="animate-fade-in-up">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <h2 className="text-lg font-heading font-bold text-lien-900 dark:text-lien-50">
              予約キャンセル
            </h2>
          </CardHeader>
          <CardBody>
            {error && <Alert variant="error" className="mb-4">{error}</Alert>}
            <form onSubmit={handleSearch} className="space-y-4">
              <Input
                label="予約番号"
                value={reservationId}
                onChange={e => setReservationId(e.target.value)}
                placeholder="予約完了時に発行された番号"
                required
              />
              <Input
                label="電話番号"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="予約時に入力した電話番号"
                required
              />
              <Button type="submit" className="w-full" loading={loading}>
                予約を確認する
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    );
  }

  // 詳細画面
  if (phase === 'detail' && booking) {
    const isAlreadyCancelled = booking.status === 'cancelled';
    const { canCancel, deadline } = getCancelDeadline();

    return (
      <div className="animate-fade-in-up space-y-4 max-w-md mx-auto">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-heading font-bold text-lien-900 dark:text-lien-50">
              予約内容
            </h2>
          </CardHeader>
          <CardBody>
            <dl className="space-y-2 text-sm">
              {[
                ['予約日時', `${formatDateShort(booking.date)} ${booking.time}〜`],
                ['予約番号', booking.id],
                ['氏名', booking.name],
                ['電話番号', booking.phone],
                ['初診/再診', booking.visitType || '-'],
                ['症状', booking.symptoms],
              ].map(([label, val]) => (
                <div key={label} className="flex border-b border-lien-100 dark:border-lien-700 py-2">
                  <dt className="w-24 shrink-0 text-lien-500 dark:text-lien-400">{label}</dt>
                  <dd className="text-lien-900 dark:text-lien-100 break-all">{val}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>

        {isAlreadyCancelled ? (
          <Alert variant="warning">この予約はすでにキャンセル済みです。</Alert>
        ) : !canCancel ? (
          <Alert variant="warning">
            キャンセル受付期限（{cutoffMinutes}分前）を過ぎているため、オンラインでのキャンセルを受け付けられません。
            {clinic?.phone && (
              <span>お電話（<a href={`tel:${clinic.phone}`} className="underline">{clinic.phone}</a>）でご連絡ください。</span>
            )}
          </Alert>
        ) : (
          <>
            <Alert variant="info">キャンセル受付期限: {deadline} まで</Alert>
            <Button variant="danger" className="w-full" onClick={() => setConfirmOpen(true)} loading={cancelling}>
              この予約をキャンセルする
            </Button>
          </>
        )}

        <Button variant="ghost" className="w-full" onClick={reset}>別の予約を確認する</Button>

        <ConfirmDialog
          open={confirmOpen}
          title="キャンセルの確認"
          message="この予約をキャンセルしてもよろしいですか？この操作は取り消せません。"
          okLabel="キャンセルする"
          variant="danger"
          onConfirm={handleCancel}
          onCancel={() => setConfirmOpen(false)}
        />
      </div>
    );
  }

  // 完了画面
  return (
    <div className="animate-fade-in-up">
      <Card className="max-w-md mx-auto text-center">
        <CardBody className="py-8">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-heading font-bold text-lien-900 dark:text-lien-50 mb-2">
            キャンセルが完了しました
          </h2>
          <p className="text-sm text-lien-500 dark:text-lien-400 mb-6">
            ご不明な点がございましたらお電話ください。
          </p>
          <Button variant="secondary" onClick={reset}>トップに戻る</Button>
        </CardBody>
      </Card>
    </div>
  );
}
