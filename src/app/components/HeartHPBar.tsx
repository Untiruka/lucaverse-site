// 役割：HPハート。外側余白を一切つけず、親（hpbar-wrap）の高さに100%フィットさせる
"use client";

type Props = {
  hp: number;   // 現在値
  max: number;  // 総数
};

export default function HeartHPBar({ hp, max }: Props) {
  return (
    // ★ 余白を作らない（margin/paddingゼロ）。高さは親（hpbar-wrap）の --hp-height に従う
    <div className="flex items-center justify-center gap-[6px] h-full w-full relative z-[1200]">
      {Array.from({ length: max }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          // ★ 各アイコンを親高に合わせる（--hp-height をそのまま使用）
          style={{ width: "var(--hp-height)", height: "var(--hp-height)" }}
          className={i < hp ? "fill-red-500 text-red-500" : "fill-none text-gray-400"}
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 21s-8-7.5-8-12.5C4 5.42 6.42 3 9.5 3c1.74 0 3.41 1.01 4.5 2.61C15.09 4.01 16.76 3 18.5 3 21.58 3 24 5.42 24 8.5c0 5-8 12.5-8 12.5H12z" />
        </svg>
      ))}
    </div>
  );
}
