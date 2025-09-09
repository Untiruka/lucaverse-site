// src/app/components/ConfirmModal.tsx
'use client' // ← Client Component は最上段

// ------------------------------------------------------
// ConfirmModal（見た目アップデート＋ロジック微修正）
// ・Supabaseは getSupabaseBrowser() で「呼び出し時に生成」
// ・end_time をコース時間で計算して保存
// ・try/catch は unknown → instanceof Error で扱う（any禁止）
// ------------------------------------------------------

import { useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabaseClient' // ← 遅延生成（ビルド時実行を避ける）

type ConfirmModalProps = {
  date: string
  course: '30min' | '60min'
  slot: string // "HH:MM"
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

  // ※ Supabase クライアントは「コンポ内」で生成（import時の実行を避ける）
  const supabase = getSupabaseBrowser()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // "HH:MM" + コース分を足して end_time を作る
  const calcEndTime = (startHHMM: string, course: '30min' | '60min'): string => {
    // コメント: "YYYY-MM-DDTHH:MM:00" にして Date 計算（分を足す）
    const end = new Date(`${date}T${startHHMM}:00`)
    end.setMinutes(end.getMinutes() + (course === '60min' ? 60 : 30))
    const hh = String(end.getHours()).padStart(2, '0')
    const mm = String(end.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}` // コメント: 秒は不要なら付けない
  }

  const handleSubmit = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      // --- end_time 計算 ---
      const end_time = calcEndTime(slot, course)

      // --- 1) reservation insert（id取得） ---
      // 重要：getSupabaseBrowser() の返り値（クライアント）に対して from(...).insert(...)
      const { data, error } = await supabase
        .from('reservation')
        .insert([{
          date,             // "YYYY-MM-DD"
          start_time: slot, // "HH:MM"
          end_time,         // "HH:MM"
          course,           // '30min' | '60min'
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

      const reservationId: number | null = data?.id ?? null

      // --- 2) メールAPI（reservationId を添付） ---
      // コメント: API 側でバリデーションしてください
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
    } catch (e: unknown) {
      // コメント: any禁止。unknown→Error に絞り込む
      if (e instanceof Error) {
        setError(e.message)
      } else {
        setError('送信に失敗しました。時間をおいてお試しください。')
      }
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
          <button
            className="rounded-xl bg-gray-200 px-4 py-2 text-sm text-gray-800 hover:bg-gray-300"
            onClick={onClose}
            disabled={loading}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
