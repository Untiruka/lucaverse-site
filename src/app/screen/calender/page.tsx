// app/calendar/page.tsx
// ------------------------------------------------------
// 横スク3ヶ月 + 見切れ対策 + 過去/満了日は黒塗り・無効化
// ・月ごとスナップ：snap-x / snap-mandatory
// ・子幅：w-[min(560px,calc(100vw-2rem))] で右端見切れ防止
// ・セル：min-w-[44px] / 左上=日付丸 / 右下=ステータス
// ・過去 or full/closed → 黒半透明オーバーレイ＋操作不可
// ・SSG/prerender回避のため dynamic を指定（ビルド時実行を避ける）
// ------------------------------------------------------


"use client" // ←（Client Component 指定）

export const dynamic = 'force-dynamic' // ←（動的レンダリング固定）


import { useMemo, useState } from "react"
import ConfirmModal from "@/src/app/components/ConfirmModal"
import DayModal from "@/src/app/components/DayModal"
import MassageHeader from "../../components/MassageHeader"
import MassageFooter from "../../components/MassageFooter"
import ReserveForm from "@/src/app/components/ReserveForm"
import { getSupabaseBrowser } from '@/lib/supabaseClient'
import { ReserveInfo } from "@/src/app/components/ReserveForm"

// ------------------------------------------------------
// 型定義（any禁止のため最小限を明示）
// ------------------------------------------------------
type AvailabilityStatus = "open" | "full" | "closed"

type AvailabilityMap = Record<string, AvailabilityStatus>

type FormValues = {
  // 予約者基本情報
  name: string
  tel: string
  email: string
  // 任意クーポン
  coupon1?: string
}

// ------------------------------------------------------
// 空き状況（サンプル）："YYYY-MM-DD": "open" | "full" | "closed"
// ------------------------------------------------------
const availability: AvailabilityMap = {
  // "2025-08-05": "open",
  // "2025-08-06": "full",
}

// ------------------------------------------------------
// デフォルトエクスポートは **1つだけ**（重複exportエラー対策）
// ・同コンポーネント内で supabase を生成してスコープ解決
// ------------------------------------------------------
export default function CalendarPage() {
  // Supabase クライアントを「呼ばれた時にだけ」生成（ビルド時未定義対策）
  const supabase = getSupabaseBrowser()

  const [modalDate, setModalDate] = useState<string | null>(null)
  const [reserveInfo, setReserveInfo] = useState<ReserveInfo | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [formValues, setFormValues] = useState<FormValues | null>(null)
  const [isFirst, setIsFirst] = useState<boolean | null>(null)

  // 全閉じ（モーダル等の状態をまとめてリセット）
  const closeAll = () => {
    setReserveInfo(null)
    setFormValues(null)
    setConfirming(false)
    setModalDate(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-50 text-gray-800 font-yusei antialiased">
      <MassageHeader />

      <main className="pt-20 pb-24 px-3 max-w-md mx-auto md:pt-24 md:pb-28 md:px-6 md:max-w-3xl">
        <div className="bg-white rounded-2xl border border-amber-100 shadow p-4 md:p-6">
          <h1 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
            空き状況カレンダー
          </h1>

          {/* 横スク3ヶ月（右端見切れ防止：内側paddingと子幅を調整） */}
          <div className="rounded-xl border border-amber-100 bg-white">
            <HorizontalCalendar
              months={3}
              onSelectDate={setModalDate}
              availability={availability}
            />
          </div>
        </div>
      </main>

      <MassageFooter />

      {/* 日付選択モーダル */}
      {modalDate && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45">
          <div className="bg-white rounded-2xl border border-amber-100 shadow-2xl w-full max-w-lg mx-4">
            <DayModal
              date={modalDate}
              onClose={() => setModalDate(null)}
              onReserve={(info) => {
                // コメント：日付モーダルから予約情報（仮）を受け取りフォームへ
                setReserveInfo(info)
                setModalDate(null)
              }}
            />
          </div>
        </div>
      )}

      {/* 入力フォーム */}
      {reserveInfo && !confirming && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45">
          <div className="bg-white rounded-2xl border border-amber-100 shadow-2xl w-full max-w-lg mx-4 p-4 md:p-5">
            <ReserveForm
              info={reserveInfo}
              onNext={async (values: FormValues) => {
                // --- 初回判定（過去に確定予約があるか） ---
                const { data: prev } = await supabase
                  .from("reservation")
                  .select("id")
                  .or(`tel.eq.${values.tel},email.eq.${values.email},name.eq.${values.name}`)
                  .eq("status", "confirmed")
                  .limit(1)

                const firstTime = !prev || prev.length === 0

                // --- クーポン例（coupon1） ---
                let validCouponDiscount = 0
                let usedCouponCode = ""
                if (values.coupon1) {
                  const todayIso = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
                  const { data: c } = await supabase
                    .from("coupons")
                    .select("amount")
                    .eq("code", values.coupon1)
                    .eq("used", false)
                    .gte("valid_from", todayIso)
                    .lte("valid_until", todayIso)
                    .single()

                  if (c && typeof c.amount === "number") {
                    validCouponDiscount = c.amount
                    usedCouponCode = values.coupon1
                  }
                }

                // --- 金額計算 ---
                let finalPrice = reserveInfo.basePrice
                if (firstTime && reserveInfo.firstPrice) finalPrice = reserveInfo.firstPrice
                if (validCouponDiscount) finalPrice = Math.max(finalPrice - validCouponDiscount, 0)

                // --- 反映 ---
                setReserveInfo({
                  ...reserveInfo,
                  finalPrice,
                  couponDiscount: validCouponDiscount,
                  couponCode: usedCouponCode,
                })
                setFormValues(values)
                setIsFirst(firstTime)
                setConfirming(true)
              }}
              onClose={closeAll}
            />
            <div className="mt-3 flex justify-end">
              <button
                className="inline-flex items-center rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 text-sm transition"
                onClick={closeAll}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 確認モーダル */}
      {reserveInfo && confirming && formValues && isFirst !== null && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45">
          <div className="bg-white rounded-2xl border border-amber-100 shadow-2xl w-full max-w-lg mx-4">
            <ConfirmModal
              date={reserveInfo.date}
              course={reserveInfo.course}
              slot={reserveInfo.slot}
              name={formValues.name}
              tel={formValues.tel}
              finalPrice={reserveInfo.finalPrice!} // ←（ReserveInfo側でoptionalなら実値確定後に使用）
              email={formValues.email}
              isFirst={isFirst}
              onBack={() => setConfirming(false)}
              onClose={closeAll}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/* ======================================================
   横スク3ヶ月カレンダー
   - 見切れ対策：親に px、子幅 w-[min(560px,calc(100vw-2rem))]
   - セル：min-w-[44px], h-12(md:h-14), 左上=日付丸, 右下=ステータス
   - 無効化条件：過去日 or full/closed → 黒半透明で無効化
   ====================================================== */
type CalProps = {
  months?: number
  onSelectDate: (dateStr: string) => void
  availability?: AvailabilityMap
}

function HorizontalCalendar({ months = 3, onSelectDate, availability = {} }: CalProps) {
  const today = useMemo(() => {
    const t = new Date()
    // 当日0:00固定（過去判定のズレ防止）
    t.setHours(0, 0, 0, 0)
    return t
  }, [])

  const monthBlocks = useMemo(() => {
    const arr: Date[] = []
    for (let i = 0; i < months; i++) {
      arr.push(new Date(today.getFullYear(), today.getMonth() + i, 1))
    }
    return arr
  }, [months, today])

  const weekNames = ["日", "月", "火", "水", "木", "金", "土"]

  // YYYY-MM-DD（ゼロ埋めISO）
  const toISO = (d: Date) => {
    const y = d.getFullYear()
    const m = `${d.getMonth() + 1}`.padStart(2, "0")
    const dd = `${d.getDate()}`.padStart(2, "0")
    return `${y}-${m}-${dd}`
  }

  const getIcon = (iso: string) => {
    const st = availability[iso]
    if (st === "open") return "😊"
    if (st === "full" || st === "closed") return "✖"
    return "" // 未設定は非表示でスッキリ
  }

  return (
    <div className="overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-pl-4 md:scroll-pl-6 px-4 md:px-6 py-3">
      <div className="flex gap-4 md:gap-6">
        {monthBlocks.map((firstDay, idx) => {
          // 月の開始/終了
          const year = firstDay.getFullYear()
          const month = firstDay.getMonth()
          const monthStart = new Date(year, month, 1)
          const monthEnd = new Date(year, month + 1, 0)

          // 表示範囲を週単位に拡げる
          const gridStart = new Date(monthStart)
          gridStart.setDate(gridStart.getDate() - gridStart.getDay())
          gridStart.setHours(0, 0, 0, 0)
          const gridEnd = new Date(monthEnd)
          gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()))
          gridEnd.setHours(0, 0, 0, 0)

          // 日配列
          const days: Date[] = []
          for (let d = new Date(gridStart); d <= gridEnd; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
            days.push(d)
          }

          return (
            <section
              key={idx}
              className="snap-start shrink-0 w-[min(560px,calc(100vw-2rem))]"
              // ↑ 子幅：ビューポートの左右余白ぶん差し引き（見切れ防止）
            >
              {/* 月タイトル */}
              <div className="px-1 md:px-2 mb-2 flex items-baseline justify-between">
                <h2 className="text-lg md:text-xl font-bold">
                  {year}年{month + 1}月
                </h2>
                <span className="text-xs text-gray-500">（横にスワイプ）</span>
              </div>

              {/* 曜日ヘッダ */}
              <div className="grid grid-cols-7 text-center text-[11px] md:text-xs text-gray-500 mb-1">
                {weekNames.map((w) => (
                  <div key={w} className="py-1">{w}</div>
                ))}
              </div>

              {/* 月グリッド */}
              <div className="grid grid-cols-7 gap-1 md:gap-2">
                {days.map((d) => {
                  const iso = toISO(d)
                  const inThisMonth = d.getMonth() === month
                  const isToday =
                    d.getFullYear() === today.getFullYear() &&
                    d.getMonth() === today.getMonth() &&
                    d.getDate() === today.getDate()
                  const st = availability[iso]
                  const icon = getIcon(iso)

                  // ▼ 無効条件：過去 or 満/休
                  const isPast = d < today
                  const isDisabled = isPast || st === "full" || st === "closed"

                  return (
                    <div
                      key={iso}
                      className={[
                        "relative rounded-lg border bg-white shadow-sm overflow-hidden",
                        "min-w-[44px] h-12 md:h-14 p-1 md:p-2 text-[11px] md:text-xs leading-tight",
                        inThisMonth ? "border-amber-100" : "border-gray-100 opacity-60",
                        isToday ? "ring-2 ring-amber-400" : "",
                        isDisabled ? "pointer-events-none" : "hover:bg-amber-50 cursor-pointer",
                      ].join(" ")}
                      onClick={() => {
                        if (!isDisabled && inThisMonth) onSelectDate(iso)
                      }}
                    >
                      {/* 日付バッジ（SP:日 / md+: 月/日） */}
                      <span className="absolute left-1 top-1 md:left-2 md:top-2">
                        <span className="inline-flex items-center justify-center rounded-full bg-gray-100 text-gray-700 h-5 min-w-5 px-1 md:h-6 md:min-w-6 md:px-2 text-[10px] md:text-[11px]">
                          <span className="md:hidden">{d.getDate()}</span>
                          <span className="hidden md:inline">
                            {d.getMonth() + 1}/{d.getDate()}
                          </span>
                        </span>
                      </span>

                      {/* ステータス（右下・1文字固定） */}
                      {icon && (
                        <span className="absolute right-1 bottom-1 md:right-2 md:bottom-2 text-base md:text-lg leading-none">
                          {icon}
                        </span>
                      )}

                      {/* ▼ 黒塗りオーバーレイ（過去/満了/休） */}
                      {isDisabled && <span className="absolute inset-0 bg-black/55" />}
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

/* --------------------------
  スクロールバー非表示（任意）
  - Client Component内で実行（document参照はブラウザ限定）
---------------------------*/
if (typeof document !== "undefined") {
  const style = document.createElement("style")
  style.innerHTML = `
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `
  document.head.appendChild(style)
}
