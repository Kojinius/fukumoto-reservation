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
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-lien-100 dark:bg-lien-700 flex items-center justify-center">
          <svg className="w-6 h-6 text-lien-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm text-lien-400 dark:text-lien-500">
          この日は予約を受け付けていません
        </p>
      </div>
    );
  }

  function SlotSection({ label, icon, slots }: { label: string; icon: string; slots: typeof amSlots }) {
    if (slots.length === 0) return null;
    return (
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold text-lien-500 dark:text-lien-400 tracking-wider uppercase flex items-center gap-1.5">
          <span>{icon}</span>
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
                  'px-3 py-2.5 rounded-xl text-sm font-mono transition-all duration-200',
                  isSelected && 'bg-gradient-accent text-white font-bold shadow-[0_2px_12px_-3px_rgba(247,147,33,0.5)] scale-[1.02]',
                  !isSelected && available && [
                    'bg-white dark:bg-lien-700/50 border border-lien-200/80 dark:border-lien-600/60',
                    'hover:border-accent/50 hover:shadow-[0_2px_8px_-2px_rgba(247,147,33,0.15)] hover:scale-[1.02]',
                    'text-lien-700 dark:text-lien-200',
                  ],
                  !available && 'bg-lien-100/50 dark:bg-lien-800/50 text-lien-300 dark:text-lien-600 cursor-not-allowed line-through opacity-50',
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-lien-600 dark:text-lien-300 font-medium">時間を選択</span>
        <span className={cn(
          'text-xs font-bold px-2.5 py-1 rounded-full tracking-wide',
          availableCount > 3 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300'
            : availableCount > 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300'
            : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300',
        )}>
          残り{availableCount}枠
        </span>
      </div>
      <SlotSection label="午前" icon="☀" slots={amSlots} />
      <SlotSection label="午後" icon="🌙" slots={pmSlots} />
    </div>
  );
}
