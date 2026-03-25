import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useClinic } from '@/hooks/useClinic';
import { fetchBookedSlots } from '@/hooks/useReservation';
import { Calendar } from '@/components/shared/Calendar';
import { TimeSlots } from '@/components/shared/TimeSlots';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { formatDateShort } from '@/utils/date';
import { DEFAULT_BUSINESS_HOURS } from '@/types/clinic';

interface Props {
  date: string;
  time: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onNext: () => void;
}

export function DateTimeSelect({ date, time, onDateChange, onTimeChange, onNext }: Props) {
  const { t, i18n } = useTranslation('booking');
  const { clinic } = useClinic();
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const bh = clinic?.businessHours || DEFAULT_BUSINESS_HOURS;
  const holidays = clinic?.holidays || [];
  const holidayNames = clinic?.holidayNames || {};
  const cutoff = clinic?.bookingCutoffMinutes || 0;

  const handleDateSelect = useCallback(async (d: string) => {
    onDateChange(d);
    onTimeChange('');
    setLoadingSlots(true);
    try {
      const booked = await fetchBookedSlots(d);
      setBookedSlots(booked);
    } catch {
      setBookedSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [onDateChange, onTimeChange]);

  useEffect(() => {
    if (date) {
      setLoadingSlots(true);
      fetchBookedSlots(date)
        .then(setBookedSlots)
        .catch(() => setBookedSlots([]))
        .finally(() => setLoadingSlots(false));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* カレンダー */}
        <div className="card-section animate-stagger-1">
          <h3 className="section-heading mb-3">
            <span>{t('dateTimeSelect.dateHeading')}</span>
          </h3>
          <Calendar
            selectedDate={date}
            onSelectDate={handleDateSelect}
            holidays={holidays}
            holidayNames={holidayNames}
            businessHours={bh}
          />
        </div>

        {/* タイムスロット */}
        <div className="card-section animate-stagger-2">
          <h3 className="section-heading mb-3">
            <span>{t('dateTimeSelect.timeHeading')}</span>
          </h3>
          {!date ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 mx-auto mb-4 rounded-lg bg-cream-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-navy-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-navy-400 font-medium">
                {t('dateTimeSelect.selectDatePrompt')}
              </p>
            </div>
          ) : loadingSlots ? (
            <Spinner className="py-10" />
          ) : (
            <TimeSlots
              date={date}
              selectedTime={time}
              onSelectTime={onTimeChange}
              bookedSlots={bookedSlots}
              businessHours={bh}
              bookingCutoffMinutes={cutoff}
            />
          )}
        </div>
      </div>

      {/* 選択結果 + 次へ */}
      {date && time && (
        <div className="relative bg-navy-700 text-cream rounded-lg overflow-hidden animate-scale-in">
          {/* 装飾メッシュ */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(201,169,110,0.08)_0%,transparent_60%)]" />
          <div className="flex items-center justify-between px-6 py-5 relative">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-cream" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <div>
                <p className="text-lg font-display font-light tracking-wide">
                  {formatDateShort(date, i18n.language)}
                </p>
                <p className="text-sm font-mono text-cream/70">
                  {time}〜
                </p>
              </div>
            </div>
            <Button onClick={onNext} className="bg-white/10 hover:bg-white/20 text-cream border-0">
              {t('dateTimeSelect.next')}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
