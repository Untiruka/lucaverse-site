// /src/app/api/sendMail/route.ts
// ------------------------------------------------------
// Resend 送信API（本番向け修正版）
// ・ENV使用: RESEND_API_KEY / EMAIL_FROM / EMAIL_TO_ADMIN / NEXT_PUBLIC_SITE_URL / VERCEL_URL
// ・BASE_URLは環境から自動決定（ローカル fallback あり）
// ・管理者/ユーザー両方にメール送信
// ・承認/拒否URLは絶対URLで生成
// ・地図リンクは店舗住所（広島市中区上幟町9-33 301）
// ------------------------------------------------------

import { NextResponse } from 'next/server'
export const runtime = 'nodejs' // ← Edgeだと環境変数/SDKでハマるのでnodejs

import { Resend } from 'resend'

// ---------- ユーティリティ ----------
/** プロトコル付きの BASE_URL を返す（環境に応じて自動判定） */
const resolveBaseUrl = () => {
  // 明示指定（推奨）
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (fromEnv) return fromEnv

  // Vercel の自動URL（例：myapp.vercel.app）
  const fromVercel = process.env.VERCEL_URL?.trim()
  if (fromVercel) {
    // VERCEL_URL はスキームなしなので https 付与
    return `https://${fromVercel}`
  }

  // ローカル fallback
  return 'http://localhost:3001'
}

/** 絶対URLを安全に作る（/api/foo?bar=...） */
const buildUrl = (path: string, params?: Record<string, string | number | undefined>) => {
  const u = new URL(path, resolveBaseUrl())
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) u.searchParams.set(k, String(v))
    }
  }
  return u.toString()
}

// ---------- Resend セットアップ ----------
const resendApiKey = process.env.RESEND_API_KEY
// 送信元（Verified推奨・例: "施術屋 Luca <hello@lucaverce.com>"）
const EMAIL_FROM = process.env.EMAIL_FROM || '施術屋 Luca <onboarding@resend.dev>'
// 管理者通知先（なければあなたのYahooへ）
const EMAIL_TO_ADMIN = process.env.EMAIL_TO_ADMIN || 'lucaverce_massage@yahoo.co.jp'

// SDKインスタンス（キー無い場合は後でチェック）
const resend = resendApiKey ? new Resend(resendApiKey) : null

export async function POST(req: Request) {
  try {
    // ------- 入力取得 -------
    const body = await req.json()
    const { date, slot, course, name, tel, email, reservationId } = body || {}

    // ------- バリデーション（最低限） -------
    if (!resend || !resendApiKey) {
      console.error('RESEND_API_KEYが設定されていません')
      return NextResponse.json({ error: 'APIキー未設定' }, { status: 500 })
    }
    if (!date || !slot || !course || !name || !tel || !email) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
    }

    // ------- 承認/拒否/キャンセルURL（絶対URL） -------
    const approveUrl = buildUrl('/api/confirm', { id: reservationId })
    const denyUrl = buildUrl('/api/deny', { id: reservationId })
    const cancelUrl = denyUrl // ユーザー向けは拒否URLを流用

    // ------- Googleマップ（店舗住所 固定）-------
    const mapAddress = '広島市中区上幟町9-33 301' // ← 店舗の正式住所
    const mapUrl = `https://maps.google.com/?q=${encodeURIComponent(mapAddress)}`

    // ------- 共通本文（テキスト） -------
    const userText = [
      'Lucaをご予約いただきありがとうございます。',
      '',
      '■ ご予約内容',
      `日付：${date}`,
      `時間：${slot}`,
      `コース：${course === '60min' ? '60分' : '30分'}`,
      `お名前：${name}`,
      `電話番号：${tel}`,
      `メール：${email}`,
      reservationId ? `予約ID：${reservationId}` : '',
      '',
      '▼店舗地図',
      mapUrl,
      '',
      '▼ご予約のキャンセルはこちらから',
      cancelUrl,
      '',
      '※このメールは自動送信です。返信不要です。',
      '変更・キャンセルは必ず上記リンクからお願いします。',
    ].filter(Boolean).join('\n')

    const adminText = [
      '【新規予約が入りました】',
      '',
      '■ 予約内容',
      `予約ID：${reservationId ?? '(未発行)'}`,
      `日時：${date} ${slot}`,
      `コース：${course}`,
      `名前：${name}`,
      `電話：${tel}`,
      `メール：${email}`,
      '',
      '▼承認/拒否',
      `承認: ${approveUrl}`,
      `拒否: ${denyUrl}`,
      '',
      '▼店舗地図',
      mapUrl,
    ].join('\n')

    // ------- 管理者宛（HTML簡易） -------
    const { error: adminError } = await resend.emails.send({
      from: EMAIL_FROM,
      to: EMAIL_TO_ADMIN,
      subject: `新規予約：${date} ${slot}`,
      text: adminText, // ← テキストも入れておく（到達率/見やすさ）
      html: `
        <div>
          <b>【新規予約】</b><br/>
          予約ID: ${reservationId ?? '(未発行)'}<br/>
          日時: ${date} ${slot}<br/>
          コース: ${course}<br/>
          名前: ${name}<br/>
          電話: ${tel}<br/>
          メール: ${email}<br/>
          <br/>
          <b>▼承認/拒否</b><br/>
          <a href="${approveUrl}">[承認]</a>
          <a href="${denyUrl}" style="margin-left:10px;">[拒否]</a>
          <br/><br/>
          <b>▼店舗地図</b><br/>
          <a href="${mapUrl}" target="_blank" rel="noreferrer">Googleマップで開く</a>
        </div>
      `,
      headers: { 'X-Reservation-ID': String(reservationId ?? '') }, // 任意ヘッダ
    })

    if (adminError) {
      console.error('Resend 管理者メール送信エラー', adminError)
      return NextResponse.json({ error: 'Resend送信エラー（管理者）', detail: adminError }, { status: 500 })
    }

    // ------- ユーザー宛 -------
    const { error: userError } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: `【Luca】ご予約ありがとうございます（自動返信）`,
      text: userText,
      html: `
        <div>
          <b>ご予約内容（自動返信）</b><br/>
          予約ID: ${reservationId ?? '(発行中)'}<br/>
          日時: ${date} ${slot}<br/>
          コース: ${course}<br/>
          お名前: ${name}<br/>
          電話番号: ${tel}<br/>
          メール: ${email}<br/>
          <br/>
          ▼店舗地図<br/>
          <a href="${mapUrl}" target="_blank" rel="noreferrer">Googleマップで開く</a><br/>
          <br/>
          ▼ご予約のキャンセルはこちらから<br/>
          <a href="${cancelUrl}">予約キャンセルフォーム</a><br/>
          <br/>
          ※このメールは自動送信です。返信不要です。<br/>
          変更・キャンセルは必ず上記リンクからお願いします。<br/>
        </div>
      `,
    })

    if (userError) {
      console.error('Resend 予約者メール送信エラー', userError)
      return NextResponse.json({ error: '予約者メール送信エラー', detail: userError }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('API Routeエラー', e)
    return NextResponse.json({ error: 'API内部エラー', detail: e?.message ?? String(e) }, { status: 500 })
  }
}
