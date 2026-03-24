import { useState, useEffect, useRef, type FormEvent } from 'react';
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

/** 要配慮個人情報の同意デフォルト文言（settings/clinic.sensitiveDataConsentText 未設定時） */
const DEFAULT_SENSITIVE_DATA_TEXT =
  '「症状・お悩み」欄に入力される健康に関する情報は、個人情報保護法上の「要配慮個人情報」に該当する可能性があります。当院の予約対応・施術準備の目的でのみ使用し、ご本人の同意なく第三者に提供することはありません。';

export function PatientForm({ form, onUpdate, onNext, onBack, privacyPolicyUrl }: Props) {
  const { clinic } = useClinic();
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [sensitiveConsentError, setSensitiveConsentError] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [zipMsg, setZipMsg] = useState('');

  /** 要配慮個人情報の同意文言（管理画面で設定可能、未設定時はデフォルト） */
  const sensitiveDataText = clinic?.sensitiveDataConsentText?.trim() || DEFAULT_SENSITIVE_DATA_TEXT;
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  /* 郵便番号自動検索（CVCreator方式） — 7桁入力で自動的に住所取得 */
  useEffect(() => {
    const digits = form.zip.replace(/[^\d]/g, '');
    if (digits.length !== 7) { setZipMsg(''); return; }
    setZipMsg('検索中…');
    const timer = setTimeout(async () => {
      try {
        const addr = await lookupZip(digits);
        if (addr) {
          onUpdateRef.current({ addressMain: addr });
          setZipMsg('✓ 住所を反映');
        } else {
          setZipMsg('見つかりません');
        }
      } catch {
        setZipMsg('検索エラー');
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
    if (!form.name.trim()) errs.push('氏名を入力してください');
    if (!form.furigana.trim()) {
      errs.push('ふりがなを入力してください');
    } else if (!isValidFurigana(form.furigana)) {
      // ふりがな形式チェック（ひらがな・カタカナ・スペースのみ）
      errs.push('ふりがなはひらがな又はカタカナで入力してください');
    }
    if (!form.birthdate) errs.push('生年月日を入力してください');
    if (!form.zip.trim()) {
      errs.push('郵便番号を入力してください');
    } else if (!isValidZip(form.zip)) {
      // 郵便番号形式チェック（7桁数字、ハイフン任意）
      errs.push('郵便番号は7桁の数字で入力してください（例: 123-4567）');
    }
    if (!form.addressMain.trim()) errs.push('住所を入力してください');
    if (!form.phone.trim()) {
      errs.push('電話番号を入力してください');
    } else if (!isValidPhone(toHankaku(form.phone))) {
      // 電話番号形式チェック（半角数字・ハイフン、10〜15桁）
      errs.push('電話番号の形式が正しくありません（例: 090-1234-5678）');
    }
    // メール：連絡方法がメールの場合は必須、それ以外は入力時のみ形式チェック
    if (form.contactMethod === 'メール' && !form.email.trim()) {
      errs.push('連絡方法が「メール」の場合、メールアドレスは必須です');
    } else if (form.email.trim() && !isValidEmail(form.email)) {
      errs.push('メールアドレスの形式が正しくありません');
    }
    if (!form.hasSensitiveDataConsent) errs.push('健康情報の取り扱いに同意してください');
    if (!form.symptoms.trim()) errs.push('症状・お悩みを入力してください');
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
          <span>基本情報</span>
          <span className="ml-auto text-[10px] text-navy-400 font-normal font-body tracking-wider">* は必須</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="氏名 *" value={form.name} onChange={e => onUpdate({ name: e.target.value })} placeholder="山田 太郎" required />
          <Input label="ふりがな *" value={form.furigana} onChange={e => onUpdate({ furigana: e.target.value })} placeholder="やまだ たろう" required />
        </div>
        {/* 生年月日 + 年齢 + 性別 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-end gap-2">
            <div className="w-40 shrink-0">
              <Input label="生年月日 *" type="date" value={form.birthdate} onChange={e => onUpdate({ birthdate: e.target.value })} required />
            </div>
            <span className={cn(
              'inline-flex items-center px-2 py-2 rounded-md text-xs font-medium font-mono shrink-0 mb-px min-w-[3rem] justify-center',
              age !== null ? 'bg-gold-50 text-gold-500' : 'bg-cream-100 text-navy-300',
            )}>
              {age !== null ? `${age}歳` : '— 歳'}
            </span>
            <div className="w-[5.5rem] shrink-0">
              <Select
                label="性別"
                value={form.gender}
                onChange={e => onUpdate({ gender: e.target.value as Gender })}
                options={[
                  { value: '', label: '未入力' },
                  { value: '男性', label: '男性' },
                  { value: '女性', label: '女性' },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 連絡先 */}
      <div className="card-section space-y-4 animate-stagger-2">
        <h3 className="section-heading">
          <span>連絡先</span>
        </h3>
        <div className="flex flex-wrap gap-4 items-end">
          {/* 郵便番号 — 〒プレフィックス + 自動検索（CVCreator方式） */}
          <div>
            <label className="block text-xs tracking-wider uppercase text-navy-400 font-body mb-1.5">郵便番号 *</label>
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-navy-400 font-medium shrink-0">〒</span>
              <input
                value={form.zip}
                onChange={e => handleZipInput(e.target.value)}
                placeholder="123-4567"
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
          <Input label="電話番号 *" type="tel" value={form.phone} onChange={e => onUpdate({ phone: e.target.value })} placeholder="090-1234-5678" required className="w-44" />
        </div>
        <Input label="都道府県・市区町村・番地 *" value={form.addressMain} onChange={e => onUpdate({ addressMain: e.target.value })} placeholder="福岡県福岡市中央区..." required />
        <Input label="建物名・号室" value={form.addressSub} onChange={e => onUpdate({ addressSub: e.target.value })} placeholder="〇〇マンション 101号室" />
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_10rem] gap-4">
          <Input label="メールアドレス" type="email" value={form.email} onChange={e => onUpdate({ email: e.target.value })} placeholder="example@mail.com" />
          <Select
            label="ご希望の連絡方法"
            value={form.contactMethod}
            onChange={e => onUpdate({ contactMethod: e.target.value as ContactMethod })}
            options={[
              { value: '電話', label: '電話' },
              { value: 'メール', label: 'メール' },
              { value: 'その他', label: 'その他' },
            ]}
          />
        </div>
      </div>

      {/* 診療情報 */}
      <div className="card-section space-y-4 animate-stagger-3">
        <h3 className="section-heading">
          <span>診療情報</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-[8rem_10rem] gap-4">
          <Select
            label="初診 / 再診"
            value={form.visitType}
            onChange={e => onUpdate({ visitType: e.target.value as VisitType })}
            options={[
              { value: '初診', label: '初診' },
              { value: '再診', label: '再診' },
            ]}
          />
          <Select
            label="保険証"
            value={form.insurance}
            onChange={e => onUpdate({ insurance: e.target.value as InsuranceType })}
            options={[
              { value: '保険あり', label: '保険あり' },
              { value: '保険なし', label: '保険なし（自費）' },
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
            <span className="text-xs font-medium text-navy-500 uppercase tracking-wider">健康情報の取り扱いについて</span>
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
              上記に同意のうえ、健康情報を入力します
            </span>
          </label>
          {sensitiveConsentError && (
            <p className="text-xs text-danger mt-2 ml-6 font-medium flex items-center gap-1">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              健康情報の取り扱いに同意してください
            </p>
          )}
        </div>
        <Textarea label="症状・お悩み *" value={form.symptoms} onChange={e => onUpdate({ symptoms: e.target.value })} rows={3} placeholder="〇月〇日の〇時頃から、腰痛・肩こりなど" required disabled={!form.hasSensitiveDataConsent} />
        <Textarea label="伝達事項（任意）" value={form.notes} onChange={e => onUpdate({ notes: e.target.value })} rows={2} placeholder="アレルギー、服用中の薬など" />
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
                予約前日にリマインダーメールを受け取る
              </span>
              <p className="text-[11px] text-navy-400 mt-1">
                ご入力のメールアドレス宛に予約日前日のリマインダーをお送りします。配信停止はいつでも可能です。
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
              プライバシーポリシー
            </a>
            に同意します
          </span>
        </label>
        {consentError && (
          <p className="text-xs text-danger mt-2 ml-8 font-medium flex items-center gap-1">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            プライバシーポリシーに同意してください
          </p>
        )}
      </div>

      {/* ボタン */}
      <div className="flex justify-between items-center pt-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          戻る
        </Button>
        <Button type="submit" size="lg">
          確認画面へ
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
    </form>
  );
}
