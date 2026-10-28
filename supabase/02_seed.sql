-- =====================================================================
--  File 2/2 : Data awal (master unit + migrasi data spreadsheet)
--  Dibuat otomatis oleh tools/generate_seed.py - jangan diedit manual
--  Jumlah survei: 50
-- =====================================================================

insert into public.units (kode, nama) values
  ('SKPP', 'SKPP'),
  ('SKMP', 'SKMP'),
  ('SKMK', 'SKMK'),
  ('SKTAN', 'SKTAN'),
  ('DAPKK', 'DAPKK'),
  ('DSPK2AN', 'DSPK2AN'),
  ('STIA JKT', 'Politeknik STIA LAN Jakarta'),
  ('STIA BDG', 'Politeknik STIA LAN Bandung'),
  ('STIA MKS', 'Politeknik STIA LAN Makassar')
on conflict (kode) do nothing;

do $seed$
declare v_id bigint;
begin
  if exists (select 1 from public.surveys) then
    raise notice 'Tabel surveys sudah berisi data, seed dilewati';
    return;
  end if;

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Survei Optimalisasi Akses Layanan Kesehatan', (select id from public.units where kode = 'SKPP'), '{}', null, 2025, 'Prioritas Presiden', null, 10, 'selesai', null, '2025', null)
  returning id into v_id;
  insert into public.survey_publications (survey_id, web_lan, web_unit, ig_unit) values (v_id, 'https://lan.go.id/penguatan-kebijakan-pelayanan-publik-untuk-optimalisasi-akses-dan-kualitas-pelayanan-kesehatan-di-daerah', 'https://mediaindonesia.com/nusantara/789368/policy-paper-dorong-pemerataan-akses-dan-kualitas-layanan-kesehatan-daerah', 'https://www.instagram.com/p/DL1pkJQSxyy/?img_index=1');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Survei Disrupsi Pekerjaan dan Keterampilan Strategis (Top Skills ASN)', (select id from public.units where kode = 'DAPKK'), '{}', null, 2025, 'Tata Kelola & Manajemen ASN', null, 10, 'selesai', null, '2025', null)
  returning id into v_id;
  insert into public.survey_publications (survey_id, web_lan, web_unit, ig_unit, yt_lan) values (v_id, 'https://lan.go.id/future-skills-outlook-for-asn-survei-disrupsi-dan-keterampilan-masa-depan-asn', 'https://www.kompas.id/artikel/asn-di-tengah-gempuran-teknologi-dan-ai?utm_source=whatsapp&utm_medium=shared&utm_campaign=tpd_-_website_traffic', 'https://www.instagram.com/p/DLr81wgR3v8/?img_index=1', 'https://youtu.be/YjgvJKFJOhY?si=CY9Bi4cYiKA5igAu');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Survei Indeks Kesehatan Organisasi (OHI)', (select id from public.units where kode = 'SKMP'), '{}', null, 2025, 'Tata Kelola & Manajemen ASN', null, 10, 'selesai', null, '2025', null)
  returning id into v_id;
  insert into public.survey_publications (survey_id, web_lan, web_unit, ig_unit, yt_unit) values (v_id, 'https://lan.go.id/laporan-hasil-survei-organizational-health-index-ohi-tahun-2025', 'https://mediaindonesia.com/nusantara/810118/lan-ri-mayoritas-birokrasi-daerah-indonesia-tergolong-sehat-beberapa-capai-sangat-sehat', 'https://www.instagram.com/p/DOC54DnkfBE/?igsh=MWZ2anp6cnFyaTVsNg==', 'https://youtu.be/J_NgDWb9bbw?si=grFl_zRJDu1aeKll');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Kemudahan Penanaman Modal di Daerah', (select id from public.units where kode = 'SKPP'), '{}', null, 2025, 'Prioritas Presiden', null, 10, 'selesai', null, '2025', null)
  returning id into v_id;
  insert into public.survey_publications (survey_id, web_lan, web_unit) values (v_id, 'https://lan.go.id/menguatkan-layanan-guna-memacu-investasi-di-daerah', 'https://jurnalpost.com/survei-kemudahan-berusaha-di-daerah-693-pelaku-usaha-suarakan-peluang-dan-hambatan-investasi/85561/');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Implementasi Penerapan Manajemen Talenta di Lingkungan Pemerintah Daerah Provinsi / Kabupaten / Kota di Indonesia', (select id from public.units where kode = 'SKTAN'), '{}', null, 2025, 'Tata Kelola & Manajemen ASN', null, 10, 'selesai', null, '2025', null)
  returning id into v_id;
  insert into public.survey_publications (survey_id, web_lan, web_unit, ig_unit, yt_unit) values (v_id, 'https://lan.go.id/laporan-survei-implementasi-manajemen-talenta', 'https://mediaindonesia.com/jabar/berita/820603/survei-lan-penerapan-manajemen-talenta-di-pemda-berjalan-lamban', 'https://www.instagram.com/p/DPVMvtxj7jb/?igsh=ZGxwMnRkY2N6a3cz', 'https://www.youtube.com/watch?v=X4rrLqsCaF0&t=243s');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Survei Birokrasi Melayani Outlook', (select id from public.units where kode = 'STIA JKT'), array(select id from public.units where kode in ('STIA MKS', 'STIA BDG')), null, 2025, 'Pelayanan Publik', null, 10, 'selesai', null, '2025', null)
  returning id into v_id;
  insert into public.survey_publications (survey_id, web_unit) values (v_id, 'https://jabar.tribunnews.com/kampus-360/1150623/lan-luncurkan-birokrasi-melayani-outlook-2025-perkuat-transformasi-pelayanan-publik');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Survei Future Jobs and Skills Sektor Ketahanan Pangan', (select id from public.units where kode = 'DAPKK'), '{}', null, 2025, 'Prioritas Presiden', null, 10, 'selesai', null, '2025', null)
  returning id into v_id;
  insert into public.survey_publications (survey_id, web_lan) values (v_id, 'https://lan.go.id/survei-future-jobs-and-skill-di-bidang-ketahanan-pangan-pertanian');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Survei Efektivitas Kinerja Jabatan Fungsional', (select id from public.units where kode = 'SKMK'), '{}', null, 2025, 'Tata Kelola & Manajemen ASN', null, 10, 'selesai', null, '2025', null)
  returning id into v_id;
  insert into public.survey_publications (survey_id, web_lan, web_unit, ig_unit) values (v_id, 'https://lan.go.id/efektivitas-kinerja-jabatan-fungsional-aparatur-sipil-negara', 'https://publikupdate.com/temuan-survei-nasional-dari-lan-ri-jadi-basis-kebijakan-untuk-dongkrak-kompetensi-dan-kinerja-asn/', 'https://www.instagram.com/p/DQq1kgykeuv/?igsh=eG9pZWRtZnNpdGo5');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('“Customer Journey” Pelayanan Publik Instansi Pemerintah', (select id from public.units where kode = 'SKPP'), '{}', null, 2025, 'Pelayanan Publik', null, 10, 'selesai', null, '2025', null)
  returning id into v_id;
  insert into public.survey_publications (survey_id, web_lan, web_unit) values (v_id, 'https://lan.go.id/survei-spmb-tingkat-sma-sebuah-survei-customer-journey', 'https://www.prokal.co/kalimantan-timur/1776885705/survey-customer-journey-spmb-2025-dari-lan-akses-informasi-bikin-bingung-pengaduan-nihil');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Persepsi Masyarakat dan Birokrasi terhadap kompetensi dan nilai ASN', (select id from public.units where kode = 'SKTAN'), '{}', null, 2025, 'Tata Kelola & Manajemen ASN', null, 10, 'selesai', null, '2025', null)
  returning id into v_id;
  insert into public.survey_publications (survey_id, web_unit) values (v_id, 'https://jakarta.suaramerdeka.com/nasional/13416086400/hasil-survei-lan-integritas-dan-akuntabilitas-jadi-fondasi-utama-birokrasi-masa-depan');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Survei Produktivitas Sektor Publik Pertanian dengan Pendekatan APO (Tanaman Padi dan Jagung)', (select id from public.units where kode = 'DAPKK'), '{}', null, 2025, 'Prioritas Presiden', null, 10, 'selesai', null, '2025', null)
  returning id into v_id;
  insert into public.survey_publications (survey_id, web_lan) values (v_id, 'https://lan.go.id/pengukuran-produktivitas-sektor-publik-studi-kasus-sektor-pertanian-fokus-tanaman-padi-dan-jagung');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Survei Strategi Peningkatan Tata Kelola BUMDes berdasarkan potensi dan karakteristik wilayah', (select id from public.units where kode = 'SKMP'), '{}', null, 2025, 'Prioritas Presiden', null, 10, 'selesai', null, '2025', null)
  returning id into v_id;
  insert into public.survey_publications (survey_id, web_lan, web_unit, ig_unit, yt_unit) values (v_id, 'https://makassar.lan.go.id/laporan-kajian-strategi-peningkatan-tata-kelola-bumdes-berdasarkan-karakteristik-dan-potensi-wilayah/', 'https://mediaindonesia.com/nusantara/838149/penguatan-tata-kelola-bumdes-menuju-kemandirian-ekonomi-desa', 'https://www.instagram.com/p/DR_hYQLkSXR/?igsh=OTdoaWY3MW83NWQ=', 'https://youtu.be/KZWeXlXTj18?si=QqZsfZhozyD25Tdn');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Survei Strategi Peningkatan Kinerja ASN di Era Efisiensi Anggaran', (select id from public.units where kode = 'SKMK'), '{}', null, 2025, 'Tata Kelola & Manajemen ASN', null, 10, 'selesai', null, '2025', null)
  returning id into v_id;
  insert into public.survey_publications (survey_id, web_lan, web_unit) values (v_id, 'https://lan.go.id/melampaui-sekadar-penghematan-strategi-optimalisasi-kinerja-asn-di-era-efisiensi-anggaran', 'https://publikupdate.com/survei-nasional-lan-ri-ungkap-tantangan-dan-peluang-optimalisasi-layanan-publik-era-efesiensi-anggaran/');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Flexible Working Arrangement untuk Pegawai Perempuan ASN dan Swasta', (select id from public.units where kode = 'STIA JKT'), '{}', 'Jurnal/Penelitian Kolaborasi', 2025, 'Tata Kelola & Manajemen ASN', null, 9, 'berjalan', null, '2025', 'Materi sudah dipaparkan di depan DFT Australia. Sudah coba dikirim ke jurnal tapi belum diterima')
  returning id into v_id;

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Ekosistem Inovasi', (select id from public.units where kode = 'DAPKK'), '{}', 'Buku', 2025, 'Digitalisasi', null, 10, 'selesai', null, '2025', null)
  returning id into v_id;
  insert into public.survey_publications (survey_id, web_lan) values (v_id, 'https://lan.go.id/buku-referensi-pembelajaran-ekosistem-inovasi-pelayanan-publik');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Survei persepsi alumni terkait dampak pelatihan kepemimpinan terhadap manajemen karir', (select id from public.units where kode = 'SKTAN'), '{}', 'Jurnal/Penelitian', 2026, 'Tata Kelola & Manajemen ASN', null, 10, 'selesai', '2026-01-07', 'Januari (1)', 'Selesai
dengan publikasi di Prosiding dan youtube')
  returning id into v_id;
  insert into public.survey_publications (survey_id, web_lan, web_unit, yt_lan, yt_unit) values (v_id, 'https://lan.go.id/menjembatani-pelatihan-kepemimpinan-dan-karier-dalam-manajemen-talenta-asn-mengintegrasikan-hasil-pelatihan-ke-dalam-manajemen-talenta-asn', 'https://knia.stialanbandung.ac.id/index.php/knia/article/view/1192', 'https://www.youtube.com/watch?v=4QYu8ENe0PY', 'https://www.youtube.com/watch?v=4QYu8ENe0PY');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Survey Budaya Kerja ASN', (select id from public.units where kode = 'STIA BDG'), '{}', 'Laporan', 2026, 'Tata Kelola & Manajemen ASN', null, 10, 'selesai', '2026-01-28', 'Januari (4)', 'Selesai
dengan publikasi di website lan dan podcast di youtube Poltek')
  returning id into v_id;
  insert into public.survey_publications (survey_id, web_lan, yt_unit) values (v_id, 'https://lan.go.id/hasil-survey-internalisasi-nilai-asn-berakhlak-sebagai-upaya-penguatan-budaya-kerja-adaptif-di-lingkungan-instansi-pemerintah', 'https://www.youtube.com/watch?v=3rf8AVxhOdw');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Survei Kesiapan Pemerintah Desa/Kelurahan dalam Mengelola Koperasi Merah Putih', (select id from public.units where kode = 'STIA MKS'), '{}', 'Policy Paper', 2026, 'Prioritas Presiden', null, 10, 'selesai', '2026-02-21', 'Februari (3)', 'Selesai
 dengan publikasi di website Poltek dan Podcast di LAN dan Poltek')
  returning id into v_id;
  insert into public.survey_publications (survey_id, web_unit, yt_lan, yt_unit) values (v_id, 'https://politeknik.stialanmakassar.ac.id/strategi-akselerasi-kinerja-koperasi-desa-merah-putih/', 'https://youtu.be/1m_WN1ll-Uo', 'https://youtu.be/1m_WN1ll-Uo');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Survei Indonesia Leadership Outlook 2026', (select id from public.units where kode = 'DSPK2AN'), '{}', 'Laporan', 2026, 'Digitalisasi', null, 10, 'selesai', '2026-02-28', 'Februari (4)', 'Selesai
 dengan publikasi di Website LAN, Instagram LAN & D1 (Infografis & Podcast), dan Youtube LAN (Podcast)')
  returning id into v_id;
  insert into public.survey_publications (survey_id, web_lan, web_unit, ig_lan, ig_unit, yt_lan, yt_unit) values (v_id, 'https://lan.go.id/indonesia-leadership-outlook-2026', 'https://lan.go.id/indonesia-leadership-outlook-2026', 'https://www.instagram.com/reels/DYHOoeLJYdd/', 'https://www.instagram.com/reels/DYHOoeLJYdd/', 'https://www.youtube.com/watch?v=DGD73qhfO4s', 'https://www.youtube.com/watch?v=DGD73qhfO4s');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Difusi Inovasi', (select id from public.units where kode = 'STIA BDG'), '{}', 'Policy Brief', 2026, 'Digitalisasi', null, 10, 'selesai', '2026-03-07', 'Maret (1)', 'Selesai
 dengan publikasi di Website LAN dan Youtube LAN & Poltek (Podcast)')
  returning id into v_id;
  insert into public.survey_publications (survey_id, web_lan, yt_lan, yt_unit) values (v_id, 'https://lan.go.id/menutup-kesenjangan-literasi-digital-asn-arah-kebijakan-pengembangan-kompetensi-digital', 'https://www.youtube.com/watch?v=mZkD-Hg70z8', 'https://www.youtube.com/watch?v=mZkD-Hg70z8');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Desain kelembagaan pengentasan kemiskinan', (select id from public.units where kode = 'DAPKK'), '{}', 'Buku', 2026, 'Prioritas Presiden', null, 10, 'selesai', '2026-03-28', 'Maret (4)', 'Selesai
 dengan publikasi di Website LAN, Instagram LAN & D1 (Podcast), dan Youtube LAN (Podcast)')
  returning id into v_id;
  insert into public.survey_publications (survey_id, web_lan, web_unit, ig_lan, ig_unit, yt_lan, yt_unit) values (v_id, 'https://lan.go.id/blueprint-desain-kelembagaan-pengentasan-kemiskinan', 'https://lan.go.id/blueprint-desain-kelembagaan-pengentasan-kemiskinan', 'https://www.instagram.com/reels/DXBntX3guq-/', 'https://www.instagram.com/reels/DXBntX3guq-/', 'https://www.youtube.com/watch?v=dSY0oAlWA0w', 'https://www.youtube.com/watch?v=dSY0oAlWA0w');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Kesiapan dan kebutuhan kompetensi ASN muda dalam mendukung komponen cadangan pertahanan negara', (select id from public.units where kode = 'SKMP'), '{}', 'Artikel', 2026, 'Tata Kelola & Manajemen ASN', null, 10, 'selesai', '2026-04-07', 'April (1)', 'Selesai
 dengan publikasi di Website (Media Berita Online) dan Youtube LAN dan Pusjar (Podcast)')
  returning id into v_id;
  insert into public.survey_publications (survey_id, web_unit, yt_lan, yt_unit) values (v_id, 'https://harian.fajar.co.id/2026/06/29/menakar-kesiapan-asn-dalam-mendukung-pertahanan-negara-melalui-program-komcad/', 'https://youtu.be/VBzMqhqXKqA?feature=shared', 'https://youtu.be/VBzMqhqXKqA?feature=shared');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Efektifitas layanan call center di daerah', (select id from public.units where kode = 'SKPP'), '{}', 'Policy Paper', 2026, 'Pelayanan Publik', null, 10, 'selesai', '2026-04-21', 'April (3)', 'Selesai
 dengan publikasi di Website Pusjar & Online (Media Indonesia), Instagram Pusjar (Podcast), dan Youtube LAN & Pusjar (Podcast)')
  returning id into v_id;
  insert into public.survey_publications (survey_id, web_lan, web_unit, ig_unit, yt_lan, yt_unit) values (v_id, 'https://lan.go.id/efektivitas-layanan-hotline-kedaruratan-112-di-indonesia', 'https://mediaindonesia.com/humaniora/894112/layanan-darurat-112-di-indonesia-masih-terkendala-integrasi-dan-respons', 'https://www.instagram.com/reel/DXv7MnYo_8s/?igsh=MXIwenBsczN1a256bw==', 'https://youtu.be/KLxjFuQJrvI?si=gbza9sYrT8LvTz-R', 'https://youtu.be/KLxjFuQJrvI?si=gbza9sYrT8LvTz-R');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Survei Resiliensi ASN dalam situasi Krisis Bencana', (select id from public.units where kode = 'SKMK'), '{}', null, 2026, 'Tata Kelola & Manajemen ASN', null, 10, 'selesai', '2026-05-14', 'Mei (2)', 'Selesai
Sudah disusun policy brief')
  returning id into v_id;

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Monitoring dan Evaluasi Sekolah Rakyat', (select id from public.units where kode = 'DAPKK'), '{}', 'Buku', 2026, 'Prioritas Presiden', null, 10, 'selesai', '2026-05-28', 'Mei (4)', 'Selesai
dengan publikasi di Website LAN dan Youtube LAN (Podcast)')
  returning id into v_id;
  insert into public.survey_publications (survey_id, web_lan, web_unit, yt_lan, yt_unit) values (v_id, 'https://lan.go.id/monitoring-dan-evaluasi-sekolah-rakyat-2025', 'https://lan.go.id/monitoring-dan-evaluasi-sekolah-rakyat-2025', 'https://www.youtube.com/watch?v=0xDToqKsjkY', 'https://www.youtube.com/watch?v=0xDToqKsjkY');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Strategi adaptasi fiskal Pemda terhadap pemangkasan dana transfer ke daerah dalam APBN 2026', (select id from public.units where kode = 'SKMP'), '{}', null, 2026, 'Tata Kelola & Manajemen ASN', null, 6, 'berjalan', '2026-11-07', 'November (1)', 'Belum Selesai
Sudah dilakukan pengumpulan data namun belum ada penambahan jumlah responden')
  returning id into v_id;
  insert into public.survey_schedule (survey_id, tahap, rencana_selesai) values (v_id, 9, '2026-11-07');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Survey Kualitatif Sistem Penilaian Integritas: Integritas Masih Sebatas Jargon?', (select id from public.units where kode = 'STIA JKT'), '{}', 'Policy Brief', 2026, 'Tata Kelola & Manajemen ASN', null, 10, 'selesai', '2026-06-14', 'Juni (2)', 'Selesai
dengan publikasi di Website LAN, Instagram LAN (Podcast), Instagram Unit & D1 (Podcast), dan Youtube LAN (Podcast)')
  returning id into v_id;
  insert into public.survey_publications (survey_id, web_lan, ig_lan, ig_unit, yt_lan) values (v_id, 'https://lan.go.id/memperkuat-tone-from-the-top-strategi-kepemimpinan-dalam-transformasi-budaya-integritas-di-instansi-pemerintah-dan-bumn', 'https://www.instagram.com/p/DYoMNwCxi8R/', 'https://www.instagram.com/p/DYoMNwCxi8R/', 'https://www.youtube.com/watch?v=a6kd8VqD3rU');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Preferensi pilihan karier Gen Z untuk menjadi ASN', (select id from public.units where kode = 'STIA MKS'), '{}', null, 2026, 'Tata Kelola & Manajemen ASN', null, 6, 'berjalan', '2026-06-21', 'Juni (3)', 'Belum Selesai
Sedang dilakukan penyebaran instrumen survei.')
  returning id into v_id;
  insert into public.survey_schedule (survey_id, tahap, rencana_selesai) values (v_id, 9, '2026-06-21');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Preferensi pilihan karier ASN Gen Z', (select id from public.units where kode = 'SKTAN'), '{}', 'Policy Brief', 2026, 'Tata Kelola & Manajemen ASN', null, 10, 'selesai', '2026-07-07', 'Juli (1)', 'Selesai.
dengan publikasi di media online, website LAN, website unit, Instagram Pusjar & D1 (Infografis), youtube LAN dan youtube unit')
  returning id into v_id;
  insert into public.survey_publications (survey_id, media_online, web_lan, web_unit, ig_unit, yt_lan, yt_unit) values (v_id, 'https://www.ayobandung.id/ayo-netizen/01177494/10092026/asn-gen-z-dan-tantangan-mengubah-kepastian-menjadi-kinerja', 'https://lan.go.id/preferensi-karir-asn-gen-z', 'https://bandung.lan.go.id/berita/1465', 'https://www.instagram.com/p/DcfUboZEZaU/?igsi=M29iMWU1MncwNnVk', 'https://youtu.be/WajJ6MnUYiA?si=Rmos8eT48jEuvZux', 'https://youtu.be/WajJ6MnUYiA?si=Rmos8eT48jEuvZux');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Penguatan layanan tanggap bencana di daerah (skupnya nasional)', (select id from public.units where kode = 'SKPP'), '{}', 'Policy Brief', 2026, 'Pelayanan Publik', null, 10, 'selesai', '2026-07-21', 'Juli (3)', 'Selesai dengan publikasi di Website Pusjar, Instagram Pusjar (Dokumentasi Webinar), dan Youtube Pusjar (Webinar).')
  returning id into v_id;
  insert into public.survey_publications (survey_id, web_lan, web_unit, ig_unit, yt_unit) values (v_id, 'https://lan.go.id/beyond-response-transformasi-pelayanan-tanggap-bencana-yang-cepat-tangguh-dan-berkelanjutan', 'https://samarinda.lan.go.id/2026/07/beyond-response-transformasi-pelayanan-tanggap-bencana-yang-cepat-tangguh-dan-berkelanjutan/', 'https://www.instagram.com/p/DZw0NWqFN8P/?igsh=c25kemowdXU5ejYx', 'https://www.youtube.com/live/fmeYZmTFSL8?si=MtXKLV8EhdNDcXLd');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Organizational Trend in Indonesia''s Public Sector: Mapping Change, Readiness, & Adaptive Capability', (select id from public.units where kode = 'STIA JKT'), array(select id from public.units where kode in ('STIA MKS', 'STIA BDG')), null, 2026, 'Tata Kelola & Manajemen ASN', null, 6, 'berjalan', '2026-11-07', 'November (1)', 'Belum Selesai
Dalam Proses pengumpulan data')
  returning id into v_id;
  insert into public.survey_schedule (survey_id, tahap, rencana_selesai) values (v_id, 9, '2026-11-07');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Pelayanan Publik Outlook', (select id from public.units where kode = 'SKPP'), '{}', 'Buku', 2026, 'Pelayanan Publik', null, 10, 'selesai', '2026-08-14', 'Agustus (2)', 'Selesai dengan publikasi di instagram')
  returning id into v_id;
  insert into public.survey_publications (survey_id, web_lan, ig_unit) values (v_id, 'https://lan.go.id/pelayanan-publik-outlook-2026', 'https://www.instagram.com/p/Db-RiQNo7Zi/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ%3D%3D');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Survei Kesiapan Operasional Koperasi Desa Merah Putih di Desa', (select id from public.units where kode = 'SKTAN'), '{}', 'Policy Brief', 2026, 'Prioritas Presiden', null, 7, 'revisi', '2026-08-21', 'Agustus (3)', 'Belum Selesai
Sedang dilakukan perbaikan policy brief hasil review Deputi')
  returning id into v_id;
  insert into public.survey_publications (survey_id, ig_unit) values (v_id, 'https://www.instagram.com/lan_pusjarsktan/p/DdTMnOLkeLl/');
  insert into public.survey_schedule (survey_id, tahap, rencana_selesai) values (v_id, 9, '2026-08-21');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Workplace trend', (select id from public.units where kode = 'DAPKK'), '{}', 'Policy Brief', 2026, 'Tata Kelola & Manajemen ASN', null, 7, 'berjalan', '2026-11-28', 'November (4)', 'Belum Selesai 
Sedang dilakukan penyusunan laporan
Target Minggu 4 November')
  returning id into v_id;
  insert into public.survey_publications (survey_id, ig_unit) values (v_id, 'https://www.instagram.com/p/DdlfuCphsIF/');
  insert into public.survey_schedule (survey_id, tahap, rencana_selesai) values (v_id, 9, '2026-11-28');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Pelestarian lingkungan hidup (Bencana Sumatera Utara, Sumatera Barat dan Aceh) Transformasi Kebijakan Lingkungan dari Instrumen menuju Dampak', (select id from public.units where kode = 'SKTAN'), '{}', 'Policy Brief', 2026, 'Prioritas Presiden', null, 7, 'revisi', '2026-09-21', 'September (3)', 'Belum Selesai
Sedang dilakukan revisi policy brief berdasarkan masukan deputi')
  returning id into v_id;
  insert into public.survey_publications (survey_id, web_unit, ig_unit) values (v_id, 'https://bandung.lan.go.id/berita/1469', 'https://www.instagram.com/p/DdajRliEkOl/?img_index=2');
  insert into public.survey_schedule (survey_id, tahap, rencana_selesai) values (v_id, 9, '2026-09-21');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Reformasi Tata Kelola Makan Bergizi Gratis (MBG): Dari Ekspansi Berbasis Target menjadi Pelayanan Gizi Berbasis Standar, Resiko dan Akuntabilitas', (select id from public.units where kode = 'DSPK2AN'), '{}', 'Policy Paper', 2026, 'Prioritas Presiden', null, 10, 'selesai', '2026-09-28', 'September (4)', 'Selesai 
 dengan publikasi di Website LAN dan Website Unit')
  returning id into v_id;
  insert into public.survey_publications (survey_id, web_lan, web_unit) values (v_id, 'https://lan.go.id/reformasi-tata-kelola-makan-bergizi-gratis-mbg', 'https://drive.google.com/file/d/1dEJCneLt-iWSZxoviYGWorID8ptIrqei/view?usp=sharing');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Fenomena Polyworking di kalangan ASN', (select id from public.units where kode = 'SKPP'), '{}', 'Policy Brief', 2026, 'Tata Kelola & Manajemen ASN', null, 10, 'selesai', '2026-09-28', 'September (4)', 'Selesai 
dengan publikasi di Website Pusjar, Instagram Pusjar (Dokumentasi Webinar), dan Youtube Pusjar (Webinar)')
  returning id into v_id;
  insert into public.survey_publications (survey_id, media_online, web_lan, web_unit, ig_unit, yt_unit) values (v_id, 'https://mediaindonesia.com/politik-dan-hukum/936008/green-skills-jadi-tantangan-industri-polyworking-mulai-muncul-di-kalangan-asn', 'https://lan.go.id/polyworking-asn-tantangan-baru-pengelolaan-kinerja-aparatur', 'https://samarinda.lan.go.id/2026/10/polyworking-asn-tantangan-baru-pengelolaan-kinerja-aparatur/', 'https://www.instagram.com/lan_pusjarskpp/p/DdTGy1glAcS/?hl=en', 'https://www.youtube.com/watch?v=lubAJsX78nk');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Regenerative Leadership', (select id from public.units where kode = 'STIA JKT'), array(select id from public.units where kode in ('STIA MKS', 'STIA BDG')), null, 2026, 'Tata Kelola & Manajemen ASN', null, 6, 'berjalan', '2026-10-07', 'Oktober (1)', 'Belum Selesai
Sudah proses pengumpulan data (sudah dikirim instumen)')
  returning id into v_id;
  insert into public.survey_schedule (survey_id, tahap, rencana_selesai) values (v_id, 9, '2026-10-07');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Evaluasi Kebijakan Makan Bergizi Gratis', (select id from public.units where kode = 'SKMK'), '{}', null, 2026, 'Prioritas Presiden', null, 7, 'berjalan', '2026-10-28', 'Oktober (4)', 'Belum Selesai
Sedang dilakukan penyusunan Policy Brief')
  returning id into v_id;
  insert into public.survey_schedule (survey_id, tahap, rencana_selesai) values (v_id, 9, '2026-10-28');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Penguatan Kebijakan Kedaulatan Pangan Nasional', (select id from public.units where kode = 'DSPK2AN'), '{}', 'Policy Brief', 2026, 'Prioritas Presiden', null, 10, 'selesai', '2026-10-14', 'Oktober (2)', 'Selesai
 dengan publikasi di Website Unit, website LAN & Instagram Unit')
  returning id into v_id;
  insert into public.survey_publications (survey_id, web_lan, web_unit, ig_unit) values (v_id, 'https://lan.go.id/menjaga-ketahanan-pangan-melalui-penguatan-tata-niaga-beras-nasional', 'https://docs.google.com/document/d/1c4xc6HkhXmUBScBid4pvMsqri0FDcLff/edit?usp=sharing&ouid=111118272005817396419&rtpof=true&sd=true', 'https://www.instagram.com/p/DczqNR6k4LJ/?utm_source=ig_web_copy_link&igsi=MzRlODBiNWFlZA%3D%3D');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Persepsi ASN mengenai Upaya Penguatan/Pembentukan Lembaga Pengawas sistem merit', (select id from public.units where kode = 'SKMP'), '{}', null, 2026, 'Tata Kelola & Manajemen ASN', null, 6, 'berjalan', '2026-11-21', 'November (3)', 'Dalam pengumpulan data sampai dengan 6 November')
  returning id into v_id;
  insert into public.survey_schedule (survey_id, tahap, rencana_selesai) values (v_id, 9, '2026-11-21');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Survei Perilaku Kepemimpinan Adaptif Berdasarkan Persepsi Aparatur Sipil Negara', (select id from public.units where kode = 'DAPKK'), '{}', null, 2026, 'Tata Kelola & Manajemen ASN', null, 6, 'berjalan', '2026-11-21', 'November (3)', 'Belum selesai
Dalam tahap pengumpulan data
Target Minggu 3 November')
  returning id into v_id;
  insert into public.survey_schedule (survey_id, tahap, rencana_selesai) values (v_id, 9, '2026-11-21');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Ketahanan pangan sebagai fondasi kemandirian bangsa', (select id from public.units where kode = 'SKTAN'), '{}', null, 2026, 'Prioritas Presiden', null, 3, 'berjalan', '2026-12-07', 'Desember (1)', 'Sedang dilakukan penyusunan instrumen')
  returning id into v_id;
  insert into public.survey_schedule (survey_id, tahap, rencana_selesai) values (v_id, 9, '2026-12-07');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Persepsi masyarakat terhadap peran opini publik/agenda kebijakan pemerintah', (select id from public.units where kode = 'SKMP'), '{}', null, 2026, 'Prioritas Presiden', null, 6, 'berjalan', '2026-11-28', 'November (4)', 'Dalam pengumpulan data sampai dengan 10 November')
  returning id into v_id;
  insert into public.survey_schedule (survey_id, tahap, rencana_selesai) values (v_id, 9, '2026-11-28');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Penguatan kebijakan ekonomi hijau dalam mendukung hilirisasi berkelanjutan', (select id from public.units where kode = 'SKPP'), '{}', null, 2026, 'Prioritas Presiden', null, 10, 'selesai', '2026-11-28', 'November (4)', 'Selesai
dengan publikasi PB diwebsite LAN')
  returning id into v_id;
  insert into public.survey_publications (survey_id, media_online, web_lan, ig_unit) values (v_id, 'https://mediaindonesia.com/politik-dan-hukum/936008/green-skills-jadi-tantangan-industri-polyworking-mulai-muncul-di-kalangan-asn', 'https://lan.go.id/menjawab-tantangan-implementasi-ekonomi-hijau-dengan-4-g', 'https://www.instagram.com/lan_pusjarskpp/p/DdTGy1glAcS/?hl=en');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Learning agility ASN dalam mendukung Pendidikan vokasi, peningkatan kualitas guru dan kesesuaian kurikulum dunia kerja', (select id from public.units where kode = 'SKTAN'), '{}', null, 2026, 'Prioritas Presiden', null, 3, 'berjalan', '2026-12-07', 'Desember (1)', 'Tahap validasi instrumen di BPS')
  returning id into v_id;
  insert into public.survey_schedule (survey_id, tahap, rencana_selesai) values (v_id, 9, '2026-12-07');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Survei Tata Kelola dan Kualitas Pelayanan Program Bantuan Sosial', (select id from public.units where kode = 'SKPP'), '{}', null, 2026, null, null, 1, 'draft', '2026-12-07', 'Desember (1)', null)
  returning id into v_id;
  insert into public.survey_schedule (survey_id, tahap, rencana_selesai) values (v_id, 9, '2026-12-07');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Survei Integrasi Pelayanan Publik', (select id from public.units where kode = 'SKPP'), '{}', null, 2026, null, null, 1, 'draft', '2026-12-14', 'Desember (2)', null)
  returning id into v_id;
  insert into public.survey_schedule (survey_id, tahap, rencana_selesai) values (v_id, 9, '2026-12-14');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Survei Indonesia Leadership Outlook 2027', (select id from public.units where kode = 'DSPK2AN'), '{}', 'Laporan', 2026, 'Tata Kelola & Manajemen ASN', null, 1, 'draft', '2027-02-21', 'Februari 2027 (3)', null)
  returning id into v_id;
  insert into public.survey_schedule (survey_id, tahap, rencana_selesai) values (v_id, 9, '2027-02-21');

  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2, tahap, status, jadwal_publikasi, jadwal_label, keterangan)
  values ('Pendidikan bermutu untuk SDM berdaya saing global', (select id from public.units where kode = 'STIA JKT'), '{}', null, 2026, 'Prioritas Presiden', null, 1, 'draft', '2026-11-07', 'November (1)', null)
  returning id into v_id;
  insert into public.survey_schedule (survey_id, tahap, rencana_selesai) values (v_id, 9, '2026-11-07');

end $seed$;
