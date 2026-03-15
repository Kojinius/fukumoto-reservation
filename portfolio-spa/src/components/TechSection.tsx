import { skills } from '@/data/skills';

export function TechSection() {
  return (
    <section className="max-w-3xl mx-auto px-6 pb-16">
      {/* セクションタイトル */}
      <div
        className="flex items-center gap-4 mb-8 opacity-0 animate-fade-in-up"
        style={{ animationDelay: '800ms' }}
      >
        <div className="h-px flex-1 bg-brown-200 dark:bg-brown-800" />
        <h2 className="text-xs font-bold tracking-[0.12em] uppercase text-brown-500">
          Technology
        </h2>
        <div className="h-px flex-1 bg-brown-200 dark:bg-brown-800" />
      </div>

      {/* カテゴリグリッド */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {skills.map((category, i) => (
          <div
            key={category.name}
            className="bg-white/60 dark:bg-brown-900/40 rounded-xl border border-brown-200/60 dark:border-brown-800/60 p-5 opacity-0 animate-fade-in-up"
            style={{ animationDelay: `${850 + i * 50}ms` }}
          >
            <h3 className="text-[11px] font-bold tracking-wider uppercase text-brown-400 dark:text-brown-500 mb-3">
              {category.name}
            </h3>
            <div className="flex flex-wrap gap-2">
              {category.items.map(item => (
                <span
                  key={item}
                  className="text-sm text-brown-700 dark:text-brown-300 bg-brown-50 dark:bg-brown-800/80 rounded-lg px-3 py-1"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
