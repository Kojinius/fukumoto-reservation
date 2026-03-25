import { Button } from '@/components/ui/Button';
import { useTranslation } from 'react-i18next';
import { formatDateShort, calcAge } from '@/utils/date';
import type { ReservationFormData } from '@/types/reservation';

interface Props {
  form: ReservationFormData;
  loading: boolean;
  onSubmit: () => void;
  onBack: () => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex border-b border-cream-200/80 py-3">
      <dt className="w-28 shrink-0 text-xs text-navy-400 uppercase tracking-wider pt-0.5">{label}</dt>
      <dd className="text-sm text-navy-700 whitespace-pre-wrap break-all font-medium">{value || '-'}</dd>
    </div>
  );
}

export function Confirm({ form, loading, onSubmit, onBack }: Props) {
  const { t, i18n } = useTranslation('booking');
  const address = form.addressSub
    ? `${form.addressMain}　${form.addressSub}`
    : form.addressMain;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* 予約日時 — ネイビーソリッド + mesh */}
      <div className="relative bg-navy-700 text-cream rounded-lg px-6 py-8 text-center overflow-hidden animate-stagger-1">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_25%_30%,rgba(201,169,110,0.1)_0%,transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_70%,rgba(61,97,159,0.12)_0%,transparent_50%)]" />
        <div className="relative">
          <p className="text-[10px] font-display tracking-[0.3em] uppercase text-cream/50 mb-3">
            {t('confirm.appointmentDateTime')}
          </p>
          <p className="text-3xl font-display font-light text-cream tracking-wide">
            {formatDateShort(form.date, i18n.language)}
          </p>
          <p className="text-lg font-mono font-medium text-cream/80 mt-1">
            {form.time}〜
          </p>
        </div>
      </div>

      {/* 基本情報 */}
      <div className="card-section animate-stagger-2">
        <h3 className="section-heading">{t('confirm.basicInfo')}</h3>
        <dl>
          <Row label={t('confirm.labelName')} value={form.name} />
          <Row label={t('confirm.labelFurigana')} value={form.furigana} />
          <Row label={t('confirm.labelBirthdate')} value={form.birthdate + (calcAge(form.birthdate) !== null ? `（${calcAge(form.birthdate)}${t('confirm.labelAgeUnit')}）` : '')} />
          <Row label={t('confirm.labelGender')} value={form.gender || t('confirm.labelGenderUnspecified')} />
          <Row label={t('confirm.labelZip')} value={`〒${form.zip}`} />
          <Row label={t('confirm.labelAddress')} value={address} />
          <Row label={t('confirm.labelPhone')} value={form.phone} />
          <Row label={t('confirm.labelEmail')} value={form.email} />
          <Row label={t('confirm.labelContactMethod')} value={form.contactMethod} />
        </dl>
      </div>

      {/* 診療情報 */}
      <div className="card-section animate-stagger-3">
        <h3 className="section-heading">{t('confirm.medicalInfo')}</h3>
        <dl>
          <Row label={t('confirm.labelVisitType')} value={form.visitType} />
          <Row label={t('confirm.labelInsurance')} value={form.insurance} />
          <Row label={t('confirm.labelSymptoms')} value={form.symptoms} />
          <Row label={t('confirm.labelNotes')} value={form.notes || t('confirm.notesNone')} />
        </dl>
      </div>

      {/* ボタン */}
      <div className="flex justify-between items-center pt-2 animate-stagger-4">
        <Button type="button" variant="ghost" onClick={onBack} disabled={loading}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t('confirm.back')}
        </Button>
        <Button onClick={onSubmit} loading={loading} size="lg">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {t('confirm.submit')}
        </Button>
      </div>
    </div>
  );
}
