import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
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
  const { t, i18n } = useTranslation('booking');
  const { clinic } = useClinic();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // メール内リンク ?id=XXX または Complete画面からの state 経由
  const passedBookingId = searchParams.get('id') || (location.state as { bookingId?: string } | null)?.bookingId || '';
  const [phase, setPhase] = useState<Phase>('search');
  const [reservationId, setReservationId] = useState(passedBookingId);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<ReservationRecord | null>(null);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelReasonOther, setCancelReasonOther] = useState('');

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
      setError(t('cancel.validationRequired'));
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
      setError(e?.message || e?.error || t('cancel.notFound'));
    } finally {
      setLoading(false);
    }
  }

  /** キャンセル実行 */
  async function handleCancel() {
    setConfirmOpen(false);
    setCancelling(true);
    try {
      // [SEC-CR1] cancelledBy はサーバー側でIDトークン有無から判定
      await callFunction('cancelReservation', {
        reservationId: reservationId.trim(),
        phone: toHankaku(phone.trim()),
        cancelReason: cancelReason === 'その他' ? (cancelReasonOther || 'その他') : (cancelReason || ''),
      });
      setPhase('done');
    } catch (err: unknown) {
      const e = err as { error?: string; message?: string };
      showToast(e?.message || t('cancel.cancelFailed'), 'error');
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
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-navy-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-navy-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <h2 className="text-lg font-heading font-semibold text-navy-700">
                {t('cancel.searchTitle')}
              </h2>
            </div>
          </CardHeader>
          <CardBody>
            {error && <Alert variant="error" className="mb-4">{error}</Alert>}
            <form onSubmit={handleSearch} className="space-y-4">
              <Input
                label={t('cancel.reservationId')}
                value={reservationId}
                onChange={e => setReservationId(e.target.value)}
                placeholder={t('cancel.reservationIdPlaceholder')}
                required
              />
              <Input
                label={t('cancel.phone')}
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder={t('cancel.phonePlaceholder')}
                required
              />
              <Button type="submit" className="w-full" loading={loading}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                {t('cancel.searchButton')}
              </Button>
            </form>
            <div className="text-center mt-3 pt-3 border-t border-cream-300/60">
              <Link to="/" className="text-sm text-navy-400 hover:text-navy-600 transition-colors">
                {t('cancel.backToTop')}
              </Link>
            </div>
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
            <h2 className="text-lg font-heading font-semibold text-navy-700">
              {t('cancel.detailTitle')}
            </h2>
          </CardHeader>
          <CardBody>
            <dl className="space-y-2 text-sm">
              {[
                [t('cancel.labelDateTime'), `${formatDateShort(booking.date, i18n.language)} ${booking.time}〜`],
                [t('cancel.labelReservationId'), booking.id],
                [t('cancel.labelName'), booking.name],
                [t('cancel.labelPhone'), booking.phone],
                [t('cancel.labelVisitType'), booking.visitType || '-'],
                [t('cancel.labelSymptoms'), booking.symptoms],
              ].map(([label, val]) => (
                <div key={label} className="flex border-b border-cream-200/80 py-2">
                  <dt className="w-24 shrink-0 text-navy-400">{label}</dt>
                  <dd className="text-navy-700 break-all">{val}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>

        {isAlreadyCancelled ? (
          <Alert variant="warning">{t('cancel.alreadyCancelled')}</Alert>
        ) : !canCancel ? (
          <Alert variant="warning">
            {t('cancel.pastCutoff', { minutes: cutoffMinutes })}
            {clinic?.phone && (
              <span>{t('cancel.callUs')}<a href={`tel:${clinic.phone}`} className="underline font-medium">{clinic.phone}</a>{t('cancel.callUsEnd')}</span>
            )}
          </Alert>
        ) : (
          <>
            <Alert variant="info">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('cancel.deadlineLabel', { deadline })}
              </span>
            </Alert>
            <Card>
              <CardBody className="space-y-3">
                <label className="block text-sm font-medium text-navy-600">{t('cancel.reasonLabel')}</label>
                <select
                  value={cancelReason}
                  onChange={e => { setCancelReason(e.target.value); if (e.target.value !== 'その他') setCancelReasonOther(''); }}
                  className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-navy-700 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
                >
                  <option value="">{t('cancel.reasonNone')}</option>
                  <option value="都合がつかなくなった">{t('cancel.reasonSchedule')}</option>
                  <option value="日程を変更したい">{t('cancel.reasonReschedule')}</option>
                  <option value="その他">{t('cancel.reasonOther')}</option>
                </select>
                <p className="text-[11px] text-navy-400 leading-relaxed">{t('cancel.reasonHint')}</p>
                {cancelReason === 'その他' && (
                  <input
                    type="text"
                    value={cancelReasonOther}
                    onChange={e => setCancelReasonOther(e.target.value)}
                    placeholder={t('cancel.reasonOtherPlaceholder')}
                    className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-navy-700 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
                  />
                )}
                <Button variant="danger" className="w-full" onClick={() => setConfirmOpen(true)} loading={cancelling}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {t('cancel.cancelButton')}
                </Button>
              </CardBody>
            </Card>
          </>
        )}

        <Button variant="ghost" className="w-full" onClick={reset}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          {t('cancel.searchOtherButton')}
        </Button>

        <ConfirmDialog
          open={confirmOpen}
          title={t('cancel.confirmTitle')}
          message={t('cancel.confirmMessage')}
          okLabel={t('cancel.confirmOk')}
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
        <CardBody className="py-10">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
                className="check-draw"
              />
            </svg>
          </div>
          <h2 className="text-xl font-heading font-semibold text-navy-700 mb-2">
            {t('cancel.doneTitle')}
          </h2>
          <p className="text-sm text-navy-400 mb-6">
            {t('cancel.doneMessage')}
          </p>
          <Button variant="secondary" onClick={() => navigate('/')}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            {t('cancel.backToTopButton')}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
