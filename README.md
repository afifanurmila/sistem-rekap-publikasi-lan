# SIREKAP Publikasi & Monitoring Survei — LAN RI

Sistem Rekapitulasi Publikasi dan Manajemen Siklus Hidup Survei (Pipeline 9 Tahapan) untuk Lembaga Administrasi Negara Republik Indonesia (LAN RI), terintegrasi dengan database **Supabase (PostgreSQL)** dan siap di-deploy ke **Vercel**.

---

## 📁 Struktur Direktori

```text
├── index.html               # Dashboard publik (grafik, pipeline, KPI, kalender, rekap)
├── login.html               # Halaman login portal multi-role
├── portal.html              # Portal aplikasi internal (SPA hash-routed)
├── vercel.json              # Konfigurasi deployment Vercel
├── package.json             # Dependensi serverless function
├── run_local.py             # Script runner server lokal (Python)
├── api/
│   └── create-user.js       # Serverless function Vercel untuk Admin membuat user baru
├── assets/
│   ├── css/
│   │   └── style.css        # Desain antarmuka modern & responsif (LAN RI Theme)
│   └── js/
│       ├── config.js        # Konfigurasi SUPABASE_URL & SUPABASE_ANON_KEY
│       ├── lib.js           # Client Supabase, helper format, tahapan, modal, toast
│       ├── calendar.js      # Komponen kalender jadwal publikasi & deadline (Bulanan & Tahunan)
│       ├── dashboard.js     # Logika dashboard publik, chart, & filter
│       └── portal.js        # Logika portal internal dengan RBAC (Unit Kerja, Pimpinan, Humas, DSPK)
├── supabase/
│   ├── 01_schema.sql        # Skema lengkap PostgreSQL, Enum, RLS, Trigger, & Stored Procedure Workflow
│   └── 02_seed.sql          # Data awal: Master Unit & Migrasi 50 survei dari Google Spreadsheet (beserta tautan aktif)
└── tools/
    └── generate_seed.py     # Script generator migrasi otomatis dari Google Spreadsheet ke 02_seed.sql
```

---

## 🚀 Panduan Setup Langkah Demi Langkah

### Langkah 1: Siapkan Database di Supabase
1. Masuk ke [supabase.com](https://supabase.com) dan buat proyek baru (pilih Region: **Singapore**).
2. Buka menu **SQL Editor** > **New query**.
3. Buka file `supabase/01_schema.sql`, salin seluruh isinya, tempel ke SQL Editor Supabase, lalu klik **Run**.
4. Setelah selesai, buka file `supabase/02_seed.sql`, salin seluruh isinya, tempel ke SQL Editor Supabase, lalu klik **Run**.
   *(50 data survei dari sheet AnalisisSuvei 2026 dan master unit kerja akan otomatis masuk ke database).*

---

### Langkah 2: Buat Akun Admin Pertama
1. Di dashboard Supabase, buka menu **Authentication** > **Users** > klik **Add user** > **Create user**.
2. Masukkan email dan password Anda (misal: `admin@lan.go.id`). Centang **Auto Confirm User**.
3. Buka menu **SQL Editor**, jalankan query berikut untuk memberikan hak akses `admin`:
   ```sql
   update public.profiles
   set role = 'admin', aktif = true, nama = 'Administrator Utama'
   where email = 'admin@lan.go.id';
   ```
4. Akun Admin Anda sekarang sudah aktif dan dapat mengelola seluruh menu, menambah pengguna lain, serta menyetujui usulan.

---

### Langkah 3: Konfigurasi Frontend
1. Di dashboard Supabase, buka **Project Settings** > **API**.
2. Salin **Project URL** dan **anon public key**.
3. Buka file `assets/js/config.js` di proyek ini, perbarui nilainya:
   ```javascript
   export const SUPABASE_URL = "https://xxxxxx.supabase.co";
   export const SUPABASE_ANON_KEY = "eyJh......";
   ```

---

### Langkah 4: Uji Coba Secara Lokal
Jalankan file `run_local.py` menggunakan Python:
```powershell
python run_local.py
```
Browser akan otomatis terbuka di `http://localhost:3000`:
- **Dashboard Publik**: langsung dapat diakses tanpa login.
- **Login Portal**: klik tombol **Masuk Portal** di pojok kanan atas, lalu login menggunakan akun admin yang telah Anda buat di Langkah 2.

---

### Langkah 5: Deploy ke Vercel
1. Buat repository di GitHub, lalu push kode sistem ini:
   ```bash
   git init
   git add .
   git commit -m "Initial commit SIREKAP LAN RI"
   git remote add origin <URL_REPO_GITHUB_ANDA>
   git push -u origin main
   ```
2. Buka dashboard [vercel.com](https://vercel.com) > klik **Add New...** > **Project** > Import repositori GitHub Anda.
3. Di bagian **Environment Variables** Vercel, tambahkan 3 variabel berikut:
   - `SUPABASE_URL` = URL proyek Supabase Anda.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Kunci `anon public` Supabase Anda.
   - `SUPABASE_SERVICE_ROLE_KEY` = Kunci `service_role` Supabase Anda *(didapat dari Supabase Project Settings > API > service_role secret. Kunci ini aman di Vercel untuk API pembuatan akun).*
4. Klik **Deploy**. Aplikasi Anda langsung online!

---

## 👥 Role & Alur Kerja (Workflow)

| Role | Menu & Hak Akses Utama |
|---|---|
| **Admin** | Memiliki akses penuh ke seluruh menu, manajemen user, master unit kerja, dan approval. |
| **Unit Kerja** (SKPP, DAPKK, SKMP, SKTAN, STIA, dll.) | Membuat Usulan Survei baru, mengisi target jadwal, mengunggah laporan/desain, dan mengajukan approval. |
| **Pimpinan** (Deputi & Kepala LAN) | Menu khusus **Persetujuan (ACC)** satu klik untuk menyetujui, meminta revisi dengan catatan, atau menolak. |
| **Humas** | Memantau survei siap rilis, mengisi tautan multi-kanal (Web, IG, YouTube, Jurnal, Media Online), dan mempublikasikan hasil akhir. |
| **Admin DSPK2AN** | Monitoring dan mempublikasikan **Pengumuman** ke dashboard publik maupun portal internal. |
