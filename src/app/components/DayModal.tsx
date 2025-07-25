'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { ReserveInfo } from '@/src/app/components/ReserveForm'


type Props = {
  date: string
  onClose: () => void
  onReserve: (info: ReserveInfo) => void   // ←ここをReserveInfoに！
}
function getYMDStr(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-')
}

const generateSlots = (course: '30min' | '60min') => {
  const slots: string[] = []
  for (let h = 10; h <= 16; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
    if (h < 16 || course === '30min') {
      slots.push(`${String(h).padStart(2, '0')}:30`)
    }
  }
  // 60分コースでは16:30を無効にする
  if (course === '60min') slots.pop()
  return slots
}

export default function DayModal({ date, onClose, onReserve }: Props) {
  const [course, setCourse] = useState<'30min' | '60min'>('30min')
  const [reserved, setReserved] = useState<string[]>([])
  const [slot, setSlot] = useState<string>('')
const priceTable = {
  '30min': { normal: 5000, first: 3000 },
  '60min': { normal: 9000, first: 4000 }
};

  useEffect(() => {
    const fetchReserved = async () => {
      const { data, error } = await supabase
        .from('reservation')
        .select('start_time')
        .eq('date', date)
        .eq('status', 'confirmed')

      if (error) {
        console.error('予約取得エラー:', error)
        return
      }

      setReserved(data.map(r => r.start_time.slice(0, 5))) // HH:MM形式
    }

    fetchReserved()
  }, [date])

  const slots = generateSlots(course)

  return (

    
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
      <div className="bg-white rounded shadow p-4 min-w-[320px]">
<div className="mb-3">
  <div className="font-bold text-green-700 mb-1">コース・料金</div>
  <div className="flex gap-2 mb-3">
    <button
      className={`px-3 py-1 rounded ${course === '30min' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
      onClick={() => setCourse('30min')}
    >
      30分　初回3,000円／通常5,000円
    </button>
    <button
      className={`px-3 py-1 rounded ${course === '60min' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
      onClick={() => setCourse('60min')}
    >
      60分　初回4,000円／通常9,000円
    </button>
  </div>
  <div className="text-xs text-gray-500 mt-2">
    ※初回ご利用の方には割引価格が適用されます。
  </div>
</div>

<div className="grid grid-cols-3 gap-2 mb-3">
  {slots.map((t) => {
    const isReserved = reserved.includes(t)
    const isSelected = slot === t

    // "date"は「このモーダルの表示日(YYYY-MM-DD)」
    const [year, month, day] = date.split('-').map(Number)
    const [h, m] = t.split(':').map(Number)
    const slotDate = new Date(year, month - 1, day, h, m, 0, 0)

    // 今日の日付（文字列）
    const now = new Date()
    const todayStr = getYMDStr(now)
    const isToday = date === todayStr

    let isDisabled = isReserved

    if (isToday) {
      // 今日だけ「今から90分以内」の枠は無効化
      if (slotDate.getTime() < now.getTime() + 90 * 60 * 1000) {
        isDisabled = true
      }
    }

    return (
      <button
        key={t}
        className={`p-2 border rounded text-sm ${
          isDisabled
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : isSelected
            ? 'bg-blue-200'
            : 'hover:bg-blue-50'
        }`}
        disabled={isDisabled}
        onClick={() => {
          if (!isDisabled) setSlot(t)
        }}
      >
        {t}
      </button>
    )
  })}
</div>

        <div className="flex justify-between gap-2">
  <button className="py-1 px-3 rounded bg-gray-300" onClick={onClose}>
    閉じる
  </button>
  <button
    className="py-1 px-3 rounded bg-blue-500 text-white"
    disabled={!slot}
    onClick={() => onReserve({
      date,
      course,
      slot,
      basePrice: priceTable[course].normal,
      firstPrice: priceTable[course].first
    })}
  >
    つぎへ
  </button>
</div>
      </div>
    </div>
  )
}
