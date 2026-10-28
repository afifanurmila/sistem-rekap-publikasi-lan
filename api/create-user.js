// Vercel Serverless Function: /api/create-user
// Memungkinkan Admin membuat user baru secara langsung menggunakan service_role key
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ 
      error: "Konfigurasi server belum lengkap. Pastikan SUPABASE_SERVICE_ROLE_KEY dan SUPABASE_URL terpasang di Vercel Environment Variables." 
    });
  }

  // 1. Verifikasi token admin yang melakukan request
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Token otentikasi tidak ditemukan" });
  }
  const token = authHeader.replace(/^Bearer\s+/i, "");

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(token);
  if (callerError || !caller) {
    return res.status(401).json({ error: "Sesi admin tidak valid atau telah kedaluwarsa" });
  }

  // Cek apakah pemanggil adalah role admin
  const { data: profileCaller, error: profError } = await supabaseAdmin
    .from("profiles")
    .select("role, aktif")
    .eq("id", caller.id)
    .single();

  if (profError || !profileCaller || profileCaller.role !== "admin" || !profileCaller.aktif) {
    return res.status(403).json({ error: "Hanya akun dengan role Admin yang diizinkan membuat user baru" });
  }

  // 2. Baca payload data user baru
  const { email, password, nama, role, unit_id } = req.body || {};
  if (!email || !password || !role) {
    return res.status(400).json({ error: "Email, password, dan role wajib diisi" });
  }

  try {
    // 3. Buat user di auth.users Supabase
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nama }
    });

    if (createError) {
      return res.status(400).json({ error: createError.message });
    }

    // 4. Update data profile yang baru dibuat (trigger handle_new_user sudah menginsert row profil awal)
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        nama: nama || email.split("@")[0],
        role,
        unit_id: unit_id || null,
        aktif: true
      })
      .eq("id", newUser.user.id);

    if (updateError) {
      return res.status(500).json({ error: "User berhasil dibuat tetapi gagal mengatur profil: " + updateError.message });
    }

    return res.status(200).json({ success: true, user: newUser.user });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Terjadi kesalahan internal" });
  }
}
