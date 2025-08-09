// app/page.tsx

'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image' // ← next/image を使う

export default function TopPage() {
  const [menuVisible, setMenuVisible] = useState(false)

  return (
    <section className="section section1">
      {/* 背景画像たち（public/image/ に配置）
         - next/image は width / height 必須（※仮値。実ファイルの解像度に合わせて直すこと）
         - className はそのまま使える
         - priority: 初期表示で重要なら付けるとLCP改善 */}
      <Image
        src="/image/1.png"
        className="layer back"
        alt="background layer"
        width={1920}   // ← 仮。実サイズに合わせて修正
        height={1080}  // ← 仮。実サイズに合わせて修正
        priority
      />
      <Image
        src="/image/1.1.png"
        className="layer front"
        alt="foreground layer"
        width={1920}   // ← 仮
        height={1080}  // ← 仮
      />
      <Image
        src="/image/1.2.png"
        className="twinkle"
        alt="twinkle effect"
        width={1920}   // ← 仮
        height={1080}  // ← 仮
      />

      {/* タップ表示 */}
      {!menuVisible && (
        <div id="tap-to-start" className="tap-text" onClick={() => setMenuVisible(true)}>
          - タップする -
        </div>
      )}

      {/* メニュー表示 */}
      {menuVisible && (
        <div id="menu" className="menu-visible">
          <ul className="menu-list text-base sm:text-lg md:text-xl leading-relaxed space-y-2">
            <li>
              <Link href="/screen/home">▶︎ リメディアルマッサージサロン[Luca]</Link>
            </li>
            <li>
              <Link href="/tachibana">▶︎ アプリ断ち花とは？</Link>
            </li>
            <li>
              <Link href="/project">▶︎ 禁欲プロジェクトとは？</Link>
            </li>
            <li>
              <Link href="/privacy">▶︎ プライバシーポリシー</Link>
            </li>
          </ul>
        </div>
      )}
    </section>
  )
}
