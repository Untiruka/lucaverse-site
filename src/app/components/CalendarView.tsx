'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

type CalendarViewProps = {
  onSelectDate: (date: string) => void
}

type MonthlyDays = {
  yearMonth: string
  days: Date[]
  isPast: boolean
}

function getYMDStr(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-')
}

const getDaysGroupedByMonth = (): MonthlyDays[] => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const map: Record<string, Date[]> = {}

  const date = new Date(today)
  for (let m = 0; m < 3; m++) {
    const year = date.getFullYear()
    const month = date.getMonth()

    const first = new Date(year, month, 1)
    const last = new Date(year, month + 1, 0)

    for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
      if (!map[key]) map[key] = []
      map[key].push(new Date(d))
    }

    // 翌月へ進める
    date.setMonth(date.getMonth() + 1)
  }

  const todayStr = getYMDStr(today)

  return Object.entries(map).map(([yearMonth, days]) => {
    const lastDayStr = getYMDStr(days[days.length - 1])
    const isPast = lastDayStr < todayStr
    return { yearMonth, days, isPast }
  })
}

const weekdayLabels = ['月', '火', '水', '木', '金', '土', '日']
const weekdayColors = ['text-black', 'text-black', 'text-black', 'text-black', 'text-black', 'text-blue-500', 'text-red-500']

export default function CalendarView({ onSelectDate }: CalendarViewProps) {
  const [available, setAvailable] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const allDates = getDaysGroupedByMonth().flatMap(group =>
      group.days.map(d => d.toISOString().slice(0, 10))
    )

    const fetch = async () => {
      const { data, error } = await supabase
        .from('reservation')
        .select('date')
        .in('date', allDates)
        .eq('status', 'confirmed')

      if (error) {
        console.error('予約取得エラー:', error)
        return
      }

      const usedDates = data?.map(r => r.date) ?? []
      const av: Record<string, boolean> = {}
      allDates.forEach(d => {
        av[d] = !usedDates.includes(d)
      })
      setAvailable(av)
    }

    fetch()
  }, [])

  const grouped = getDaysGroupedByMonth()

  return (
    <div className="mt-15 space-y-8">
 {grouped.map(({ yearMonth, days, isPast }) => {
  const [year, month] = yearMonth.split('-')

  return (
<div key={yearMonth} className={`mb-30 ${isPast ? 'opacity-50' : ''}`}>
      {/* ✅ 月タイトル */}
<h2 className="text-lg font-bold mb-2 mt-8 text-white">{Number(month)}月</h2>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 text-center text-sm font-bold mb-2">
        {weekdayLabels.map((label, i) => (
          <div key={i} className={weekdayColors[i]}>
            {label}
          </div>
        ))}
      </div>

      {/* 日付ボタンたち */}
      <div className="grid grid-cols-7 gap-2">
 {days.map(d => {
  const dstr = getYMDStr(d) // ← ここで絶対ズレない
  const isAvailable = available[dstr]

  const todayStr = getYMDStr(new Date())
  const isPastDay = dstr < todayStr // これが絶対安全

  const jsWeekday = d.getDay()
  const weekdayIndex = (jsWeekday + 6) % 7
  const weekdayLabel = weekdayLabels[weekdayIndex]
  const textColor = weekdayColors[weekdayIndex]

  return (
    <button
      key={dstr}
      className={`border rounded p-2 text-sm ${
        !isAvailable || isPastDay
          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
          : 'bg-white hover:bg-blue-50'
      }`}
      onClick={() => !isPastDay && isAvailable && onSelectDate(dstr)}
      disabled={isPastDay || !isAvailable}
    >
      <div>{d.getMonth() + 1}/{d.getDate()}</div>
      <div className={textColor}>{weekdayLabel}</div>
      <div className="text-xs">{isAvailable ? '空きあり' : '埋まり'}</div>
    </button>
  )
})}

      </div>
    </div>
  )
})}
    </div>
  )
}
