// src/lib/supabaseBrowser.ts
// ブラウザ用（Client Components 専用）
// コメント: NEXT_PUBLIC の環境変数だけを使う

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!           // ← ブラウザ公開OK
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  // ← 同上

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
// コメント: これを import するのは 'use client' なコンポーネントだけに限定
