-- =====================================================================
--  SISTEM REKAPITULASI PUBLIKASI SURVEI - LAN RI
--  File 1/2 : Skema, fungsi workflow, dan Row Level Security (RLS)
--  Jalankan seluruh isi file ini di Supabase > SQL Editor > New query
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. ENUM
-- ---------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum
    ('admin', 'unit_kerja', 'admin_dspk', 'deputi', 'kepala_lan', 'humas');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.survey_status as enum
    ('draft', 'menunggu_persetujuan', 'revisi', 'berjalan', 'selesai', 'ditolak');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 1. TABEL MASTER
-- ---------------------------------------------------------------------
create table if not exists public.units (
  id          serial primary key,
  kode        text not null unique,
  nama        text not null,
  aktif       boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  nama        text,
  role        public.user_role,            -- NULL = belum diaktifkan admin
  unit_id     int references public.units(id),
  aktif       boolean not null default true,
  created_at  timestamptz not null default now()
);

-- 10 tahapan siklus survei (9 tahapan kerja + Selesai)
create table if not exists public.stages (
  tahap              smallint primary key,
  kode               text not null unique,
  nama               text not null,
  pelaksana          text not null,
  butuh_persetujuan  boolean not null default false
);

insert into public.stages (tahap, kode, nama, pelaksana, butuh_persetujuan) values
  (1,  'usulan',              'Usulan Kegiatan',               'Unit Kerja',        false),
  (2,  'persetujuan_usulan',  'Persetujuan Kegiatan',          'Deputi / Kepala',   true),
  (3,  'desain',              'Penyusunan Desain Kegiatan',    'Unit Kerja',        false),
  (4,  'persetujuan_desain',  'Persetujuan Desain',            'Deputi / Kepala',   true),
  (5,  'publikasi_awal',      'Publikasi Awal',                'Unit Kerja / Humas',false),
  (6,  'pengumpulan_data',    'Pengumpulan & Analisis Data',   'Unit Kerja',        false),
  (7,  'laporan',             'Penyusunan Laporan',            'Unit Kerja',        false),
  (8,  'persetujuan_laporan', 'Persetujuan Laporan',           'Deputi / Kepala',   true),
  (9,  'publikasi_akhir',     'Publikasi Akhir',               'Humas',             false),
  (10, 'selesai',             'Selesai',                       '-',                 false)
on conflict (tahap) do update
  set kode = excluded.kode, nama = excluded.nama,
      pelaksana = excluded.pelaksana, butuh_persetujuan = excluded.butuh_persetujuan;

-- ---------------------------------------------------------------------
-- 2. TABEL TRANSAKSI
-- ---------------------------------------------------------------------
create table if not exists public.surveys (
  id                bigint generated always as identity primary key,
  judul             text not null,
  unit_id           int  not null references public.units(id),
  unit_kolaborasi   int[] not null default '{}',     -- unit lain yang ikut berkolaborasi
  jenis             text,                             -- Policy Brief, Buku, Laporan, dll.
  tahun             int  not null default extract(year from now())::int,
  klaster_1         text,
  klaster_2         text,
  deskripsi         text,
  tahap             smallint not null default 1 references public.stages(tahap),
  status            public.survey_status not null default 'draft',
  jadwal_publikasi  date,                             -- target tanggal publikasi akhir
  jadwal_label      text,                             -- label lama dari spreadsheet, mis. "Januari (1)"
  keterangan        text,
  catatan_terakhir  text,                             -- catatan review/aksi terakhir
  created_by        uuid references auth.users(id) default auth.uid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists surveys_unit_idx   on public.surveys(unit_id);
create index if not exists surveys_status_idx on public.surveys(status, tahap);
create index if not exists surveys_tahun_idx  on public.surveys(tahun);

-- Rencana jadwal per tahap (dasar kalender & reminder deadline)
create table if not exists public.survey_schedule (
  survey_id        bigint   not null references public.surveys(id) on delete cascade,
  tahap            smallint not null references public.stages(tahap),
  rencana_mulai    date,
  rencana_selesai  date,
  aktual_selesai   date,
  primary key (survey_id, tahap)
);

-- Tautan publikasi per kanal. Satu kolom boleh berisi beberapa URL (pisahkan dengan baris baru)
create table if not exists public.survey_publications (
  survey_id     bigint primary key references public.surveys(id) on delete cascade,
  jurnal        text,
  media_online  text,
  web_lan       text,
  web_unit      text,
  ig_lan        text,
  ig_unit       text,
  yt_lan        text,
  yt_unit       text,
  updated_by    uuid references auth.users(id) default auth.uid(),
  updated_at    timestamptz not null default now()
);

-- Riwayat aksi (audit trail)
create table if not exists public.survey_logs (
  id            bigint generated always as identity primary key,
  survey_id     bigint not null references public.surveys(id) on delete cascade,
  dari_tahap    smallint,
  ke_tahap      smallint,
  aksi          text not null,
  catatan       text,
  lampiran_url  text,
  actor_id      uuid references auth.users(id) default auth.uid(),
  actor_nama    text,
  actor_role    text,
  created_at    timestamptz not null default now()
);
create index if not exists survey_logs_survey_idx on public.survey_logs(survey_id, created_at desc);

create table if not exists public.announcements (
  id              bigint generated always as identity primary key,
  judul           text not null,
  isi             text not null,
  kategori        text not null default 'info' check (kategori in ('info', 'penting', 'deadline')),
  tampil_publik   boolean not null default true,
  berlaku_hingga  date,
  created_by      uuid references auth.users(id) default auth.uid(),
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. FUNGSI BANTU (dipakai di RLS)
-- ---------------------------------------------------------------------
create or replace function public.my_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and aktif
$$;

create or replace function public.my_unit() returns int
language sql stable security definer set search_path = public as $$
  select unit_id from public.profiles where id = auth.uid() and aktif
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() = 'admin', false)
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_role() is not null
$$;

-- Apakah user saat ini "pemilik" survei (unit pengusul / kolaborator / admin)
create or replace function public.owns_survey(p_unit int, p_kolab int[]) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or (public.my_role() = 'unit_kerja'
          and (p_unit = public.my_unit() or public.my_unit() = any(p_kolab)))
$$;

-- Apakah user boleh MELIHAT survei (pimpinan, humas, admin dspk melihat semua)
create or replace function public.can_view_survey(p_unit int, p_kolab int[]) returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_role() in ('admin', 'admin_dspk', 'deputi', 'kepala_lan', 'humas')
      or public.owns_survey(p_unit, p_kolab)
$$;

-- ---------------------------------------------------------------------
-- 4. TRIGGER
-- ---------------------------------------------------------------------
-- 4a. Profil otomatis saat user baru dibuat di Supabase Auth
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, nama)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data ->> 'nama', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4b. User biasa tidak boleh mengubah role / unit / status aktif dirinya sendiri
create or replace function public.guard_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;  -- SQL editor / service role / admin
  if new.role is distinct from old.role
     or new.unit_id is distinct from old.unit_id
     or new.aktif is distinct from old.aktif then
    raise exception 'Hanya admin yang dapat mengubah role, unit, atau status akun';
  end if;
  return new;
end $$;

drop trigger if exists guard_profile on public.profiles;
create trigger guard_profile before update on public.profiles
  for each row execute function public.guard_profile();

-- 4c. Survei baru oleh non-admin selalu mulai dari tahap 1 (draft)
create or replace function public.before_survey_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.tahap := 1;
    new.status := 'draft';
    new.created_by := auth.uid();
  end if;
  return new;
end $$;

drop trigger if exists before_survey_insert on public.surveys;
create trigger before_survey_insert before insert on public.surveys
  for each row execute function public.before_survey_insert();

-- 4d. Tahap / status hanya boleh berubah lewat fungsi workflow (kecuali admin)
create or replace function public.before_survey_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if (new.tahap is distinct from old.tahap or new.status is distinct from old.status)
     and coalesce(current_setting('app.workflow', true), '') <> 'on'
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Perubahan tahap/status harus melalui tombol aksi workflow';
  end if;
  return new;
end $$;

drop trigger if exists before_survey_update on public.surveys;
create trigger before_survey_update before update on public.surveys
  for each row execute function public.before_survey_update();

-- ---------------------------------------------------------------------
-- 5. FUNGSI WORKFLOW (dipanggil dari web: supabase.rpc('survey_action', ...))
--    Aksi:
--      ajukan    : unit kerja mengajukan di tahap 1 / 3 / 7  -> tahap persetujuan
--      setujui   : deputi / kepala LAN menyetujui tahap 2 / 4 / 8 -> tahap berikutnya
--      revisi    : pimpinan minta revisi -> kembali ke tahap sebelumnya (status revisi)
--      tolak     : pimpinan menolak (status ditolak)
--      lanjut    : tahap 5->6, 6->7 (unit kerja/humas), 9->10 selesai (humas)
--      catatan   : menambahkan catatan tanpa pindah tahap
-- ---------------------------------------------------------------------
create or replace function public.survey_action(
  p_survey_id bigint,
  p_aksi      text,
  p_catatan   text default null,
  p_lampiran  text default null
) returns public.surveys
language plpgsql security definer set search_path = public as $$
declare
  s           public.surveys;
  v_role      public.user_role := public.my_role();
  v_nama      text;
  v_owner     boolean;
  v_pimpinan  boolean;
  v_tahap     smallint;
  v_status    public.survey_status;
begin
  if v_role is null then
    raise exception 'Akun Anda belum memiliki role. Hubungi admin.';
  end if;

  select * into s from public.surveys where id = p_survey_id for update;
  if not found then raise exception 'Survei tidak ditemukan'; end if;

  select nama into v_nama from public.profiles where id = auth.uid();
  v_owner    := public.owns_survey(s.unit_id, s.unit_kolaborasi);
  v_pimpinan := v_role in ('admin', 'deputi', 'kepala_lan');
  v_tahap    := s.tahap;
  v_status   := s.status;

  if s.status in ('selesai', 'ditolak') and p_aksi <> 'catatan' then
    raise exception 'Survei sudah %, tidak dapat diproses lagi', s.status;
  end if;

  case p_aksi
    when 'ajukan' then
      if not v_owner then raise exception 'Hanya unit pengusul yang dapat mengajukan'; end if;
      if s.tahap not in (1, 3, 7) or s.status not in ('draft', 'revisi', 'berjalan') then
        raise exception 'Survei tidak dapat diajukan pada tahap ini';
      end if;
      v_tahap := s.tahap + 1;
      v_status := 'menunggu_persetujuan';

    when 'setujui' then
      if not v_pimpinan then raise exception 'Hanya Deputi / Kepala LAN yang dapat menyetujui'; end if;
      if s.tahap not in (2, 4, 8) or s.status <> 'menunggu_persetujuan' then
        raise exception 'Survei tidak sedang menunggu persetujuan';
      end if;
      v_tahap := s.tahap + 1;
      v_status := 'berjalan';

    when 'revisi' then
      if not v_pimpinan then raise exception 'Hanya Deputi / Kepala LAN yang dapat meminta revisi'; end if;
      if s.tahap not in (2, 4, 8) or s.status <> 'menunggu_persetujuan' then
        raise exception 'Survei tidak sedang menunggu persetujuan';
      end if;
      if coalesce(trim(p_catatan), '') = '' then raise exception 'Catatan revisi wajib diisi'; end if;
      v_tahap := s.tahap - 1;
      v_status := 'revisi';

    when 'tolak' then
      if not v_pimpinan then raise exception 'Hanya Deputi / Kepala LAN yang dapat menolak'; end if;
      if s.status <> 'menunggu_persetujuan' then raise exception 'Survei tidak sedang menunggu persetujuan'; end if;
      if coalesce(trim(p_catatan), '') = '' then raise exception 'Alasan penolakan wajib diisi'; end if;
      v_status := 'ditolak';

    when 'lanjut' then
      if s.status <> 'berjalan' then raise exception 'Survei tidak dalam status berjalan'; end if;
      if s.tahap = 5 and (v_owner or v_role = 'humas') then
        v_tahap := 6;
      elsif s.tahap = 6 and v_owner then
        v_tahap := 7;
      elsif s.tahap = 9 and v_role in ('humas', 'admin') then
        v_tahap := 10;
        v_status := 'selesai';
      else
        raise exception 'Aksi lanjut tidak diizinkan untuk role/tahap ini';
      end if;

    when 'catatan' then
      if not public.can_view_survey(s.unit_id, s.unit_kolaborasi) then
        raise exception 'Tidak memiliki akses ke survei ini';
      end if;
      if coalesce(trim(p_catatan), '') = '' then raise exception 'Catatan kosong'; end if;

    else
      raise exception 'Aksi tidak dikenal: %', p_aksi;
  end case;

  -- catat riwayat dulu (s.tahap masih tahap lama)
  insert into public.survey_logs
    (survey_id, dari_tahap, ke_tahap, aksi, catatan, lampiran_url, actor_id, actor_nama, actor_role)
  values
    (s.id, s.tahap, v_tahap, p_aksi, nullif(trim(p_catatan), ''), nullif(trim(p_lampiran), ''),
     auth.uid(), v_nama, v_role::text);

  -- tandai tahap lama selesai bila maju
  if p_aksi in ('ajukan', 'setujui', 'lanjut') then
    insert into public.survey_schedule (survey_id, tahap, aktual_selesai)
    values (s.id, s.tahap, current_date)
    on conflict (survey_id, tahap) do update set aktual_selesai = current_date;
  end if;

  perform set_config('app.workflow', 'on', true);

  update public.surveys
     set tahap = v_tahap,
         status = v_status,
         catatan_terakhir = coalesce(nullif(trim(p_catatan), ''), catatan_terakhir)
   where id = s.id
   returning * into s;

  perform set_config('app.workflow', 'off', true);
  return s;
end $$;

revoke all on function public.survey_action(bigint, text, text, text) from public, anon;
grant execute on function public.survey_action(bigint, text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 6. VIEW
-- ---------------------------------------------------------------------
-- 6a. Data publik untuk dashboard rekap (tanpa catatan internal, tanpa draft/ditolak)
create or replace view public.public_surveys as
select s.id, s.judul, s.jenis, s.tahun, s.klaster_1, s.klaster_2,
       s.tahap, st.nama as tahap_nama, s.status,
       s.jadwal_publikasi, s.jadwal_label, s.updated_at,
       u.kode as unit_kode, u.nama as unit_nama,
       coalesce((select array_agg(k.kode order by k.kode) from public.units k
                  where k.id = any(s.unit_kolaborasi)), '{}') as kolaborasi_kode,
       p.jurnal, p.media_online, p.web_lan, p.web_unit,
       p.ig_lan, p.ig_unit, p.yt_lan, p.yt_unit
  from public.surveys s
  join public.units  u  on u.id = s.unit_id
  join public.stages st on st.tahap = s.tahap
  left join public.survey_publications p on p.survey_id = s.id
 where s.status not in ('draft', 'ditolak');

-- 6b. Reminder deadline tahap berjalan (mengikuti RLS user yang login)
create or replace view public.v_reminders with (security_invoker = true) as
select s.id as survey_id, s.judul, s.unit_id, u.kode as unit_kode,
       s.tahap, st.nama as tahap_nama, s.status,
       sc.rencana_selesai as deadline,
       (sc.rencana_selesai - current_date) as sisa_hari
  from public.surveys s
  join public.units u   on u.id = s.unit_id
  join public.stages st on st.tahap = s.tahap
  join public.survey_schedule sc on sc.survey_id = s.id and sc.tahap = s.tahap
 where s.status not in ('selesai', 'ditolak')
   and sc.rencana_selesai is not null;

-- ---------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.units               enable row level security;
alter table public.profiles            enable row level security;
alter table public.stages              enable row level security;
alter table public.surveys             enable row level security;
alter table public.survey_schedule     enable row level security;
alter table public.survey_publications enable row level security;
alter table public.survey_logs         enable row level security;
alter table public.announcements       enable row level security;

-- helper: hapus policy lama agar file ini bisa dijalankan ulang
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- units & stages: semua boleh baca, hanya admin yang mengubah
create policy units_read   on public.units  for select using (true);
create policy units_admin  on public.units  for all using (public.is_admin()) with check (public.is_admin());
create policy stages_read  on public.stages for select using (true);

-- profiles
create policy profiles_read_self  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update     on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy profiles_admin_del  on public.profiles for delete to authenticated using (public.is_admin());

-- surveys
create policy surveys_read on public.surveys for select to authenticated
  using (public.can_view_survey(unit_id, unit_kolaborasi));
create policy surveys_insert on public.surveys for insert to authenticated
  with check (public.is_admin() or (public.my_role() = 'unit_kerja' and unit_id = public.my_unit()));
create policy surveys_update on public.surveys for update to authenticated
  using (public.is_admin()
         or (public.owns_survey(unit_id, unit_kolaborasi) and status in ('draft', 'revisi', 'berjalan')))
  with check (public.is_admin() or public.owns_survey(unit_id, unit_kolaborasi));
create policy surveys_delete on public.surveys for delete to authenticated
  using (public.is_admin() or (public.owns_survey(unit_id, unit_kolaborasi) and status = 'draft'));

-- survey_schedule
create policy schedule_read on public.survey_schedule for select to authenticated
  using (exists (select 1 from public.surveys s where s.id = survey_id));
create policy schedule_write on public.survey_schedule for all to authenticated
  using (exists (select 1 from public.surveys s where s.id = survey_id
                  and public.owns_survey(s.unit_id, s.unit_kolaborasi)))
  with check (exists (select 1 from public.surveys s where s.id = survey_id
                  and public.owns_survey(s.unit_id, s.unit_kolaborasi)));

-- survey_publications (humas, admin, dan unit pemilik boleh mengisi tautan)
create policy pub_read on public.survey_publications for select to authenticated
  using (exists (select 1 from public.surveys s where s.id = survey_id));
create policy pub_write on public.survey_publications for all to authenticated
  using (public.my_role() in ('admin', 'humas')
         or exists (select 1 from public.surveys s where s.id = survey_id
                     and public.owns_survey(s.unit_id, s.unit_kolaborasi)))
  with check (public.my_role() in ('admin', 'humas')
         or exists (select 1 from public.surveys s where s.id = survey_id
                     and public.owns_survey(s.unit_id, s.unit_kolaborasi)));

-- survey_logs: hanya baca; penulisan lewat fungsi survey_action
create policy logs_read on public.survey_logs for select to authenticated
  using (exists (select 1 from public.surveys s where s.id = survey_id));

-- announcements
create policy ann_read_public on public.announcements for select
  using ((tampil_publik and (berlaku_hingga is null or berlaku_hingga >= current_date))
         or public.is_staff());
create policy ann_write on public.announcements for all to authenticated
  using (public.my_role() in ('admin', 'admin_dspk'))
  with check (public.my_role() in ('admin', 'admin_dspk'));

-- ---------------------------------------------------------------------
-- 8. HAK AKSES TABEL/VIEW
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on public.public_surveys to anon, authenticated;
grant select on public.v_reminders to authenticated;
revoke all on public.surveys, public.survey_schedule, public.survey_publications,
              public.survey_logs, public.profiles from anon;

-- =====================================================================
-- SELESAI. Lanjutkan dengan file 02_seed.sql
-- =====================================================================
