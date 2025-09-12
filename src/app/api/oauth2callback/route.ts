// app/api/oauth2callback/route.ts
// 役割：Google認可の戻り受け口（テスト表示専用）
// - ここではトークン交換を絶対に行わない（二重交換/invalid_grant防止）
// - キャッシュ無効化、GET以外拒否、state照合（あれば）

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // ▼ クエリ取得（code=認可コード, error=エラー種別, error_description=詳細）
  const sp = new URL(req.url).searchParams;
  const code  = sp.get("code");                  // 成功時のみ付与される
  const error = sp.get("error");                 // 例: invalid_request など
  const desc  = sp.get("error_description");     // エラー詳細（人間可読）
  const state = sp.get("state");                 // CSRF対策用の乱数

  // ▼ （任意）state照合：事前に /api/google/auth でCookie等へ保存している前提
  //    例：auth時に 'oauth_state' を SameSite=Strict でセットしておく
  const expectedState = req.cookies.get("oauth_state")?.value;
  const stateOk = expectedState ? state === expectedState : true; // state未採用なら true

  // ▼ 返却JSONを組み立て（codeはログに残りにくいよう一部マスク）
  const maskedCode = code ? `${code.slice(0,8)}***` : null;

  const body = {
    code: maskedCode,                 // ★表示専用：実交換は別APIで1回だけ行う
    error,
    error_description: desc,
    state_ok: stateOk,
  };

  // ▼ キャッシュ無効化ヘッダ（no-store は最優先）
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "Pragma": "no-cache",
  };

  // ▼ エラー or state不一致なら 400、成功見込みなら 200
  const status = error || !stateOk ? 400 : 200;

  return new NextResponse(JSON.stringify(body, null, 2), { status, headers });
}

// ★ POST/PUT などで来た場合は拒否（念のため）
//   Next.js App Router では未定義メソッドは 405にしておくのが安全
export const dynamic = "force-dynamic"; // 念のため動的扱い（Vercel最適化との絡みで）
