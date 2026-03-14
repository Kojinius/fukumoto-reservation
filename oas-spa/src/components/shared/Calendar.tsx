import { useState, useMemo } from 'react';
import { cn } from '@/utils/cn';
import { formatDate, today as getToday } from '@/utils/date';
import type { BusinessHours } from '@/types/clinic';

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

interface CalendarProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  holidays: string[];
  holidayNames?: Record<string, string>;
  businessHours: BusinessHours;
}

export function Calendar({ selectedDate, onSelectDate, holidays, holidayNames, businessHours }: CalendarProps) {
  const todayStr = getToday();
  const [viewYear, setViewYear] = useState(() => {
    if (selectedDate) {
      const [y] = selectedDate.split('-').map(Number);
      return y;
    }
    return new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    if (selectedDate) {
      const parts = selectedDate.split('-').map(Number);
      return parts[1] - 1;
    }
    return new Date().getMonth();
  });

  /** 月内の全日データを生成 */
  const days = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startDow = firstDay.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells: Array<{
      date: string;
      day: number;
      dow: number;
      disabled: boolean;
      isToday: boolean;
      isHoliday: boolean;
      holidayName?: string;
    } | null> = [];

    // 月初の空白セル
    for (let i = 0; i < startDow; i++) cells.push(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(viewYear, viewMonth, d);
      const dateStr = formatDate(dt);
      const dow = dt.getDay();
      const isPast = dateStr < todayStr;
      const isHoliday = holidays.includes(dateStr);
      const daySchedule = businessHours[String(dow)];
      const noBusinessHours = !daySchedule || !daySchedule.open;

      cells.push({
        date: dateStr,
        day: d,
        dow,
        disabled: isPast || isHoliday || noBusinessHours,
        isToday: dateStr === todayStr,
        isHoliday,
        holidayName: holidayNames?.[dateStr],
      });
    }

    return cells;
  }, [viewYear, viewMonth, todayStr, holidays, holidayNames, businessHours]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  return (
    <div className="select-none">
      {/* ヘッダー: 年月 + ナビ */}
      <div className="flex items-center justify-between mb-5">
        <button
          type="button"
          onClick={prevMonth}
          className="w-9 h-9 rounded-md flex items-center justify-center hover:bg-cream-100 text-navy-300 hover:text-navy-500 transition-all duration-200 active:scale-[0.93]"
          aria-label="前月"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-center">
          <h3 className="text-lg font-heading font-semibold text-navy-700">
            {viewMonth + 1}月
          </h3>
          <p className="text-sm font-display font-light text-navy-400 -mt-0.5">
            {viewYear}
          </p>
        </div>
        <button
          type="button"
          onClick={nextMonth}
          className="w-9 h-9 rounded-md flex items-center justify-center hover:bg-cream-100 text-navy-300 hover:text-navy-500 transition-all duration-200 active:scale-[0.93]"
          aria-label="翌月"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAY_LABELS.map((wd, i) => (
          <div key={wd} className={cn(
            'text-center text-[10px] tracking-[0.15em] uppercase py-1.5 font-body font-medium',
            i === 0 && 'text-red-400',
            i === 6 && 'text-sky-400',
            i > 0 && i < 6 && 'text-navy-300',
          )}>
            {wd}
          </div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((cell, i) => {
          if (!cell) return <div key={`empty-${i}`} />;

          const isSelected = cell.date === selectedDate;

          return (
            <button
              key={cell.date}
              type="button"
              disabled={cell.disabled}
              onClick={() => onSelectDate(cell.date)}
              title={cell.holidayName}
              className={cn(
                'relative aspect-square flex items-center justify-center rounded-md text-sm font-display transition-all duration-200',
                // 選択中
                isSelected && 'bg-navy-700 text-white font-medium shadow-subtle',
                // 今日
                !isSelected && cell.isToday && 'ring-1 ring-gold/50 font-medium text-gold',
                // 通常 — ホバー
                !isSelected && !cell.disabled && 'hover:bg-cream-100 cursor-pointer active:scale-[0.92]',
                // 無効
                cell.disabled && 'opacity-25 cursor-not-allowed',
                // 曜日カラー（未選択時）
                !isSelected && !cell.disabled && cell.dow === 0 && 'text-red-500',
                !isSelected && !cell.disabled && cell.dow === 6 && 'text-sky-500',
                !isSelected && !cell.disabled && cell.dow > 0 && cell.dow < 6 && 'text-navy-700',
              )}
            >
              {cell.day}
              {/* 今日のドット */}
              {cell.isToday && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gold" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
