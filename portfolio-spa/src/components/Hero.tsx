export function Hero() {
  return (
    <section className="max-w-3xl mx-auto pt-20 pb-12 px-6 text-center">
      {/* タグ */}
      <span className="inline-block bg-accent text-white text-xs font-bold rounded-full px-4 py-1.5 tracking-wider opacity-0 animate-fade-in-up">
        Claude Code × Firebase
      </span>

      {/* メインタイトル */}
      <h1
        className="mt-6 font-body text-[clamp(26px,5vw,44px)] font-bold leading-tight text-brown-800 dark:text-brown-100 opacity-0 animate-fade-in-up"
        style={{ animationDelay: '100ms' }}
      >
        Claude と一緒に
        <br />
        <span className="text-brown-600 dark:text-brown-400">プロダクトを作っています</span>
      </h1>

      {/* 説明文 */}
      <p
        className="mt-6 text-[15px] text-brown-500 dark:text-brown-400 leading-relaxed max-w-xl mx-auto opacity-0 animate-fade-in-up"
        style={{ animationDelay: '200ms' }}
      >
        このサイトは、AI（Claude Code）との対話を通じて設計・実装したプロジェクトを公開するポートフォリオです。
        インフラは Firebase Hosting、データベースは Firestore を使用しています。
      </p>

      {/* Claude バッジ */}
      <div
        className="mt-10 opacity-0 animate-fade-in-up"
        style={{ animationDelay: '300ms' }}
      >
        <div className="inline-flex items-center gap-3 bg-white dark:bg-brown-900 border border-brown-200 dark:border-brown-800 rounded-full px-5 py-2.5 shadow-sm dark:shadow-brown-950/40">
          <div className="w-7 h-7 rounded-lg badge-shimmer flex items-center justify-center text-white text-sm font-display font-bold">
            C
          </div>
          <span className="text-sm font-medium text-brown-600 dark:text-brown-300">
            Built with Claude Code by Anthropic
          </span>
        </div>
      </div>
    </section>
  );
}
