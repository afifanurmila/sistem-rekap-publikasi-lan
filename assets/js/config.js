// =====================================================================
//  KONFIGURASI SUPABASE
//  Ambil dari Supabase Dashboard > Project Settings > API
//  - SUPABASE_URL      : "Project URL"
//  - SUPABASE_ANON_KEY : "anon public" key  (AMAN dipakai di browser,
//                        karena akses data dijaga oleh Row Level Security)
//
//  JANGAN PERNAH menaruh "service_role" key di file ini!
//  service_role hanya disimpan di Vercel > Settings > Environment Variables.
// =====================================================================
export const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
export const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";
