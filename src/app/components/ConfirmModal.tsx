'use client' // ← Client Component は最上段

// ------------------------------------------------------
// ConfirmModal（保存時の値をDB制約に完全準拠／IDは別SELECT／詳細デバッグ）
// ・course を保存用に正規化（'30min','60min','90' 等）← DBの CHECK に合わせる
// ・tel を保存用に E.164 形式へ正規化（+81…）← DBの CHECK に合わせる
// ・INSERT では .select() を使わない（POSTに?columnsが付いても問題化しない）
// ・IDは直後に別SELECTで取得
// ・失敗時は code/message/details/hint を console.error に全部出力
// ------------------------------------------------------

import { useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabaseClient'

type ConfirmModalProps = {
  date: string
  course: string            // 例: "30min" | "60min" | "90min"（画面表示はこのまま）
  slot: string              // "HH:MM"
  name: string
  tel: string               // 例: "09012345678" など（保存時に +81 へ正規化）
  email: string
  finalPrice: number
  onBack: () => void
  onClose: () => void
  isFirst: boolean
}

/** "30min" 等から分数（number）を抽出（未知値は30でフォールバック） */
function courseToMinutes(course: string): number {
  // 数字だけ抜き出して変換（"90min"→90, "90"→90）
  const m = parseInt(course.replace(/[^0-9]/g, ''), 10)
  return Number.isFinite(m) && m > 0 ? m : 30
}

/** DBのCHECK制約に合わせた course 正規化（保存用）
 *  - 現在の制約: {'30min','60min','60','90','120','150','180','210'}
 *  - 方針:
 *    * 30分 → '30min'
 *    * 60分 → '60min'（DBは'60'も可やけど '60min'で統一）
 *    * 90分以上 → 数値のみ文字列（'90','120','150','180','210'）
 */
function normalizeCourseForDB(course: string): string {
  const m = courseToMinutes(course)
  if (m === 30) return '30min'
  if (m === 60) return '60min'
  return String(m)
}

/** 電話番号をE.164へ正規化（保存用）
 *  - 国内想定: 先頭0なら +81 に変換（例: "09012345678" → "+819012345678"）
 *  - 既に "+" 始まりはそのまま
 *  - 数字以外は除去
 */
function toE164(tel: string): string {
  const raw = tel.replace(/[^\d+]/g, '')
  if (raw.startsWith('+')) return raw
  if (raw.startsWith('0')) return '+81' + raw.slice(1)
  // 国番号不明は日本前提で +81 を付与（運用に合わせて調整可）
  return '+81' + raw
}

export default function ConfirmModal(props: ConfirmModalProps) {
  const { date, course, slot, name, isFirst, tel, email, onBack, onClose, finalPrice } = props
  const supabase = getSupabaseBrowser()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  /** 開始"HH:MM"にコース分を足して終了"HH:MM"を作成（30/60/90対応） */
  const calcEndTime = (startHHMM: string, courseStr: string): string => {
    const dur = courseToMinutes(courseStr) // 30/60/90...
    const end = new Date(`${date}T${startHHMM}:00`)
    end.setMinutes(end.getMinutes() + dur)
    const hh = String(end.getHours()).padStart(2, '0')
    const mm = String(end.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }

  const handleSubmit = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      // ▼ 表示用はそのまま、保存用は正規化してDB制約に完全準拠
      const end_time   = calcEndTime(slot, course)
      const courseDb   = normalizeCourseForDB(course) // ★ '90min' → '90' など
      const telE164    = toE164(tel)                  // ★ "090…" → "+81…"

      // --- 1) INSERT（.select() 付けない） ---
      const insertRes = await supabase
        .from('reservation')
        .insert([{
          date,             // "YYYY-MM-DD"
          start_time: slot, // "HH:MM"
          end_time,         // "HH:MM"
          course: courseDb, // ★ DBチェックに合う形だけ保存
          price: finalPrice,
          name,
          tel: telE164,     // ★ E.164形式で保存
          email,
          status: 'pending',
        }])

      if (insertRes.error) {
        // 失敗詳細を全部ログ（本番前に削除推奨）
        console.error('INSERT ERROR', {
          code: insertRes.error.code,        // 例: 23514=CHECK違反, 42501=RLS
          message: insertRes.error.message,  // 人間可読メッセージ
          details: insertRes.error.details,  // 具体内容（制約名など）
          hint: insertRes.error.hint,        // ヒント
          payload: { date, slot, end_time, courseDb, price: finalPrice, name, telE164, email, status: 'pending' },
        })
        throw insertRes.error
      }

      // --- 2) IDを別SELECTで取得（POSTに?columnsが付く問題と切り離し） ---
      const { data: row, error: selErr } = await supabase
        .from('reservation')
        .select('id')
        .eq('date', date)
        .eq('start_time', slot)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (selErr) {
        console.error('SELECT ID ERROR', {
          code: selErr.code,
          message: selErr.message,
          details: selErr.details,
          hint: selErr.hint,
          key: { date, start_time: slot },
        })
        throw selErr
      }

      const reservationId: number | null = row?.id ?? null

      // --- 3) メール送信（必要に応じて保存用/表示用を使い分け） ---
      await fetch('/api/sendMail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          slot,
          // メールには“見たまま”を載せたい場合は course をそのまま送る
          course,            // 例: "90min"（表示用）
          courseDb,          // 例: "90"（保存用）←ログやバックオフィス用に同梱もアリ
          name,
          tel: tel,          // 通知はユーザー入力のまま見せたいなら raw を送る
          telE164,           // 保存実体を併記したいなら同梱
          email,
          reservationId,
        }),
      })

      setDone(true)
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message)
      else setError('送信に失敗しました。時間をおいてお試しください。')
    } finally {
      setLoading(false)
    }
  }

  // --- 完了画面 ---
  if (done) {
    return (
     <div
  className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-3"
  style={{ paddingTop: '80px', paddingBottom: '100px' }}
>
  {/* ★ 保険で mx-auto 追加（親flexが効かん環境でも中央化） */}
  <div className="w-full max-w-md mx-auto rounded-2xl border border-amber-100 bg-white shadow-2xl p-6">
    <div className="text-green-700 font-bold text-lg mb-2">予約が完了しました！</div>
    <p className="text-sm text-gray-700">確認メールをお送りしました。ご来店お待ちしております。</p>
    <div className="mt-5">
      <button
        className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-amber-700"
        onClick={onClose}
      >
        閉じる
      </button>
    </div>
  </div>
</div>
    )
  }

  // --- 確認画面 ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-3" style={{ paddingTop: '80px', paddingBottom: '100px' }}>
      <div className="w-full max-w-md rounded-2xl border border-amber-100 bg-white shadow-2xl overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-amber-100">
          <h2 className="text-lg font-bold text-gray-800">予約内容の最終確認</h2>
          <button onClick={onClose} className="rounded-lg border bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50" aria-label="閉じる" title="閉じる">×</button>
        </div>

        {/* 内容 */}
        <div className="px-5 py-4 space-y-3">
          {/* 金額を強調 */}
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
            <div className="text-[12px] text-amber-700 font-semibold">お支払い金額</div>
            <div className="text-2xl font-extrabold text-gray-900 mt-0.5">{finalPrice.toLocaleString()}円</div>
          </div>

          {/* 詳細（画面表示は“見たまま”の course を使用） */}
          <ul className="text-sm text-gray-800 space-y-1">
            <li><span className="text-gray-500">日付：</span>{date}</li>
            <li><span className="text-gray-500">時間：</span>{slot}</li>
            <li><span className="text-gray-500">コース：</span>{course.replace('min','分')}</li>
            <li><span className="text-gray-500">お名前：</span>{name}</li>
            <li><span className="text-gray-500">電話番号：</span>{tel}</li>
            <li><span className="text-gray-500">メール：</span>{email}</li>
          </ul>

          {/* 初回でない場合の案内 */}
          {!isFirst && (
            <div className="mt-2 rounded-lg bg-gray-50 border border-gray-200 p-3 text-[13px] text-gray-700">
              <p className="leading-relaxed">
                ※ あなたは初回ではないため通常料金になります。<br />
                もし「初めて予約したはずなのに？」という場合は
                <a href="mailto:lucaverce_massage@yahoo.co.jp" className="text-amber-700 underline ml-1">お問い合わせ</a>
                ください。
              </p>
            </div>
          )}

          {/* エラー表示 */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-2">
              {error}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="px-5 py-4 border-t border-amber-100 flex items-center justify-start gap-3">
          <button className="rounded-xl border bg-white px-4 py-2 text-sm text-gray-800 hover:bg-gray-50" onClick={onBack} disabled={loading}>戻る</button>
          <button className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleSubmit} disabled={loading}>
            {loading ? '送信中…' : '予約送信'}
          </button>
          <button className="rounded-xl bg-gray-200 px-4 py-2 text-sm text-gray-800 hover:bg-gray-300" onClick={onClose} disabled={loading}>閉じる</button>
        </div>
      </div>
    </div>
  )
}
