"use client"

import MassageHeader from "../../components/MassageHeader"
import MassageFooter from "../../components/MassageFooter"

export default function PricesPage() {
  return (
    <div className="bg-gray-100 min-h-screen text-gray-800 font-yusei">
      <MassageHeader />

<main className="pt-24 p-6 pb-40 max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow p-4 space-y-7 mt-8">

          <h2 className="text-[28px] font-bold text-center">料金表</h2>

          {/* 通常料金 */}
          <div>
            <h3 className="text-lg font-semibold border-b pb-1 mb-2">通常料金</h3>
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-[20px] mb-1">ボディケア</p>
                <p className="text-gray-600 text-[16px] mb-1">
                  指圧（しあつ）・ヘッドスパ・足裏マッサージ・ふくらはぎオイルマッサージ<br />
                  <b>この中からお好みで組み合わせ</b>（予約時でもマッサージ中でもやってほしいことをお伝えしてくださいね！）
                </p>
                <div className="flex items-center gap-5">
                  <span className="text-[18px] text-gray-600">30分</span>
                  <span className="font-bold text-[28px]">5,000円</span>
                </div>
              </div>
              <div>
                <p className="font-semibold text-[20px] mb-1">全身リメディアル／オイル</p>
                <p className="text-gray-600 text-[16px] mb-1">
                  全身に対して深層筋までケア（リメディアル＝本格的な筋肉調整）＋オイル
                </p>
                <div className="flex items-center gap-5">
                  <span className="text-[18px] text-gray-600">60分</span>
                  <span className="font-bold text-[28px]">9,000円</span>
                </div>
              </div>
            </div>
          </div>

          {/* 初回料金 */}
          <div>
            <h3 className="text-lg font-semibold border-b pb-1 mb-2 text-green-700">初回料金</h3>
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-[20px] mb-1">ボディケア or 全身オイル</p>
                <p className="text-gray-600 text-[16px] mb-1">内容は通常コースと同じです</p>
                <div className="flex items-center gap-5">
                  <span className="text-[18px] text-gray-600">30分</span>
                  <span className="font-bold text-[28px] text-green-700">3,000円</span>
                </div>
              </div>
              <div>
                <p className="font-semibold text-[20px] mb-1">全身リメディアル／オイル</p>
                <p className="text-gray-600 text-[16px] mb-1">全身オイルマッサージ（初回割引価格）</p>
                <div className="flex items-center gap-5">
                  <span className="text-[18px] text-gray-600">60分</span>
                  <span className="font-bold text-[28px] text-green-700">4,000円</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-gray-700 text-sm mt-2">
            <span className="text-red-600 font-semibold">※現在60分以上のコースは受付停止中</span><br />
            <span>短時間でもしっかり成果を出します。</span>
          </div>
        </div>

        {/* 🌿 断ち花割り */}
        <section className="text-center font-yusei space-y-6 mt-10 px-4">
          <h2 className="text-2xl font-bold text-green-700">🌿 アプリ「断ち花」提示で500円割引！</h2>

          <p className="text-[18px] text-gray-700 leading-relaxed">
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

          {/* リンク */}
          <div className="text-[16px] text-gray-700 space-y-2 mt-4">
            <p><b>Android：</b><br />
              <a href="https://play.google.com/store/apps/details?id=com.iruka.tachibana" target="_blank" className="text-blue-600 underline">
                https://play.google.com/store/apps/details?id=com.iruka.tachibana
              </a>
            </p>
            <p><b>iPhone：</b><br />現在開発中です</p>
          </div>

          {/* 📱 紹介 */}
          <h2 className="text-xl font-bold text-indigo-700 mt-10">📱 アプリ「断ち花」って？</h2>

          <p className="text-[18px] text-gray-800 leading-relaxed">
            「断ち花」は、<b>禁酒・禁煙・脱カフェイン・ダイエット・SNS断ち</b>など、<br />
            あらゆる依存を「楽しく継続」するためのサポートアプリです。
          </p>

          <p className="text-[17px] text-gray-700 leading-relaxed">
            習慣改善はどうしてもつらくなりがち。<br />
            だからこそ、<b className="text-indigo-700">楽しさ</b>と<b className="text-indigo-700">やる気の継続</b>を重視しました。
          </p>

          <ul className="text-left text-[17px] text-gray-800 list-disc list-inside max-w-md mx-auto mt-4 space-y-2 leading-relaxed">
            <li><b>節約金額の自動可視化</b>：禁欲で浮いたお金が一目でわかる</li>
            <li><b>キャラクターと楽しむストーリー</b>：共に歩む感覚で続けられる</li>
            <li><b>定期イベント</b>：日々の継続をもっと楽しく</li>
          </ul>

          <p className="text-[18px] text-black font-semibold mt-6">
            あなたの「挑戦」を、少しでも楽しくするために設計されたアプリです。
          </p>
        </section>
      </main>

      <MassageFooter />
    </div>
  )
}
