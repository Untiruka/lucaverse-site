'use client'

// ------------------------------------------------------
// ReserveForm（見た目アップデート版：機能は元のまま）
// ・暖色カード風の入力群（label/placeholder整理）
// ・SPでも押しやすいサイズ / フォーカスリング明確化
// ・バリデーションは簡易（必須3項目が空ならボタン無効）
// ・クーポン欄はそのまま3枠（任意）
// ------------------------------------------------------

import { useState } from 'react'

type ReserveFormProps = {
  info: ReserveInfo
  onNext: (values: {
    name: string
    tel: string
    email: string
    coupon1: string
    coupon2: string
    coupon3: string
  }) => void
  onClose?: () => void
}

export type ReserveInfo = {
  date: string
  course: '30min' | '60min'
  slot: string
  basePrice: number
  firstPrice?: number
  couponDiscount?: number
  couponCode?: string
  finalPrice?: number
  // ※ ここに追加したい拡張があれば適宜どうぞ
}

export default function ReserveForm({ info, onNext, onClose }: ReserveFormProps) {
  // ▼ 入力state（元仕様を踏襲）
  const [name, setName] = useState('')
  const [tel, setTel] = useState('')
  const [email, setEmail] = useState('')
  const [coupon1, setCoupon1] = useState('')
  const [coupon2, setCoupon2] = useState('')
  const [coupon3, setCoupon3] = useState('')

  const disabled = !name || !tel || !email // ← 必須3項目のどれか空で無効

  // ▼ 画面上部の予約概要（元文言を残しつつ視認性UP）
  const summary = `予約内容：${info.date} ${info.slot}〜 / ${info.course}`

  return (
    <div className="space-y-4 text-sm">
      {/* 予約概要（強調カード） */}
      <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
        <div className="text-base font-bold text-gray-900">{summary}</div>
        <p className="mt-1 text-[12px] text-gray-600">
          ※ 料金は次画面で自動判定（初回割/クーポン適用）されます。
        </p>
      </div>

      {/* 名前 */}
      <div className="space-y-1">
        <label className="block text-gray-700 font-medium">お名前 <span className="text-red-500 text-xs">必須</span></label>
        <input
          type="text"
          placeholder="名前（nicknameも可）"
          className="w-full rounded-xl border border-amber-100 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-amber-300"
          value={name}
          onChange={(e) => setName(e.target.value)}
          // ※ IMEありでOK
        />
      </div>

      {/* 電話番号 */}
      <div className="space-y-1">
        <label className="block text-gray-700 font-medium">電話番号 <span className="text-red-500 text-xs">必須</span></label>
        <input
          type="tel"
          inputMode="tel" // ← スマホで数字キーボード
          placeholder="例）09012345678"
          className="w-full rounded-xl border border-amber-100 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-amber-300"
          value={tel}
          onChange={(e) => setTel(e.target.value)}
        />
        <p className="text-[11px] text-gray-500">※ 緊急連絡が必要な場合のみ使用します。</p>
      </div>

      {/* メール */}
      <div className="space-y-1">
        <label className="block text-gray-700 font-medium">メールアドレス <span className="text-red-500 text-xs">必須</span></label>
        <input
          type="email"
          inputMode="email" // ← スマホで@入力しやすい
          placeholder="例）sample@example.com"
          className="w-full rounded-xl border border-amber-100 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-amber-300"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className="text-[11px] text-gray-500">※ 予約確認メールをお送りします。</p>
      </div>

      {/* クーポン（任意） */}
      <div className="rounded-xl border border-amber-100 bg-white p-3">
        <p className="mb-2 text-gray-800 font-medium">クーポン（任意）</p>

        <div className="space-y-2">
          <input
            type="text"
            placeholder="クーポンコード1（あれば）"
            className="w-full rounded-lg border border-amber-100 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-amber-200"
            value={coupon1}
            onChange={(e) => setCoupon1(e.target.value)}
          />
          <input
            type="text"
            placeholder="クーポンコード2（あれば）"
            className="w-full rounded-lg border border-amber-100 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-amber-200"
            value={coupon2}
            onChange={(e) => setCoupon2(e.target.value)}
          />
          <input
            type="text"
            placeholder="クーポンコード3（あれば）"
            className="w-full rounded-lg border border-amber-100 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-amber-200"
            value={coupon3}
            onChange={(e) => setCoupon3(e.target.value)}
          />
        </div>

        <p className="mt-2 text-[11px] text-gray-500">
          ※ 適用可否は次画面で自動チェックします。
        </p>
      </div>

      {/* アクションボタン */}
      <div className="space-y-2">
        <button
          disabled={disabled}
          onClick={() =>
            onNext({ name, tel, email, coupon1, coupon2, coupon3 })
          }
          className="w-full rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          確認画面へ
        </button>

        {onClose && (
          <button
            className="w-full rounded-xl bg-gray-200 px-3 py-2 text-sm text-gray-800 hover:bg-gray-300"
            onClick={onClose}
          >
            戻る
          </button>
        )}
      </div>
    </div>
  )
}
