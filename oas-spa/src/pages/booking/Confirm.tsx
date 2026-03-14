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
    <div className="flex border-b border-lien-100/80 dark:border-lien-700/60 py-3 group">
      <dt className="w-28 shrink-0 text-sm text-lien-400 dark:text-lien-500 group-hover:text-lien-600 dark:group-hover:text-lien-300 transition-colors">{label}</dt>
      <dd className="text-sm text-lien-900 dark:text-lien-100 whitespace-pre-wrap break-all font-medium">{value || '-'}</dd>
    </div>
  );
}

export function Confirm({ form, loading, onSubmit, onBack }: Props) {
  const address = form.addressSub
    ? `${form.addressMain}　${form.addressSub}`
    : form.addressMain;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* 予約日時 — ヒーローバナー */}
      <div className="hero-banner px-6 py-6 text-center shadow-[0_4px_20px_-4px_rgba(247,147,33,0.35)] animate-stagger-1">
        <p className="relative text-xs font-heading font-bold text-white/80 tracking-[0.2em] uppercase mb-2">
          ご予約日時
        </p>
        <p className="relative text-2xl font-heading font-black text-white tracking-wide">
          {formatDateShort(form.date)}
        </p>
        <p className="relative text-lg font-mono font-bold text-white/90 mt-1">
          {form.time}〜
        </p>
      </div>

      {/* 基本情報 */}
      <div className="card-section card-section-accent animate-stagger-2">
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
      <div className="card-section card-section-teal animate-stagger-3">
        <h3 className="section-heading">診療情報</h3>
        <dl>
          <Row label="初診/再診" value={form.visitType} />
          <Row label="保険証" value={form.insurance} />
          <Row label="症状" value={form.symptoms} />
          <Row label="伝達事項" value={form.notes || 'なし'} />
        </dl>
      </div>

      {/* ボタン */}
      <div className="flex justify-between items-center pt-2">
        <Button type="button" variant="ghost" onClick={onBack} disabled={loading}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          戻る
        </Button>
        <Button onClick={onSubmit} loading={loading} size="lg">
          予約を確定する
        </Button>
      </div>
    </div>
  );
}
