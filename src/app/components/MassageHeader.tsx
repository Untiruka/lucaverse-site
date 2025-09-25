// /mnt/data/MassageHeader.tsx
// ------------------------------------------------------
// 目的：ゲーム感のあるヘッダー演出を「全部盛り」実装
// 効果：フェードイン、ネオン脈動、グリッチ（ホバー時）、下線ライト走査
// 注意：Tailwind前提。追加の外部ライブラリ不要。
// ------------------------------------------------------

"use client"

import Link from "next/link"

export default function MassageHeader() {
  return (
    // ▼ ヘッダー土台：固定配置＋ダーク基調＋シアン下線
    //    - animate-[fadeSlide...]：初回ロードで下からフェードイン（フェードイン演出）
    //    - relative+overflow-hidden：下線のライト走査をはみ出し無しで表示
    <div
      id="app-header" // ← 既存IDを維持（他コンポ連携を壊さないため）
      className="fixed top-0 left-0 w-full bg-gray-900 z-50 border-b-2 border-cyan-400 relative overflow-hidden animate-[fadeSlide_0.8s_ease-out]"
    >
      {/* ▼ 下線ライト走査（ボーダーライトラン） */}
      {/*   - absoluteのバーを左→右へ流すキーフレーム“shine”を適用 */}
      <span className="pointer-events-none absolute bottom-[-2px] left-0 h-[2px] w-1/3 bg-cyan-400/80 animate-[shine_2s_linear_infinite]" />

      <Link href="/" passHref>
        {/* ▼ group：子要素のhoverスタイルをまとめて扱える（今回は見出しのみで使用） */}
        <div className="group p-4 cursor-pointer text-left">
          {/* ▼ サブコピー（白文字） */}
          <h1 className="text-sm font-yusei text-white">
            男がやるオイルマッサージ屋さん
          </h1>

          {/* ▼ 店名（ネオン発光＋脈動＋hover時のみグリッチ） */}
          {/*   - animate-pulse：常時ゆるく明滅（ネオン脈動）
               - group-hover:glitch-run：ホバー時だけグリッチ（ノイズ揺れ）
               - textShadow：ネオン発光感（発光の見た目） */}
          <h2
            className="text-3xl mt-1 font-conti text-cyan-400 animate-pulse glitch-run-on-hover"
            style={{ textShadow: "0 0 5px #06b6d4, 0 0 10px #06b6d4" }}
          >
            Luca
          </h2>
        </div>
      </Link>

      {/* ▼ コンポーネント内に必要アニメ定義を同梱（グローバル適用） */}
      <style jsx global>{`
        /* -------------------------------
         * フェードイン＋スライド（fadeSlide）
         * 説明：初回マウント時に下からスッと出す（導入の気持ち良さ）
         * ------------------------------- */
        @keyframes fadeSlide {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* -------------------------------
         * 下線ライト走査（shine）
         * 説明：下線のシアンが左→右へ走る（アーケード筐体っぽさ）
         * ------------------------------- */
        @keyframes shine {
          0% {
            transform: translateX(-120%);
          }
          100% {
            transform: translateX(220%);
          }
        }

        /* -------------------------------
         * グリッチ（glitch）
         * 説明：古いCRT風の微妙なズレ（世界観のノイズ）
         * メモ：hover時のみ発動させて常時ガタつかないように配慮
         * ------------------------------- */
        @keyframes glitch {
          0% {
            transform: translate(0);
            filter: hue-rotate(0deg);
          }
          20% {
            transform: translate(-1px, 1px) skewX(0.3deg);
            filter: hue-rotate(5deg);
          }
          40% {
            transform: translate(1px, -1px) skewX(-0.3deg);
            filter: hue-rotate(-5deg);
          }
          60% {
            transform: translate(-1px, -1px) skewX(0.2deg);
            filter: hue-rotate(3deg);
          }
          80% {
            transform: translate(1px, 1px) skewX(-0.2deg);
            filter: hue-rotate(-3deg);
          }
          100% {
            transform: translate(0);
            filter: hue-rotate(0deg);
          }
        }

        /* hover時のみグリッチ作動（読みやすさ配慮） */
        .glitch-run-on-hover:hover {
          animation: glitch 0.8s steps(2, end) infinite;
        }
      `}</style>
    </div>
  )
}
