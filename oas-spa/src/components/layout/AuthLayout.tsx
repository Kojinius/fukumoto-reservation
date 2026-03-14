import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="min-h-screen flex bg-canvas">
      {/* 左パネル — ネイビーグラデーション + 金の装飾（AMS風スプリットスクリーン） */}
      <div className="hidden lg:flex relative w-[45%] bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 flex-col items-center justify-center overflow-hidden">
        {/* 装飾メッシュ */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(201,169,110,0.08)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_70%,rgba(61,97,159,0.12)_0%,transparent_50%)]" />

        {/* 金の同心円モチーフ */}
        <div className="relative">
          <div className="w-32 h-32 rounded-full bg-gold/10 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-gold/20 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-gold/60" />
            </div>
          </div>
        </div>

        {/* ブランドテキスト */}
        <div className="relative mt-8 text-center">
          <h2 className="text-xl font-heading font-semibold text-cream">
            オンライン予約システム
          </h2>
          <p className="text-[11px] tracking-[0.25em] uppercase text-cream/40 font-display mt-2">
            ONLINE RESERVATION SYSTEM
          </p>
        </div>

        {/* 装飾ドット（gold / navy） */}
        <div className="absolute top-12 left-10 w-2 h-2 rounded-full bg-gold/30" />
        <div className="absolute top-24 right-16 w-1.5 h-1.5 rounded-full bg-cream/10" />
        <div className="absolute bottom-20 left-20 w-1 h-1 rounded-full bg-gold/20" />
        <div className="absolute bottom-32 right-10 w-2.5 h-2.5 rounded-full bg-cream/5" />
        <div className="absolute top-1/3 left-8 w-1 h-1 rounded-full bg-gold/15" />
        <div className="absolute bottom-16 left-1/3 w-1.5 h-1.5 rounded-full bg-gold/25" />
      </div>

      {/* 右パネル — フォーム */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <Outlet />
      </div>
    </div>
  );
}
