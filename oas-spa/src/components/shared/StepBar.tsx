import { cn } from '@/utils/cn';

interface Step {
  label: string;
}

interface StepBarProps {
  steps: Step[];
  current: number;
}

export function StepBar({ steps, current }: StepBarProps) {
  return (
    <nav className="mb-10" aria-label="予約ステップ">
      <div className="flex items-center justify-center gap-0">
        {steps.map((step, i) => {
          const stepNum = i + 1;
          const isDone = stepNum < current;
          const isActive = stepNum === current;

          return (
            <div key={i} className="flex items-center">
              {/* ステップ */}
              <div className="flex flex-col items-center gap-1.5">
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300',
                  isDone && 'bg-gradient-accent text-white shadow-[0_2px_8px_-2px_rgba(247,147,33,0.5)]',
                  isActive && 'bg-gradient-accent text-white shadow-[0_2px_12px_-2px_rgba(247,147,33,0.5)] ring-[3px] ring-accent/20 scale-110',
                  !isDone && !isActive && 'bg-lien-100 dark:bg-lien-700/60 text-lien-400 dark:text-lien-500 border border-lien-200 dark:border-lien-600',
                )}>
                  {isDone ? (
                    <svg className="w-4 h-4 animate-check-pop" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : stepNum}
                </div>
                <span className={cn(
                  'text-xs whitespace-nowrap transition-colors duration-300',
                  isActive && 'text-accent font-bold',
                  isDone && 'text-lien-600 dark:text-lien-300 font-medium',
                  !isDone && !isActive && 'text-lien-400 dark:text-lien-500',
                )}>
                  {step.label}
                </span>
              </div>

              {/* コネクタ */}
              {i < steps.length - 1 && (
                <div className="relative w-10 sm:w-14 mx-1 mt-[-1.25rem]">
                  {/* 背景線 */}
                  <div className="h-[2px] bg-lien-200 dark:bg-lien-700 rounded-full" />
                  {/* 完了済み線 */}
                  <div className={cn(
                    'absolute top-0 left-0 h-[2px] rounded-full transition-all duration-500',
                    isDone ? 'w-full bg-accent' : 'w-0 bg-accent',
                  )} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
