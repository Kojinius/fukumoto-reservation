import { useEffect, useState, useCallback } from 'react';
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
        <div className="card-section card-section-accent animate-stagger-1">
          <h3 className="section-heading mb-3">日付を選択</h3>
          <Calendar
            selectedDate={date}
            onSelectDate={handleDateSelect}
            holidays={holidays}
            holidayNames={holidayNames}
            businessHours={bh}
          />
        </div>

        {/* タイムスロット */}
        <div className="card-section card-section-teal animate-stagger-2">
          <h3 className="section-heading mb-3">時間を選択</h3>
          {!date ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent/10 dark:bg-accent/20 flex items-center justify-center animate-float">
                <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-lien-400 dark:text-lien-500 font-medium">
                カレンダーから日付を選択してください
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
        <div className="hero-banner flex items-center justify-between px-6 py-5 shadow-[0_4px_20px_-4px_rgba(247,147,33,0.35)] animate-scale-in">
          <div className="relative flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <div>
              <p className="relative text-white font-heading font-bold">
                {formatDateShort(date)} {time}〜
              </p>
            </div>
          </div>
          <Button onClick={onNext} className="bg-white/20 hover:bg-white/30 text-white border-0 shadow-none hover:shadow-none backdrop-blur-sm">
            次へ
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      )}
    </div>
  );
}
