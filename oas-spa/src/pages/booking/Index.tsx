import { useState, useCallback } from 'react';
import { StepBar } from '@/components/shared/StepBar';
import { DateTimeSelect } from './DateTimeSelect';
import { PatientForm } from './PatientForm';
import { Confirm } from './Confirm';
import { Complete } from './Complete';
import { useToast } from '@/hooks/useToast';
import { createReservation, fetchBookedSlots } from '@/hooks/useReservation';
import { Alert } from '@/components/ui/Alert';
import type { ReservationFormData } from '@/types/reservation';

const STEPS = [
  { label: '日時選択' },
  { label: '情報入力' },
  { label: '確認' },
  { label: '完了' },
];

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
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ReservationFormData>({ ...INITIAL_FORM });
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
        setSlotTakenMsg('選択した時間はすでに予約が入っています。別の時間を選択してください。');
        // スロットを再取得してStep 1に戻る
        fetchBookedSlots(form.date).catch(() => {});
        updateForm({ time: '' });
        goToStep(1);
      } else {
        showToast('予約の作成に失敗しました', 'error');
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
          onTimeChange={t => updateForm({ time: t })}
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
