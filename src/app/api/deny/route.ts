import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  
  if (!id) return NextResponse.json({ error: '予約IDが必要' }, { status: 400 })

  // statusをrejectedに
 console.log("confirm called with id:", id)
const { error } = await supabase
  .from('reservation')
  .update({ status: 'confirmed' })
  .eq('id', id)
console.log("update error:", error)
if (error) return NextResponse.json({ error: error.message }, { status: 500 })
return new Response(
  `<html><body>予約を拒否しました</body></html>`,
  { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
)
}