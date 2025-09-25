"use client"

import Link from "next/link"
import MassageFooter from "../../components/MassageFooter"
import MassageHeader from "../../components/MassageHeader"

export default function ContactPage() {
  const email = "lucaverce_massage@yahoo.co.jp"

  return (
    // ▼ 全体をダークテーマ・ピクセル風フォントに変更
    <div className="min-h-screen bg-gray-900 text-gray-200 font-conti">
      <MassageHeader />

      <main className="pt-24 pb-32 px-6 max-w-3xl mx-auto space-y-8">
        {/* ▼ 見出しをネオン風に */}
        <header className="text-center">
          <h1 
            className="text-3xl md:text-4xl font-bold text-white"
            style={{ textShadow: '0 0 8px #06b6d4' }}
          >
            お問い合わせ
          </h1>
          <p className="text-gray-400 mt-2">ご質問・ご予約確認など、お気軽にどうぞ。</p>
        </header>

        {/* ▼ メールリンクカードをゲーミング風UIに */}
        <section className="bg-gray-800 rounded-lg border border-cyan-400/50 p-6 md:p-8 space-y-4">
          <h2 className="text-xl font-bold text-cyan-300">メールでのお問い合わせ</h2>
          <p className="text-[15px] text-gray-300">
            下記リンクをクリックすると、お使いのメールアプリが開きます。
          </p>
          {/* ▼ ボタンのデザインを変更 */}
          <a
            href={`mailto:${email}`}
            className="inline-flex items-center rounded-lg bg-cyan-500 text-black px-5 py-3 text-sm md:text-base font-bold shadow-lg shadow-cyan-500/20 hover:bg-cyan-400 transition-all duration-200"
          >
            {email} にメールする
          </a>
          <p className="text-xs text-gray-500">※ メール本文にお名前・お問い合わせ内容をご記入ください。</p>
        </section>

        {/* ▼ 営業情報カードのデザインを変更 */}
        <section className="rounded-lg border border-gray-700 bg-black/50 p-6">
          <h2 className="text-lg font-bold text-white mb-3">営業情報</h2>
          <ul className="list-disc list-inside text-[15px] text-gray-300 space-y-2">
            <li>営業時間：10:00〜17:00</li>
            <li>
              不定休：
              {/* ▼ リンクカラーを変更 */}
              <Link href="/screen/calender" className="text-cyan-400 hover:underline ml-2">
                営業日カレンダーはこちら
              </Link>
            </li>
          </ul>
        </section>
      </main>

      <MassageFooter />
    </div>
  )
}