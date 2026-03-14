import { useState, type FormEvent } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { lookupZip } from '@/utils/zip';
import { toHankaku } from '@/utils/security';
import { calcAge } from '@/utils/date';
import { cn } from '@/utils/cn';
import type { ReservationFormData, Gender, VisitType, InsuranceType, ContactMethod } from '@/types/reservation';

interface Props {
  form: ReservationFormData;
  onUpdate: (patch: Partial<ReservationFormData>) => void;
  onNext: () => void;
  onBack: () => void;
  privacyPolicyUrl?: string;
}

export function PatientForm({ form, onUpdate, onNext, onBack, privacyPolicyUrl }: Props) {
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [zipMsg, setZipMsg] = useState('');
  const [zipLoading, setZipLoading] = useState(false);

  async function handleZipLookup() {
    const zip = toHankaku(form.zip).replace(/-/g, '');
    if (!/^\d{7}$/.test(zip)) {
      setZipMsg('7桁の郵便番号を入力してください');
      return;
    }
    setZipLoading(true);
    setZipMsg('');
    try {
      const addr = await lookupZip(zip);
      if (addr) {
        onUpdate({ addressMain: addr });
        setZipMsg('');
      } else {
        setZipMsg('住所が見つかりませんでした');
      }
    } catch {
      setZipMsg('住所の検索に失敗しました');
    } finally {
      setZipLoading(false);
    }
  }

  function validate(): boolean {
    const errs: string[] = [];
    if (!form.name.trim()) errs.push('氏名を入力してください');
    if (!form.furigana.trim()) errs.push('ふりがなを入力してください');
    if (!form.birthdate) errs.push('生年月日を入力してください');
    if (!form.zip.trim()) errs.push('郵便番号を入力してください');
    if (!form.addressMain.trim()) errs.push('住所を入力してください');
    if (!form.phone.trim()) errs.push('電話番号を入力してください');
    if (form.contactMethod === 'メール' && !form.email.trim()) errs.push('連絡方法が「メール」の場合、メールアドレスは必須です');
    if (!form.symptoms.trim()) errs.push('症状・お悩みを入力してください');
    setConsentError(!consent);
    setErrors(errs);
    return errs.length === 0 && consent;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onUpdate({ phone: toHankaku(form.phone) });
    if (validate()) onNext();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up">
      {errors.length > 0 && (
        <Alert variant="error">
          <ul className="list-disc list-inside space-y-0.5">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </Alert>
      )}

      {/* 基本情報 — オレンジアクセント */}
      <div className="card-section card-section-accent space-y-4 animate-stagger-1">
        <h3 className="section-heading">
          <span>基本情報</span>
          <span className="ml-auto text-[11px] text-lien-400 dark:text-lien-500 font-normal">* は必須</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="氏名 *" value={form.name} onChange={e => onUpdate({ name: e.target.value })} placeholder="山田 太郎" required />
          <Input label="ふりがな *" value={form.furigana} onChange={e => onUpdate({ furigana: e.target.value })} placeholder="やまだ たろう" required />
        </div>
        <div className="grid grid-cols-[1fr_8rem] sm:grid-cols-[10rem_8rem] gap-4 items-start">
          <div>
            <Input label="生年月日 *" type="date" value={form.birthdate} onChange={e => onUpdate({ birthdate: e.target.value })} required />
            {form.birthdate && calcAge(form.birthdate) !== null && (
              <p className="mt-1.5 ml-1">
                <span className="inline-flex items-center gap-1 bg-accent/10 text-accent-dark dark:text-accent-light px-2.5 py-0.5 rounded-full text-xs font-bold">
                  {calcAge(form.birthdate)}歳
                </span>
              </p>
            )}
          </div>
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

      {/* 連絡先 — パープルアクセント */}
      <div className="card-section card-section-rose space-y-4 animate-stagger-2">
        <h3 className="section-heading">連絡先</h3>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <div className="flex gap-2 items-end">
              <Input label="郵便番号 *" value={form.zip} onChange={e => onUpdate({ zip: e.target.value })} placeholder="810-0001" required className="w-32" />
              <Button type="button" variant="secondary" size="sm" onClick={handleZipLookup} loading={zipLoading} className="mb-0.5">
                検索
              </Button>
            </div>
            {zipMsg && <p className="text-xs text-red-500 mt-1">{zipMsg}</p>}
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

      {/* 診療情報 — グリーンアクセント */}
      <div className="card-section card-section-teal space-y-4 animate-stagger-3">
        <h3 className="section-heading">診療情報</h3>
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
        <Textarea label="症状・お悩み *" value={form.symptoms} onChange={e => onUpdate({ symptoms: e.target.value })} rows={3} placeholder="腰痛、肩こりなど" required />
        <Textarea label="伝達事項（任意）" value={form.notes} onChange={e => onUpdate({ notes: e.target.value })} rows={2} placeholder="アレルギー、服用中の薬など" />
      </div>

      {/* 同意チェック */}
      <div className={cn(
        'bg-white dark:bg-lien-800 rounded-2xl border-2 p-5 shadow-warm transition-all duration-200 animate-stagger-4',
        consentError ? 'border-red-400 dark:border-red-600 shadow-[0_0_0_4px_rgba(239,68,68,0.1)]' : 'border-lien-200/60 dark:border-lien-600/40',
        consent && !consentError && 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-900/10',
      )}>
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={consent}
            onChange={e => { setConsent(e.target.checked); setConsentError(false); }}
            className="mt-1 h-5 w-5 rounded border-lien-300 text-accent focus:ring-accent/30"
          />
          <span className="text-sm text-lien-600 dark:text-lien-300 group-hover:text-lien-800 dark:group-hover:text-lien-100 transition-colors">
            <a href={privacyPolicyUrl || '/privacy-policy'} target="_blank" rel="noopener noreferrer" className="text-accent font-bold underline decoration-accent/30 underline-offset-2 hover:decoration-accent transition-colors">
              プライバシーポリシー
            </a>
            に同意します
          </span>
        </label>
        {consentError && (
          <p className="text-xs text-red-500 mt-2 ml-8 font-medium">プライバシーポリシーに同意してください</p>
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
