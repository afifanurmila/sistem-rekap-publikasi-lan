// =====================================================================
//  PORTAL INTERNAL (portal.html)
//  Single-page app sederhana berbasis hash (#/dashboard, #/usulan, ...)
//  Menu & aksi disesuaikan dengan role. Keamanan sebenarnya dijaga oleh
//  RLS + fungsi survey_action di database (lihat supabase/01_schema.sql).
// =====================================================================
import {
  supabase, isConfigured, configWarning, STAGES, STATUS, ROLES, KLASTER, JENIS, KANAL, esc, fmtDate, fmtDateTime,
  todayISO, daysUntil, jadwalText, statusBadge, stepperMini, stepperFull, linksHtml, countLinks, toast, openModal,
  confirmDialog, loaderHtml, errMsg, stageName,
} from "./lib.js";
import { mountCalendar } from "./calendar.js";

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const ALL = Object.keys(ROLES);

const MENU = [
  { id: "dashboard", label: "Dashboard", icon: "🏠", roles: ALL },
  { id: "usulan", label: "Usulan Publikasi", icon: "📝", roles: ["admin", "unit_kerja"] },
  { id: "monitoring", label: "Monitoring", icon: "📊", roles: ["admin", "unit_kerja", "humas", "deputi", "kepala_lan", "admin_dspk"] },
  { id: "persetujuan", label: "Persetujuan (ACC)", icon: "✅", roles: ["admin", "deputi", "kepala_lan"], badge: "approval" },
  { id: "publikasi", label: "Publikasi Akhir", icon: "📣", roles: ["admin", "humas"], badge: "publish" },
  { id: "jadwal", label: "Jadwal Publikasi", icon: "📅", roles: ALL },
  { id: "pengumuman", label: "Pengumuman", icon: "📢", roles: ["admin", "admin_dspk"] },
  { id: "pengguna", label: "Pengguna", icon: "👥", roles: ["admin"], group: "Administrasi" },
  { id: "unit", label: "Unit Kerja", icon: "🏢", roles: ["admin"], group: "Administrasi" },
  { id: "akun", label: "Akun Saya", icon: "⚙️", roles: ALL, group: "Akun" },
];

const S = { session: null, me: null, units: [], surveys: [], loaded: false, recovery: false };

// ---------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------
async function boot() {
  if (!isConfigured) {
    $("#boot").innerHTML = `<div class="container" style="padding-top:60px">${configWarning()}</div>`;
    return;
  }
  supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") { S.recovery = true; location.hash = "#/akun"; }
    if (event === "SIGNED_OUT") location.replace("login.html");
  });

  const { data } = await supabase.auth.getSession();
  if (!data.session) return location.replace("login.html");
  S.session = data.session;

  const { data: me, error } = await supabase.from("profiles").select("*, unit:units(id,kode,nama)").eq("id", data.session.user.id).maybeSingle();
  if (error) return fatal(errMsg(error));
  if (!me || !me.role || !me.aktif) {
    $("#boot").innerHTML = `<div class="container" style="padding-top:80px;max-width:560px">
      <div class="card"><h3>Akun belum aktif</h3>
      <p class="muted">Akun <b>${esc(data.session.user.email)}</b> sudah terdaftar, tetapi belum diberi role/unit oleh admin atau sedang dinonaktifkan. Silakan hubungi admin sistem.</p>
      <button class="btn btn-primary" id="out">Keluar</button></div></div>`;
    $("#out").onclick = () => supabase.auth.signOut();
    return;
  }
  S.me = me;

  $("#u-nama").textContent = me.nama || me.email;
  $("#u-role").textContent = ROLES[me.role] + (me.unit ? ` · ${me.unit.kode}` : "");
  $("#btn-logout").onclick = async () => { await supabase.auth.signOut(); location.replace("login.html"); };
  $("#menu-toggle").onclick = () => $("#sidebar").classList.toggle("open");

  const { data: units } = await supabase.from("units").select("*").order("kode");
  S.units = units || [];

  $("#boot").remove();
  $("#app").classList.remove("hidden");
  window.addEventListener("hashchange", route);
  await loadSurveys();
  route();
}

function fatal(msg) {
  $("#boot").innerHTML = `<div class="container" style="padding-top:60px"><div class="alert alert-error">${esc(msg)}</div></div>`;
}

async function loadSurveys() {
  const { data, error } = await supabase
    .from("surveys")
    .select("*, unit:units(id,kode,nama), pub:survey_publications(*), schedule:survey_schedule(*)")
    .order("updated_at", { ascending: false });
  if (error) { toast(errMsg(error), "error"); return; }
  S.surveys = data.map((s) => ({ ...s, pub: Array.isArray(s.pub) ? s.pub[0] || null : s.pub }));
  S.loaded = true;
  renderNav();
}

// ---------------------------------------------------------------------
// Hak akses (sisi tampilan)
// ---------------------------------------------------------------------
const role = () => S.me.role;
const can = (...roles) => roles.includes(role());
const isOwner = (s) => role() === "admin" || (role() === "unit_kerja" && (s.unit_id === S.me.unit_id || (s.unit_kolaborasi || []).includes(S.me.unit_id)));
const unitKode = (id) => S.units.find((u) => u.id === id)?.kode ?? "-";
const kolabText = (s) => (s.unit_kolaborasi || []).map(unitKode).join(", ");

function actionsFor(s) {
  const a = [];
  if (["selesai", "ditolak"].includes(s.status)) return a;
  if (isOwner(s) && [1, 3, 7].includes(s.tahap) && ["draft", "revisi", "berjalan"].includes(s.status))
    a.push({ aksi: "ajukan", label: `Ajukan ${stageName(s.tahap + 1)}`, cls: "btn-primary" });
  if (can("admin", "deputi", "kepala_lan") && s.status === "menunggu_persetujuan") {
    a.push({ aksi: "setujui", label: "Setujui (ACC)", cls: "btn-success" });
    a.push({ aksi: "revisi", label: "Minta Revisi", cls: "btn-warning" });
    a.push({ aksi: "tolak", label: "Tolak", cls: "btn-danger" });
  }
  if (s.status === "berjalan") {
    if (s.tahap === 5 && (isOwner(s) || can("humas"))) a.push({ aksi: "lanjut", label: "Lanjut ke Pengumpulan Data", cls: "btn-primary" });
    if (s.tahap === 6 && isOwner(s)) a.push({ aksi: "lanjut", label: "Lanjut ke Penyusunan Laporan", cls: "btn-primary" });
    if (s.tahap === 9 && can("admin", "humas")) a.push({ aksi: "lanjut", label: "Tandai Selesai Dipublikasikan", cls: "btn-success" });
  }
  return a;
}
const canEdit = (s) => isOwner(s) && ["draft", "revisi", "berjalan"].includes(s.status);
const canEditLinks = (s) => can("admin", "humas") || isOwner(s);

function currentDeadline(s) {
  const sc = (s.schedule || []).find((x) => x.tahap === s.tahap);
  const d = sc?.rencana_selesai || (s.tahap === 9 ? s.jadwal_publikasi : null);
  return d && !["selesai", "ditolak"].includes(s.status) ? d : null;
}
function deadlineBadge(s) {
  const d = currentDeadline(s);
  if (!d) return "";
  const n = daysUntil(d);
  if (n < 0) return `<span class="badge b-red" title="Deadline ${fmtDate(d)}">⚠ Lewat ${-n} hari</span>`;
  if (n <= 7) return `<span class="badge b-orange" title="Deadline ${fmtDate(d)}">⏰ H-${n}</span>`;
  return `<span class="badge b-gray" title="Deadline tahap">${fmtDate(d, { day: "numeric", month: "short" })}</span>`;
}

// ---------------------------------------------------------------------
// Navigasi
// ---------------------------------------------------------------------
function renderNav() {
  const counts = {
    approval: S.surveys.filter((s) => s.status === "menunggu_persetujuan").length,
    publish: S.surveys.filter((s) => s.tahap === 9 && s.status === "berjalan").length,
  };
  const cur = (location.hash.replace("#/", "") || "dashboard").split("?")[0];
  let group = null, html = "";
  for (const m of MENU.filter((m) => m.roles.includes(role()))) {
    if (m.group !== group) { group = m.group; if (group) html += `<div class="nav-label">${group}</div>`; }
    const c = m.badge && counts[m.badge] ? `<span class="count">${counts[m.badge]}</span>` : "";
    html += `<a href="#/${m.id}" class="${cur === m.id ? "active" : ""}">${m.icon} ${m.label}${c}</a>`;
  }
  $("#nav").innerHTML = '<div class="nav-label">Menu</div>' + html;
}

const PAGES = {};
async function route() {
  const id = (location.hash.replace("#/", "") || "dashboard").split("?")[0];
  const menu = MENU.find((m) => m.id === id && m.roles.includes(role()));
  if (!menu) { location.hash = "#/dashboard"; return; }
  $("#page-title").textContent = menu.label;
  $("#sidebar").classList.remove("open");
  renderNav();
  const view = $("#view");
  view.innerHTML = loaderHtml();
  try { await PAGES[id](view); } catch (e) { console.error(e); view.innerHTML = `<div class="alert alert-error">${esc(errMsg(e))}</div>`; }
}
const refresh = async () => { await loadSurveys(); await route(); };

// ---------------------------------------------------------------------
// Komponen tabel survei
// ---------------------------------------------------------------------
function surveyTable(list, { actions = true, empty = "Belum ada data." } = {}) {
  if (!list.length) return `<div class="empty">${empty}</div>`;
  return `<div class="table-wrap"><table><thead><tr>
      <th>Judul</th><th>Unit</th><th>Progres</th><th>Status</th><th>Deadline</th><th>Publikasi</th>${actions ? "<th></th>" : ""}
    </tr></thead><tbody>
    ${list.map((s) => `<tr class="clickable" data-detail="${s.id}">
        <td style="min-width:240px"><div class="title">${esc(s.judul)}</div><small class="muted">${esc(s.jenis || "")}${s.jenis ? " · " : ""}${s.tahun}${s.klaster_1 ? " · " + esc(s.klaster_1) : ""}</small></td>
        <td><span class="badge b-navy">${esc(s.unit?.kode)}</span>${kolabText(s) ? `<br><small class="muted">+ ${esc(kolabText(s))}</small>` : ""}</td>
        <td>${stepperMini(s.tahap, s.status)}</td>
        <td>${statusBadge(s.status)}</td>
        <td>${deadlineBadge(s) || '<span class="muted">-</span>'}</td>
        <td style="min-width:140px">${linksHtml(s.pub)}</td>
        ${actions ? `<td style="white-space:nowrap"><button class="btn btn-outline btn-sm">Detail</button></td>` : ""}
      </tr>`).join("")}
    </tbody></table></div>`;
}
function bindDetail(root) {
  $$("[data-detail]", root).forEach((tr) =>
    tr.addEventListener("click", (e) => { if (!e.target.closest("a")) showDetail(Number(tr.dataset.detail)); })
  );
}

// ---------------------------------------------------------------------
// Detail survei (modal)
// ---------------------------------------------------------------------
async function showDetail(id) {
  const s = S.surveys.find((x) => x.id === id);
  if (!s) return;
  const acts = actionsFor(s);
  const m = openModal({
    size: "lg",
    title: esc(s.judul),
    subtitle: `${esc(s.unit?.kode)}${kolabText(s) ? " + " + esc(kolabText(s)) : ""} · Tahun ${s.tahun}`,
    body: `<div class="detail-grid">
      <div>
        <dl class="kv">
          <dt>Status</dt><dd>${statusBadge(s.status)} ${deadlineBadge(s)}</dd>
          <dt>Tahap</dt><dd>${s.tahap}. ${esc(stageName(s.tahap))}</dd>
          <dt>Jenis</dt><dd>${esc(s.jenis || "-")}</dd>
          <dt>Klaster</dt><dd>${esc([s.klaster_1, s.klaster_2].filter(Boolean).join(" · ") || "-")}</dd>
          <dt>Jadwal publikasi</dt><dd>${esc(jadwalText(s))}</dd>
          <dt>Deskripsi</dt><dd style="white-space:pre-wrap">${esc(s.deskripsi || "-")}</dd>
          ${s.keterangan ? `<dt>Keterangan</dt><dd style="white-space:pre-wrap">${esc(s.keterangan)}</dd>` : ""}
          ${s.catatan_terakhir ? `<dt>Catatan terakhir</dt><dd><div class="alert alert-warn" style="margin:0;white-space:pre-wrap">${esc(s.catatan_terakhir)}</div></dd>` : ""}
        </dl>
        <div class="section-title">Tautan Publikasi</div>
        ${linksHtml(s.pub, { empty: '<span class="muted">Belum ada tautan.</span>' })}
        <div class="section-title">Riwayat Aktivitas</div>
        <div id="logs">${loaderHtml("Memuat riwayat...")}</div>
      </div>
      <div><div class="section-title" style="margin-top:0">Tahapan &amp; Jadwal</div>${stepperFull(s.tahap, s.status, s.schedule)}</div>
    </div>`,
    footer: [
      `<button class="btn btn-outline" data-act="catatan">💬 Tambah Catatan</button>`,
      canEditLinks(s) ? `<button class="btn btn-outline" data-links>🔗 Kelola Tautan</button>` : "",
      canEdit(s) ? `<button class="btn btn-outline" data-edit>✏️ Edit</button>` : "",
      ...acts.map((a) => `<button class="btn ${a.cls}" data-act="${a.aksi}">${esc(a.label)}</button>`),
    ].join(""),
  });
  $$("[data-act]", m.el).forEach((b) => b.addEventListener("click", () => { m.close(); actionDialog(s, b.dataset.act, b.textContent); }));
  $("[data-edit]", m.el)?.addEventListener("click", () => { m.close(); surveyForm(s); });
  $("[data-links]", m.el)?.addEventListener("click", () => { m.close(); linksForm(s); });

  const { data: logs } = await supabase.from("survey_logs").select("*").eq("survey_id", id).order("created_at", { ascending: false });
  const AKSI = { ajukan: "Mengajukan", setujui: "Menyetujui", revisi: "Meminta revisi", tolak: "Menolak", lanjut: "Melanjutkan tahap", catatan: "Menambahkan catatan" };
  $("#logs", m.el).innerHTML = logs?.length
    ? `<ul class="timeline">${logs.map((l) => `<li>
        <div><b>${esc(l.actor_nama || "-")}</b> <small class="muted">(${esc(ROLES[l.actor_role] || l.actor_role || "")})</small> — ${esc(AKSI[l.aksi] || l.aksi)}
        ${l.aksi !== "catatan" && l.dari_tahap ? `<small class="muted">: ${esc(stageName(l.dari_tahap))} → ${esc(stageName(l.ke_tahap))}</small>` : ""}</div>
        <div class="when">${fmtDateTime(l.created_at)}</div>
        ${l.catatan ? `<div class="note">${esc(l.catatan)}</div>` : ""}
        ${l.lampiran_url ? `<a href="${esc(l.lampiran_url)}" target="_blank" rel="noopener">📎 Lampiran</a>` : ""}
      </li>`).join("")}</ul>`
    : '<span class="muted">Belum ada riwayat.</span>';
}

// ---------------------------------------------------------------------
// Dialog aksi workflow -> rpc survey_action
// ---------------------------------------------------------------------
function actionDialog(s, aksi, label) {
  const needNote = ["revisi", "tolak", "catatan"].includes(aksi);
  const lampiranHint = { ajukan: "Contoh: tautan Google Drive dokumen desain / laporan untuk direview pimpinan." }[aksi] || "Opsional.";
  const m = openModal({
    title: esc(label.trim()),
    subtitle: esc(s.judul),
    body: `
      <p class="muted" style="margin-top:0">Tahap saat ini: <b>${s.tahap}. ${esc(stageName(s.tahap))}</b></p>
      <div class="field"><label>Catatan ${needNote ? "*" : "(opsional)"}</label>
        <textarea class="input" id="a-note" placeholder="${aksi === "revisi" ? "Tuliskan poin-poin yang perlu diperbaiki..." : "Catatan..."}"></textarea></div>
      ${aksi !== "tolak" ? `<div class="field"><label>Tautan lampiran</label><input class="input" id="a-file" type="url" placeholder="https://drive.google.com/..." /><span class="hint">${lampiranHint}</span></div>` : ""}`,
    footer: `<button class="btn btn-outline" data-close>Batal</button><button class="btn btn-primary" id="a-ok">Kirim</button>`,
  });
  $("#a-ok", m.el).onclick = async () => {
    const note = $("#a-note", m.el).value.trim();
    const file = $("#a-file", m.el)?.value.trim() || null;
    if (needNote && !note) return toast("Catatan wajib diisi.", "error");
    if (file && !/^https?:\/\//i.test(file)) return toast("Tautan lampiran harus diawali http(s)://", "error");
    $("#a-ok", m.el).disabled = true;
    const { error } = await supabase.rpc("survey_action", { p_survey_id: s.id, p_aksi: aksi, p_catatan: note || null, p_lampiran: file });
    if (error) { $("#a-ok", m.el).disabled = false; return toast(errMsg(error), "error"); }
    m.close();
    toast("Berhasil diproses.", "success");
    await refresh();
  };
}

// ---------------------------------------------------------------------
// Form usulan / edit survei
// ---------------------------------------------------------------------
function surveyForm(s = null) {
  const isNew = !s;
  const unitId = s?.unit_id ?? S.me.unit_id;
  const sch = Object.fromEntries((s?.schedule || []).map((x) => [x.tahap, x]));
  const opt = (arr, val) => arr.map((v) => `<option ${v === val ? "selected" : ""}>${esc(v)}</option>`).join("");
  const year = new Date().getFullYear();

  const m = openModal({
    size: "lg",
    title: isNew ? "Usulan Survei Baru" : "Edit Survei",
    subtitle: isNew ? "Survei akan tersimpan sebagai draft, lalu klik “Ajukan” agar direview pimpinan." : esc(s.judul),
    body: `<form id="sf">
      <div class="field"><label>Judul survei *</label><input class="input" name="judul" required value="${esc(s?.judul)}" /></div>
      <div class="form-row">
        <div class="field"><label>Unit pengusul *</label>
          <select class="input" name="unit_id" ${role() !== "admin" ? "disabled" : ""}>${S.units.filter((u) => u.aktif || u.id === unitId).map((u) => `<option value="${u.id}" ${u.id === unitId ? "selected" : ""}>${esc(u.kode)} — ${esc(u.nama)}</option>`).join("")}</select></div>
        <div class="field"><label>Tahun *</label><input class="input" type="number" name="tahun" min="2020" max="2100" value="${s?.tahun ?? year}" /></div>
        <div class="field"><label>Jenis publikasi</label><select class="input" name="jenis"><option value="">- pilih -</option>${opt(JENIS, s?.jenis)}${s?.jenis && !JENIS.includes(s.jenis) ? `<option selected>${esc(s.jenis)}</option>` : ""}</select></div>
        <div class="field"><label>Target jadwal publikasi akhir</label><input class="input" type="date" name="jadwal_publikasi" value="${s?.jadwal_publikasi ?? ""}" /></div>
        <div class="field"><label>Klaster 1 *</label><select class="input" name="klaster_1" required><option value="">- pilih -</option>${opt(KLASTER, s?.klaster_1)}</select></div>
        <div class="field"><label>Klaster 2</label><select class="input" name="klaster_2"><option value="">- tidak ada -</option>${opt(KLASTER, s?.klaster_2)}</select></div>
      </div>
      <div class="field"><label>Unit kolaborasi</label>
        <div class="links">${S.units.filter((u) => u.aktif).map((u) => `<label class="chip" style="cursor:pointer"><input type="checkbox" name="kolab" value="${u.id}" ${(s?.unit_kolaborasi || []).includes(u.id) ? "checked" : ""}/> ${esc(u.kode)}</label>`).join("")}</div></div>
      <div class="field"><label>Deskripsi / latar belakang singkat</label><textarea class="input" name="deskripsi">${esc(s?.deskripsi)}</textarea></div>

      <div class="section-title">Rencana Jadwal per Tahap <small class="muted" style="text-transform:none;letter-spacing:0">— dipakai untuk kalender &amp; pengingat deadline</small></div>
      <div class="table-wrap"><table><thead><tr><th>Tahap</th><th>Rencana mulai</th><th>Target selesai</th></tr></thead><tbody>
        ${STAGES.filter((x) => x.tahap <= 9).map((st) => `<tr>
          <td><b>${st.tahap}.</b> ${esc(st.nama)}<br><small class="muted">${esc(st.pelaksana)}</small></td>
          <td><input class="input" type="date" name="mulai_${st.tahap}" value="${sch[st.tahap]?.rencana_mulai ?? ""}" /></td>
          <td><input class="input" type="date" name="selesai_${st.tahap}" value="${sch[st.tahap]?.rencana_selesai ?? ""}" /></td>
        </tr>`).join("")}
      </tbody></table></div>
    </form>`,
    footer: `<button class="btn btn-outline" data-close>Batal</button><button class="btn btn-primary" id="sf-save">${isNew ? "Simpan Draft" : "Simpan Perubahan"}</button>`,
  });

  $("#sf-save", m.el).onclick = async () => {
    const f = $("#sf", m.el);
    const fd = new FormData(f);
    const payload = {
      judul: fd.get("judul").trim(),
      unit_id: role() === "admin" ? Number(fd.get("unit_id")) : unitId,
      tahun: Number(fd.get("tahun")),
      jenis: fd.get("jenis") || null,
      jadwal_publikasi: fd.get("jadwal_publikasi") || null,
      klaster_1: fd.get("klaster_1") || null,
      klaster_2: fd.get("klaster_2") || null,
      unit_kolaborasi: fd.getAll("kolab").map(Number).filter((id) => id !== (role() === "admin" ? Number(fd.get("unit_id")) : unitId)),
      deskripsi: fd.get("deskripsi").trim() || null,
    };
    if (!payload.judul || !payload.klaster_1 || !payload.tahun) return toast("Judul, tahun, dan klaster 1 wajib diisi.", "error");
    if (!payload.unit_id) return toast("Akun Anda belum terhubung ke unit kerja. Hubungi admin.", "error");

    const schedule = [];
    for (let t = 1; t <= 9; t++) {
      let mulai = fd.get(`mulai_${t}`) || null, selesai = fd.get(`selesai_${t}`) || null;
      if (t === 9 && !selesai && payload.jadwal_publikasi) selesai = payload.jadwal_publikasi;
      if (mulai && selesai && mulai > selesai) return toast(`Tahap ${t}: tanggal mulai melewati target selesai.`, "error");
      if (mulai || selesai || sch[t]) schedule.push({ tahap: t, rencana_mulai: mulai, rencana_selesai: selesai });
    }

    const btn = $("#sf-save", m.el);
    btn.disabled = true;
    let res = isNew
      ? await supabase.from("surveys").insert(payload).select().single()
      : await supabase.from("surveys").update(payload).eq("id", s.id).select().single();
    if (res.error) { btn.disabled = false; return toast(errMsg(res.error), "error"); }
    if (schedule.length) {
      const { error } = await supabase.from("survey_schedule").upsert(schedule.map((x) => ({ ...x, survey_id: res.data.id })), { onConflict: "survey_id,tahap" });
      if (error) toast("Survei tersimpan, tetapi jadwal gagal disimpan: " + errMsg(error), "error");
    }
    m.close();
    toast(isNew ? "Usulan tersimpan sebagai draft." : "Perubahan tersimpan.", "success");
    await refresh();
  };
}

// ---------------------------------------------------------------------
// Form tautan publikasi
// ---------------------------------------------------------------------
function linksForm(s) {
  const p = s.pub || {};
  const m = openModal({
    size: "lg",
    title: "Kelola Tautan Publikasi",
    subtitle: esc(s.judul),
    body: `<p class="muted" style="margin-top:0">Satu kanal boleh berisi lebih dari satu tautan — tulis satu URL per baris.</p>
      <div class="form-row">${KANAL.map((k) => `<div class="field"><label>${k.icon} ${k.label}</label><textarea class="input" style="min-height:60px" name="${k.key}" placeholder="https://...">${esc(p[k.key])}</textarea></div>`).join("")}</div>`,
    footer: `<button class="btn btn-outline" data-close>Batal</button><button class="btn btn-primary" id="l-save">Simpan Tautan</button>`,
  });
  $("#l-save", m.el).onclick = async () => {
    const payload = { survey_id: s.id, updated_at: new Date().toISOString() };
    for (const k of KANAL) {
      const urls = $(`[name=${k.key}]`, m.el).value.split(/\s*\n\s*/).map((u) => u.trim()).filter(Boolean);
      const bad = urls.find((u) => !/^https?:\/\/\S+$/i.test(u));
      if (bad) return toast(`URL tidak valid pada ${k.label}: ${bad}`, "error");
      payload[k.key] = urls.join("\n") || null;
    }
    const { error } = await supabase.from("survey_publications").upsert(payload, { onConflict: "survey_id" });
    if (error) return toast(errMsg(error), "error");
    m.close();
    toast("Tautan publikasi tersimpan.", "success");
    await refresh();
  };
}

// =====================================================================
//  HALAMAN
// =====================================================================

// ---------- Dashboard ----------
PAGES.dashboard = async (view) => {
  const list = S.surveys;
  const active = list.filter((s) => !["selesai", "ditolak"].includes(s.status));
  const reminders = active
    .map((s) => ({ s, d: currentDeadline(s) }))
    .filter((x) => x.d && daysUntil(x.d) <= 14)
    .sort((a, b) => a.d.localeCompare(b.d));
  const mine = role() === "unit_kerja" ? list.filter(isOwner) : list;
  const kpi = [
    ["📊", "b-navy", mine.length, role() === "unit_kerja" ? "Survei Unit Saya" : "Total Survei"],
    ["⏳", "b-blue", mine.filter((s) => s.status === "berjalan").length, "Berjalan"],
    ["🖊️", "b-purple", mine.filter((s) => s.status === "menunggu_persetujuan").length, "Menunggu Persetujuan"],
    ["↩️", "b-orange", mine.filter((s) => s.status === "revisi").length, "Perlu Revisi"],
    ["✅", "b-green", mine.filter((s) => s.status === "selesai").length, "Selesai"],
  ];

  const todo = [];
  if (can("deputi", "kepala_lan", "admin")) {
    const n = list.filter((s) => s.status === "menunggu_persetujuan").length;
    if (n) todo.push(`<a class="btn btn-primary" href="#/persetujuan">✅ ${n} survei menunggu persetujuan Anda</a>`);
  }
  if (can("humas", "admin")) {
    const n = list.filter((s) => s.tahap === 9 && s.status === "berjalan").length;
    if (n) todo.push(`<a class="btn btn-gold" href="#/publikasi">📣 ${n} survei siap publikasi akhir</a>`);
  }
  if (role() === "unit_kerja") {
    const r = list.filter((s) => isOwner(s) && s.status === "revisi").length;
    if (r) todo.push(`<a class="btn btn-warning" href="#/usulan">↩️ ${r} survei perlu direvisi</a>`);
  }

  const [{ data: ann }, { data: logs }] = await Promise.all([
    supabase.from("announcements").select("*").or(`berlaku_hingga.is.null,berlaku_hingga.gte.${todayISO()}`).order("created_at", { ascending: false }).limit(5),
    supabase.from("survey_logs").select("*, survey:surveys(judul)").order("created_at", { ascending: false }).limit(8),
  ]);

  view.innerHTML = `
    <div class="card" style="background:linear-gradient(120deg,var(--navy-800),var(--navy-600));color:#fff">
      <h3 style="font-size:20px">Selamat datang, ${esc(S.me.nama || S.me.email)} 👋</h3>
      <p style="margin:6px 0 0;opacity:.85">Anda masuk sebagai <b>${esc(ROLES[role()])}</b>${S.me.unit ? ` — ${esc(S.me.unit.nama)}` : ""}.</p>
      ${todo.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">${todo.join("")}</div>` : ""}
    </div>
    <div class="grid grid-5" style="margin-top:20px">${kpi.map(([i, c, v, l]) => `<div class="card kpi"><div class="kpi-icon badge ${c}">${i}</div><div><div class="kpi-value">${v}</div><div class="kpi-label">${l}</div></div></div>`).join("")}</div>
    <div class="grid grid-2" style="margin-top:20px">
      <div class="card">
        <div class="card-head"><div><h3>⏰ Pengingat Deadline</h3><p>Tahap yang terlambat atau jatuh tempo ≤ 14 hari</p></div></div>
        ${reminders.length ? reminders.map(({ s, d }) => {
          const n = daysUntil(d);
          const cls = n < 0 ? "b-red" : n <= 3 ? "b-orange" : "b-gold";
          return `<div class="reminder" data-detail="${s.id}"><div class="days badge ${cls}">${n < 0 ? `+${-n} hr` : n === 0 ? "HARI INI" : `H-${n}`}</div>
            <div class="info"><strong>${esc(s.judul)}</strong><small class="muted">${esc(s.unit?.kode)} · ${esc(stageName(s.tahap))} · ${fmtDate(d)}</small></div></div>`;
        }).join("") : '<div class="empty">Tidak ada deadline mendesak 🎉</div>'}
      </div>
      <div class="card">
        <div class="card-head"><div><h3>📢 Pengumuman</h3></div>${can("admin", "admin_dspk") ? '<a class="btn btn-outline btn-sm" href="#/pengumuman">Kelola</a>' : ""}</div>
        ${ann?.length ? ann.map((a) => `<div class="announce ${esc(a.kategori)}"><h4>${esc(a.judul)} <small class="muted">${fmtDate(a.created_at)}</small></h4><p>${esc(a.isi)}</p></div>`).join("") : '<div class="empty">Belum ada pengumuman.</div>'}
      </div>
      <div class="card span-2">
        <div class="card-head"><div><h3>🕘 Aktivitas Terbaru</h3></div></div>
        ${logs?.length ? `<ul class="timeline">${logs.map((l) => `<li><b>${esc(l.actor_nama || "-")}</b> — ${esc(l.aksi)} <i>${esc(l.survey?.judul || "")}</i>${l.catatan ? `<div class="note">${esc(l.catatan)}</div>` : ""}<div class="when">${fmtDateTime(l.created_at)}</div></li>`).join("")}</ul>` : '<div class="empty">Belum ada aktivitas.</div>'}
      </div>
    </div>`;
  bindDetail(view);
};

// ---------- Usulan Publikasi (unit kerja) ----------
PAGES.usulan = async (view) => {
  const list = S.surveys.filter(isOwner);
  const groups = [
    ["Perlu tindakan Anda", list.filter((s) => (["draft", "revisi"].includes(s.status)) || (s.status === "berjalan" && [3, 5, 6, 7].includes(s.tahap)))],
    ["Menunggu persetujuan pimpinan", list.filter((s) => s.status === "menunggu_persetujuan")],
    ["Publikasi akhir (Humas) & selesai", list.filter((s) => (s.tahap >= 9 && s.status !== "revisi") || s.status === "ditolak")],
  ];
  view.innerHTML = `
    <div class="card-head">
      <div><h3>Usulan Publikasi ${role() === "unit_kerja" ? `— ${esc(S.me.unit?.kode || "")}` : "(semua unit)"}</h3><p>Ajukan survei baru, lengkapi desain & laporan, lalu ajukan ke pimpinan.</p></div>
      <button class="btn btn-gold" id="btn-new">＋ Usulan Baru</button>
    </div>
    ${role() === "unit_kerja" && !S.me.unit_id ? '<div class="alert alert-warn">Akun Anda belum terhubung ke unit kerja. Hubungi admin.</div>' : ""}
    ${groups.map(([t, l]) => `<div class="card"><div class="card-head"><h3>${t} <span class="badge b-navy">${l.length}</span></h3></div>${surveyTable(l, { empty: "Tidak ada." })}</div>`).join("")}`;
  $("#btn-new").onclick = () => surveyForm();
  bindDetail(view);
};

// ---------- Monitoring ----------
PAGES.monitoring = async (view) => {
  const units = [...new Set(S.surveys.map((s) => s.unit?.kode).filter(Boolean))].sort();
  const years = [...new Set(S.surveys.map((s) => s.tahun))].sort().reverse();
  view.innerHTML = `
    <div class="card">
      <div class="filters">
        <input class="input search" id="m-q" type="search" placeholder="🔍 Cari judul..." />
        <select class="input" id="m-tahun"><option value="">Semua tahun</option>${years.map((y) => `<option>${y}</option>`).join("")}</select>
        <select class="input" id="m-unit"><option value="">Semua unit</option>${units.map((u) => `<option>${esc(u)}</option>`).join("")}</select>
        <select class="input" id="m-tahap"><option value="">Semua tahap</option>${STAGES.map((s) => `<option value="${s.tahap}">${s.tahap}. ${esc(s.nama)}</option>`).join("")}</select>
        <select class="input" id="m-status"><option value="">Semua status</option>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("")}</select>
        <label style="display:flex;gap:6px;align-items:center;font-size:12px"><input type="checkbox" id="m-late" /> Hanya terlambat</label>
      </div>
    </div>
    <div class="card"><div class="card-head"><p id="m-info"></p></div><div id="m-table"></div></div>`;
  const draw = () => {
    const q = $("#m-q").value.toLowerCase(), th = $("#m-tahun").value, u = $("#m-unit").value, tp = $("#m-tahap").value, st = $("#m-status").value, late = $("#m-late").checked;
    const list = S.surveys.filter((s) =>
      (!q || s.judul.toLowerCase().includes(q)) && (!th || String(s.tahun) === th) &&
      (!u || s.unit?.kode === u || kolabText(s).split(", ").includes(u)) && (!tp || String(s.tahap) === tp) &&
      (!st || s.status === st) && (!late || (currentDeadline(s) && daysUntil(currentDeadline(s)) < 0)));
    $("#m-info").textContent = `${list.length} survei`;
    $("#m-table").innerHTML = surveyTable(list, { empty: "Tidak ada survei sesuai filter." });
    bindDetail($("#m-table"));
  };
  $$("#m-q,#m-tahun,#m-unit,#m-tahap,#m-status,#m-late").forEach((el) => el.addEventListener("input", draw));
  draw();
};

// ---------- Persetujuan (Deputi / Kepala LAN) ----------
PAGES.persetujuan = async (view) => {
  const pending = S.surveys.filter((s) => s.status === "menunggu_persetujuan").sort((a, b) => a.updated_at.localeCompare(b.updated_at));
  const ids = pending.map((s) => s.id);
  const { data: logs } = ids.length
    ? await supabase.from("survey_logs").select("*").in("survey_id", ids).eq("aksi", "ajukan").order("created_at", { ascending: false })
    : { data: [] };
  const lastSubmit = {};
  (logs || []).forEach((l) => (lastSubmit[l.survey_id] ||= l));

  view.innerHTML = `
    <div class="card-head"><div><h3>Antrean Persetujuan <span class="badge b-purple">${pending.length}</span></h3><p>Tinjau lampiran, lalu Setujui / Minta Revisi / Tolak. Semua keputusan tercatat di riwayat.</p></div></div>
    ${pending.length ? pending.map((s) => {
      const l = lastSubmit[s.id];
      return `<div class="card">
        <div class="card-head" style="margin-bottom:8px">
          <div><span class="badge b-purple">${esc(stageName(s.tahap))}</span> <span class="badge b-navy">${esc(s.unit?.kode)}</span>
          <h3 style="margin-top:8px;font-size:16px">${esc(s.judul)}</h3>
          <p>${esc(s.jenis || "")} ${s.klaster_1 ? "· " + esc(s.klaster_1) : ""} · diajukan ${l ? fmtDateTime(l.created_at) + " oleh " + esc(l.actor_nama || "-") : fmtDate(s.updated_at)}</p></div>
          <button class="btn btn-outline btn-sm" data-detail="${s.id}">Lihat detail</button>
        </div>
        ${l?.catatan ? `<div class="note alert alert-info" style="white-space:pre-wrap">${esc(l.catatan)}</div>` : ""}
        ${l?.lampiran_url ? `<p><a class="btn btn-outline btn-sm" href="${esc(l.lampiran_url)}" target="_blank" rel="noopener">📎 Buka lampiran</a></p>` : ""}
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-success" data-act="setujui" data-id="${s.id}">✓ Setujui (ACC)</button>
          <button class="btn btn-warning" data-act="revisi" data-id="${s.id}">↩ Minta Revisi</button>
          <button class="btn btn-danger" data-act="tolak" data-id="${s.id}">✕ Tolak</button>
        </div></div>`;
    }).join("") : '<div class="card"><div class="empty">Tidak ada survei yang menunggu persetujuan. 🎉</div></div>'}`;
  bindDetail(view);
  $$("[data-act]", view).forEach((b) => b.addEventListener("click", () => {
    const s = S.surveys.find((x) => x.id === Number(b.dataset.id));
    actionDialog(s, b.dataset.act, b.textContent);
  }));
};

// ---------- Publikasi Akhir (Humas) ----------
PAGES.publikasi = async (view) => {
  const tabs = [
    ["akhir", "Siap Publikasi Akhir", S.surveys.filter((s) => s.tahap === 9 && s.status === "berjalan")],
    ["awal", "Publikasi Awal", S.surveys.filter((s) => s.tahap === 5 && s.status === "berjalan")],
    ["selesai", "Sudah Selesai", S.surveys.filter((s) => s.status === "selesai")],
  ];
  let cur = "akhir";
  const draw = () => {
    const [, , list] = tabs.find((t) => t[0] === cur);
    view.innerHTML = `
      <div class="tabs">${tabs.map(([k, l, arr]) => `<button class="tab ${k === cur ? "active" : ""}" data-tab="${k}">${l} <span class="badge b-navy">${arr.length}</span></button>`).join("")}</div>
      ${list.length ? `<div class="table-wrap"><table><thead><tr><th>Judul</th><th>Unit</th><th>Jadwal</th><th>Tautan</th><th>Aksi</th></tr></thead><tbody>
      ${list.map((s) => `<tr>
        <td style="min-width:240px"><a href="javascript:void(0)" data-detail="${s.id}" class="title">${esc(s.judul)}</a><br><small class="muted">${esc(s.jenis || "")}</small></td>
        <td><span class="badge b-navy">${esc(s.unit?.kode)}</span></td>
        <td><small>${esc(jadwalText(s))}</small><br>${deadlineBadge(s)}</td>
        <td style="min-width:160px">${linksHtml(s.pub)}<small class="muted">${countLinks(s.pub)} tautan</small></td>
        <td style="white-space:nowrap">
          <button class="btn btn-outline btn-sm" data-links="${s.id}">🔗 Kelola Tautan</button>
          ${actionsFor(s).filter((a) => a.aksi === "lanjut").map((a) => `<button class="btn ${a.cls} btn-sm" data-lanjut="${s.id}" title="${esc(a.label)}">${s.tahap === 9 ? "✓ Selesai" : "Lanjut →"}</button>`).join("")}
        </td></tr>`).join("")}
      </tbody></table></div>` : '<div class="empty">Tidak ada data.</div>'}`;
    $$("[data-tab]", view).forEach((b) => b.addEventListener("click", () => { cur = b.dataset.tab; draw(); }));
    $$("[data-links]", view).forEach((b) => b.addEventListener("click", () => linksForm(S.surveys.find((s) => s.id === Number(b.dataset.links)))));
    $$("[data-lanjut]", view).forEach((b) => b.addEventListener("click", () => {
      const s = S.surveys.find((x) => x.id === Number(b.dataset.lanjut));
      if (s.tahap === 9 && !countLinks(s.pub)) return toast("Isi minimal satu tautan publikasi sebelum menandai selesai.", "error");
      actionDialog(s, "lanjut", b.title);
    }));
    bindDetail(view);
  };
  draw();
};

// ---------- Jadwal ----------
PAGES.jadwal = async (view) => {
  const today = todayISO();
  const events = [];
  for (const s of S.surveys) {
    if (s.status === "ditolak") continue;
    if (s.jadwal_publikasi)
      events.push({ date: s.jadwal_publikasi, surveyId: s.id, title: `📣 ${s.unit?.kode} · ${s.judul}`, type: s.status === "selesai" ? "done" : s.jadwal_publikasi < today ? "overdue" : "pub" });
    for (const sc of s.schedule || []) {
      if (!sc.rencana_selesai || (sc.tahap === 9 && sc.rencana_selesai === s.jadwal_publikasi)) continue;
      const done = sc.aktual_selesai || s.status === "selesai" || sc.tahap < s.tahap;
      events.push({ date: sc.rencana_selesai, surveyId: s.id, title: `[${STAGES[sc.tahap - 1].singkat}] ${s.unit?.kode} · ${s.judul}`, type: done ? "done" : sc.rencana_selesai < today ? "overdue" : "deadline" });
    }
  }
  view.innerHTML = `<div class="card"><div class="card-head"><div><h3>Kalender Jadwal Survei &amp; Publikasi</h3><p>Klik tanggal (atau bulan pada tampilan Tahunan) untuk melihat survei yang dijadwalkan.</p></div></div><div id="cal"></div></div>`;
  mountCalendar($("#cal"), {
    events,
    onSelect: (evs, label) => {
      const m = openModal({
        title: `Jadwal · ${esc(label)}`,
        body: evs.length ? evs.map((e) => {
          const s = S.surveys.find((x) => x.id === e.surveyId);
          return `<div class="reminder" data-id="${s.id}"><div class="days cal-ev ev-${e.type}">${fmtDate(e.date, { day: "numeric", month: "short" })}</div><div class="info"><strong>${esc(e.title)}</strong><small class="muted">Posisi saat ini: ${esc(stageName(s.tahap))}</small></div>${statusBadge(s.status)}</div>`;
        }).join("") : '<p class="muted" style="margin:0">Tidak ada jadwal.</p>',
      });
      $$("[data-id]", m.el).forEach((r) => r.addEventListener("click", () => { m.close(); showDetail(Number(r.dataset.id)); }));
    },
  });
};

// ---------- Pengumuman ----------
PAGES.pengumuman = async (view) => {
  const { data, error } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  view.innerHTML = `
    <div class="card-head"><div><h3>Pengumuman</h3><p>Pengumuman publik tampil di dashboard utama; pengumuman internal hanya di portal.</p></div><button class="btn btn-gold" id="a-new">＋ Pengumuman Baru</button></div>
    <div class="card">${data.length ? `<div class="table-wrap"><table><thead><tr><th>Judul</th><th>Kategori</th><th>Tampil</th><th>Berlaku hingga</th><th>Dibuat</th><th></th></tr></thead><tbody>
      ${data.map((a) => `<tr><td><b>${esc(a.judul)}</b><br><small class="muted">${esc(a.isi.slice(0, 120))}${a.isi.length > 120 ? "…" : ""}</small></td>
        <td><span class="badge ${a.kategori === "penting" ? "b-red" : a.kategori === "deadline" ? "b-gold" : "b-blue"}">${esc(a.kategori)}</span></td>
        <td>${a.tampil_publik ? "🌐 Publik" : "🔒 Internal"}</td><td>${fmtDate(a.berlaku_hingga)}</td><td>${fmtDate(a.created_at)}</td>
        <td style="white-space:nowrap"><button class="btn btn-outline btn-sm" data-edit="${a.id}">Edit</button> <button class="btn btn-outline btn-sm" data-del="${a.id}">Hapus</button></td></tr>`).join("")}
    </tbody></table></div>` : '<div class="empty">Belum ada pengumuman.</div>'}</div>`;

  const form = (a = {}) => {
    const m = openModal({
      title: a.id ? "Edit Pengumuman" : "Pengumuman Baru",
      body: `<div class="field"><label>Judul *</label><input class="input" id="p-judul" value="${esc(a.judul)}" /></div>
        <div class="field"><label>Isi *</label><textarea class="input" id="p-isi" style="min-height:120px">${esc(a.isi)}</textarea></div>
        <div class="form-row">
          <div class="field"><label>Kategori</label><select class="input" id="p-kat">${["info", "penting", "deadline"].map((k) => `<option ${a.kategori === k ? "selected" : ""}>${k}</option>`).join("")}</select></div>
          <div class="field"><label>Berlaku hingga</label><input class="input" type="date" id="p-until" value="${a.berlaku_hingga ?? ""}" /></div>
        </div>
        <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="p-pub" ${a.tampil_publik !== false ? "checked" : ""}/> Tampilkan di dashboard publik</label>`,
      footer: `<button class="btn btn-outline" data-close>Batal</button><button class="btn btn-primary" id="p-save">Simpan</button>`,
    });
    $("#p-save", m.el).onclick = async () => {
      const payload = { judul: $("#p-judul", m.el).value.trim(), isi: $("#p-isi", m.el).value.trim(), kategori: $("#p-kat", m.el).value, berlaku_hingga: $("#p-until", m.el).value || null, tampil_publik: $("#p-pub", m.el).checked };
      if (!payload.judul || !payload.isi) return toast("Judul dan isi wajib diisi.", "error");
      const { error } = a.id ? await supabase.from("announcements").update(payload).eq("id", a.id) : await supabase.from("announcements").insert(payload);
      if (error) return toast(errMsg(error), "error");
      m.close(); toast("Pengumuman tersimpan.", "success"); route();
    };
  };
  $("#a-new").onclick = () => form();
  $$("[data-edit]", view).forEach((b) => b.addEventListener("click", () => form(data.find((a) => a.id === Number(b.dataset.edit)))));
  $$("[data-del]", view).forEach((b) => b.addEventListener("click", async () => {
    if (!(await confirmDialog("Hapus pengumuman ini?", { danger: true, okText: "Hapus" }))) return;
    const { error } = await supabase.from("announcements").delete().eq("id", Number(b.dataset.del));
    if (error) return toast(errMsg(error), "error");
    toast("Pengumuman dihapus.", "success"); route();
  }));
};

// ---------- Pengguna (Admin) ----------
PAGES.pengguna = async (view) => {
  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  const unitOpts = (sel) => `<option value="">- tidak ada -</option>` + S.units.map((u) => `<option value="${u.id}" ${u.id === sel ? "selected" : ""}>${esc(u.kode)}</option>`).join("");
  const roleOpts = (sel) => `<option value="">- belum aktif -</option>` + Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${k === sel ? "selected" : ""}>${v}</option>`).join("");
  view.innerHTML = `
    <div class="card-head"><div><h3>Manajemen Pengguna</h3><p>Atur role &amp; unit kerja setiap akun. Role <b>Unit Kerja</b> wajib memiliki unit.</p></div><button class="btn btn-gold" id="u-new">＋ Tambah Pengguna</button></div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>Nama / Email</th><th>Role</th><th>Unit</th><th>Aktif</th><th></th></tr></thead><tbody>
      ${data.map((p) => `<tr data-id="${p.id}">
        <td><input class="input" data-f="nama" value="${esc(p.nama)}" style="min-width:180px" /><small class="muted">${esc(p.email)}</small></td>
        <td><select class="input" data-f="role">${roleOpts(p.role)}</select></td>
        <td><select class="input" data-f="unit_id">${unitOpts(p.unit_id)}</select></td>
        <td><input type="checkbox" data-f="aktif" ${p.aktif ? "checked" : ""} ${p.id === S.me.id ? "disabled" : ""}/></td>
        <td><button class="btn btn-primary btn-sm" data-save>Simpan</button></td></tr>`).join("")}
    </tbody></table></div></div>`;

  $$("[data-save]", view).forEach((b) => b.addEventListener("click", async () => {
    const tr = b.closest("tr");
    const payload = {
      nama: $("[data-f=nama]", tr).value.trim() || null,
      role: $("[data-f=role]", tr).value || null,
      unit_id: Number($("[data-f=unit_id]", tr).value) || null,
      aktif: $("[data-f=aktif]", tr).checked,
    };
    if (payload.role === "unit_kerja" && !payload.unit_id) return toast("Role Unit Kerja wajib memilih unit.", "error");
    const { error } = await supabase.from("profiles").update(payload).eq("id", tr.dataset.id);
    if (error) return toast(errMsg(error), "error");
    toast("Pengguna diperbarui.", "success");
  }));

  $("#u-new").onclick = () => {
    const m = openModal({
      title: "Tambah Pengguna",
      body: `<div class="form-row">
          <div class="field"><label>Nama *</label><input class="input" id="n-nama" /></div>
          <div class="field"><label>Email *</label><input class="input" id="n-email" type="email" /></div>
          <div class="field"><label>Password awal *</label><input class="input" id="n-pass" type="text" placeholder="min. 8 karakter" /></div>
          <div class="field"><label>Role *</label><select class="input" id="n-role">${roleOpts("unit_kerja")}</select></div>
          <div class="field"><label>Unit</label><select class="input" id="n-unit">${unitOpts(null)}</select></div>
        </div>
        <div class="alert alert-info">Akun dibuat lewat fungsi server Vercel (<code>/api/create-user</code>). Bila belum di-deploy, buat user melalui Supabase Dashboard › Authentication › Add user, lalu atur role-nya di tabel ini.</div>`,
      footer: `<button class="btn btn-outline" data-close>Batal</button><button class="btn btn-primary" id="n-save">Buat Akun</button>`,
    });
    $("#n-save", m.el).onclick = async () => {
      const body = { nama: $("#n-nama", m.el).value.trim(), email: $("#n-email", m.el).value.trim(), password: $("#n-pass", m.el).value, role: $("#n-role", m.el).value, unit_id: Number($("#n-unit", m.el).value) || null };
      if (!body.nama || !body.email || body.password.length < 8 || !body.role) return toast("Lengkapi data (password min. 8 karakter).", "error");
      if (body.role === "unit_kerja" && !body.unit_id) return toast("Role Unit Kerja wajib memilih unit.", "error");
      $("#n-save", m.el).disabled = true;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const r = await fetch("/api/create-user", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(body) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || (r.status === 404 ? "Endpoint /api/create-user belum tersedia (jalankan di Vercel)." : `Gagal (${r.status})`));
        m.close(); toast("Akun berhasil dibuat.", "success"); route();
      } catch (e) {
        $("#n-save", m.el).disabled = false;
        toast(errMsg(e), "error", 6000);
      }
    };
  };
};

// ---------- Unit Kerja (Admin) ----------
PAGES.unit = async (view) => {
  view.innerHTML = `
    <div class="card-head"><div><h3>Master Unit Kerja</h3><p>Kode dipakai sebagai label singkat di seluruh dashboard.</p></div><button class="btn btn-gold" id="un-new">＋ Tambah Unit</button></div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>Kode</th><th>Nama lengkap</th><th>Aktif</th><th>Jumlah survei</th><th></th></tr></thead><tbody>
      ${S.units.map((u) => `<tr data-id="${u.id}"><td><input class="input" data-f="kode" value="${esc(u.kode)}" /></td><td><input class="input" data-f="nama" value="${esc(u.nama)}" /></td>
        <td><input type="checkbox" data-f="aktif" ${u.aktif ? "checked" : ""}/></td><td>${S.surveys.filter((s) => s.unit_id === u.id).length}</td>
        <td><button class="btn btn-primary btn-sm" data-save>Simpan</button></td></tr>`).join("")}
    </tbody></table></div></div>`;
  const reloadUnits = async () => { S.units = (await supabase.from("units").select("*").order("kode")).data || []; route(); };
  $$("[data-save]", view).forEach((b) => b.addEventListener("click", async () => {
    const tr = b.closest("tr");
    const payload = { kode: $("[data-f=kode]", tr).value.trim(), nama: $("[data-f=nama]", tr).value.trim(), aktif: $("[data-f=aktif]", tr).checked };
    if (!payload.kode || !payload.nama) return toast("Kode dan nama wajib diisi.", "error");
    const { error } = await supabase.from("units").update(payload).eq("id", Number(tr.dataset.id));
    if (error) return toast(errMsg(error), "error");
    toast("Unit diperbarui.", "success"); reloadUnits();
  }));
  $("#un-new").onclick = () => {
    const m = openModal({
      title: "Tambah Unit Kerja",
      body: `<div class="field"><label>Kode *</label><input class="input" id="un-kode" placeholder="mis. SKPP" /></div><div class="field"><label>Nama lengkap *</label><input class="input" id="un-nama" /></div>`,
      footer: `<button class="btn btn-outline" data-close>Batal</button><button class="btn btn-primary" id="un-save">Simpan</button>`,
    });
    $("#un-save", m.el).onclick = async () => {
      const payload = { kode: $("#un-kode", m.el).value.trim(), nama: $("#un-nama", m.el).value.trim() };
      if (!payload.kode || !payload.nama) return toast("Kode dan nama wajib diisi.", "error");
      const { error } = await supabase.from("units").insert(payload);
      if (error) return toast(errMsg(error), "error");
      m.close(); toast("Unit ditambahkan.", "success"); reloadUnits();
    };
  };
};

// ---------- Akun Saya ----------
PAGES.akun = async (view) => {
  view.innerHTML = `
    ${S.recovery ? '<div class="alert alert-warn">Anda masuk melalui tautan reset password. Silakan buat password baru di bawah.</div>' : ""}
    <div class="grid grid-2">
      <div class="card"><div class="card-head"><h3>Profil</h3></div>
        <dl class="kv" style="margin-bottom:16px"><dt>Email</dt><dd>${esc(S.me.email)}</dd><dt>Role</dt><dd>${esc(ROLES[role()])}</dd><dt>Unit</dt><dd>${esc(S.me.unit ? S.me.unit.kode + " — " + S.me.unit.nama : "-")}</dd></dl>
        <div class="field"><label>Nama tampilan</label><input class="input" id="ak-nama" value="${esc(S.me.nama)}" /></div>
        <button class="btn btn-primary" id="ak-save">Simpan Profil</button></div>
      <div class="card"><div class="card-head"><h3>Ubah Password</h3></div>
        <div class="field"><label>Password baru</label><input class="input" type="password" id="ak-p1" autocomplete="new-password" /></div>
        <div class="field"><label>Ulangi password baru</label><input class="input" type="password" id="ak-p2" autocomplete="new-password" /></div>
        <button class="btn btn-primary" id="ak-pass">Ubah Password</button></div>
    </div>`;
  $("#ak-save").onclick = async () => {
    const nama = $("#ak-nama").value.trim();
    const { error } = await supabase.from("profiles").update({ nama }).eq("id", S.me.id);
    if (error) return toast(errMsg(error), "error");
    S.me.nama = nama; $("#u-nama").textContent = nama; toast("Profil tersimpan.", "success");
  };
  $("#ak-pass").onclick = async () => {
    const p1 = $("#ak-p1").value, p2 = $("#ak-p2").value;
    if (p1.length < 8) return toast("Password minimal 8 karakter.", "error");
    if (p1 !== p2) return toast("Konfirmasi password tidak sama.", "error");
    const { error } = await supabase.auth.updateUser({ password: p1 });
    if (error) return toast(errMsg(error), "error");
    S.recovery = false; $("#ak-p1").value = $("#ak-p2").value = ""; toast("Password berhasil diubah.", "success");
  };
};

boot();
