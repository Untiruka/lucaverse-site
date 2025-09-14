// src/app/api/google/auth/route.ts
// まずは 404 切り分け用の最小実装
import { NextResponse } from "next/server";

export async function GET() {
  // ← ここに来れば 200 {"ok":true} が返る（ルーティングOK）
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
