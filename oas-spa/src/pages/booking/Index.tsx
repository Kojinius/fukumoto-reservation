import { useState, useCallback } from 'react';
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
      const { bookingId: id } = await createReservation(form);
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
        />
      )}
    </div>
  );
}
