import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StepBar } from '@/components/shared/StepBar';
import { DateTimeSelect } from './DateTimeSelect';
import { PatientForm } from './PatientForm';
import { Confirm } from './Confirm';
import { Complete } from './Complete';
import { useToast } from '@/hooks/useToast';
import { createReservation, fetchBookedSlots } from '@/hooks/useReservation';
import { Alert } from '@/components/ui/Alert';
import type { ReservationFormData } from '@/types/reservation';

/** フォームの初期値 */
const INITIAL_FORM: ReservationFormData = {
  date: '',
  time: '',
  name: '',
  furigana: '',
  birthdate: '',
  zip: '',
  addressMain: '',
  addressSub: '',
  phone: '',
  email: '',
  gender: '',
  visitType: '初診',
  insurance: '保険あり',
  symptoms: '',
  notes: '',
  contactMethod: '電話',
  hasSensitiveDataConsent: false,
  reminderEmailConsent: false,
};

export default function BookingIndex() {
  const { t } = useTranslation('booking');
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const isAdminProxy = searchParams.get('admin') === '1';
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ReservationFormData>({ ...INITIAL_FORM });

  /** ステップラベル（ローカライズ） */
  const STEPS = [
    { label: t('steps.dateTime') },
    { label: t('steps.patientInfo') },
    { label: t('steps.confirm') },
    { label: t('steps.complete') },
  ];
  const [bookingId, setBookingId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [slotTakenMsg, setSlotTakenMsg] = useState('');

  function goToStep(n: number) {
    setStep(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateForm(patch: Partial<ReservationFormData>) {
    setForm(prev => ({ ...prev, ...patch }));
  }

  /** Step 3 → 予約確定 */
  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setSlotTakenMsg('');
    try {
      // メール送信はサーバーサイド（createReservation内部）で自動処理される
      const { bookingId: id } = await createReservation(form, isAdminProxy ? 'admin' : undefined);
      setBookingId(id);

      goToStep(4);
    } catch (err: unknown) {
      const error = err as { error?: string };
      if (error?.error === 'SLOT_TAKEN') {
        setSlotTakenMsg(t('slotTaken'));
        // スロットを再取得してStep 1に戻る
        fetchBookedSlots(form.date).catch(() => {});
        updateForm({ time: '' });
        goToStep(1);
      } else {
        showToast(t('errors.createFailed'), 'error');
      }
    } finally {
      setSubmitting(false);
    }
  }, [form, showToast]);

  /** 新規予約リセット */
  function handleNewReservation() {
    setForm({ ...INITIAL_FORM });
    setBookingId('');
    setSlotTakenMsg('');
    goToStep(1);
  }

  return (
    <div>
      {/* 管理者代行入力モードバナー */}
      {isAdminProxy && step < 4 && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800">{t('adminProxy.banner')}</p>
            <p className="text-xs text-amber-600 mt-0.5">{t('adminProxy.bannerDesc')}</p>
          </div>
        </div>
      )}

      {step < 4 && <StepBar steps={STEPS} current={step} />}

      {slotTakenMsg && step === 1 && (
        <Alert variant="warning" className="mb-4">{slotTakenMsg}</Alert>
      )}

      {step === 1 && (
        <DateTimeSelect
          date={form.date}
          time={form.time}
          onDateChange={d => updateForm({ date: d })}
          onTimeChange={time => updateForm({ time })}
          onNext={() => goToStep(2)}
        />
      )}

      {step === 2 && (
        <PatientForm
          form={form}
          onUpdate={updateForm}
          onNext={() => goToStep(3)}
          onBack={() => goToStep(1)}
        />
      )}

      {step === 3 && (
        <Confirm
          form={form}
          loading={submitting}
          onSubmit={handleSubmit}
          onBack={() => goToStep(2)}
        />
      )}

      {step === 4 && (
        <Complete
          bookingId={bookingId}
          form={form}
          onNewReservation={handleNewReservation}
          isAdminProxy={isAdminProxy}
        />
      )}
    </div>
  );
}
