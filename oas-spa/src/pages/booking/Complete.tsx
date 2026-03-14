import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { formatDateShort } from '@/utils/date';
import type { ReservationFormData } from '@/types/reservation';

interface Props {
  bookingId: string;
  form: ReservationFormData;
  onNewReservation: () => void;
}

export function Complete({ bookingId, form, onNewReservation }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(bookingId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard APIが使えない環境 */ }
  }

  return (
    <div className="space-y-5 animate-fade-in-up max-w-lg mx-auto">
      {/* セクション1: 成功ヒーロー */}
      <div className="bg-white rounded-xl border border-cream-300/60 shadow-sm overflow-hidden">
        <div className="relative bg-navy-700 px-6 pt-10 pb-10 text-center overflow-hidden">
          {/* 装飾メッシュ */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(201,169,110,0.12)_0%,transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_70%,rgba(61,97,159,0.15)_0%,transparent_50%)]" />

          {/* 金の同心円（装飾） */}
          <div className="absolute top-3 right-5 opacity-20">
            <div className="w-16 h-16 rounded-full border border-gold/40 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full border border-gold/60 flex items-center justify-center">
                <div className="w-5 h-5 rounded-full bg-gold/30" />
              </div>
            </div>
          </div>
          <div className="absolute bottom-6 left-5 opacity-15">
            <div className="w-12 h-12 rounded-full border border-cream/20 flex items-center justify-center">
              <div className="w-7 h-7 rounded-full border border-cream/30" />
            </div>
          </div>

          {/* check-draw SVGアニメーション */}
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full bg-white/5 animate-gold-pulse" />
            <div className="absolute inset-0 rounded-full bg-white/10 flex items-center justify-center">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="#FAFAF8"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="check-draw"
                />
              </svg>
            </div>
          </div>

          <h2 className="relative text-xl font-heading font-semibold text-cream mb-1.5">
            予約を受け付けました
          </h2>
          <p className="relative text-sm text-cream/60 font-display">
            {formatDateShort(form.date)} {form.time}〜 / {form.name}様
          </p>
        </div>
      </div>

      {/* セクション2: 予約番号 */}
      <div className="bg-white rounded-xl border border-cream-300/60 shadow-sm px-5 py-5 shimmer-gold">
        <p className="text-[10px] text-navy-400 mb-2.5 tracking-[0.2em] uppercase font-medium text-center">
          予約番号
        </p>
        <div className="flex items-center gap-3 justify-center">
          <span className="text-lg font-mono font-medium text-navy-700 select-all tracking-wider break-all">
            {bookingId}
          </span>
          <button
            type="button"
            onClick={copyId}
            className="w-9 h-9 rounded-lg bg-cream-100 hover:bg-cream-200 flex items-center justify-center text-navy-400 hover:text-navy-600 transition-all duration-200 active:scale-[0.92] shrink-0"
            aria-label="コピー"
          >
            {copied ? (
              <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* セクション3: ご確認ください */}
      <div className="card-section animate-stagger-2">
        <h3 className="section-heading mb-3">ご確認ください</h3>
        <ul className="text-sm text-navy-500 space-y-3">
          {[
            '予約は確認後、院よりご連絡いたします。',
            'キャンセル・変更は予約番号をお控えの上、下記ボタンまたはお電話でお願いします。',
            '保険証をお持ちの方は当日ご持参ください。',
          ].map((text, i) => (
            <li key={i} className="flex gap-3 items-start">
              <span className="w-1.5 h-1.5 bg-gold rounded-full shrink-0 mt-1.5" />
              {text}
            </li>
          ))}
        </ul>
      </div>

      {/* アクション */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 animate-stagger-3">
        <Link to="/cancel" state={{ bookingId }}>
          <Button variant="secondary" className="w-full sm:w-auto">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            予約をキャンセル
          </Button>
        </Link>
        <Button variant="ghost" onClick={onNewReservation} className="w-full sm:w-auto">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          新しい予約をする
        </Button>
      </div>
    </div>
  );
}
