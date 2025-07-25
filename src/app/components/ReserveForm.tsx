'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'


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
  // 必要に応じて他の拡張項目もここに追加
}

export default function ReserveForm({ info, onNext, onClose }: ReserveFormProps) {
  const [name, setName] = useState('')
  const [tel, setTel] = useState('')
  const [email, setEmail] = useState('')

const [coupon1, setCoupon1] = useState('');
const [coupon2, setCoupon2] = useState('');
const [coupon3, setCoupon3] = useState('');
  
  return (
    <div className="space-y-3 text-sm">
     <div className="text-base font-bold">
  予約内容：{info.date} {info.slot}〜 / {info.course}
</div>

    <input
  type="text"
  placeholder="名前（nicknameも可）"
  className="border rounded px-3 py-1 w-full"
  value={name}
  required
  onChange={(e) => setName(e.target.value)}
/>

<input
  type="tel"
  placeholder="電話番号"
  className="border rounded px-3 py-1 w-full"
  value={tel}
  required
  onChange={(e) => setTel(e.target.value)}
/>

<input
  type="email"
  placeholder="メールアドレス"
  className="border rounded px-3 py-1 w-full"
  value={email}
  required
  onChange={(e) => setEmail(e.target.value)}
/>
<input
  type="text"
  placeholder="クーポンコード1（あれば）"
  className="border rounded px-3 py-1 w-full"
  value={coupon1}
  onChange={(e) => setCoupon1(e.target.value)}
/>

<input
  type="text"
  placeholder="クーポンコード2（あれば）"
  className="border rounded px-3 py-1 w-full"
  value={coupon2}
  onChange={(e) => setCoupon2(e.target.value)}
/>

<input
  type="text"
  placeholder="クーポンコード3（あれば）"
  className="border rounded px-3 py-1 w-full"
  value={coupon3}
  onChange={(e) => setCoupon3(e.target.value)}
/>
    <button
  disabled={!name || !tel || !email}
  onClick={() =>
    onNext({
      name,
      tel,
      email,
      coupon1,
      coupon2,
      coupon3,
    })
  }
  className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded w-full"
>
  確認画面へ
</button>
      {onClose && (
        <button
          className="mt-2 py-1 px-3 rounded bg-gray-300 w-full"
          onClick={onClose}
        >
          戻る
        </button>
      )}
    </div>
  )
}
