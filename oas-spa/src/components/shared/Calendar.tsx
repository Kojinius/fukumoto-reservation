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
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={prevMonth}
          className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-lien-100 dark:hover:bg-lien-700 text-lien-400 dark:text-lien-500 hover:text-lien-600 dark:hover:text-lien-300 transition-all duration-200"
          aria-label="前月"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-base font-heading font-bold text-lien-900 dark:text-lien-50 tracking-wide">
          <span className="text-accent font-mono">{viewYear}</span>
          <span className="mx-1 text-lien-300 dark:text-lien-600">/</span>
          <span>{viewMonth + 1}月</span>
        </h3>
        <button
          type="button"
          onClick={nextMonth}
          className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-lien-100 dark:hover:bg-lien-700 text-lien-400 dark:text-lien-500 hover:text-lien-600 dark:hover:text-lien-300 transition-all duration-200"
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
            'text-center text-[11px] font-bold py-1.5 tracking-wider uppercase',
            i === 0 && 'text-red-400',
            i === 6 && 'text-sky-400',
            i > 0 && i < 6 && 'text-lien-400 dark:text-lien-500',
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
                'relative aspect-square flex items-center justify-center rounded-xl text-sm transition-all duration-200',
                // 選択中
                isSelected && 'bg-gradient-accent text-white font-bold shadow-[0_2px_12px_-3px_rgba(247,147,33,0.5)] scale-105',
                // 今日
                !isSelected && cell.isToday && 'ring-2 ring-accent/30 font-bold text-accent',
                // 通常 — ホバーでリフト
                !isSelected && !cell.disabled && 'hover:bg-lien-100 dark:hover:bg-lien-700 hover:scale-105 cursor-pointer',
                // 無効
                cell.disabled && 'opacity-25 cursor-not-allowed',
                // 曜日カラー（未選択時）
                !isSelected && !cell.disabled && cell.dow === 0 && 'text-red-500 dark:text-red-400',
                !isSelected && !cell.disabled && cell.dow === 6 && 'text-sky-500 dark:text-sky-400',
                !isSelected && !cell.disabled && cell.dow > 0 && cell.dow < 6 && 'text-lien-700 dark:text-lien-200',
              )}
            >
              {cell.day}
              {/* 今日のドット */}
              {cell.isToday && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent animate-pulse-soft" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
