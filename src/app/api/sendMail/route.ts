// /src/app/api/sendMail/route.ts
// ------------------------------------------------------
// 予約直後：管理者メールだけ送る（承認/拒否リンク付き）
// ユーザーへの自動返信は送らない（Confirm/Deny時に送る）
// ログ（console.log）を厚めに入れて原因切り分けしやすくする
// ------------------------------------------------------

import { NextResponse } from 'next/server'
export const runtime = 'nodejs' // （実行環境）nodejs固定

import { Resend } from 'resend'

// ---------- ユーティリティ ----------
/** BASE_URL（絶対URLの土台）を決める。 */
const resolveBaseUrl = () => {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim() // 例: https://lucaverce.com
  if (fromEnv) return fromEnv
  const fromVercel = process.env.VERCEL_URL?.trim()        // 例: lucaverse-xxxx.vercel.app
  if (fromVercel) return `https://${fromVercel}`
  return 'http://localhost:3000' // （fallback）
}

/** 絶対URLを作る（/api/foo?id=...） */
const buildUrl = (path: string, params?: Record<string, string | number | undefined>) => {
  const u = new URL(path, resolveBaseUrl())
  if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined) u.searchParams.set(k, String(v)) })
  return u.toString()
}

// ---------- Resend ----------
const resendApiKey = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM || '施術屋 Luca <onboarding@resend.dev>'
const EMAIL_TO_ADMIN = process.env.EMAIL_TO_ADMIN || 'lucaverce_massage@yahoo.co.jp'
const resend = resendApiKey ? new Resend(resendApiKey) : null

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const { date, slot, course, name, tel, email, reservationId } = body as {
      date?: string; slot?: string; course?: string; name?: string; tel?: string; email?: string; reservationId?: string
    }

    // --- 入力/ENVログ（ここで大体原因が分かる） ---
    console.log('[sendMail] START', { date, slot, course, name, tel, email, reservationId })
    console.log('[sendMail] ENV', {
      RESEND_API_KEY: !!resendApiKey,
      EMAIL_FROM: !!EMAIL_FROM,
      EMAIL_TO_ADMIN: !!EMAIL_TO_ADMIN,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      VERCEL_URL: process.env.VERCEL_URL,
      BASE_URL_RESOLVED: resolveBaseUrl(),
    })

    if (!resend || !resendApiKey) {
      console.error('[sendMail] ERROR: RESEND_API_KEY missing')
      return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 500 })
    }
    if (!date || !slot || !course || !name) {
      console.error('[sendMail] ERROR: required fields missing')
      return NextResponse.json({ error: 'required fields missing' }, { status: 400 })
    }

    // --- 承認/拒否リンク（絶対URL） ---
    const approveUrl = buildUrl('/api/confirm', { id: reservationId })
    const denyUrl = buildUrl('/api/deny', { id: reservationId })
    console.log('[sendMail] LINKS', { approveUrl, denyUrl })

    // --- 地図リンク ---
    const mapAddress = '広島市中区上幟町9-33 301'
    const mapUrl = `https://maps.google.com/?q=${encodeURIComponent(mapAddress)}`
    console.log('[sendMail] MAP', { mapUrl })

    // --- 管理者向け本文 ---
    const adminText = [
      '【新規予約が入りました】',
      '',
      '■ 予約内容',
      `予約ID：${reservationId ?? '(未発行)'}`,
      `日時：${date} ${slot}`,
      `コース：${course}`,
      `名前：${name}`,
      tel ? `電話：${tel}` : '',
      email ? `メール：${email}` : '',
      '',
      '▼承認/拒否',
      `承認: ${approveUrl}`,
      `拒否: ${denyUrl}`,
      '',
      '▼店舗地図',
      mapUrl,
    ].filter(Boolean).join('\n')

    // --- 送信（管理者のみ） ---
    const adminRes = await resend.emails.send({
      from: EMAIL_FROM,
      to: EMAIL_TO_ADMIN,
      subject: `新規予約：${date} ${slot}`,
      text: adminText,
      html: `
        <div>
          <b>【新規予約】</b><br/>
          予約ID: ${reservationId ?? '(未発行)'}<br/>
          日時: ${date} ${slot}<br/>
          コース: ${course}<br/>
          名前: ${name}<br/>
          ${tel ? `電話: ${tel}<br/>` : '' }
          ${email ? `メール: ${email}<br/>` : '' }
          <br/>
          <b>▼承認/拒否</b><br/>
          <a href="${approveUrl}">[承認]</a>
          <a href="${denyUrl}" style="margin-left:10px;">[拒否]</a>
          <br/><br/>
          <b>▼店舗地図</b><br/>
          <a href="${mapUrl}" target="_blank" rel="noreferrer">Googleマップで開く</a>
        </div>
      `,
      headers: { 'X-Reservation-ID': String(reservationId ?? '') },
    })
    console.log('[sendMail] admin email result', { data: adminRes?.data, error: adminRes?.error })

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[sendMail] ERROR', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
