import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { formatDateShort } from '@/utils/date';
import { useClinic } from '@/hooks/useClinic';
import type { ReservationFormData } from '@/types/reservation';

interface Props {
  bookingId: string;
  form: ReservationFormData;
  onNewReservation: () => void;
  isAdminProxy?: boolean;
}

/** 患者権利行使のデフォルト案内文 */
const DEFAULT_RIGHTS_TEXT =
  '個人情報の開示・訂正・利用停止をご希望の場合は、当院窓口までお問い合わせください。本人確認の上、法令に基づき対応いたします。';

export function Complete({ bookingId, form, onNewReservation, isAdminProxy }: Props) {
  const { t, i18n } = useTranslation('booking');
  const { clinic } = useClinic();
  const [copied, setCopied] = useState(false);
  const rightsText = clinic?.patientRightsContact?.trim() || DEFAULT_RIGHTS_TEXT;

  async function copyId() {
    try {
      await navigator.clipboard.writeText(bookingId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard APIが使えない環境 */ }
  }

  return (
    <div className="space-y-5 animate-fade-in-up max-w-lg mx-auto">
      {/* 管理者代行入力モードバナー */}
      {isAdminProxy && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800">{t('adminProxy.banner')}</p>
            <p className="text-xs text-amber-600 mt-0.5">{t('adminProxy.bannerDesc')}</p>
          </div>
        </div>
      )}

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
            {t('complete.accepted')}
          </h2>
          <p className="relative text-sm text-cream/60 font-display">
            {formatDateShort(form.date, i18n.language)} {form.time}〜 / {form.name}様
          </p>
        </div>
      </div>

      {/* セクション2: 予約番号 */}
      <div className="bg-white rounded-xl border border-cream-300/60 shadow-sm px-5 py-5 shimmer-gold">
        <p className="text-[10px] text-navy-400 mb-2.5 tracking-[0.2em] uppercase font-medium text-center">
          {t('complete.reservationNumber')}
        </p>
        <div className="flex items-center gap-3 justify-center">
          <span className="text-lg font-mono font-medium text-navy-700 select-all tracking-wider break-all">
            {bookingId}
          </span>
          <button
            type="button"
            onClick={copyId}
            className="w-9 h-9 rounded-lg bg-cream-100 hover:bg-cream-200 flex items-center justify-center text-navy-400 hover:text-navy-600 transition-all duration-200 active:scale-[0.92] shrink-0"
            aria-label={t('complete.copyAriaLabel')}
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
        <h3 className="section-heading mb-3">{t('complete.checklistHeading')}</h3>
        <ul className="text-sm text-navy-500 space-y-3">
          {[
            t('complete.checklist1'),
            t('complete.checklist2'),
            t('complete.checklist3'),
          ].map((text, i) => (
            <li key={i} className="flex gap-3 items-start">
              <span className="w-1.5 h-1.5 bg-gold rounded-full shrink-0 mt-1.5" />
              {text}
            </li>
          ))}
        </ul>
      </div>

      {/* 問診票入力案内 */}
      <div className="card-section animate-stagger-3">
        <h3 className="section-heading mb-3">
          <svg className="w-4 h-4 inline-block mr-1.5 -mt-0.5 text-navy-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
          </svg>
          {t('complete.questionnaireHeading')}
        </h3>
        <p className="text-xs text-navy-500 leading-relaxed mb-3">{t('complete.questionnaireDesc')}</p>
        <Link to={`/questionnaire?bookingId=${bookingId}`}>
          <Button variant="secondary" className="w-full">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            {t('complete.questionnaireButton')}
          </Button>
        </Link>
      </div>

      {/* [H3] 患者権利行使の案内（APPI 第28〜30条） */}
      <div className="card-section animate-stagger-3">
        <h3 className="section-heading mb-3">
          <svg className="w-4 h-4 inline-block mr-1.5 -mt-0.5 text-navy-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          {t('complete.privacyHeading')}
        </h3>
        <p className="text-xs text-navy-500 leading-relaxed whitespace-pre-line">{rightsText}</p>
      </div>

      {/* アクション */}
      {isAdminProxy ? (
        <div className="flex justify-center pt-2 animate-stagger-3">
          <Button
            variant="primary"
            className="w-full sm:w-auto"
            onClick={() => window.close()}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
            {t('adminProxy.closeTab')}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 animate-stagger-3">
          <Link to="/cancel" state={{ bookingId }}>
            <Button variant="secondary" className="w-full sm:w-auto">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              {t('complete.cancelButton')}
            </Button>
          </Link>
          <Button variant="ghost" onClick={onNewReservation} className="w-full sm:w-auto">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {t('complete.newReservationButton')}
          </Button>
        </div>
      )}
    </div>
  );
}
