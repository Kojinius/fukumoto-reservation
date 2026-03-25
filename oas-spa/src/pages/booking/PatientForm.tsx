import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { lookupZip } from '@/utils/zip';
import { toHankaku } from '@/utils/security';
import { isValidPhone, isValidEmail, isValidFurigana, isValidZip } from '@/utils/validation';
import { calcAge } from '@/utils/date';
import { cn } from '@/utils/cn';
import { useClinic } from '@/hooks/useClinic';
import type { ReservationFormData, Gender, VisitType, InsuranceType, ContactMethod } from '@/types/reservation';

interface Props {
  form: ReservationFormData;
  onUpdate: (patch: Partial<ReservationFormData>) => void;
  onNext: () => void;
  onBack: () => void;
  privacyPolicyUrl?: string;
}

export function PatientForm({ form, onUpdate, onNext, onBack, privacyPolicyUrl }: Props) {
  const { t } = useTranslation('booking');
  const { clinic } = useClinic();
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [sensitiveConsentError, setSensitiveConsentError] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [zipMsg, setZipMsg] = useState('');

  /** 要配慮個人情報の同意文言（管理画面で設定可能、未設定時はi18nデフォルト） */
  const sensitiveDataText = clinic?.sensitiveDataConsentText?.trim() || t('patientForm.sensitiveDataBody');
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  /* 郵便番号自動検索（CVCreator方式） — 7桁入力で自動的に住所取得 */
  useEffect(() => {
    const digits = form.zip.replace(/[^\d]/g, '');
    if (digits.length !== 7) { setZipMsg(''); return; }
    setZipMsg(t('patientForm.zipSearching'));
    const timer = setTimeout(async () => {
      try {
        const addr = await lookupZip(digits);
        if (addr) {
          onUpdateRef.current({ addressMain: addr });
          setZipMsg(t('patientForm.zipFound'));
        } else {
          setZipMsg(t('patientForm.zipNotFound'));
        }
      } catch {
        setZipMsg(t('patientForm.zipError'));
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [form.zip]);

  function handleZipInput(raw: string) {
    let digits = toHankaku(raw).replace(/[^\d]/g, '');
    if (digits.length > 7) digits = digits.slice(0, 7);
    const formatted = digits.length > 3 ? digits.slice(0, 3) + '-' + digits.slice(3) : digits;
    onUpdate({ zip: formatted });
  }

  function validate(): boolean {
    const errs: string[] = [];
    // 必須チェック
    if (!form.name.trim()) errs.push(t('patientForm.validationNameRequired'));
    if (!form.furigana.trim()) {
      errs.push(t('patientForm.validationFuriganaRequired'));
    } else if (!isValidFurigana(form.furigana)) {
      // ふりがな形式チェック（ひらがな・カタカナ・スペースのみ）
      errs.push(t('patientForm.validationFuriganaFormat'));
    }
    if (!form.birthdate) errs.push(t('patientForm.validationBirthdateRequired'));
    if (!form.zip.trim()) {
      errs.push(t('patientForm.validationZipRequired'));
    } else if (!isValidZip(form.zip)) {
      // 郵便番号形式チェック（7桁数字、ハイフン任意）
      errs.push(t('patientForm.validationZipFormat'));
    }
    if (!form.addressMain.trim()) errs.push(t('patientForm.validationAddressRequired'));
    if (!form.phone.trim()) {
      errs.push(t('patientForm.validationPhoneRequired'));
    } else if (!isValidPhone(toHankaku(form.phone))) {
      // 電話番号形式チェック（半角数字・ハイフン、10〜15桁）
      errs.push(t('patientForm.validationPhoneFormat'));
    }
    // メール：連絡方法がメールの場合は必須、それ以外は入力時のみ形式チェック
    if (form.contactMethod === 'メール' && !form.email.trim()) {
      errs.push(t('patientForm.validationEmailRequiredForMail'));
    } else if (form.email.trim() && !isValidEmail(form.email)) {
      errs.push(t('patientForm.validationEmailFormat'));
    }
    if (!form.hasSensitiveDataConsent) errs.push(t('patientForm.validationSensitiveConsent'));
    if (!form.symptoms.trim()) errs.push(t('patientForm.validationSymptomsRequired'));
    setSensitiveConsentError(!form.hasSensitiveDataConsent);
    setConsentError(!consent);
    setErrors(errs);
    return errs.length === 0 && consent;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onUpdate({ phone: toHankaku(form.phone) });
    if (validate()) onNext();
  }

  const age = form.birthdate ? calcAge(form.birthdate) : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up">
      {errors.length > 0 && (
        <Alert variant="error">
          <ul className="list-disc list-inside space-y-0.5">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </Alert>
      )}

      {/* 基本情報 */}
      <div className="card-section space-y-4 animate-stagger-1">
        <h3 className="section-heading">
          <span>{t('patientForm.basicInfo')}</span>
          <span className="ml-auto text-[10px] text-navy-400 font-normal font-body tracking-wider">{t('patientForm.required')}</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label={t('patientForm.name')} value={form.name} onChange={e => onUpdate({ name: e.target.value })} placeholder={t('patientForm.namePlaceholder')} required />
          <Input label={t('patientForm.furigana')} value={form.furigana} onChange={e => onUpdate({ furigana: e.target.value })} placeholder={t('patientForm.furiganaPlaceholder')} required />
        </div>
        {/* 生年月日 + 年齢 + 性別 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-end gap-2">
            <div className="w-40 shrink-0">
              <Input label={t('patientForm.birthdate')} type="date" value={form.birthdate} onChange={e => onUpdate({ birthdate: e.target.value })} required />
            </div>
            <span className={cn(
              'inline-flex items-center px-2 py-2 rounded-md text-xs font-medium font-mono shrink-0 mb-px min-w-[3rem] justify-center',
              age !== null ? 'bg-gold-50 text-gold-500' : 'bg-cream-100 text-navy-300',
            )}>
              {age !== null ? `${age}${t('patientForm.ageUnit')}` : t('patientForm.ageDash')}
            </span>
            <div className="w-[5.5rem] shrink-0">
              <Select
                label={t('patientForm.gender')}
                value={form.gender}
                onChange={e => onUpdate({ gender: e.target.value as Gender })}
                options={[
                  { value: '', label: t('patientForm.genderUnspecified') },
                  { value: '男性', label: t('patientForm.genderMale') },
                  { value: '女性', label: t('patientForm.genderFemale') },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 連絡先 */}
      <div className="card-section space-y-4 animate-stagger-2">
        <h3 className="section-heading">
          <span>{t('patientForm.contact')}</span>
        </h3>
        <div className="flex flex-wrap gap-4 items-end">
          {/* 郵便番号 — 〒プレフィックス + 自動検索（CVCreator方式） */}
          <div>
            <label className="block text-xs tracking-wider uppercase text-navy-400 font-body mb-1.5">{t('patientForm.zip')}</label>
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-navy-400 font-medium shrink-0">〒</span>
              <input
                value={form.zip}
                onChange={e => handleZipInput(e.target.value)}
                placeholder={t('patientForm.zipPlaceholder')}
                maxLength={8}
                required
                className="w-28 rounded-lg border border-cream-300 bg-white px-3 py-2.5 text-sm font-body text-navy-700 placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-all duration-200 hover:border-navy-200"
              />
              {zipMsg && (
                <span className={cn(
                  'text-xs font-bold whitespace-nowrap',
                  zipMsg.includes('✓') ? 'text-success' : zipMsg.includes('検索中') ? 'text-navy-400' : 'text-danger',
                )}>{zipMsg}</span>
              )}
            </div>
          </div>
          <Input label={t('patientForm.phone')} type="tel" value={form.phone} onChange={e => onUpdate({ phone: e.target.value })} placeholder={t('patientForm.phonePlaceholder')} required className="w-44" />
        </div>
        <Input label={t('patientForm.addressMain')} value={form.addressMain} onChange={e => onUpdate({ addressMain: e.target.value })} placeholder={t('patientForm.addressMainPlaceholder')} required />
        <Input label={t('patientForm.addressSub')} value={form.addressSub} onChange={e => onUpdate({ addressSub: e.target.value })} placeholder={t('patientForm.addressSubPlaceholder')} />
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_10rem] gap-4">
          <Input label={t('patientForm.email')} type="email" value={form.email} onChange={e => onUpdate({ email: e.target.value })} placeholder={t('patientForm.emailPlaceholder')} />
          <Select
            label={t('patientForm.contactMethod')}
            value={form.contactMethod}
            onChange={e => onUpdate({ contactMethod: e.target.value as ContactMethod })}
            options={[
              { value: '電話', label: t('patientForm.contactPhone') },
              { value: 'メール', label: t('patientForm.contactEmail') },
              { value: 'その他', label: t('patientForm.contactOther') },
            ]}
          />
        </div>
      </div>

      {/* 診療情報 */}
      <div className="card-section space-y-4 animate-stagger-3">
        <h3 className="section-heading">
          <span>{t('patientForm.medicalInfo')}</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-[8rem_10rem] gap-4">
          <Select
            label={t('patientForm.visitType')}
            value={form.visitType}
            onChange={e => onUpdate({ visitType: e.target.value as VisitType })}
            options={[
              { value: '初診', label: t('patientForm.visitTypeFirst') },
              { value: '再診', label: t('patientForm.visitTypeReturn') },
            ]}
          />
          <Select
            label={t('patientForm.insurance')}
            value={form.insurance}
            onChange={e => onUpdate({ insurance: e.target.value as InsuranceType })}
            options={[
              { value: '保険あり', label: t('patientForm.insuranceWith') },
              { value: '保険なし', label: t('patientForm.insuranceWithout') },
            ]}
          />
        </div>
        {/* [C1] 要配慮個人情報の同意（個人情報保護法 第20条第2項） */}
        <div className={cn(
          'rounded-lg border p-4 transition-all duration-200',
          sensitiveConsentError ? 'border-danger bg-red-50/50 shadow-[0_0_0_3px_rgba(194,91,86,0.08)]' : 'border-cream-300/60 bg-cream-50/50',
          form.hasSensitiveDataConsent && !sensitiveConsentError && 'border-gold/40 bg-gold-50/30',
        )}>
          <div className="flex items-start gap-2 mb-2.5">
            <svg className="w-4 h-4 shrink-0 mt-0.5 text-navy-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-xs font-medium text-navy-500 uppercase tracking-wider">{t('patientForm.sensitiveDataTitle')}</span>
          </div>
          <p className="text-xs text-navy-500 leading-relaxed mb-3 ml-6">{sensitiveDataText}</p>
          <label className="flex items-start gap-3 cursor-pointer group ml-3">
            <input
              type="checkbox"
              checked={form.hasSensitiveDataConsent}
              onChange={e => {
                onUpdate({ hasSensitiveDataConsent: e.target.checked });
                setSensitiveConsentError(false);
                // 同意解除時に症状フィールドをクリア
                if (!e.target.checked) onUpdate({ hasSensitiveDataConsent: false, symptoms: '' });
              }}
              className="mt-0.5 h-4 w-4 rounded border-cream-300 text-gold focus:ring-gold/30"
            />
            <span className="text-sm text-navy-600 group-hover:text-navy-700 transition-colors font-medium">
              {t('patientForm.sensitiveDataAgree')}
            </span>
          </label>
          {sensitiveConsentError && (
            <p className="text-xs text-danger mt-2 ml-6 font-medium flex items-center gap-1">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {t('patientForm.sensitiveDataError')}
            </p>
          )}
        </div>
        {/* [AUDIT-02] 診察履歴保管通知（APPI 第32条 — 利用目的の通知義務） */}
        <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50/60 px-3.5 py-3">
          <svg className="w-4 h-4 shrink-0 mt-0.5 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-sky-700 leading-relaxed">{t('patientForm.visitHistoryNotice')}</p>
        </div>
        <Textarea label={t('patientForm.symptoms')} value={form.symptoms} onChange={e => onUpdate({ symptoms: e.target.value })} rows={3} placeholder={t('patientForm.symptomsPlaceholder')} required disabled={!form.hasSensitiveDataConsent} maxLength={1000} />
        <Textarea label={t('patientForm.notes')} value={form.notes} onChange={e => onUpdate({ notes: e.target.value })} rows={2} placeholder={t('patientForm.notesPlaceholder')} maxLength={500} />
      </div>

      {/* [H2] リマインダーメール配信同意（管理画面で有効時のみ表示） */}
      {clinic?.reminderEmailEnabled && form.email.trim() && (
        <div className={cn(
          'bg-white rounded-lg border p-4 shadow-subtle transition-all duration-200 animate-stagger-4',
          form.reminderEmailConsent ? 'border-gold/40 bg-gold-50/30' : 'border-cream-300/60',
        )}>
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={form.reminderEmailConsent}
              onChange={e => onUpdate({ reminderEmailConsent: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-cream-300 text-gold focus:ring-gold/30"
            />
            <div>
              <span className="text-sm text-navy-600 group-hover:text-navy-700 transition-colors font-medium">
                {t('patientForm.reminderEmail')}
              </span>
              <p className="text-[11px] text-navy-400 mt-1">
                {t('patientForm.reminderEmailDesc')}
              </p>
            </div>
          </label>
        </div>
      )}

      {/* 同意チェック */}
      <div className={cn(
        'bg-white rounded-lg border p-5 shadow-subtle transition-all duration-200 animate-stagger-4',
        consentError ? 'border-danger shadow-[0_0_0_3px_rgba(194,91,86,0.08)]' : 'border-cream-300/60',
        consent && !consentError && 'border-gold/40 bg-gold-50/30',
      )}>
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={consent}
            onChange={e => { setConsent(e.target.checked); setConsentError(false); }}
            className="mt-1 h-5 w-5 rounded border-cream-300 text-gold focus:ring-gold/30"
          />
          <span className="text-sm text-navy-500 group-hover:text-navy-700 transition-colors">
            <a href={privacyPolicyUrl || '/privacy-policy'} target="_blank" rel="noopener noreferrer" className="text-gold-500 font-medium link-gold-underline">
              {t('patientForm.privacyPolicy')}
            </a>
            {t('patientForm.privacyPolicyAgree')}
          </span>
        </label>
        {consentError && (
          <p className="text-xs text-danger mt-2 ml-8 font-medium flex items-center gap-1">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            {t('patientForm.privacyPolicyError')}
          </p>
        )}
      </div>

      {/* ボタン */}
      <div className="flex justify-between items-center pt-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t('patientForm.back')}
        </Button>
        <Button type="submit" size="lg">
          {t('patientForm.toConfirm')}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
    </form>
  );
}
