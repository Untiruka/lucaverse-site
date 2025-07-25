"use client"

import MassageHeader from "../../components/MassageHeader"
import MassageFooter from "../../components/MassageFooter"

export default function AboutPage() {
  return (
    <div className="bg-gray-100 min-h-screen text-gray-800 font-yusei">
      <MassageHeader />

      <main className="pt-24 pb-40 px-6 max-w-3xl mx-auto space-y-8">
        <section>
          <h2 className="text-xl font-bold mb-2">
            男がやるオイルマッサージ・指圧店【Luca】とは？
          </h2>
          <p>
            当店Luca（ルカ）は、「男性セラピストによる、安心・丁寧・実感あるボディケア」を提供する、自宅リラクゼーションサロンです。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-4 mb-2">🔧 提供サービス一覧</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>リメディアルマッサージ（筋肉のコリにアプローチ。まあオイルマッサージの延長線上にあると思ってください）</li>
            <li>オイルマッサージ（リラックスと血流改善）</li>
            <li>リンパマッサージ（むくみ・老廃物ケア）</li>
            <li>指圧（ツボ押しで疲労回復）</li>
            <li>ヘッドスパ（頭皮の緊張緩和・睡眠改善）</li>
            <li>足裏マッサージ（反射区で内臓調整にも）</li>
            <li>ファシア（筋膜・体の連続性）を意識した施術</li>
          </ul>
          <p className="mt-2">
            どの施術も、しっかりと圧をかけつつも、力任せではなく丁寧に。カラダの状態に合わせて施術します。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-4 mb-2">👕 男性向けの理由（※ここ大事！）</h2>
          <p>上半身へのリメディアルマッサージやオイル施術では上裸になっていただく必要があるため、基本的に男性のお客様を対象としております。</p>
          <p className="mt-2">鼠径部（そけいぶ）まわりのリンパや筋膜の施術も含まれるため、施術環境に抵抗の少ない同性間での対応が前提となります。</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-4 mb-2">🧘‍♂️ Lucaのこだわりポイント</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>施術歴8年のオーナー</li>
            <li>オーストラリアのparramatta parkでリメディアルマッサージ資格を取得（国家資格）</li>
            <li>ダブルサイズのこだわり施術ベットを使用</li>
            <li>English is available. Feel free to ask me if you have any question.</li>
            <li>筋肉・体質に特化した圧とアプローチ</li>
            <li>施術後の軽さやリフレッシュ感を重視</li>
            <li>完全予約制・個室対応で安心空間</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-4 mb-2">💬 こんな方にオススメ！</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>座りっぱなしで肩や背中がパンパンな人</li>
            <li>寝つきが悪くて頭が重い・目が疲れてる人</li>
            <li>日々のストレスでリラックスしたい人</li>
            <li>ガチガチに固まった体をほぐしてほしい人</li>
            <li>自分の体のこと、ちゃんと話せる場所がほしい人</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-4 mb-2">📌 ご注意事項</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>女性のお客様への施術は限定的です（ご紹介や面識ある場合を除く）。</li>
            <li>性的サービスは一切行っておりません。あくまで「健康と癒しのための施術」です。</li>
            <li>医療行為ではありませんのでご了承ください。</li>
          </ul>
        </section>
      </main>

      <MassageFooter />
    </div>
  )
}
