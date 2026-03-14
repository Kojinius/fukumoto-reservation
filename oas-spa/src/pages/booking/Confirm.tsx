import { Button } from '@/components/ui/Button';
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
            ご予約日時
          </p>
          <p className="text-3xl font-display font-light text-cream tracking-wide">
            {formatDateShort(form.date)}
          </p>
          <p className="text-lg font-mono font-medium text-cream/80 mt-1">
            {form.time}〜
          </p>
        </div>
      </div>

      {/* 基本情報 */}
      <div className="card-section animate-stagger-2">
        <h3 className="section-heading">基本情報</h3>
        <dl>
          <Row label="氏名" value={form.name} />
          <Row label="ふりがな" value={form.furigana} />
          <Row label="生年月日" value={form.birthdate + (calcAge(form.birthdate) !== null ? `（${calcAge(form.birthdate)}歳）` : '')} />
          <Row label="性別" value={form.gender || '未入力'} />
          <Row label="郵便番号" value={`〒${form.zip}`} />
          <Row label="住所" value={address} />
          <Row label="電話番号" value={form.phone} />
          <Row label="メール" value={form.email} />
          <Row label="連絡方法" value={form.contactMethod} />
        </dl>
      </div>

      {/* 診療情報 */}
      <div className="card-section animate-stagger-3">
        <h3 className="section-heading">診療情報</h3>
        <dl>
          <Row label="初診/再診" value={form.visitType} />
          <Row label="保険証" value={form.insurance} />
          <Row label="症状" value={form.symptoms} />
          <Row label="伝達事項" value={form.notes || 'なし'} />
        </dl>
      </div>

      {/* ボタン */}
      <div className="flex justify-between items-center pt-2 animate-stagger-4">
        <Button type="button" variant="ghost" onClick={onBack} disabled={loading}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          戻る
        </Button>
        <Button onClick={onSubmit} loading={loading} size="lg">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          予約を確定する
        </Button>
      </div>
    </div>
  );
}
