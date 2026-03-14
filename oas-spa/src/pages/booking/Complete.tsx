import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { formatDateShort } from '@/utils/date';
import type { ReservationFormData } from '@/types/reservation';

interface Props {
  bookingId: string;
  form: ReservationFormData;
  onNewReservation: () => void;
}

/** 紙吹雪 — ページ全体に降る（fixed） */
function Confetti() {
  const colors = ['#F79321', '#FFAD4D', '#FFC573', '#4CAF50', '#81C784', '#735763', '#E05252', '#60A5FA'];
  const pieces = useRef(
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      duration: 2.5 + Math.random() * 3,
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
    }))
  ).current;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-50">
      {pieces.map(p => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            top: '-12px',
            width: `${p.size}px`,
            height: `${p.size * 0.6}px`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotation}deg)`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
}

export function Complete({ bookingId, form, onNewReservation }: Props) {
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(bookingId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard APIが使えない環境 */ }
  }

  return (
    <>
      {showConfetti && <Confetti />}

      <div className="space-y-6 animate-fade-in-up max-w-lg mx-auto">
        {/* 成功ヒーロー */}
        <div className="bg-white dark:bg-lien-800 rounded-2xl shadow-warm-lg overflow-hidden">
          {/* 上部グラデーション装飾 */}
          <div className="hero-banner px-6 pt-8 pb-10">
            {/* チェックアイコン */}
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse-soft" />
              <div className="absolute inset-2 rounded-full bg-white/30 flex items-center justify-center backdrop-blur-sm">
                <svg className="w-10 h-10 text-white animate-check-pop" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="relative text-xl font-heading font-black text-white mb-1">
              予約を受け付けました！
            </h2>
            <p className="relative text-sm text-white/80">
              {formatDateShort(form.date)} {form.time}〜 / {form.name}様
            </p>
          </div>

          {/* 予約番号 */}
          <div className="relative z-10 -mt-5 mx-6 mb-6">
            <div className="bg-white dark:bg-lien-700 rounded-xl px-5 py-4 shadow-warm border border-lien-200/60 dark:border-lien-600/40">
              <p className="text-[11px] text-lien-400 dark:text-lien-500 mb-2 tracking-[0.15em] uppercase font-bold text-center">
                予約番号
              </p>
              <div className="flex items-center gap-3 justify-center">
                <span className="text-base font-mono font-bold text-lien-900 dark:text-lien-100 select-all tracking-wide">
                  {bookingId}
                </span>
                <button
                  type="button"
                  onClick={copyId}
                  className="w-9 h-9 rounded-xl bg-accent/10 hover:bg-accent/20 dark:bg-accent/20 dark:hover:bg-accent/30 flex items-center justify-center text-accent transition-all duration-200 hover:scale-105"
                  aria-label="コピー"
                >
                  {copied ? (
                    <svg className="w-4 h-4 text-emerald-500 animate-check-pop" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
          </div>
        </div>

        {/* 注意事項 */}
        <div className="card-section card-section-accent animate-stagger-2">
          <h3 className="section-heading mb-3">ご確認ください</h3>
          <ul className="text-sm text-lien-600 dark:text-lien-300 space-y-3">
            <li className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-accent" />
              </span>
              予約は確認後、院よりご連絡いたします。
            </li>
            <li className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-accent" />
              </span>
              キャンセル・変更は予約番号をお控えの上、下記ボタンまたはお電話でお願いします。
            </li>
            <li className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-accent" />
              </span>
              保険証をお持ちの方は当日ご持参ください。
            </li>
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
            新しい予約をする
          </Button>
        </div>
      </div>
    </>
  );
}
