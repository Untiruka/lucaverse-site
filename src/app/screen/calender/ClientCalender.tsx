'use client'

// ------------------------------------------------------
// 目的：Supabaseブラウザクライアントを「クライアントで描画開始後」に安全初期化
// ポイント：getSupabaseBrowser() は useEffect で setState 経由で保持する
//   - これでビルド時の静的プレレンダー中に呼ばれない
//   - 参照前には null ガードを入れて操作を抑止
// ------------------------------------------------------

import { useMemo, useState, useEffect } from "react"
import ConfirmModal from "@/src/app/components/ConfirmModal"
import DayModal from "@/src/app/components/DayModal"
import MassageHeader from "@/src/app/components/MassageHeader"
import MassageFooter from "@/src/app/components/MassageFooter"
import ReserveForm from "@/src/app/components/ReserveForm"
import { getSupabaseBrowser } from '@/lib/supabaseClient'
import type { ReserveInfo } from "@/src/app/components/ReserveForm"

// ---------- 型定義（any禁止） ----------
type AvailabilityStatus = "open" | "full" | "closed"
type AvailabilityMap = Record<string, AvailabilityStatus>
type FormValues = { name: string; tel: string; email: string; coupon1?: string }
// getSupabaseBrowser() の戻り型を安全に推論
type SupaClient = ReturnType<typeof getSupabaseBrowser>

// ---------- ダミー在庫 ----------
const availability: AvailabilityMap = {
  "2025-09-25": "open",
  "2025-09-26": "full",
  "2025-10-10": "open",
}

export default function ClientCalender() {
  // --------------------------------------------------
  // Supabase は「描画後」に初期化（SSR/SSG中に実行させない）
  // --------------------------------------------------
  const [supabase, setSupabase] = useState<SupaClient | null>(null)

  useEffect(() => {
    // ※ ブラウザ上でのみ実行される
    setSupabase(getSupabaseBrowser())
  }, [])

  // ---------- UI状態 ----------
  const [modalDate, setModalDate] = useState<string | null>(null)
  const [reserveInfo, setReserveInfo] = useState<ReserveInfo | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [formValues, setFormValues] = useState<FormValues | null>(null)
  const [isFirst, setIsFirst] = useState<boolean | null>(null)

  const closeAll = () => {
    setReserveInfo(null)
    setFormValues(null)
    setConfirming(false)
    setModalDate(null)
    setIsFirst(null)
  }

  // ---------- スクロールバー非表示（装飾） ----------
  useEffect(() => {
    const style = document.createElement("style")
    style.innerHTML = `
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    `
    document.head.appendChild(style)
    return () => { document.head.removeChild(style) }
  }, [])

  // ---------- 表示 ----------
  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-conti antialiased">
      <MassageHeader />
      <main className="pt-20 pb-24 px-3 max-w-md mx-auto md:pt-24 md:pb-28 md:px-6 md:max-w-3xl">
        <div className="bg-gray-800 rounded-lg border border-cyan-400/50 p-4 md:p-6">
          <h1 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 flex items-center gap-3"
              style={{ textShadow: '0 0 5px #06b6d4' }}>
            <span className="inline-block h-2 w-2 rounded-full bg-cyan-400" />
            空き状況カレンダー
          </h1>
          <div className="rounded-lg border border-gray-700 bg-black/50">
            <HorizontalCalendar
              months={3}
              onSelectDate={setModalDate}
              availability={availability}
            />
          </div>
        </div>

        {/* ▼ Supabase未初期化中は注意表示（操作抑止のため） */}
        {!supabase && (
          <p className="mt-4 text-sm text-gray-400">
            読み込み中です…（数秒後に予約フォームが使えます）
          </p>
        )}
      </main>
      <MassageFooter />

      {/* 日付選択モーダル */}
      {modalDate && !reserveInfo && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
          <div className="bg-gray-800 rounded-lg border border-cyan-400/50 shadow-2xl w-full max-w-lg mx-4">
            <DayModal
              date={modalDate}
              onClose={() => setModalDate(null)}
              onReserve={(info) => {
                setReserveInfo(info)
                setModalDate(null)
              }}
            />
          </div>
        </div>
      )}

      {/* 予約フォーム */}
      {reserveInfo && !confirming && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
          <div className="bg-gray-800 rounded-lg border border-cyan-400/50 shadow-2xl w-full max-w-lg mx-4 p-4 md:p-5">
            <ReserveForm
              info={reserveInfo}
              onNext={async (values: FormValues) => {
                // ------------------------------
                // ★ Supabase 初期化前は無視して安全化
                // ------------------------------
                if (!supabase) return

                // 既存顧客かチェック
                const { data: prev } = await supabase
                  .from("reservation")
                  .select("id")
                  .or(`tel.eq.${values.tel},email.eq.${values.email},name.eq.${values.name}`)
                  .eq("status", "confirmed")
                  .limit(1)

                const firstTime = !prev || prev.length === 0

                // クーポン検証
                let validCouponDiscount = 0
                let usedCouponCode = ""
                if (values.coupon1) {
                  const todayIso = new Date().toISOString().slice(0, 10)
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

                // 価格計算
                let finalPrice = reserveInfo.basePrice
                if (firstTime && reserveInfo.firstPrice) finalPrice = reserveInfo.firstPrice
                if (validCouponDiscount) finalPrice = Math.max(finalPrice - validCouponDiscount, 0)

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
              // ※ supabaseが用意できるまで送信ボタンを実質無効化するなら、
              //   ReserveForm側のpropsに disabled 等を渡して制御するのもアリ
            />
            <div className="mt-3 flex justify-end">
              <button
                className="inline-flex items-center rounded-md bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 text-sm transition"
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
          <div className="bg-gray-800 rounded-lg border border-cyan-400/50 shadow-2xl w-full max-w-lg mx-4">
            <ConfirmModal
              date={reserveInfo.date}
              course={reserveInfo.course}
              slot={reserveInfo.slot}
              name={formValues.name}
              tel={formValues.tel}
              finalPrice={reserveInfo.finalPrice!}
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
   横スク3ヶ月カレンダー（元UIそのまま）
   - 見切れ対策：親に px、子幅 w-[min(560px,calc(100vw-2rem))]
   - セル：min-w-[44px], h-12(md:h-14), 右下=ステータス
   - 無効条件：過去日 or full/closed → 黒半透明で無効化
   ====================================================== */
type CalProps = {
  months?: number
  onSelectDate: (dateStr: string) => void
  availability?: AvailabilityMap
}

function HorizontalCalendar({ months = 3, onSelectDate, availability = {} }: CalProps) {
  const today = useMemo(() => {
    const t = new Date()
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
    return ""
  }

  return (
    <div className="overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-pl-4 md:scroll-pl-6 px-4 md:px-6 py-3">
      <div className="flex gap-4 md:gap-6">
        {monthBlocks.map((firstDay, idx) => {
          const year = firstDay.getFullYear()
          const month = firstDay.getMonth()
          const monthStart = new Date(year, month, 1)
          const monthEnd = new Date(year, month + 1, 0)

          const gridStart = new Date(monthStart)
          gridStart.setDate(gridStart.getDate() - gridStart.getDay())
          gridStart.setHours(0, 0, 0, 0)
          const gridEnd = new Date(monthEnd)
          gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()))
          gridEnd.setHours(0, 0, 0, 0)

          const days: Date[] = []
          for (let d = new Date(gridStart); d <= gridEnd; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
            days.push(d)
          }

          return (
            <section key={idx} className="snap-start shrink-0 w-[min(560px,calc(100vw-2rem))]">
              <div className="px-1 md:px-2 mb-2 flex items-baseline justify-between">
                <h2 className="text-lg md:text-xl font-bold">
                  {year}年{month + 1}月
                </h2>
                <span className="text-xs text-gray-500">（横にスワイプ）</span>
              </div>

              <div className="grid grid-cols-7 text-center text-[11px] md:text-xs text-gray-500 mb-1">
                {weekNames.map((w) => (
                  <div key={w} className="py-1">{w}</div>
                ))}
              </div>

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
                      <span className="absolute left-1 top-1 md:left-2 md:top-2">
                        <span className="inline-flex items-center justify-center rounded-full bg-gray-100 text-gray-700 h-5 min-w-5 px-1 md:h-6 md:min-w-6 md:px-2 text-[10px] md:text-[11px]">
                          <span className="md:hidden">{d.getDate()}</span>
                          <span className="hidden md:inline">
                            {d.getMonth() + 1}/{d.getDate()}
                          </span>
                        </span>
                      </span>

                      {icon && (
                        <span className="absolute right-1 bottom-1 md:right-2 md:bottom-2 text-base md:text-lg leading-none">
                          {icon}
                        </span>
                      )}

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
