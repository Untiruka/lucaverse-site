// app/screen/calender/page.tsx
// ------------------------------------------------------
// Server薄ラッパ：ここでは 'use client' を付けない＆Supabaseを触らない
// SSG/prerenderを明示停止して、ビルド時評価を避ける
// ------------------------------------------------------
export const dynamic = 'force-dynamic'

import ClientCalender from './ClientCalender'

export default function Page() {
  // 注意：Supabaseやwindow/document等はここで触らないこと！
  return <ClientCalender />
}
