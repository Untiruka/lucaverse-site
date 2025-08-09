// app/about/page.tsx
// -----------------------------------------------
// マッサージ店向けの柔らかデザイン（Tailwind）
// ・ヒーロー：安心感（暖色グラデ + 角丸 + 余白）
// ・カード：読みやすいボックス（影/角丸）
// ・CTA：予約導線を明確化（primaryボタン）
// （CTA=Call To Action／行動喚起ボタン）
// -----------------------------------------------

"use client"

import Link from "next/link"            // 予約への導線（ルーティング用）
import MassageHeader from "../../components/MassageHeader"
import MassageFooter from "../../components/MassageFooter"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-50 text-gray-800 font-yusei">
      {/* ヘッダー（共通） */}
      <MassageHeader />

      {/* ヒーロー：店舗紹介の第一印象 */}
      <section
        className="relative pt-28 pb-14 px-6"
        // （pt/pb=padding上/下, px=左右。first-viewの余白を広めに）
      >
        {/* 背景のやわらか装飾（放射ぼかし） */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="mx-auto h-[28rem] w-[28rem] blur-3xl opacity-30 bg-amber-200/60 rounded-full translate-y-[-20%]" />
        </div>

        <div className="max-w-4xl mx-auto text-center space-y-5">
          <span className="inline-block text-xs tracking-widest text-amber-700/80 bg-amber-100 px-3 py-1 rounded-full shadow-sm">
            男性セラピストのプライベートサロン
          </span>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight">
            男がやるオイルマッサージ・指圧店
            <span className="text-amber-700">【Luca】</span>
          </h1>
          <p className="text-base md:text-lg text-gray-600">
            「安心・丁寧・実感あるボディケア」。自宅サロンで、落ち着いた空間としっかり圧（あつ／適切な加圧）で整えます。
          </p>

          {/* CTA（予約導線） */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
            href="/screen/calender"           // ← 予約ページのパスに合わせて変更
              className="inline-flex items-center justify-center rounded-xl bg-amber-600 text-white px-5 py-3 text-sm md:text-base shadow hover:bg-amber-700 transition"
            >
              予約する
            </Link>
            <Link
              href="/screen/prices"               // ← 料金表のパスに合わせて変更
              className="inline-flex items-center justify-center rounded-xl border border-amber-300 bg-white text-amber-700 px-5 py-3 text-sm md:text-base shadow-sm hover:bg-amber-50 transition"
            >
              料金を見る
            </Link>
          </div>
        </div>
      </section>

      {/* メイン：読みやすいカード構成 */}
      <main className="pb-28 px-6 max-w-4xl mx-auto space-y-10">
        {/* 店の説明 */}
        <section className="bg-white/80 backdrop-blur-sm border border-amber-100 rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold mb-3">Luca（ルカ）とは？</h2>
          <p className="leading-relaxed text-gray-700">
            当店Lucaは、「男性セラピストによる、安心・丁寧・実感あるボディケア」を提供する自宅リラクゼーションサロンです。
          </p>
        </section>

        {/* 提供サービス（カード） */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">提供サービス</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {/* 各ボックス：短文 + 補足（カッコ）で実用性重視 */}
            <div className="bg-white rounded-2xl border border-amber-100 p-5 shadow-sm">
              <h3 className="font-semibold mb-1">リメディアルマッサージ</h3>
              <p className="text-sm text-gray-600">
                筋肉のコリにアプローチ（オイル施術の発展形／症状ベースの調整）。
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-amber-100 p-5 shadow-sm">
              <h3 className="font-semibold mb-1">オイルマッサージ</h3>
              <p className="text-sm text-gray-600">
                リラックスと血流改善（自律神経ケア・睡眠の質向上）。
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-amber-100 p-5 shadow-sm">
              <h3 className="font-semibold mb-1">リンパマッサージ</h3>
              <p className="text-sm text-gray-600">
                むくみ・老廃物ケア（体液循環の促進）。
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-amber-100 p-5 shadow-sm">
              <h3 className="font-semibold mb-1">指圧</h3>
              <p className="text-sm text-gray-600">
                ツボ押しで疲労回復（経穴＝ツボ／指や手根で持続圧）。
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-amber-100 p-5 shadow-sm">
              <h3 className="font-semibold mb-1">ヘッドスパ</h3>
              <p className="text-sm text-gray-600">
                頭皮の緊張緩和・睡眠改善（側頭筋など頭部筋のリリース）。
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-amber-100 p-5 shadow-sm">
              <h3 className="font-semibold mb-1">足裏（リフレ）</h3>
              <p className="text-sm text-gray-600">
                反射区で内臓調整（リフレクソロジー／足底の対応マップ）。
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-amber-100 p-5 shadow-sm md:col-span-2">
              <h3 className="font-semibold mb-1">ファシア（筋膜）アプローチ</h3>
              <p className="text-sm text-gray-600">
                体の連続性を意識して全体の動きを改善（線維性膜＝筋膜／滑走性）。
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            ※しっかり圧（過剰な強圧はしない）で、状態に合わせて丁寧に施術します。
          </p>
        </section>

        {/* 男性向けの理由 */}
        <section className="bg-white rounded-2xl border border-amber-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-2">男性向けの理由</h2>
          <p className="text-gray-700">
            上半身リメディアルやオイル施術で上裸（じょうら）対応が必要になるため、基本は男性の方を対象としています。
          </p>
          <p className="text-gray-700 mt-2">
            鼠径部（そけいぶ）のリンパ/筋膜施術を含むため、施術環境に抵抗の少ない同性間の対応を前提としています。
          </p>
        </section>

        {/* こだわりポイント（ハイライトカード） */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Lucaのこだわり</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              "施術歴8年のオーナー",
              "豪州Parramatta Parkでリメディアル資格（国家資格）",
              "ダブルサイズのこだわり施術ベッド",
              "English OK（質問はお気軽に）",
              "筋肉・体質に合わせた圧と手技",
              "施術後の軽さ・リフレッシュ感を重視",
              "完全予約制・個室で安心",
            ].map((t) => (
              <div key={t} className="bg-white rounded-2xl border border-amber-100 p-4 shadow-sm">
                <p className="text-sm text-gray-700">{t}</p>
              </div>
            ))}
          </div>
        </section>

        {/* おすすめ層 */}
        <section className="bg-white rounded-2xl border border-amber-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-2">こんな方におすすめ</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>デスクワークで肩/背中がパンパン</li>
            <li>寝つきが悪い・頭が重い・目が疲れる</li>
            <li>ストレスでリラックスしたい</li>
            <li>ガチガチに固まった体をしっかり解したい</li>
            <li>自分の体のことを相談できる場所がほしい</li>
          </ul>
        </section>

        {/* 注意事項 */}
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-lg font-semibold mb-2">ご注意事項</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-800">
            <li>女性への施術は限定的（紹介・面識ある場合など）。</li>
            <li>性的サービスは一切なし（健康と癒し目的の施術）。</li>
            <li>医療行為ではありません。</li>
          </ul>

          {/* 下部CTA：スクロール末尾でも予約に届くように */}
          <div className="pt-4">
            <Link
              href="/screen/calender"
              className="inline-flex items-center justify-center rounded-xl bg-amber-600 text-white px-5 py-3 text-sm md:text-base shadow hover:bg-amber-700 transition"
            >
              予約へ進む
            </Link>
          </div>
        </section>
      </main>

      {/* フッター（共通） */}
      <MassageFooter />
    </div>
  )
}
