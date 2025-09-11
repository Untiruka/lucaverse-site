"use client"

import MassageHeader from "../../components/MassageHeader"
import MassageFooter from "../../components/MassageFooter"

export default function PricesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-50 text-gray-800 font-yusei">
      <MassageHeader />

      <main className="pt-24 pb-40 px-6 max-w-4xl mx-auto">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-amber-100 shadow-md p-6 md:p-8 space-y-7 mt-8">
          <h2 className="text-3xl font-bold text-center tracking-wide">
            料金表
          </h2>

          {/* 通常料金 */}
          <div>
            <h3 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
              通常料金
            </h3>

            <div className="grid md:grid-cols-2 gap-5">
              {/* 30分 */}
              <div className="rounded-xl border border-amber-100 bg-white p-5 shadow-sm">
                <p className="font-semibold text-[20px] mb-2">ボディケア</p>
                <p className="text-gray-600 text-[16px] mb-3 leading-relaxed">
                  指圧（しあつ）・ヘッドスパ・足裏マッサージ・ふくらはぎオイルマッサージ<br />
                  <b>この中からお好みで組み合わせ</b>
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[16px] text-gray-600">30分</span>
                  <span className="font-extrabold text-[28px] text-gray-900">5,000円</span>
                </div>
              </div>

              {/* 60分 */}
              <div className="rounded-xl border border-amber-100 bg-white p-5 shadow-sm">
                <p className="font-semibold text-[20px] mb-2">全身リメディアル／オイル</p>
                <p className="text-gray-600 text-[16px] mb-3 leading-relaxed">
                  全身に対して深層筋までケア＋オイル
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[16px] text-gray-600">60分</span>
                  <span className="font-extrabold text-[28px] text-gray-900">9,000円</span>
                </div>
              </div>

              {/* ★ 追加：90分 */}
              <div className="rounded-xl border border-amber-100 bg-white p-5 shadow-sm">
                <p className="font-semibold text-[20px] mb-2">全身リメディアル／オイル（ロング）</p>
                <p className="text-gray-600 text-[16px] mb-3 leading-relaxed">
                  じっくりほぐしたい方向けの90分ロングコース
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[16px] text-gray-600">90分</span>
                  <span className="font-extrabold text-[28px] text-gray-900">12,000円</span>
                </div>
              </div>
            </div>
          </div>

          {/* 初回料金 */}
          <div>
            <h3 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-emerald-700">初回料金</span>
            </h3>

            <div className="grid md:grid-cols-2 gap-5">
              {/* 30分 */}
              <div className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
                <p className="font-semibold text-[20px] mb-2">ボディケア or 全身オイル</p>
                <p className="text-gray-600 text-[16px] mb-3">内容は通常コースと同じです</p>
                <div className="flex items-center justify-between">
                  <span className="text-[16px] text-gray-600">30分</span>
                  <span className="font-extrabold text-[28px] text-emerald-700">3,000円</span>
                </div>
              </div>

              {/* 60分 */}
              <div className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
                <p className="font-semibold text-[20px] mb-2">全身リメディアル／オイル</p>
                <p className="text-gray-600 text-[16px] mb-3">全身オイルマッサージ（初回割引価格）</p>
                <div className="flex items-center justify-between">
                  <span className="text-[16px] text-gray-600">60分</span>
                  <span className="font-extrabold text-[28px] text-emerald-700">4,000円</span>
                </div>
              </div>

              {/* ★ 追加：90分 */}
              <div className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
                <p className="font-semibold text-[20px] mb-2">全身リメディアル／オイル（ロング）</p>
                <p className="text-gray-600 text-[16px] mb-3">初回限定の90分ロングコース</p>
                <div className="flex items-center justify-between">
                  <span className="text-[16px] text-gray-600">90分</span>
                  <span className="font-extrabold text-[28px] text-emerald-700">7,000円</span>
                </div>
              </div>
            </div>
          </div>

          {/* 注意テキスト */}
          <div className="text-gray-700 text-sm mt-2 bg-amber-50 border border-amber-100 rounded-xl p-4">
            <span className="text-red-600 font-semibold block">※現在90分以上のコースは受付停止中</span>
            <span>90分以内でもがっつり成果出します。</span>
          </div>
        </div>
      </main>

      <MassageFooter />
    </div>
  )
}
