import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';

interface Step {
  label: string;
}

interface StepBarProps {
  steps: Step[];
  current: number;
}

export function StepBar({ steps, current }: StepBarProps) {
  const { t } = useTranslation('booking');
  return (
    <nav className="mb-10" aria-label={t('stepBar.ariaLabel')}>
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
                  'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300',
                  isDone && 'bg-navy-700 text-white border border-navy-700',
                  isActive && 'border-2 border-gold text-gold animate-gold-pulse',
                  !isDone && !isActive && 'border border-cream-300 text-navy-400',
                )}>
                  {isDone ? (
                    /* check-draw SVGアニメーション */
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                        className="check-draw"
                      />
                    </svg>
                  ) : (
                    <span className="font-display text-sm font-medium">{stepNum}</span>
                  )}
                </div>
                <span className={cn(
                  'text-[11px] whitespace-nowrap font-body transition-colors duration-300',
                  isActive && 'text-navy-700 font-medium',
                  isDone && 'text-navy-500 font-medium',
                  !isDone && !isActive && 'text-navy-400',
                )}>
                  {step.label}
                </span>
              </div>

              {/* コネクタ */}
              {i < steps.length - 1 && (
                <div className="relative w-10 sm:w-14 mx-1 mt-[-1.25rem]">
                  <div className="h-px bg-cream-300" />
                  <div className={cn(
                    'absolute top-0 left-0 h-px transition-all duration-500 ease-out',
                    isDone ? 'w-full bg-navy-700' : 'w-0 bg-navy-700',
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
