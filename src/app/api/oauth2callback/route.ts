// app/api/oauth2callback/route.ts
// 認可コード受け取り用（テスト用の簡易ハンドラ）
// /api/oauth2callback/route.ts（Next.js App Router）
// 画面に code / error / error_description をJSONで表示
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const code  = sp.get("code");                 // 認可成功時だけ入る
  const error = sp.get("error");                // 失敗時の種別（invalid_request 等）
  const desc  = sp.get("error_description");    // 補足メッセージ
  return new NextResponse(JSON.stringify({ code, error, error_description: desc }, null, 2), {
    status: error ? 400 : 200,
    headers: { "Content-Type": "application/json" },
  });
}