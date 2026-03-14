import { useMemo } from 'react';
import { cn } from '@/utils/cn';
import { generateTimeSlots, today as getToday } from '@/utils/date';
import type { BusinessHours } from '@/types/clinic';

interface TimeSlotsProps {
  date: string;
  selectedTime: string;
  onSelectTime: (time: string) => void;
  bookedSlots: string[];
  businessHours: BusinessHours;
  bookingCutoffMinutes?: number;
}

export function TimeSlots({
  date, selectedTime, onSelectTime,
  bookedSlots, businessHours, bookingCutoffMinutes = 0,
}: TimeSlotsProps) {
  const todayStr = getToday();

  /** 過去スロットか判定 */
  function isPastSlot(timeStr: string): boolean {
    if (date !== todayStr) return false;
    const [h, m] = timeStr.split(':').map(Number);
    const slotMin = h * 60 + m;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return slotMin <= nowMin + bookingCutoffMinutes;
  }

  /** AM/PM スロットを生成 */
  const { amSlots, pmSlots, availableCount } = useMemo(() => {
    const dow = new Date(date).getDay();
    const schedule = businessHours[String(dow)];
    if (!schedule || !schedule.open) return { amSlots: [], pmSlots: [], availableCount: 0 };

    const am = schedule.amOpen ? generateTimeSlots(schedule.amStart, schedule.amEnd) : [];
    const pm = schedule.pmOpen ? generateTimeSlots(schedule.pmStart, schedule.pmEnd) : [];

    let count = 0;
    const tag = (slots: string[]) => slots.map(t => {
      const booked = bookedSlots.includes(t);
      const past = isPastSlot(t);
      const available = !booked && !past;
      if (available) count++;
      return { time: t, booked, past, available };
    });

    return { amSlots: tag(am), pmSlots: tag(pm), availableCount: count };
  }, [date, bookedSlots, businessHours, bookingCutoffMinutes, todayStr]);

  if (amSlots.length === 0 && pmSlots.length === 0) {
    return (
      <div className="text-center py-8 animate-fade-in-up">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-cream-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-navy-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm text-navy-400">
          この日は予約を受け付けていません
        </p>
      </div>
    );
  }

  function SlotSection({ label, slots }: { label: string; slots: typeof amSlots }) {
    if (slots.length === 0) return null;
    return (
      <div className="space-y-2.5">
        <h4 className="text-[10px] tracking-[0.15em] uppercase text-navy-400 font-medium flex items-center gap-2">
          {label === '午前' ? (
            <svg className="w-3.5 h-3.5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 text-navy-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
          {label}
        </h4>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {slots.map(({ time, available }) => {
            const isSelected = time === selectedTime;
            return (
              <button
                key={time}
                type="button"
                disabled={!available}
                onClick={() => onSelectTime(time)}
                className={cn(
                  'px-3 py-2.5 rounded-md text-sm font-mono transition-all duration-150',
                  isSelected && 'bg-navy-700 text-white border border-navy-700 font-medium shadow-subtle',
                  !isSelected && available && [
                    'border border-cream-300 bg-white',
                    'hover:border-gold hover:shadow-subtle',
                    'text-navy-700',
                    'active:scale-[0.95]',
                  ],
                  !available && 'bg-cream-100 text-navy-300 cursor-not-allowed line-through opacity-40',
                )}
              >
                {time}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <span className="text-sm text-navy-500 font-medium">時間を選択</span>
        <span className={cn(
          'text-[11px] font-mono px-2 py-0.5 rounded-md',
          availableCount <= 3 ? 'text-danger bg-danger/5' : 'text-navy-400 bg-cream-100',
        )}>
          残り{availableCount}枠
        </span>
      </div>
      <SlotSection label="午前" slots={amSlots} />
      <SlotSection label="午後" slots={pmSlots} />
    </div>
  );
}
