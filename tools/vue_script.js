// ==============================================================================
// LAN-PubTrack (LAN Publication Tracker) — Vue 3 Engine + Supabase Realtime
// ==============================================================================
const { createApp, ref, computed, onMounted, nextTick, watch } = Vue;

const SUPABASE_URL = "https://byxwnntknbvwmpwnbelo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_4N3ap4TPBhiLvRjrss5D2A_bw79TSvj";

// Inisialisasi Supabase Client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});

createApp({
  setup() {
    // State Utama
    const allSurveys = ref([]);
    const currentTab = ref('analytics');
    const selectedUnit = ref('SEMUA');
    const searchQuery = ref('');
    const filterCluster = ref('');
    const filterStatus = ref('');
    const filterYear = ref('2026');
    const viewMode = ref('card');

    // State Modal & Drawer
    const isEditModalOpen = ref(false);
    const isAddModalOpen = ref(false);
    const isLoginModalOpen = ref(false);
    const isSyncing = ref(false);
    const isSaving = ref(false);
    const isLoggingIn = ref(false);
    const loginError = ref('');

    // State Form
    const activeEditItem = ref({});
    const newItem = ref({
      judul: '',
      unit: 'SKPP',
      jenis: 'Policy Brief',
      tahun: 2026,
      jadwal: 'Maret (1)',
      cluster1: 'Prioritas Presiden',
      cluster2: '',
      keterangan: 'Sedang dilakukan penyusunan instrumen'
    });

    const loginForm = ref({
      username: '',
      password: ''
    });

    // User Session
    const currentUser = ref(null);

    // Toast Notification
    const toast = ref({ show: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
      toast.value = { show: true, message, type };
      setTimeout(() => { toast.value.show = false; }, 3500);
    };

    // Opsi Unit & Klaster
    const unitOptions = [
      'SEMUA', 'SKPP', 'DAPKK', 'SKMP', 'SKTAN', 'DSPK2AN', 
      'STIA JKT', 'STIA MKS', 'STIA BDG', 'SKMK'
    ];

    const clusterOptions = [
      'Prioritas Presiden',
      'Tata Kelola & Manajemen ASN',
      'Pelayanan Publik',
      'Digitalisasi'
    ];

    const months2026 = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    // Status Sanitizer & Determinasi
    const determineStatusClient = (item) => {
      const ket = (item.keterangan || "").toLowerCase();
      const hasLinks = item.web_lan || item.web_unit || item.ig_lan || item.ig_unit || item.yt_lan || item.yt_unit || item.media_online || item.jurnal;
      
      if (item.status === 'selesai' || ket.includes('selesai') || (hasLinks && item.tahun === '2025')) {
        return 'Selesai Publikasi';
      }
      if (item.status === 'menunggu_persetujuan' || ket.includes('review') || ket.includes('deputi') || ket.includes('persetujuan')) {
        return 'Review PB Deputi';
      }
      if (ket.includes('revisi') || item.status === 'revisi') {
        return 'Revisi Policy Brief';
      }
      if (ket.includes('penyusunan laporan') || ket.includes('policy brief')) {
        return 'Penyusunan PB/Laporan';
      }
      if (ket.includes('pengumpulan data') || ket.includes('sebar') || ket.includes('responden') || ket.includes('validasi')) {
        return 'Pengumpulan Data';
      }
      if (ket.includes('instrumen')) {
        return 'Penyusunan Instrumen';
      }
      return 'Belum Dimulai';
    };

    // Load Data dari Supabase
    const fetchDataFromSupabase = async () => {
      isSyncing.value = true;
      try {
        const { data, error } = await supabase
          .from('surveys')
          .select('*, unit:units(kode, nama), pub:survey_publications(*)')
          .order('id', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          allSurveys.value = data.map((s, idx) => {
            const p = Array.isArray(s.pub) ? (s.pub[0] || {}) : (s.pub || {});
            const item = {
              no: s.id,
              db_id: s.id,
              unit: s.unit ? s.unit.kode : 'SKPP',
              judul: s.judul,
              jenis: s.jenis || '',
              jadwal: s.jadwal_label || (s.jadwal_publikasi ? s.jadwal_publikasi.slice(0, 7) : '2026'),
              tahun: String(s.tahun || 2026),
              cluster1: s.klaster_1 || 'Tata Kelola & Manajemen ASN',
              cluster2: s.klaster_2 || '',
              jurnal: p.jurnal || '',
              media_online: p.media_online || '',
              web_lan: p.web_lan || '',
              web_unit: p.web_unit || '',
              ig_lan: p.ig_lan || '',
              ig_unit: p.ig_unit || '',
              yt_lan: p.yt_lan || '',
              yt_unit: p.yt_unit || '',
              keterangan: s.keterangan || '',
              raw_status: s.status,
              tahap: s.tahap || 1,
              status: ''
            };
            item.status = determineStatusClient(item);
            return item;
          });
          showToast(`Berhasil memuat ${allSurveys.value.length} survei dari Supabase!`, 'success');
        } else {
          // Fallback ke initialData.js jika database belum ada data
          if (window.INITIAL_SURVEY_DATA) {
            allSurveys.value = window.INITIAL_SURVEY_DATA.map(s => ({
              ...s,
              status: determineStatusClient(s)
            }));
          }
        }
      } catch (err) {
        console.error("Gagal mengambil data dari Supabase:", err);
        showToast("Gagal memuat dari database. Menggunakan data cadangan lokal.", "error");
        if (window.INITIAL_SURVEY_DATA) {
          allSurveys.value = window.INITIAL_SURVEY_DATA.map(s => ({
            ...s,
            status: determineStatusClient(s)
          }));
        }
      } finally {
        isSyncing.value = false;
        nextTick(() => {
          if (window.lucide) lucide.createIcons();
          updateCharts();
        });
      }
    };

    // Filter Computed
    const filteredSurveys = computed(() => {
      let list = allSurveys.value;
      if (selectedUnit.value !== 'SEMUA') {
        list = list.filter(s => s.unit && s.unit.toUpperCase().includes(selectedUnit.value.toUpperCase()));
      }
      return list;
    });

    const tableFilteredSurveys = computed(() => {
      let list = filteredSurveys.value;

      if (currentTab.value === 'approval') {
        return list.filter(s => s.raw_status === 'menunggu_persetujuan' || s.status === 'Review PB Deputi');
      }

      if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase();
        list = list.filter(item => 
          (item.judul && item.judul.toLowerCase().includes(q)) ||
          (item.unit && item.unit.toLowerCase().includes(q)) ||
          (item.keterangan && item.keterangan.toLowerCase().includes(q))
        );
      }

      if (filterCluster.value) {
        list = list.filter(item => item.cluster1 === filterCluster.value);
      }

      if (filterStatus.value) {
        list = list.filter(item => item.status === filterStatus.value);
      }

      if (filterYear.value) {
        list = list.filter(item => String(item.tahun) === filterYear.value);
      }

      return list;
    });

    // Statistik KPI
    const stats = computed(() => {
      const list = filteredSurveys.value;
      const total = list.length;
      const completed = list.filter(s => s.status === 'Selesai Publikasi').length;
      const inProgress = list.filter(s => s.status && s.status !== 'Selesai Publikasi' && s.status !== 'Belum Dimulai').length;
      const notStarted = list.filter(s => !s.status || s.status === 'Belum Dimulai').length;
      const year2026 = list.filter(s => String(s.tahun) === '2026').length;
      const year2025 = list.filter(s => String(s.tahun) === '2025').length;

      return {
        total,
        completed,
        completedPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
        inProgress,
        inProgressPercent: total > 0 ? Math.round((inProgress / total) * 100) : 0,
        notStarted,
        year2026,
        year2025
      };
    });

    const pendingApprovalCount = computed(() => {
      return allSurveys.value.filter(s => s.raw_status === 'menunggu_persetujuan' || s.status === 'Review PB Deputi').length;
    });

    const canApprove = computed(() => {
      if (!currentUser.value) return false;
      const r = currentUser.value.role;
      return r === 'deputi' || r === 'kepala_lan' || r === 'admin';
    });

    // Helpers
    const getUnitCount = (unit) => {
      if (unit === 'SEMUA') return allSurveys.value.length;
      return allSurveys.value.filter(s => s.unit && s.unit.toUpperCase().includes(unit.toUpperCase())).length;
    };

    const getSurveysByMonth = (monthName) => {
      return filteredSurveys.value.filter(s => {
        if (!s.jadwal) return false;
        return s.jadwal.toLowerCase().includes(monthName.toLowerCase());
      });
    };

    const getStatusBadgeClass = (status) => {
      const s = (status || "").toLowerCase();
      if (s.includes('selesai')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      if (s.includes('review') || s.includes('persetujuan')) return 'bg-purple-50 text-purple-700 border-purple-200';
      if (s.includes('revisi')) return 'bg-orange-50 text-orange-700 border-orange-200';
      if (s.includes('pengumpulan')) return 'bg-blue-50 text-blue-700 border-blue-200';
      if (s.includes('instrumen')) return 'bg-amber-50 text-amber-700 border-amber-200';
      return 'bg-slate-100 text-slate-600 border-slate-200';
    };

    const getUnitBadgeClass = (unit) => {
      const u = (unit || "").toUpperCase();
      if (u.includes('SKPP')) return 'bg-blue-100 text-blue-800 border-blue-200';
      if (u.includes('DAPKK')) return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      if (u.includes('SKMP')) return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      if (u.includes('SKTAN')) return 'bg-teal-100 text-teal-800 border-teal-200';
      if (u.includes('DSPK2AN')) return 'bg-purple-100 text-purple-800 border-purple-200';
      if (u.includes('STIA')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      return 'bg-amber-100 text-amber-800 border-amber-200';
    };

    const getRoleLabel = (role) => {
      const map = {
        admin: 'Admin Utama',
        deputi: 'Deputi Pimpinan',
        kepala_lan: 'Kepala LAN RI',
        humas: 'Biro Humas',
        admin_dspk: 'Admin DSPK2AN',
        unit_kerja: 'Unit Kerja'
      };
      return map[role] || role;
    };

    const hasLink = (val) => Boolean(val && String(val).trim() !== "");
    const getCleanLink = (val) => {
      const str = String(val || "").trim();
      const match = str.match(/https?:\/\/[^\s]+/i);
      return match ? match[0] : (str.startsWith('http') ? str : `https://${str}`);
    };

    // Modal Handlers
    const openEditModal = (item) => {
      activeEditItem.value = JSON.parse(JSON.stringify(item));
      isEditModalOpen.value = true;
      nextTick(() => { if (window.lucide) lucide.createIcons(); });
    };

    const closeEditModal = () => {
      isEditModalOpen.value = false;
    };

    const openAddModal = () => {
      isAddModalOpen.value = true;
      nextTick(() => { if (window.lucide) lucide.createIcons(); });
    };

    const openLoginModal = () => {
      loginError.value = '';
      isLoginModalOpen.value = true;
      nextTick(() => { if (window.lucide) lucide.createIcons(); });
    };

    const fillLogin = (u, p) => {
      loginForm.value.username = u;
      loginForm.value.password = p;
    };

    // Autentikasi Menggunakan Username (Sesuai Tabel Mentor)
    const submitLogin = async () => {
      isLoggingIn.value = true;
      loginError.value = '';
      try {
        const u = loginForm.value.username.trim().toLowerCase();
        const email = u.includes('@') ? u : `${u}@lan.internal`;
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: loginForm.value.password
        });

        if (error) throw error;

        // Ambil profil user
        const { data: prof, error: profErr } = await supabase
          .from('profiles')
          .select('*, unit:units(kode, nama)')
          .eq('id', data.user.id)
          .single();

        currentUser.value = {
          id: data.user.id,
          email: data.user.email,
          nama: prof ? prof.nama : data.user.email.split('@')[0],
          role: prof ? prof.role : 'unit_kerja',
          unit_kode: prof && prof.unit ? prof.unit.kode : null
        };

        if (currentUser.value.unit_kode) {
          selectedUnit.value = currentUser.value.unit_kode;
        }

        isLoginModalOpen.value = false;
        showToast(`Selamat datang, ${currentUser.value.nama}!`, 'success');
      } catch (err) {
        console.error("Login gagal:", err);
        loginError.value = "Username atau password salah. Silakan coba lagi.";
      } finally {
        isLoggingIn.value = false;
        nextTick(() => { if (window.lucide) lucide.createIcons(); });
      }
    };

    const logoutUser = async () => {
      await supabase.auth.signOut();
      currentUser.value = null;
      selectedUnit.value = 'SEMUA';
      showToast("Berhasil keluar akun.", "info");
      nextTick(() => { if (window.lucide) lucide.createIcons(); });
    };

    // Simpan Update Survei ke Supabase
    const saveSurveyUpdate = async () => {
      isSaving.value = true;
      try {
        const item = activeEditItem.value;
        const dbId = item.db_id || item.no;

        // 1. Update tabel surveys di Supabase
        if (dbId) {
          const { error: sError } = await supabase
            .from('surveys')
            .update({
              keterangan: item.keterangan,
              jenis: item.jenis,
              jadwal_label: item.jadwal,
              klaster_1: item.cluster1,
              updated_at: new Date().toISOString()
            })
            .eq('id', dbId);

          if (sError) console.warn("Supabase update error (surveys):", sError);

          // 2. Update atau Upsert tabel survey_publications
          const pubPayload = {
            survey_id: dbId,
            jurnal: item.jurnal || null,
            media_online: item.media_online || null,
            web_lan: item.web_lan || null,
            web_unit: item.web_unit || null,
            ig_lan: item.ig_lan || null,
            ig_unit: item.ig_unit || null,
            yt_lan: item.yt_lan || null,
            yt_unit: item.yt_unit || null,
            updated_at: new Date().toISOString()
          };

          const { error: pError } = await supabase
            .from('survey_publications')
            .upsert(pubPayload, { onConflict: 'survey_id' });

          if (pError) console.warn("Supabase update error (publications):", pError);
        }

        // 3. Update lokal reactive state
        const idx = allSurveys.value.findIndex(s => String(s.no) === String(item.no));
        if (idx !== -1) {
          item.status = determineStatusClient(item);
          allSurveys.value[idx] = { ...item };
        }

        closeEditModal();
        showToast("Perubahan data survei berhasil disimpan ke Supabase!", "success");
        updateCharts();
      } catch (err) {
        console.error("Gagal menyimpan update:", err);
        showToast("Gagal menyimpan ke server: " + err.message, "error");
      } finally {
        isSaving.value = false;
      }
    };

    // Tambah Survei Baru ke Supabase
    const saveNewSurvey = async () => {
      isSaving.value = true;
      try {
        // Cari unit id
        let unitId = 1;
        const { data: uData } = await supabase
          .from('units')
          .select('id')
          .eq('kode', newItem.value.unit)
          .maybeSingle();

        if (uData) unitId = uData.id;

        const payload = {
          judul: newItem.value.judul,
          unit_id: unitId,
          jenis: newItem.value.jenis,
          tahun: Number(newItem.value.tahun),
          jadwal_label: newItem.value.jadwal,
          klaster_1: newItem.value.cluster1,
          klaster_2: newItem.value.cluster2 || null,
          keterangan: newItem.value.keterangan,
          tahap: 1,
          status: 'draft'
        };

        const { data: inserted, error } = await supabase
          .from('surveys')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;

        // Tambah ke state lokal
        const newObj = {
          no: inserted.id,
          db_id: inserted.id,
          unit: newItem.value.unit,
          judul: newItem.value.judul,
          jenis: newItem.value.jenis,
          jadwal: newItem.value.jadwal,
          tahun: String(newItem.value.tahun),
          cluster1: newItem.value.cluster1,
          cluster2: newItem.value.cluster2,
          keterangan: newItem.value.keterangan,
          status: 'Penyusunan Instrumen'
        };

        allSurveys.value.unshift(newObj);
        isAddModalOpen.value = false;
        showToast("Usulan agenda survei baru berhasil disimpan ke Supabase!", "success");
        updateCharts();

        // Reset form
        newItem.value.judul = '';
      } catch (err) {
        console.error("Gagal menambah survei:", err);
        showToast("Gagal menyimpan usulan: " + err.message, "error");
      } finally {
        isSaving.value = false;
      }
    };

    // Aksi Workflow Approval (Deputi / Kepala LAN)
    const approveSurvey = async (item, action) => {
      const actionLabels = {
        'setujui': 'Persetujuan ACC diberikan',
        'revisi': 'Meminta revisi policy brief',
        'tolak': 'Usulan survei ditolak'
      };

      try {
        const dbId = item.db_id || item.no;
        let newStatus = 'berjalan';
        let newKet = item.keterangan;

        if (action === 'setujui') {
          newStatus = 'berjalan';
          newKet = 'Telah disetujui pimpinan (ACC). Siap publikasi akhir.';
        } else if (action === 'revisi') {
          newStatus = 'revisi';
          newKet = 'Sedang dilakukan revisi policy brief berdasarkan masukan Deputi.';
        } else if (action === 'tolak') {
          newStatus = 'ditolak';
          newKet = 'Usulan survei tidak disetujui pimpinan.';
        }

        await supabase
          .from('surveys')
          .update({ status: newStatus, keterangan: newKet, updated_at: new Date().toISOString() })
          .eq('id', dbId);

        // Update lokal
        item.keterangan = newKet;
        item.raw_status = newStatus;
        item.status = determineStatusClient(item);

        const idx = allSurveys.value.findIndex(s => String(s.no) === String(item.no));
        if (idx !== -1) allSurveys.value[idx] = { ...item };

        closeEditModal();
        showToast(`Berhasil: ${actionLabels[action]}`, 'success');
        updateCharts();
      } catch (err) {
        console.error("Approval error:", err);
        showToast("Gagal memproses persetujuan: " + err.message, "error");
      }
    };

    // Chart.js Rendering (Exact as friend's layout)
    let clusterChartInstance = null;
    let mediaChartInstance = null;
    let unitChartInstance = null;

    const renderCharts = () => {
      const list = filteredSurveys.value;

      // 1. Cluster Chart (Doughnut)
      const clusterCounts = {};
      clusterOptions.forEach(c => clusterCounts[c] = 0);
      list.forEach(s => {
        const c = s.cluster1 || 'Lainnya';
        clusterCounts[c] = (clusterCounts[c] || 0) + 1;
      });

      const ctxCluster = document.getElementById('clusterChart');
      if (ctxCluster) {
        if (clusterChartInstance) clusterChartInstance.destroy();
        clusterChartInstance = new Chart(ctxCluster, {
          type: 'doughnut',
          data: {
            labels: Object.keys(clusterCounts),
            datasets: [{
              data: Object.values(clusterCounts),
              backgroundColor: ['#1d4ed8', '#0284c7', '#d97706', '#10b981', '#64748b'],
              borderWidth: 2,
              borderColor: '#ffffff'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
            },
            cutout: '65%'
          }
        });
      }

      // 2. Media Dissemination Chart (Horizontal Bar)
      const mediaCounts = {
        'Website LAN': list.filter(s => hasLink(s.web_lan)).length,
        'Website Unit': list.filter(s => hasLink(s.web_unit)).length,
        'Instagram LAN': list.filter(s => hasLink(s.ig_lan)).length,
        'Instagram Unit': list.filter(s => hasLink(s.ig_unit)).length,
        'YouTube LAN': list.filter(s => hasLink(s.yt_lan)).length,
        'YouTube Unit': list.filter(s => hasLink(s.yt_unit)).length,
        'Media Online': list.filter(s => hasLink(s.media_online)).length,
        'Jurnal': list.filter(s => hasLink(s.jurnal)).length
      };

      const ctxMedia = document.getElementById('mediaChart');
      if (ctxMedia) {
        if (mediaChartInstance) mediaChartInstance.destroy();
        mediaChartInstance = new Chart(ctxMedia, {
          type: 'bar',
          data: {
            labels: Object.keys(mediaCounts),
            datasets: [{
              label: 'Jumlah Publikasi',
              data: Object.values(mediaCounts),
              backgroundColor: '#2563eb',
              borderRadius: 4
            }]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
          }
        });
      }

      // 3. Unit Progress Comparison Chart (Stacked Bar)
      const unitsToCompare = unitOptions.slice(1, 9);
      const completedByUnit = [];
      const progressByUnit = [];

      unitsToCompare.forEach(u => {
        const uList = allSurveys.value.filter(s => s.unit && s.unit.toUpperCase().includes(u.toUpperCase()));
        completedByUnit.push(uList.filter(s => s.status === 'Selesai Publikasi').length);
        progressByUnit.push(uList.filter(s => s.status !== 'Selesai Publikasi').length);
      });

      const ctxUnit = document.getElementById('unitChart');
      if (ctxUnit) {
        if (unitChartInstance) unitChartInstance.destroy();
        unitChartInstance = new Chart(ctxUnit, {
          type: 'bar',
          data: {
            labels: unitsToCompare,
            datasets: [
              { label: 'Selesai Publikasi', data: completedByUnit, backgroundColor: '#10b981', borderRadius: 4 },
              { label: 'Dalam Pengerjaan', data: progressByUnit, backgroundColor: '#f59e0b', borderRadius: 4 }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } } },
            scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } }
          }
        });
      }
    };

    const updateCharts = () => {
      nextTick(() => { renderCharts(); });
    };

    // Watchers
    watch(selectedUnit, () => { updateCharts(); });
    watch(currentTab, (val) => {
      if (val === 'analytics') updateCharts();
      nextTick(() => { if (window.lucide) lucide.createIcons(); });
    });

    onMounted(async () => {
      // Periksa Sesi Login Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*, unit:units(kode, nama)')
          .eq('id', session.user.id)
          .maybeSingle();

        currentUser.value = {
          id: session.user.id,
          email: session.user.email,
          nama: prof ? prof.nama : session.user.email.split('@')[0],
          role: prof ? prof.role : 'unit_kerja',
          unit_kode: prof && prof.unit ? prof.unit.kode : null
        };

        if (currentUser.value.unit_kode) {
          selectedUnit.value = currentUser.value.unit_kode;
        }
      }

      // Ambil data survei langsung dari Supabase
      await fetchDataFromSupabase();

      if (window.lucide) lucide.createIcons();
    });

    return {
      allSurveys,
      currentTab,
      selectedUnit,
      searchQuery,
      filterCluster,
      filterStatus,
      filterYear,
      viewMode,
      isEditModalOpen,
      isAddModalOpen,
      isLoginModalOpen,
      isSyncing,
      isSaving,
      isLoggingIn,
      loginError,
      activeEditItem,
      newItem,
      loginForm,
      currentUser,
      toast,
      unitOptions,
      clusterOptions,
      months2026,
      filteredSurveys,
      tableFilteredSurveys,
      stats,
      pendingApprovalCount,
      canApprove,
      getUnitCount,
      getSurveysByMonth,
      getStatusBadgeClass,
      getUnitBadgeClass,
      getRoleLabel,
      hasLink,
      getCleanLink,
      openEditModal,
      closeEditModal,
      openAddModal,
      openLoginModal,
      fillLogin,
      submitLogin,
      logoutUser,
      saveSurveyUpdate,
      saveNewSurvey,
      approveSurvey,
      fetchDataFromSupabase
    };
  }
}).mount('#app');
