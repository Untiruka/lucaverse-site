"use client"

import MassageFooter from "../../components/MassageFooter"
import MassageHeader from "../../components/MassageHeader"

export default function HomePage() {
  return (
    <div className="bg-gray-100 relative min-h-screen overflow-hidden font-yusei">
      {/* ✅ 共通ヘッダーを表示 */}
      <MassageHeader />
      <main className="p-6">
        <p>ここに本文</p>
      </main>

      {/* ✅ メニューアイコン（MassageFooter に統合済み） */}
      <MassageFooter />
    </div>
  )
}