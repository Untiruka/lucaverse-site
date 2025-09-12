// app/api/google/exchange/route.ts
// 役割：/api/oauth2callback に戻った code を “1回だけ” 交換する専用口
// - Basic認証ヘッダで client 認証（client_id:client_secret）
// - redirect_uri は認可時と完全一致で固定
// - code 使い回しは invalid_grant になるので注意
import { NextRequest, NextResponse } from "next/server";

const REDIRECT_URI = "https://lucaverce.com/api/oauth2callback"; // ★固定（Console登録と一致）

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json(); // { "code": "......" } を渡す
    if (!code) {
      return NextResponse.json({ error: "code_required" }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: "missing_client_env" }, { status: 500 });
    }

    // ★ Basic 認証（client_id:client_secret を Base64）
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    // ★ フォームデータ（grant_type / code / redirect_uri）
    const body = new URLSearchParams({
      grant_type: "authorization_code", // 固定
      code,                              // 使い回し不可（1回だけ）
      redirect_uri: REDIRECT_URI,        // 完全一致
    });

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basic}`, // ★ここが肝（client認証）
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const json = await res.json(); // 成功/失敗いずれもJSON
    // キャッシュ抑止
    const headers = { "Cache-Control": "no-store", "Content-Type": "application/json" };

    return new NextResponse(JSON.stringify(json), { status: res.status, headers });
  } catch (e) {
    return NextResponse.json({ error: "exchange_failed" }, { status: 500 });
  }
}
