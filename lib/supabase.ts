// lib/supabase.ts
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 🚨 报警器：如果在浏览器里读不到这两个值，直接在控制台打印错误
if (!supabaseUrl || !supabaseKey) {
  console.error("⚠️ 严重错误: 找不到 Supabase 环境变量！请务必重启 npm run dev");
}

export const supabase = createBrowserClient(supabaseUrl, supabaseKey);