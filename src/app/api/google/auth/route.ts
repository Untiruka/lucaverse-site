// app/api/google/auth/route.ts
// 役割：Googleの認可URLを安全に生成して302で飛ばす
// - 手打ちミス防止
// - state（CSRF対策）をCookie保存
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  // ★ 必須：環境変数に web.client_id を入れておくこと
  const clientId = process.env.GOOGLE_CLIENT_ID; // 例: 1234-xxxx.apps.googleusercontent.com
  if (!clientId) {
    return NextResponse.json({ error: "missing_GOOGLE_CLIENT_ID" }, { status: 500 });
  }

  // ★ redirect_uri は Console 登録と完全一致（固定）
  const redirectUri = "https://lucaverce.com/api/oauth2callback";

  // ★ scope はカレンダー
  const scope = "https://www.googleapis.com/auth/calendar";

  // ★ CSRF対策：ランダムstateを発行してCookieへ保存
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  // Cookie設定（SameSite=Strict / HttpOnly）
  const res = NextResponse.redirect(url, { status: 302 });
  res.cookies.set("oauth_state", state, {
    httpOnly: true,
    sameSite: "strict",
    secure: true,
    path: "/",
    maxAge: 60 * 10, // 10分（有効時間の目安）
  });
  // キャッシュさせない
  res.headers.set("Cache-Control", "no-store");
  return res;
}
