// src/app/components/CalendarView.tsx
'use client' // ← Client Component。最上段必須

import { useState, useEffect, useMemo } from 'react'
import { getSupabaseBrowser } from "@/lib/supabaseClient" // ← 遅延生成版を使う

// コメント: 親に選択した日付(YYYY-MM-DD)を返す
type CalendarViewProps = {
  onSelectDate: (date: string) => void
}

// コメント: 月ごとのまとまり
type MonthlyDays = {
  yearMonth: string // 例: "2025-09"
  days: Date[]
  isPast: boolean    // その月の最終日が今日より前か
}

// コメント: YYYY-MM-DD 文字列を生成（ゼロ埋め）
function getYMDStr(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-')
}

// コメント: 今日を含む「今月から3か月分」を月ごとにまとめる
function getDaysGroupedByMonth(): MonthlyDays[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const map: Record<string, Date[]> = {}
  const cursor = new Date(today)

  for (let m = 0; m < 3; m++) {
    const y = cursor.getFullYear()
    const mo = cursor.getMonth()

    const first = new Date(y, mo, 1)
    const last = new Date(y, mo + 1, 0)

    for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map[key]) map[key] = []
      map[key].push(new Date(d))
    }

    cursor.setMonth(cursor.getMonth() + 1) // 翌月へ
  }

  const todayStr = getYMDStr(today)

  return Object.entries(map).map(([yearMonth, days]) => {
    const lastDayStr = getYMDStr(days[days.length - 1])
    const isPast = lastDayStr < todayStr
    return { yearMonth, days, isPast }
  })
}

// コメント: 月〜日の並び（ラベル&色）。getDay()は日=0 なので補正して月起点にする。
const weekdayLabels = ['月', '火', '水', '木', '金', '土', '日']
const weekdayColors = ['text-black', 'text-black', 'text-black', 'text-black', 'text-black', 'text-blue-500', 'text-red-500']

export default function CalendarView({ onSelectDate }: CalendarViewProps) {
  // コメント: Supabaseクライアントは「呼ばれた時だけ」生成（ビルド時実行を避ける）
  const supabase = getSupabaseBrowser()

  // コメント: その日付が予約で埋まっているかどうか（true=空きあり/false=埋まり）
  const [available, setAvailable] = useState<Record<string, boolean>>({})

  // コメント: 月配列は固定なのでメモ化（不要な再計算を避ける）
  const grouped = useMemo<MonthlyDays[]>(() => getDaysGroupedByMonth(), [])

  useEffect(() => {
    // コメント: 3ヶ月分の日付をフラットに抽出（YYYY-MM-DD）
    const allDates = grouped.flatMap(group => group.days.map(d => getYMDStr(d)))

    // コメント: 予約を取得して「埋まってる日付」を集合に
    const loadReservations = async () => {
      // ▼ supabase クエリ（テーブル・カラム名はあなたのスキーマに合わせて）
      const { data, error } = await supabase
        .from('reservation')
        .select('date')
        .in('date', allDates)
        .eq('status', 'confirmed')

      if (error) {
        console.error('予約取得エラー:', error)
        return
      }

      const usedDates = new Set((data ?? []).map(r => r.date as string))
      const next: Record<string, boolean> = {}
      for (const d of allDates) {
        next[d] = !usedDates.has(d) // 使われていなければ空きあり
      }
      setAvailable(next)
    }

    void loadReservations()
  }, [grouped, supabase]) // ← supabase も依存に入れる（ルール的に安全）

  return (
    <div className="mt-15 space-y-8">
      {grouped.map(({ yearMonth, days, isPast }) => {
        const [, month] = yearMonth.split('-') // 例: ["2025","09"]

        return (
          <div key={yearMonth} className={`mb-30 ${isPast ? 'opacity-50' : ''}`}>
            {/* ✅ 月タイトル */}
            <h2 className="text-lg font-bold mb-2 mt-8 text-white">{Number(month)}月</h2>

            {/* 曜日ヘッダー */}
            <div className="grid grid-cols-7 text-center text-sm font-bold mb-2">
              {weekdayLabels.map((label, i) => (
                <div key={label} className={weekdayColors[i]}>
                  {label}
                </div>
              ))}
            </div>

            {/* 日付ボタン群 */}
            <div className="grid grid-cols-7 gap-2">
              {days.map((d) => {
                const dstr = getYMDStr(d)                   // ← フォーマット統一
                const isAvailable = available[dstr] ?? false // ← 未取得時はfalse扱いで安全に
                const todayStr = getYMDStr(new Date())
                const isPastDay = dstr < todayStr           // ← 文字列比較でズレなし

                // getDay()は日曜=0 → 月曜起点に補正
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
                    // コメント: ここは「押せる＝今日以降かつ空きあり」のみ
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
