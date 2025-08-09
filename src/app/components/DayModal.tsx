'use client'

/* DayModal（改良版）
  - 機能：
    ① 当日だけ「現時点から+60分」未満の枠は選べない（現在バッファ）
    ② 予約が入ってる時間は「施術時間 + 60分」ぶんを30分刻みでブロック（施術バッファ）
    ③ 30/60分コースのスロット生成は既存仕様を踏襲
  - デザイン：
    暖色カードUI、コースタブ、凡例、押しやすい枠ボタン
*/

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { ReserveInfo } from '@/src/app/components/ReserveForm'

type Props = {
  date: string
  onClose: () => void
  onReserve: (info: ReserveInfo) => void
}

/* ユーティリティ：YYYY-MM-DD 文字列化（当日判定用） */
function getYMDStr(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

/* スロット生成（10:00〜17:00、30分刻み。60分は16:30なし） */
const generateSlots = (course: '30min' | '60min') => {
  const slots: string[] = []
  for (let h = 10; h <= 16; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
    if (h < 16 || course === '30min') {
      slots.push(`${String(h).padStart(2, '0')}:30`)
    }
  }
  if (course === '60min') slots.pop() // 60分は16:30不可
  return slots
}

/* "HH:MM" → 分数（例: "10:30"→630） */
const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
/* 分数→"HH:MM"（30分刻み固定表示） */
const toHHMM = (mins: number) => {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${m === 0 ? '00' : '30'}`
}
/* 30分刻みに切り下げ（617→600=10:00） */
const snap30 = (mins: number) => Math.floor(mins / 30) * 30

export default function DayModal({ date, onClose, onReserve }: Props) {
  const [course, setCourse] = useState<'30min' | '60min'>('30min')
  const [reservedSlots, setReservedSlots] = useState<string[]>([]) // 施術+60分バッファ反映後の埋まり枠
  const [slot, setSlot] = useState<string>('')

  /* 価格テーブル（そのまま） */
  const priceTable = {
    '30min': { normal: 5000, first: 3000 },
    '60min': { normal: 9000, first: 4000 },
  } as const

  /* 予約取得 → 施術時間＋60分バッファでブロック（30分刻みで埋める） */
  useEffect(() => {
    const fetchReserved = async () => {
      // start_time: "HH:MM:SS", course: '30min' | '60min' | null
      const { data, error } = await supabase
        .from('reservation')
        .select('start_time, course')
        .eq('date', date)
        .eq('status', 'confirmed')

      if (error) {
        console.error('予約取得エラー:', error)
        setReservedSlots([])
        return
      }

      const blocked = new Set<string>()

      ;(data || []).forEach((r: any) => {
        const startHHMM = String(r.start_time).slice(0, 5) // "HH:MM"
        const start = toMinutes(startHHMM)

        // 施術時間（不明なら0分扱い）
        const dur =
          r.course === '60min' ? 60 :
          r.course === '30min' ? 30 :
          0

        // 総ブロック時間 = 施術 + 60分バッファ（※バッファ（バッファ=余白））
        const totalBlock = dur + 30

        const blockStart = snap30(start)
        const blockEnd = snap30(start + totalBlock)
        for (let t = blockStart; t <= blockEnd; t += 30) {
          blocked.add(toHHMM(t))
        }

        // course不明でも最低+60分は確保（安全側）
        if (!r.course) {
          const safeEnd = snap30(start + 60)
          for (let t = blockStart; t <= safeEnd; t += 30) {
            blocked.add(toHHMM(t))
          }
        }
      })

      setReservedSlots(Array.from(blocked))
    }

    fetchReserved()
  }, [date])

  const slots = generateSlots(course)

  /* ヘッダ表示用の和式日付 */
  const dateObj = new Date(`${date}T00:00:00`)
  const titleStr = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日（${
    ['日','月','火','水','木','金','土'][dateObj.getDay()]
  }）`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-3">
      <div className="w-full max-w-md rounded-2xl border border-amber-100 bg-white shadow-2xl">
        {/* ヘッダー */}
        <div className="flex items-start justify-between border-b border-amber-100 px-5 py-4">
          <div className="space-y-0.5">
            <p className="text-xs text-gray-500">ご予約日</p>
            <h2 className="text-lg font-bold text-gray-800">{titleStr}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            閉じる
          </button>
        </div>

        {/* コース切替（タブ風） */}
        <div className="px-5 pt-4">
          <p className="mb-2 text-sm font-semibold text-amber-700">コース・料金</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              className={[
                "rounded-xl px-3 py-3 text-left text-sm transition",
                course === '30min'
                  ? "bg-amber-600 text-white shadow"
                  : "bg-amber-50 text-amber-800 border border-amber-100 hover:bg-amber-100",
              ].join(' ')}
              onClick={() => setCourse('30min')}
              aria-pressed={course === '30min'}
            >
              <span className="block font-bold">30分</span>
              <span className="block text-[12px] opacity-90">
                初回 {priceTable['30min'].first.toLocaleString()}円／通常 {priceTable['30min'].normal.toLocaleString()}円
              </span>
            </button>

            <button
              className={[
                "rounded-xl px-3 py-3 text-left text-sm transition",
                course === '60min'
                  ? "bg-amber-600 text-white shadow"
                  : "bg-amber-50 text-amber-800 border border-amber-100 hover:bg-amber-100",
              ].join(' ')}
              onClick={() => setCourse('60min')}
              aria-pressed={course === '60min'}
            >
              <span className="block font-bold">60分</span>
              <span className="block text-[12px] opacity-90">
                初回 {priceTable['60min'].first.toLocaleString()}円／通常 {priceTable['60min'].normal.toLocaleString()}円
              </span>
            </button>
          </div>

          <p className="mt-2 text-[11px] text-gray-500">
            ※ 初回ご利用の方には割引価格が自動適用されます（判定は次画面）。
          </p>
        </div>

        {/* スロット一覧 */}
        <div className="px-5 pt-4">
          {/* 凡例 */}
          <div className="mb-2 flex items-center gap-3 text-[11px] text-gray-600">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-emerald-100 ring-1 ring-emerald-300" /> 空き
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-gray-200 ring-1 ring-gray-300" /> 予約済/受付不可
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-amber-600" /> 選択中
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {slots.map((t) => {
              const isReserved = reservedSlots.includes(t) // ← 施術+60分のバッファを含む埋まり枠
              const isSelected = slot === t

              // この日の t 時刻の Date
              const [yy, mm, dd] = date.split('-').map(Number)
              const [h, m] = t.split(':').map(Number)
              const slotDate = new Date(yy, mm - 1, dd, h, m, 0, 0)

              // 当日＆現時点から+60分未満の枠は無効化（現時点バッファ）
              const now = new Date()
              const isToday = date === getYMDStr(now)
              const withinNowBuffer = isToday && slotDate.getTime() < now.getTime() + 60 * 60 * 1000

              // 無効化条件（OR）：予約済み(施術バッファ込み) or 現時点+60分バッファ
              const isDisabled = isReserved || withinNowBuffer

              const cls = isDisabled
                ? "bg-gray-200 text-gray-400 border-gray-200 cursor-not-allowed"
                : isSelected
                ? "bg-amber-600 text-white border-amber-600 ring-2 ring-amber-300"
                : "bg-emerald-100 text-emerald-900 border-emerald-200 hover:bg-emerald-200"

              return (
                <button
                  key={t}
                  className={`min-h-11 rounded-xl border px-2 py-2 text-sm font-medium transition ${cls}`}
                  disabled={isDisabled}
                  onClick={() => !isDisabled && setSlot(t)}
                  title={
                    isReserved
                      ? "前後のバッファ含め予約で埋まっています"
                      : withinNowBuffer
                      ? "現時点から60分以内のため受付不可です"
                      : "選択できます"
                  }
                >
                  {t}
                </button>
              )
            })}
          </div>
        </div>

        {/* フッター操作：左端で「閉じる→つぎへ」横並び */}
        <div className="mt-5 flex items-center justify-start gap-3 border-t border-amber-100 px-5 py-4">
          <button
            className="rounded-xl border bg-white px-4 py-2 text-sm text-gray-800 hover:bg-gray-50"
            onClick={onClose}
          >
            閉じる
          </button>
          <button
            className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!slot}
            onClick={() =>
              onReserve({
                date,
                course,
                slot,
                basePrice: priceTable[course].normal,
                firstPrice: priceTable[course].first,
              })
            }
          >
            つぎへ
          </button>
        </div>
      </div>
    </div>
  )
}
