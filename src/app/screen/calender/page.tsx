'use client'

import { useState } from 'react'
import ConfirmModal from '@/src/app/components/ConfirmModal'
import CalendarView from '@/src/app/components/CalendarView'
import DayModal from '@/src/app/components/DayModal'
import MassageHeader from "../../components/MassageHeader"
import MassageFooter from "../../components/MassageFooter"
import ReserveForm from '@/src/app/components/ReserveForm'
import { supabase } from '@/lib/supabaseClient'
import { ReserveInfo } from '@/src/app/components/ReserveForm'

export default function CalendarPage() {
  const [modalDate, setModalDate] = useState<string | null>(null)
const [reserveInfo, setReserveInfo] = useState<ReserveInfo | null>(null);
  const [confirming, setConfirming] = useState(false)
  const [formValues, setFormValues] = useState<{ name: string; tel: string; email: string } | null>(null)
const [isFirst, setIsFirst] = useState<boolean | null>(null);

  // 全部閉じるときの共通リセット
  const closeAll = () => {
    setReserveInfo(null)
    setFormValues(null)
    setConfirming(false)
    setModalDate(null)
  }

  return (
    <>
      <MassageHeader />
      <main className="p-4 max-w-xl mx-auto">
        <h1 className="text-xl font-bold mb-4">空き状況カレンダー</h1>
        <CalendarView onSelectDate={setModalDate} />
      </main>
      <MassageFooter />

      {/* 日付モーダル */}
{modalDate && (
  <DayModal
    date={modalDate}
    onClose={() => setModalDate(null)}
    onReserve={(info) => {
      setReserveInfo(info); // ← 余計な値の上書き一切ナシ！
      setModalDate(null);
    }}
  />
)}

      {/* 予約フォーム */}
      {reserveInfo && !confirming && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-30">
          <div className="bg-white rounded shadow p-4 min-w-[320px]">
  <ReserveForm
  info={reserveInfo}
  onNext={async (values) => {
    // 1. 初回判定

    const { data: prev } = await supabase
      .from('reservation')
      .select('id')
      .or(
        `tel.eq.${values.tel},email.eq.${values.email},name.eq.${values.name}`
      )
      .eq('status', 'confirmed')
      .limit(1);
    const isFirst = !prev || prev.length === 0;


    // 2. クーポン有効性判定（ここではcoupon1だけ例に）
    let validCouponDiscount = 0;
    let usedCouponCode = "";
    if (values.coupon1) {
      // クーポンテーブルから有効なクーポン検索（例: amountが割引額）
      const { data: c } = await supabase
        .from('coupons')
        .select('amount')
        .eq('code', values.coupon1)
        .eq('used', false)
        .gte('valid_from', new Date().toISOString().slice(0, 10))
        .lte('valid_until', new Date().toISOString().slice(0, 10))
        .single();
      if (c && c.amount) {
        validCouponDiscount = c.amount;
        usedCouponCode = values.coupon1;
      }
    }
    // もっと複雑なロジックでも可（coupon2, coupon3も同様）

    // 3. 金額計算
    let finalPrice = reserveInfo.basePrice;
    if (isFirst && reserveInfo.firstPrice) {
      finalPrice = reserveInfo.firstPrice;
    }
    if (validCouponDiscount) {
      finalPrice -= validCouponDiscount;
    }
    finalPrice = Math.max(finalPrice, 0);

    // 4. reserveInfoに結果を格納
    setReserveInfo({
      ...reserveInfo,
      finalPrice,
      couponDiscount: validCouponDiscount,
      couponCode: usedCouponCode,
    });
    setFormValues(values);
    setIsFirst(isFirst);
    setConfirming(true);


    console.log("===DEBUG===");
console.log("isFirst:", isFirst);
console.log("basePrice:", reserveInfo.basePrice);
console.log("firstPrice:", reserveInfo.firstPrice);
console.log("finalPrice:", finalPrice);

  }}
  onClose={closeAll}
/>

            <button
              className="mt-3 py-1 px-3 rounded bg-gray-300"
              onClick={closeAll}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* 確認モーダル（ここでDB登録まで完結させる） */}
   {reserveInfo && confirming && formValues && isFirst !== null && (
  <ConfirmModal
    date={reserveInfo.date}
    course={reserveInfo.course}
    slot={reserveInfo.slot}
    name={formValues.name}
    tel={formValues.tel}
      finalPrice={reserveInfo.finalPrice!} // ← 追加

    email={formValues.email}
    isFirst={isFirst}
    onBack={() => setConfirming(false)}
    onClose={closeAll}
  />
)}
    </>
  )
}
