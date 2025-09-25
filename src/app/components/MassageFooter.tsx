/* MassageFooter.tsx
   役割：フッターのショップボタン → 全画面モーダルメニュー
   方針：
   - z-index を最上位（z-[2000]）に設定して、HPバー/吹き出し/webp より前面に
   - 開閉時に <html> にクラス付与（menu-open）して、下層へのポインター遮断＆非スクロール
*/
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function MassageFooter() {
  const [isOpen, setIsOpen] = useState(false);

  // 開閉に応じて <html> へフラグ付与（pointer-events/スクロール制御）
  useEffect(() => {
    const html = document.documentElement;
    if (isOpen) {
      html.classList.add("menu-open");
      // スクロール固定（iOS対策含む）
      document.body.style.overflow = "hidden";
    } else {
      html.classList.remove("menu-open");
      document.body.style.overflow = "";
    }
    return () => {
      html.classList.remove("menu-open");
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* === モーダル === */}
      {isOpen && (
        <div
          className="
            fixed inset-0 z-[2000]                 /* ← 最上位に */
            flex items-center justify-center
            bg-black/40 backdrop-blur-sm           /* 半透明＋ぼかし */
          "
          aria-modal="true"
          role="dialog"
        >
          {/* 閉じるボタン */}
          <button
            onClick={() => setIsOpen(false)}
            className="
              absolute top-4 right-4
              bg-white text-black text-3xl w-14 h-14 rounded-full shadow-md
              hover:scale-110 transition-transform
              flex items-center justify-center leading-none
            "
            aria-label="メニューを閉じる"
          >
            ×
          </button>

          {/* メニュー本体 */}
          <ul
            className="
              bg-white border border-gray-300 shadow-2xl rounded-2xl
              p-6 md:p-8 space-y-3 text-base md:text-lg lg:text-xl
              font-yusei text-gray-800 w-64 md:w-80 lg:w-96
            "
          >
            <li>
              <Link href="/screen/home" className="block hover:underline">
                Home
              </Link>
            </li>
            <li>
              <Link href="/screen/about" className="block hover:underline">
                Lucaのマッサージとは？
              </Link>
            </li>
            <li>
              <Link href="/screen/calender" className="block hover:underline">
                空き情報/予約カレンダー
              </Link>
            </li>
            <li>
              <Link href="/screen/map" className="block hover:underline">
                Googleマップ/店舗情報
              </Link>
            </li>
            <li>
              <Link href="/screen/prices" className="block hover:underline">
                料金表
              </Link>
            </li>
            <li>
              <Link href="/screen/contact" className="block hover:underline">
                お問い合わせ
              </Link>
            </li>
            <li>
              <Link href="/tachibana" className="block hover:underline">
                アプリ断ち花
              </Link>
            </li>
          </ul>
        </div>
      )}

      {/* === 右下の起動ボタン === */}
      <div className="fixed bottom-4 right-4 z-[1200]">
        {/* ↑ モーダルよりは下（2000）だが、シーン（600/1000）より上に */}
        <button onClick={() => setIsOpen(true)} aria-label="メニューを開く">
          <Image
            src="/image/shop.webp"
            alt="そよ風堂"
            width={160}
            height={160}
            className="
              w-24 sm:w-24 md:w-32 lg:w-40
              drop-shadow-lg hover:scale-105 transition-transform
            "
            priority
          />
        </button>
      </div>
    </>
  );
}
