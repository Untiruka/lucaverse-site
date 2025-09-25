// app/access/page.tsx
// ------------------------------------------------------
// アクセス（店舗情報）— 近距離ズーム版（APIキー不要）
// ・初期ズーム z=18（建物レベル）
// ・ズームIN/OUTボタンで iframe の z を差し替え
// ・中央ピンをCSSオーバーレイで疑似表示（目印）
// ------------------------------------------------------

"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import MassageHeader from "../../components/MassageHeader"
import MassageFooter from "../../components/MassageFooter"

export default function AccessPage() {
  // --- 店舗住所（単一点管理） ---
  const address = "広島市中区上上幟町 9-33 301"

  // --- 地図のズーム（14〜20くらいが実用帯） ---
  const [zoom, setZoom] = useState<number>(18) // ← 初期から“建物ドン寄り”

  // --- 埋め込みURL（APIキー不要形式） ---
  const mapEmbedSrc = useMemo(() => {
    // ※ hl=ja: 日本語UI, z=: ズーム, output=embed: 埋め込み
    return `https://www.google.com/maps?q=${encodeURIComponent(address)}&hl=ja&z=${zoom}&output=embed`
  }, [address, zoom])

  // --- 地図アプリ起動（経路） ---
  const mapLink = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`

  // --- 住所コピー ---
  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address) // 住所をクリップボードへ
      alert("住所をコピーしたで！") // ※ 簡易通知（不要なら削除OK）
    } catch {}
  }

  // --- ズーム操作 ---
  const zoomIn = () => setZoom((z) => Math.min(20, z + 1))
  const zoomOut = () => setZoom((z) => Math.max(14, z - 1))

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-50 text-gray-800 font-yusei">
      <MassageHeader />

      <main className="pt-24 pb-32 px-6 max-w-4xl mx-auto space-y-8">
        {/* タイトル */}
        <header className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold">アクセス</h1>
          <p className="text-gray-600 mt-2">完全予約制。ご来店前に場所をご確認ください。</p>
        </header>

        {/* 店舗カード */}
        <section className="bg-white/90 backdrop-blur-sm rounded-2xl border border-amber-100 shadow-md p-6 md:p-8 space-y-5">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
            <h2 className="text-xl font-bold">店舗所在地</h2>
          </div>

          {/* 住所＋操作 */}
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
            <p className="text-lg md:text-xl font-semibold tracking-wide">{address}</p>
            <div className="flex gap-2">
              <button
                onClick={copyAddress}
                className="inline-flex items-center rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm shadow-sm hover:bg-amber-50 transition"
                title="住所をコピー"
              >
                住所をコピー
              </button>
              <a
                href={mapLink}
                target="_blank"
                className="inline-flex items-center rounded-xl bg-amber-600 text-white px-3 py-2 text-sm shadow hover:bg-amber-700 transition"
                title="Googleマップで開く"
              >
                マップで開く
              </a>
            </div>
          </div>



<section className="bg-white/90 backdrop-blur-sm rounded-2xl border border-amber-100 shadow-md p-6 md:p-8 space-y-4">
  <div className="flex items-center gap-2">
    <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
    <h2 className="text-xl font-bold">営業時間</h2>
  </div>

  <p className="text-lg">
    10:00〜23:00
  </p>

  <p className="text-gray-700 text-[15px]">
    不定休のため、詳しい営業日はこちらからご確認ください。<br />
    <Link href="/screen/calender" className="text-amber-600 hover:underline">
      空き状況カレンダーを見る
    </Link>
  </p>
</section>



          {/* 来店メモ */}
          <ul className="list-disc list-inside text-[15px] text-gray-700 space-y-1">
            <li>ビル入館後は <b>301</b> をお呼び出しください（インターホン）。</li>
            <li>予約時間の <b>5分前以降</b> にお越しください（準備のため）。</li>
            <li>当店はリラクゼーションサロンです。医療行為/性的サービスは行いません。</li>
          </ul>
        </section>

        {/* 地図（近距離ズーム + ズーム操作 + 中心ピン） */}
        <section className="rounded-2xl border border-amber-100 bg-white/90 backdrop-blur-sm shadow-md p-3 md:p-4">
          {/* 操作ボタン（右上固定） */}
          <div className="flex justify-end gap-2 mb-2">
            <button
              onClick={zoomOut}
              className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
              title="ズームアウト"
            >
              −
            </button>
            <button
              onClick={zoomIn}
              className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
              title="ズームイン"
            >
              ＋
            </button>
          </div>

          {/* 16:9 ラッパー（レスポンシブ） */}
          <div className="relative w-full overflow-hidden rounded-xl" style={{ paddingTop: "56.25%" }}>
            {/* 地図本体（ズームは state から反映） */}
            <iframe
              src={mapEmbedSrc}
              className="absolute inset-0 h-full w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="店舗所在地（Googleマップ）"
            />

            {/* 中心ピン（疑似）：地図中央にリング表示して目印強化 */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              {/* 外側のソフト影 */}
              <div className="h-7 w-7 rounded-full bg-amber-600/20 blur-[2px]" />
              {/* 内側のピン本体 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-3.5 w-3.5 rounded-full bg-amber-600 ring-4 ring-white/90 shadow" />
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-2">
            ※地図がズレたら「＋/−」で調整、もしくは「マップで開く」からピン位置を確認してください。
          </p>
        </section>

        {/* 予約CTA */}
        <div>
          <Link
            href="/screen/calender"
            className="inline-flex items-center justify-center rounded-xl bg-amber-600 text-white px-5 py-3 text-sm md:text-base shadow hover:bg-amber-700 transition"
          >
            予約する
          </Link>
        </div>
      </main>

      <MassageFooter />
    </div>
  )
}
