// =====================================================================
//  Modul bersama: client Supabase, konstanta, dan helper UI
// =====================================================================
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const isConfigured = !SUPABASE_URL.includes("YOUR-PROJECT") && !SUPABASE_ANON_KEY.includes("YOUR-");

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// ---------------------------------------------------------------------
// Konstanta domain
// ---------------------------------------------------------------------
export const STAGES = [
  { tahap: 1, nama: "Usulan Kegiatan", singkat: "Usulan", pelaksana: "Unit Kerja" },
  { tahap: 2, nama: "Persetujuan Kegiatan", singkat: "ACC Usulan", pelaksana: "Deputi / Kepala", approval: true },
  { tahap: 3, nama: "Penyusunan Desain Kegiatan", singkat: "Desain", pelaksana: "Unit Kerja" },
  { tahap: 4, nama: "Persetujuan Desain", singkat: "ACC Desain", pelaksana: "Deputi / Kepala", approval: true },
  { tahap: 5, nama: "Publikasi Awal", singkat: "Publikasi Awal", pelaksana: "Unit Kerja / Humas" },
  { tahap: 6, nama: "Pengumpulan & Analisis Data", singkat: "Pengumpulan Data", pelaksana: "Unit Kerja" },
  { tahap: 7, nama: "Penyusunan Laporan", singkat: "Laporan", pelaksana: "Unit Kerja" },
  { tahap: 8, nama: "Persetujuan Laporan", singkat: "ACC Laporan", pelaksana: "Deputi / Kepala", approval: true },
  { tahap: 9, nama: "Publikasi Akhir", singkat: "Publikasi Akhir", pelaksana: "Humas" },
  { tahap: 10, nama: "Selesai", singkat: "Selesai", pelaksana: "-" },
];
export const stageName = (t) => STAGES.find((s) => s.tahap === t)?.nama ?? `Tahap ${t}`;

export const STATUS = {
  draft: { label: "Draft", cls: "b-gray" },
  menunggu_persetujuan: { label: "Menunggu Persetujuan", cls: "b-purple" },
  revisi: { label: "Perlu Revisi", cls: "b-orange" },
  berjalan: { label: "Berjalan", cls: "b-blue" },
  selesai: { label: "Selesai", cls: "b-green" },
  ditolak: { label: "Ditolak", cls: "b-red" },
};

export const ROLES = {
  admin: "Admin",
  unit_kerja: "Unit Kerja",
  admin_dspk: "Admin DSPK2AN",
  deputi: "Deputi",
  kepala_lan: "Kepala LAN",
  humas: "Humas",
};

export const KLASTER = ["Prioritas Presiden", "Tata Kelola & Manajemen ASN", "Pelayanan Publik", "Digitalisasi"];
export const JENIS = ["Policy Brief", "Policy Paper", "Laporan", "Buku", "Artikel", "Jurnal/Penelitian", "Jurnal/Penelitian Kolaborasi", "Infografis", "Podcast/Video"];

export const KANAL = [
  { key: "jurnal", label: "Jurnal", cls: "jurnal", icon: "📘" },
  { key: "media_online", label: "Media Online", cls: "media", icon: "📰" },
  { key: "web_lan", label: "Web LAN", cls: "web", icon: "🌐" },
  { key: "web_unit", label: "Web Unit", cls: "web", icon: "🌐" },
  { key: "ig_lan", label: "IG LAN", cls: "ig", icon: "📷" },
  { key: "ig_unit", label: "IG Unit", cls: "ig", icon: "📷" },
  { key: "yt_lan", label: "YT LAN", cls: "yt", icon: "▶" },
  { key: "yt_unit", label: "YT Unit", cls: "yt", icon: "▶" },
];

export const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

// ---------------------------------------------------------------------
// Helper format
// ---------------------------------------------------------------------
export const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function fmtDate(d, opts = { day: "numeric", month: "short", year: "numeric" }) {
  if (!d) return "-";
  const dt = typeof d === "string" && d.length === 10 ? new Date(d + "T00:00:00") : new Date(d);
  return isNaN(dt) ? "-" : dt.toLocaleDateString("id-ID", opts);
}
export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function daysUntil(iso) {
  if (!iso) return null;
  return Math.round((new Date(iso + "T00:00:00") - new Date(todayISO() + "T00:00:00")) / 86400000);
}
export function jadwalText(s) {
  if (s.jadwal_publikasi) return fmtDate(s.jadwal_publikasi, { month: "long", year: "numeric" }) + (s.jadwal_label?.includes("(") ? ` · Minggu ${s.jadwal_label.match(/\((\d)\)/)?.[1] ?? ""}` : "");
  return s.jadwal_label || "-";
}

export const statusBadge = (st) => `<span class="badge ${STATUS[st]?.cls ?? "b-gray"}">${esc(STATUS[st]?.label ?? st)}</span>`;

export function stepperMini(tahap, status) {
  let html = '<div class="stepper-mini">';
  for (let i = 1; i <= 9; i++) {
    let c = "";
    if (status === "selesai" || i < tahap) c = "done";
    else if (i === tahap) c = status === "revisi" ? "revisi" : status === "ditolak" ? "ditolak" : "current";
    html += `<span class="${c}" title="${esc(stageName(i))}"></span>`;
  }
  return html + `</div><div class="stepper-caption">${tahap}/10 · ${esc(stageName(tahap))}</div>`;
}

export function stepperFull(tahap, status, schedule = []) {
  const byT = Object.fromEntries(schedule.map((x) => [x.tahap, x]));
  return (
    '<div class="stepper">' +
    STAGES.map((s) => {
      let c = "";
      if (status === "selesai" || s.tahap < tahap) c = "done";
      else if (s.tahap === tahap) c = status === "revisi" || status === "ditolak" ? "revisi" : "current";
      const sc = byT[s.tahap];
      let sub = esc(s.pelaksana);
      if (sc?.aktual_selesai) sub += ` · selesai ${fmtDate(sc.aktual_selesai)}`;
      else if (sc?.rencana_selesai) {
        const d = daysUntil(sc.rencana_selesai);
        sub += ` · target ${fmtDate(sc.rencana_selesai)}` + (c === "current" && d !== null ? (d < 0 ? ` <b style="color:var(--red-600)">(lewat ${-d} hari)</b>` : ` <b>(H-${d})</b>`) : "");
      }
      return `<div class="step ${c}"><div class="step-dot">${c === "done" ? "✓" : s.tahap}</div><div class="step-body"><strong>${esc(s.nama)}</strong><small class="muted">${sub}</small></div></div>`;
    }).join("") +
    "</div>"
  );
}

export function linksHtml(row, { empty = '<span class="muted">-</span>' } = {}) {
  const chips = [];
  for (const k of KANAL) {
    const urls = String(row?.[k.key] ?? "").split(/\s*\n\s*/).filter((u) => /^https?:\/\//i.test(u));
    urls.forEach((u, i) =>
      chips.push(`<a class="chip ${k.cls}" href="${esc(u)}" target="_blank" rel="noopener" title="${esc(u)}">${k.icon} ${k.label}${urls.length > 1 ? " " + (i + 1) : ""}</a>`)
    );
  }
  return chips.length ? `<div class="links">${chips.join("")}</div>` : empty;
}
export const countLinks = (row) =>
  KANAL.reduce((n, k) => n + String(row?.[k.key] ?? "").split(/\s*\n\s*/).filter((u) => /^https?:\/\//i.test(u)).length, 0);

// ---------------------------------------------------------------------
// Helper UI: toast, modal, loader
// ---------------------------------------------------------------------
export function toast(msg, type = "info", ms = 3500) {
  let root = document.getElementById("toast-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "toast-root";
    document.body.appendChild(root);
  }
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

/** Membuka modal. Mengembalikan { el, close }. */
export function openModal({ title, subtitle = "", body = "", footer = "", size = "" }) {
  const ov = document.createElement("div");
  ov.className = "overlay";
  ov.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true">
      <div class="modal-head"><div><h3>${title}</h3>${subtitle ? `<small class="muted">${subtitle}</small>` : ""}</div>
      <button class="x-btn" data-close aria-label="Tutup">×</button></div>
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-foot">${footer}</div>` : ""}
    </div>`;
  const close = () => {
    ov.remove();
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (e) => e.key === "Escape" && close();
  ov.addEventListener("click", (e) => {
    if (e.target === ov || e.target.closest("[data-close]")) close();
  });
  document.addEventListener("keydown", onKey);
  document.body.appendChild(ov);
  return { el: ov, close };
}

export function confirmDialog(message, { okText = "Ya, lanjutkan", danger = false } = {}) {
  return new Promise((resolve) => {
    const m = openModal({
      title: "Konfirmasi",
      body: `<p style="margin:0">${message}</p>`,
      footer: `<button class="btn btn-outline" data-close>Batal</button><button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-ok>${okText}</button>`,
    });
    m.el.querySelector("[data-ok]").onclick = () => { m.close(); resolve(true); };
    m.el.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => resolve(false)));
  });
}

export const loaderHtml = (text = "Memuat data...") => `<div class="loader"><div class="spinner"></div>${esc(text)}</div>`;

export function configWarning() {
  return `<div class="alert alert-warn"><b>Supabase belum dikonfigurasi.</b> Isi <code>SUPABASE_URL</code> dan <code>SUPABASE_ANON_KEY</code> pada file <code>assets/js/config.js</code>. Lihat README.md.</div>`;
}

export function errMsg(e) {
  const m = e?.message || String(e);
  if (/Invalid login credentials/i.test(m)) return "Email atau password salah.";
  if (/Email not confirmed/i.test(m)) return "Email belum dikonfirmasi.";
  if (/Failed to fetch/i.test(m)) return "Tidak dapat terhubung ke server. Periksa koneksi internet / konfigurasi Supabase.";
  return m;
}
