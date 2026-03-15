import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface A4PreviewProps {
  children: ReactNode;
  onGeneratePdf: () => Promise<void>;
  onReset: () => void;
  isGenerating?: boolean;
}

/** A4用紙プレビュー + PDF出力ボタン */
export function A4Preview({ children, onGeneratePdf, onReset, isGenerating = false }: A4PreviewProps) {
  return (
    <div className="flex flex-col h-full">
      {/* アクションボタン */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-brown-200/60 dark:border-brown-800/60 bg-white/60 dark:bg-brown-900/40 backdrop-blur-sm">
        <button
          type="button"
          onClick={onGeneratePdf}
          disabled={isGenerating}
          className={cn(
            'flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
            isGenerating
              ? 'bg-brown-200 dark:bg-brown-700 text-brown-400 cursor-not-allowed'
              : 'bg-accent text-white hover:bg-accent-dark cursor-pointer',
          )}
        >
          {isGenerating ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
              </svg>
              生成中…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              PDF 保存
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="px-4 py-1.5 rounded-lg text-sm font-medium text-brown-500 dark:text-brown-400 hover:bg-brown-100 dark:hover:bg-brown-800 transition-colors cursor-pointer"
        >
          リセット
        </button>
      </div>

      {/* A4プレビュー領域（96dpi = ブラウザ座標系） */}
      <div className="flex-1 overflow-y-auto p-3 bg-brown-100/50 dark:bg-brown-950/30">
        <div className="mx-auto bg-white dark:bg-brown-900/80 shadow-lg rounded-sm border border-brown-200/60 dark:border-brown-800/60"
          style={{
            width: '100%',
            maxWidth: 1000,
            aspectRatio: '794 / 1123',
          }}
        >
          <div className="p-10 text-[15px] leading-relaxed text-brown-800 dark:text-brown-100">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
