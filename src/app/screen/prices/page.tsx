// app/prices/page.tsx
// ------------------------------------------------------
// デザインだけ変更版（内容テキストは一切変更なし）
// ・暖色グラデ背景（安心感）
// ・カードUI（rounded / border / shadow）
// ・見出しの視認性UP、余白・行間の最適化
// ・既存リンク/文言/構造はそのまま維持
// ------------------------------------------------------

"use client"

import MassageHeader from "../../components/MassageHeader"
import MassageFooter from "../../components/MassageFooter"

export default function PricesPage() {
  return (
    // ▼ 背景：柔らかい暖色グラデ（視認性＆清潔感）
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-50 text-gray-800 font-yusei">
      {/* 共通ヘッダー */}
      <MassageHeader />

      {/* ▼ メイン領域：余白強化＆幅広げ（読みやすさ優先） */}
      <main className="pt-24 pb-40 px-6 max-w-4xl mx-auto">
        {/* ▼ 料金ボックス：既存内容をカード化（デザインのみ変更） */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-amber-100 shadow-md p-6 md:p-8 space-y-7 mt-8">
          {/* タイトル（中央寄せ・視認性UP） */}
          <h2 className="text-3xl font-bold text-center tracking-wide">
            料金表
          </h2>

          {/* 通常料金（セクション見出しの装飾のみ） */}
          <div>
            <h3 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
              通常料金
            </h3>

            <div className="grid md:grid-cols-2 gap-5">
              {/* ▼ 既存1つ目のブロックをカード風に */}
              <div className="rounded-xl border border-amber-100 bg-white p-5 shadow-sm">
                <p className="font-semibold text-[20px] mb-2">ボディケア</p>
                <p className="text-gray-600 text-[16px] mb-3 leading-relaxed">
                  指圧（しあつ）・ヘッドスパ・足裏マッサージ・ふくらはぎオイルマッサージ<br />
                  <b>この中からお好みで組み合わせ</b>（予約時でもマッサージ中でもやってほしいことをお伝えしてくださいね！）
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[16px] text-gray-600">30分</span>
                  <span className="font-extrabold text-[28px] text-gray-900">5,000円</span>
                </div>
              </div>

              {/* ▼ 既存2つ目のブロックをカード風に */}
              <div className="rounded-xl border border-amber-100 bg-white p-5 shadow-sm">
                <p className="font-semibold text-[20px] mb-2">全身リメディアル／オイル</p>
                <p className="text-gray-600 text-[16px] mb-3 leading-relaxed">
                  全身に対して深層筋までケア（リメディアル＝本格的な筋肉調整）＋オイル
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[16px] text-gray-600">60分</span>
                  <span className="font-extrabold text-[28px] text-gray-900">9,000円</span>
                </div>
              </div>
            </div>
          </div>

          {/* 初回料金（色味だけグリーン寄せで差別化。文言はそのまま） */}
          <div>
            <h3 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-emerald-700">初回料金</span>
            </h3>

            <div className="grid md:grid-cols-2 gap-5">
              {/* ▼ 既存1つ目 */}
              <div className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
                <p className="font-semibold text-[20px] mb-2">ボディケア or 全身オイル</p>
                <p className="text-gray-600 text-[16px] mb-3">内容は通常コースと同じです</p>
                <div className="flex items-center justify-between">
                  <span className="text-[16px] text-gray-600">30分</span>
                  <span className="font-extrabold text-[28px] text-emerald-700">3,000円</span>
                </div>
              </div>

              {/* ▼ 既存2つ目 */}
              <div className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
                <p className="font-semibold text-[20px] mb-2">全身リメディアル／オイル</p>
                <p className="text-gray-600 text-[16px] mb-3">全身オイルマッサージ（初回割引価格）</p>
                <div className="flex items-center justify-between">
                  <span className="text-[16px] text-gray-600">60分</span>
                  <span className="font-extrabold text-[28px] text-emerald-700">4,000円</span>
                </div>
              </div>
            </div>
          </div>

          {/* 注意テキスト（既存文言そのまま／見た目だけ整形） */}
          <div className="text-gray-700 text-sm mt-2 bg-amber-50 border border-amber-100 rounded-xl p-4">
            <span className="text-red-600 font-semibold block">※現在60分以上のコースは受付停止中</span>
            <span>短時間でもしっかり成果を出します。</span>
          </div>
        </div>

        {/* ▼ 断ち花割り（既存内容そのまま／セクション全体をカード化） */}
        <section className="text-center space-y-6 mt-10 px-4">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-indigo-200 p-6 shadow-md">
            <h2 className="text-2xl font-bold text-green-700">🌿 アプリ「断ち花」提示で500円割引！</h2>

            <p className="text-[18px] text-gray-700 leading-relaxed mt-2">
              当店では、私が開発したアプリ <b className="text-green-800">「断ち花」</b> の<br />
              <span className="underline">メイン画面を見せていただくだけで、</span>
            </p>
            <p className="text-[48px] font-extrabold text-red-600 my-2 drop-shadow text-center">500円割引</p>
            <p className="text-[18px] text-gray-700 leading-relaxed">を実施しております。</p>
            <p className="text-[17px] text-gray-600 leading-relaxed">
              初回のお客様にも適用されます。スタッフにお気軽にご提示ください。
            </p>
            <p className="text-[17px] text-gray-700 leading-relaxed">
              実は…それを見せてもらえると、<b className="text-indigo-700">私のモチベーション</b>にもなるので、<br />
              そのお礼と言ってはなんですが…割引させていただいております 🙇‍♂️
            </p>

            {/* 既存リンクそのまま（装飾のみ） */}
            <div className="text-[16px] text-gray-700 space-y-2 mt-5">
              <p>
                <b>Android：</b><br />
                <a
                  href="https://play.google.com/store/apps/details?id=com.iruka.tachibana"
                  target="_blank"
                  className="text-blue-600 underline break-all"
                >
                  https://play.google.com/store/apps/details?id=com.iruka.tachibana
                </a>
              </p>
              <p><b>iPhone：</b><br />現在開発中です</p>
            </div>
          </div>

          {/* 既存「アプリ紹介」セクション：カード化のみ */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-amber-100 p-6 shadow-md text-left max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-indigo-700">📱 アプリ「断ち花」って？</h2>

            <p className="text-[18px] text-gray-800 leading-relaxed mt-2">
              「断ち花」は、<b>禁酒・禁煙・脱カフェイン・ダイエット・SNS断ち</b>など、<br />
              あらゆる依存を「楽しく継続」するためのサポートアプリです。
            </p>

            <p className="text-[17px] text-gray-700 leading-relaxed mt-2">
              習慣改善はどうしてもつらくなりがち。<br />
              だからこそ、<b className="text-indigo-700">楽しさ</b>と<b className="text-indigo-700">やる気の継続</b>を重視しました。
            </p>

            <ul className="text-left text-[17px] text-gray-800 list-disc list-inside mt-4 space-y-2 leading-relaxed">
              <li><b>節約金額の自動可視化</b>：禁欲で浮いたお金が一目でわかる</li>
              <li><b>キャラクターと楽しむストーリー</b>：共に歩む感覚で続けられる</li>
              <li><b>定期イベント</b>：日々の継続をもっと楽しく</li>
            </ul>

            <p className="text-[18px] text-black font-semibold mt-6">
              あなたの「挑戦」を、少しでも楽しくするために設計されたアプリです。
            </p>
          </div>
        </section>
      </main>

      {/* 共通フッター */}
      <MassageFooter />
    </div>
  )
}
