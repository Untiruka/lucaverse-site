// app/api/oauth2callback/route.ts
// 認可コード受け取り用（テスト用の簡易ハンドラ）
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  // コメント：URLの ?code=xxxxx を取得
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')

  if (error) {
    return new NextResponse(`OAuth Error: ${error}`, { status: 400 })
  }
  if (!code) {
    return new NextResponse('No code', { status: 400 })
  }

  // コメント：画面にコードをそのまま出す（後でcurlに貼る）
  const html = `
    <html><body>
      <h1>OAuth code</h1>
      <p><code>${code}</code></p>
      <p>このコードを使ってトークン交換してください。</p>
    </body></html>`
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=UTF-8' } })
}
