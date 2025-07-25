import { NextResponse } from 'next/server'
export const runtime = 'nodejs';

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY) // .env.localに必ずセット
const basEUrl = "https://lucaverse-site.vercel.app";

export async function POST(req: Request) {
  try {
    // 予約内容＋予約IDも受け取る（←これが重要！）
    const { date, slot, course, name, tel, email, reservationId } = await req.json()
    console.log("[sendMail] 予約データ受信:", { date, slot, course, name, tel, email, reservationId })

    // APIキー必須
    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEYが設定されていません")
      return NextResponse.json({ error: "APIキー未設定" }, { status: 500 })
    }

    // ここで承認・拒否用リンクを作成
const baseUrl = "http://localhost:3001";
    const approveUrl = `${baseUrl}/api/confirm?id=${reservationId}`;
    const denyUrl = `${baseUrl}/api/deny?id=${reservationId}`;

    // メール送信（SDKでシンプルに書く例）
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',         // 認証済みfromアドレス
      to: 'untiruka@gmail.com',              // 管理者（あなた）のアドレス
      subject: `新規予約：${date} ${slot}`,
      html: `
        <div>
          <b>予約内容</b><br>
          日時: ${date} ${slot}<br>
          コース: ${course}<br>
          名前: ${name}<br>
          電話: ${tel}<br>
          メール: ${email}<br>
          <br>
          <a href="${approveUrl}">[承認]</a>
          <a href="${denyUrl}" style="margin-left:10px;">[拒否]</a>
        </div>
      `
    })

    if (error) {
      console.error("Resend送信エラー", error)
      return NextResponse.json({ error: "Resend送信エラー", detail: error }, { status: 500 })
    }

    return NextResponse.json({ ok: true, data })
  } catch (e) {
    console.error("API Routeエラー", e)
    return NextResponse.json({ error: "API内部エラー", detail: String(e) }, { status: 500 })
  }
}
