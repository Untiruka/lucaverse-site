"use client"

import Link from "next/link"
import MassageFooter from "../../components/MassageFooter"
import MassageHeader from "../../components/MassageHeader"

export default function ContactPage() {
  const email = "lucaverce_massage@yahoo.co.jp"

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-50 text-gray-800 font-yusei">
      {/* ヘッダー */}
      <MassageHeader />

      {/* 本文 */}
      <main className="pt-24 pb-32 px-6 max-w-3xl mx-auto space-y-8">
        {/* 見出し */}
        <header className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold">お問い合わせ</h1>
          <p className="text-gray-600 mt-2">ご質問・ご予約確認など、お気軽にどうぞ。</p>
        </header>

        {/* メールリンクカード */}
        <section className="bg-white/90 backdrop-blur-sm rounded-2xl border border-amber-100 shadow-md p-6 md:p-8 space-y-4">
          <h2 className="text-xl font-semibold">メールでのお問い合わせ</h2>
          <p className="text-[15px] text-gray-700">
            下記リンクをクリックすると、お使いのメールアプリが開きます。
          </p>
          <a
            href={`mailto:${email}`}
            className="inline-flex items-center rounded-xl bg-amber-600 text-white px-5 py-3 text-sm md:text-base shadow hover:bg-amber-700 transition"
          >
            {email} にメールする
          </a>
          <p className="text-xs text-gray-500">※ メール本文にお名前・お問い合わせ内容をご記入ください。</p>
        </section>

        {/* 営業情報 */}
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-2">営業情報</h2>
          <ul className="list-disc list-inside text-[15px] text-gray-800 space-y-1">
            <li>営業時間：10:00〜17:00</li>
            <li>
              不定休：
              <Link href="/screen/calender" className="text-amber-600 hover:underline">
                営業日カレンダーはこちら
              </Link>
            </li>
          </ul>
        </section>
      </main>

      {/* フッター */}
      <MassageFooter />
    </div>
  )
}
