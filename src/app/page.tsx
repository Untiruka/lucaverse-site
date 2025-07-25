// app/page.tsx

'use client'

import { useState } from 'react'
import Link from 'next/link'
export default function TopPage() {
  const [menuVisible, setMenuVisible] = useState(false)

  return (
    <section className="section section1">
      {/* 背景画像たち（public/image/ に配置） */}
      <img src="/image/1.png" className="layer back" alt="background layer" />
      <img src="/image/1.1.png" className="layer front" alt="foreground layer" />
      <img src="/image/1.2.png" className="twinkle" alt="twinkle effect" />

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
