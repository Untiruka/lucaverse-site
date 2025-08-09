'use client'

// ------------------------------------------------------
// ConfirmModal（見た目だけアップデート版／ロジックは元のまま）
// ・暖色カードUI、金額を大きく強調
// ・要素は見出し＋一覧で読みやすく
// ・初回でない場合の注意文もトーン合わせ
// ・ボタンは「左端」に横並び（戻る→予約送信→閉じる）
// ・ヘッダー/フッターと被らんようにオーバーレイに上下パディング
// ------------------------------------------------------

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type ConfirmModalProps = {
  date: string
  course: '30min' | '60min'
  slot: string
  name: string
  tel: string
  email: string
  finalPrice: number
  onBack: () => void
  onClose: () => void
  isFirst: boolean
}

export default function ConfirmModal(props: ConfirmModalProps) {
  const {
    date, course, slot, name, isFirst, tel, email, onBack, onClose, finalPrice
  } = props

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      // --- end_time計算（60分 or 30分） ---
      const [hour, minute] = slot.split(':').map(Number) // eslint用に残す（計算に利用）
      let endDate = new Date(date + 'T' + slot + ':00')
      endDate.setMinutes(endDate.getMinutes() + (course === '60min' ? 60 : 30))
      const end_time = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`

      // --- 1) reservation insert（id取得） ---
      const { data, error } = await supabase
        .from('reservation')
        .insert([{
          date,
          start_time: slot,
          end_time,
          course,
          price: finalPrice,
          name,
          tel,
          email,
          status: 'pending',
        }])
        .select('id')
        .single()

      if (error) {
        throw error
      }

      const reservationId = data?.id

      // --- 2) メールAPI（reservationIdを添付） ---
      await fetch('/api/sendMail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          slot,
          course,
          name,
          tel,
          email,
          reservationId,
        }),
      })

      setDone(true)
    } catch (e: any) {
      setError(e?.message ?? '送信に失敗しました。時間をおいてお試しください。')
    } finally {
      setLoading(false)
    }
  }

  // --- 完了画面 ---
  if (done) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-3"
        style={{ paddingTop: '80px', paddingBottom: '100px' }} // ヘッダー/フッター回避
      >
        <div className="w-full max-w-md rounded-2xl border border-amber-100 bg-white shadow-2xl p-6">
          <div className="text-green-700 font-bold text-lg mb-2">予約が完了しました！</div>
          <p className="text-sm text-gray-700">確認メールをお送りしました。ご来店お待ちしております。</p>
          <div className="mt-5">
            <button
              className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-amber-700"
              onClick={onClose}
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- 確認画面 ---
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-3"
      style={{ paddingTop: '80px', paddingBottom: '100px' }} // ヘッダー/フッター回避
    >
      <div className="w-full max-w-md rounded-2xl border border-amber-100 bg-white shadow-2xl overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-amber-100">
          <h2 className="text-lg font-bold text-gray-800">予約内容の最終確認</h2>
          <button
            onClick={onClose}
            className="rounded-lg border bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            aria-label="閉じる"
            title="閉じる"
          >
            ×
          </button>
        </div>

        {/* 内容 */}
        <div className="px-5 py-4 space-y-3">
          {/* 金額を強調 */}
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
            <div className="text-[12px] text-amber-700 font-semibold">お支払い金額</div>
            <div className="text-2xl font-extrabold text-gray-900 mt-0.5">
              {finalPrice.toLocaleString()}円
            </div>
          </div>

          {/* 詳細リスト */}
          <ul className="text-sm text-gray-800 space-y-1">
            <li><span className="text-gray-500">日付：</span>{date}</li>
            <li><span className="text-gray-500">時間：</span>{slot}</li>
            <li><span className="text-gray-500">コース：</span>{course === '60min' ? '60分' : '30分'}</li>
            <li><span className="text-gray-500">お名前：</span>{name}</li>
            <li><span className="text-gray-500">電話番号：</span>{tel}</li>
            <li><span className="text-gray-500">メール：</span>{email}</li>
          </ul>

          {/* 初回でない場合の案内 */}
          {!isFirst && (
            <div className="mt-2 rounded-lg bg-gray-50 border border-gray-200 p-3 text-[13px] text-gray-700">
              <p className="leading-relaxed">
                ※ あなたは初回ではないため通常料金になります。<br />
                もし「初めて予約したはずなのに？」という場合は
                <a
                  href="mailto:lucaverce_massage@yahoo.co.jp"
                  className="text-amber-700 underline ml-1"
                >
                  お問い合わせ
                </a>
                ください。
              </p>
            </div>
          )}

          {/* エラー表示 */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-2">
              {error}
            </div>
          )}
        </div>

        {/* フッター：左端に横並び（戻る→送信→閉じる） */}
        <div className="px-5 py-4 border-t border-amber-100 flex items-center justify-start gap-3">
          <button
            className="rounded-xl border bg-white px-4 py-2 text-sm text-gray-800 hover:bg-gray-50"
            onClick={onBack}
            disabled={loading}
          >
            戻る
          </button>
          <button
            className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? '送信中…' : '予約送信'}
          </button>
       <div className="mt-5 flex items-center justify-start border-t border-amber-100 px-5 py-4 gap-2">
  {/* 閉じる（左端） */}
  <button
    className="rounded-xl border bg-white px-4 py-2 text-sm text-gray-800 hover:bg-gray-50"
    onClick={onClose}
  >
    閉じる
  </button>
          </div>

        </div>
      </div>
    </div>
  )
}
