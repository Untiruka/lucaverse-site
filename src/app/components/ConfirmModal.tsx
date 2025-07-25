import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type ConfirmModalProps = {
  date: string
  course: '30min' | '60min'
  slot: string
  name: string
  tel: string
  email: string
    finalPrice: number  // ← 追加！

  onBack: () => void
  onClose: () => void
    isFirst: boolean

}

export default function ConfirmModal(props: ConfirmModalProps) { // ←ここ！
const {
    date, course, slot, name, isFirst, tel, email, onBack, onClose, finalPrice // ← ここにfinalPrice追加！
  } = props
    const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

 const handleSubmit = async () => {
  setLoading(true)
  setError(null)
  // end_time計算
  const [hour, minute] = slot.split(':').map(Number)
  let endDate = new Date(date + "T" + slot + ":00")
  endDate.setMinutes(endDate.getMinutes() + (course === '60min' ? 60 : 30))
  const end_time = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`

  // 1. 予約insert時にIDを取得
const { data, error } = await supabase.from('reservation')
  .insert([{
    date,
    start_time: slot,
    end_time,
    course,
    price: finalPrice,
    name,
    tel,
    email,
    status: 'pending'
  }])
  .select('id')
  .single();   // ← 必ず付ける

const reservationId = data?.id;

// 2. メールAPI送信時にreservationIdも送る
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
    reservationId   // ← ここ追加！
  })
})

  setLoading(false)
  if (error) {
    setError(error.message)
  } else {
    setDone(true)
  }
}


  
  if (done) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-30">
        <div className="bg-white rounded shadow p-4 min-w-[320px]">
          <div className="font-bold mb-2 text-green-700">予約が完了しました！</div>
          <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-30">
      <div className="bg-white rounded shadow p-4 min-w-[320px]">
        <div className="font-bold mb-2">予約内容確認</div>
        <div>日付：{date}</div>
        <div>コース：{course}</div>
        <div>お支払い金額：<span className="font-bold text-lg">{finalPrice.toLocaleString()}円</span></div>

        <div>時間：{slot}</div>
        <div>名前：{name}</div>
        <div>電話番号：{tel}</div>
        <div>メール：{email}</div>
   {/* ここに初回でない場合の案内を表示 */}
      {!isFirst && (
        <div className="text-sm text-gray-600 mt-2">
          ※ あなたは初回ではないため通常料金になります。<br />
          「初めて予約したはずなのに？」と思った場合は
          <a href="mailto:your-support@example.com" className="text-blue-500 underline">お問い合わせ</a>
          ください。
        </div>
      )}


        {error && <div className="text-red-500">{error}</div>}
        <div className="flex gap-2 mt-4">
          <button
            className="py-1 px-3 rounded bg-gray-300"
            onClick={onBack}
            disabled={loading}
          >
            戻る
          </button>
          <button
            className="py-1 px-3 rounded bg-blue-500 text-white"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? '送信中…' : '予約送信'}
          </button>
          <button
            className="py-1 px-3 rounded bg-gray-200"
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
