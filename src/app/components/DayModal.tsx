'use client' // ← Client Component は必ず先頭

/* DayModal（90分コース追加＆string化）
  - 仕様：
    ① 当日だけ「現時点から+60分」未満の枠は選べない（現在バッファ）
    ② 予約が入ってる時間は「施術時間 + 30分」ぶんを30分刻みでブロック（施術バッファ）
       ※ 既存実装のロジックを踏襲（course不明は+60分で保険）
    ③ コース：30/60/90分（UIタブ）
       - 90分は 15:30 が最終開始（16:00/16:30は不可）
  - デザイン：
    暖色カードUI、コースタブ、凡例、押しやすい枠ボタン
*/

import { useState, useEffect } from 'react'
import { getSupabaseBrowser } from '@/lib/supabaseClient' // ← 遅延生成版を使う（ビルド時実行を避ける）
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

/** コース文字列から分数（"30min" → 30）を取得（未知値は30で安全フォールバック） */
function courseToMinutes(course: string): number {
  const m = parseInt(course.replace(/[^0-9]/g, ''), 10)
  return Number.isFinite(m) && m > 0 ? m : 30
}

/* スロット生成（10:00〜17:00ベース、30分刻み。コースで最終開始を制御） */
const generateSlots = (course: string): string[] => {
  const dur = courseToMinutes(course) // 30 / 60 / 90...
  const slots: string[] = []

  // 10:00 〜 16:30 まで30分刻みで作る
  for (let h = 10; h <= 16; h++) {
    const hh = String(h).padStart(2, '0')
    slots.push(`${hh}:00`)
    if (h < 16) slots.push(`${hh}:30`)
    else slots.push(`${hh}:30`) // 16:30 も一旦入れる（後でフィルタ）
  }

  // 営業終了 17:00 とし、"開始 + dur" が 17:00 を超えるものは除外
  // 17:00 → 分 = 17*60 = 1020
  const END_MIN = 17 * 60
  return slots.filter((t) => {
    const [h, m] = t.split(':').map(Number)
    const startMin = h * 60 + m
    return startMin + dur <= END_MIN
  })
}

/* "HH:MM" → 分数（例: "10:30"→630） */
const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
/* 分数→"HH:MM"（30分刻み固定表示） */
const toHHMM = (mins: number): string => {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${m === 0 ? '00' : '30'}`
}
/* 30分刻みに切り下げ（617→600=10:00） */
const snap30 = (mins: number): number => Math.floor(mins / 30) * 30

// Supabaseの行型（string化＆null対応／any禁止）
type ReservationRow = {
  start_time: string // "HH:MM:SS" など
  course: string | null
}

export default function DayModal({ date, onClose, onReserve }: Props) {
  // コメント: Supabase クライアントは「呼ばれた時だけ」生成（SSR/prerenderの巻き込み回避）
  const supabase = getSupabaseBrowser()

  // コースは priceTable のキー（型安全に3択）を既定に
  const priceTable = {
    '30min': { normal: 5000, first: 3000 },
    '60min': { normal: 9000, first: 4000 },
    '90min': { normal: 12000, first: 7000 }, // ★ 追加
  } as const
  type CourseKey = keyof typeof priceTable

  const [course, setCourse] = useState<CourseKey>('30min')
  const [reservedSlots, setReservedSlots] = useState<string[]>([]) // 施術+バッファ反映後の埋まり枠
  const [slot, setSlot] = useState<string>('')

  /* 予約取得 → 施術時間＋30分バッファでブロック（30分刻みで埋める） */
  useEffect(() => {
    const fetchReserved = async (): Promise<void> => {
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

      ;(data as ReservationRow[] | null ?? []).forEach((r: ReservationRow) => {
        const startHHMM = String(r.start_time).slice(0, 5) // "HH:MM"
        const start = toMinutes(startHHMM)

        const dur = r.course ? courseToMinutes(r.course) : 0
        const totalBlock = (dur || 0) + 30 // 施術 + 30分バッファ（既存ロジック踏襲）

        // 30分刻みに揃えてブロック範囲を列挙
        const blockStart = snap30(start)
        const blockEnd = snap30(start + totalBlock)
        for (let t = blockStart; t <= blockEnd; t += 30) {
          blocked.add(toHHMM(t))
        }

        // course不明の保険：開始から+60分をブロック
        if (!r.course) {
          const safeEnd = snap30(start + 60)
          for (let t = blockStart; t <= safeEnd; t += 30) {
            blocked.add(toHHMM(t))
          }
        }
      })

      setReservedSlots(Array.from(blocked))
    }

    void fetchReserved()
  }, [date, supabase])

  const slots = generateSlots(course)

  /* ヘッダ表示用の和式日付 */
  const dateObj = new Date(`${date}T00:00:00`)
  const titleStr = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日（${
    ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()]
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
            className="rounded-lg border bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-amber-50"
          >
            閉じる
          </button>
        </div>

        {/* コース切替（タブ風） */}
        <div className="px-5 pt-4">
          <p className="mb-2 text-sm font-semibold text-amber-700">コース・料金</p>
          <div className="grid grid-cols-3 gap-2">
            {(['30min','60min','90min'] as CourseKey[]).map((key) => (
              <button
                key={key}
                className={[
                  'rounded-xl px-3 py-3 text-left text-sm transition',
                  course === key
                    ? 'bg-amber-600 text-white shadow'
                    : 'bg-amber-50 text-amber-800 border border-amber-100 hover:bg-amber-100',
                ].join(' ')}
                onClick={() => setCourse(key)}
                aria-pressed={course === key}
              >
                <span className="block font-bold">{key.replace('min','分')}</span>
                <span className="block text-[12px] opacity-90">
                  初回 {priceTable[key].first.toLocaleString()}円／通常 {priceTable[key].normal.toLocaleString()}円
                </span>
              </button>
            ))}
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
              const isReserved = reservedSlots.includes(t) // ← 施術+バッファを含む埋まり枠
              const isSelected = slot === t

              // この日の t 時刻の Date
              const [yy, mm, dd] = date.split('-').map(Number)
              const [h, m] = t.split(':').map(Number)
              const slotDate = new Date(yy, mm - 1, dd, h, m, 0, 0)

              // 当日＆現時点から+60分未満の枠は無効化（現時点バッファ）
              const now = new Date()
              const isToday = date === getYMDStr(now)
              const withinNowBuffer = isToday && slotDate.getTime() < now.getTime() + 60 * 60 * 1000

              // 無効化条件（OR）：予約済み or 現時点+60分バッファ
              const isDisabled = isReserved || withinNowBuffer

              const cls = isDisabled
                ? 'bg-gray-200 text-gray-400 border-gray-200 cursor-not-allowed'
                : isSelected
                ? 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-300'
                : 'bg-emerald-100 text-emerald-900 border-emerald-200 hover:bg-emerald-200'

              return (
                <button
                  key={t}
                  className={`min-h-11 rounded-xl border px-2 py-2 text-sm font-medium transition ${cls}`}
                  disabled={isDisabled}
                  onClick={() => !isDisabled && setSlot(t)}
                  title={
                    isReserved
                      ? '前後のバッファ含め予約で埋まっています'
                      : withinNowBuffer
                      ? '現時点から60分以内のため受付不可です'
                      : '選択できます'
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
                course, // ← string（'30min' | '60min' | '90min'）
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
