// =====================================================================
//  Dashboard publik (index.html)
//  Sumber data: view public.public_surveys (dapat dibaca tanpa login)
// =====================================================================
import {
  supabase, isConfigured, configWarning, STAGES, STATUS, KANAL, BULAN, esc, fmtDate, jadwalText,
  statusBadge, stepperMini, stepperFull, linksHtml, countLinks, openModal, loaderHtml, todayISO, errMsg,
} from "./lib.js";
import { mountCalendar } from "./calendar.js";

const $ = (s) => document.querySelector(s);
const state = { all: [], filtered: [], stage: null, unitFocus: null, viewMode: "table", charts: {} };

document.getElementById("year").textContent = new Date().getFullYear();

async function init() {
  if (!isConfigured) {
    $("#config-alert").innerHTML = configWarning();
    return;
  }
  $("#tbody").innerHTML = `<tr><td colspan="8">${loaderHtml()}</td></tr>`;

  const [surveys, ann] = await Promise.all([
    supabase.from("public_surveys").select("*").order("tahun", { ascending: false }).order("jadwal_publikasi", { ascending: true, nullsFirst: false }),
    supabase.from("announcements").select("*").eq("tampil_publik", true).order("created_at", { ascending: false }).limit(3),
  ]);
  if (surveys.error) {
    $("#tbody").innerHTML = `<tr><td colspan="8" class="empty">Gagal memuat data: ${esc(errMsg(surveys.error))}</td></tr>`;
    return;
  }
  state.all = surveys.data;
  renderAnnouncements(ann.data || []);
  fillFilters();
  applyFilters();
}

function renderAnnouncements(list) {
  $("#announcements").innerHTML = list
    .map((a) => `<div class="announce ${esc(a.kategori)}"><h4>📢 ${esc(a.judul)} <small class="muted">${fmtDate(a.created_at)}</small></h4><p>${esc(a.isi)}</p></div>`)
    .join("");
}

function fillFilters() {
  const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort();
  const opt = (v, l = v) => `<option value="${esc(v)}">${esc(l)}</option>`;
  const years = uniq(state.all.map((s) => s.tahun)).reverse();
  const units = uniq(state.all.map((s) => s.unit_kode));

  // Render Unit Pills (Fokus Unit)
  const pillsEl = $("#unit-pills");
  if (pillsEl) {
    pillsEl.innerHTML = `<button class="unit-pill ${!state.unitFocus ? "active" : ""}" data-unit="">Semua Unit</button>` +
      units.map((u) => `<button class="unit-pill ${state.unitFocus === u ? "active" : ""}" data-unit="${esc(u)}">${esc(u)}</button>`).join("");
    
    pillsEl.querySelectorAll("[data-unit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.unitFocus = btn.dataset.unit || null;
        $("#f-unit").value = state.unitFocus || "";
        pillsEl.querySelectorAll(".unit-pill").forEach((p) => p.classList.toggle("active", p === btn));
        applyFilters();
      });
    });
  }

  $("#f-tahun").innerHTML += years.map((y) => opt(y)).join("");
  $("#f-unit").innerHTML += units.map((u) => opt(u)).join("");
  $("#f-klaster").innerHTML += uniq(state.all.map((s) => s.klaster_1)).map((k) => opt(k)).join("");
  $("#f-status").innerHTML += Object.entries(STATUS).filter(([k]) => !["draft", "ditolak"].includes(k)).map(([k, v]) => opt(k, v.label)).join("");

  // default: tahun berjalan bila tersedia
  const thisYear = String(new Date().getFullYear());
  if (years.map(String).includes(thisYear)) $("#f-tahun").value = thisYear;

  // View Mode Tabs (Tabel vs Kartu)
  document.querySelectorAll("#view-mode-tabs .tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#view-mode-tabs .tab").forEach((b) => b.classList.toggle("active", b === btn));
      state.viewMode = btn.dataset.mode;
      const isTable = state.viewMode === "table";
      $("#table-wrap").classList.toggle("hidden", !isTable);
      $("#card-grid").classList.toggle("hidden", isTable);
    });
  });

  $("#f-unit").addEventListener("change", (e) => {
    state.unitFocus = e.target.value || null;
    pillsEl?.querySelectorAll(".unit-pill").forEach((p) => p.classList.toggle("active", (p.dataset.unit || "") === (state.unitFocus || "")));
  });

  ["#f-search", "#f-tahun", "#f-unit", "#f-klaster", "#f-status"].forEach((id) => $(id).addEventListener("input", applyFilters));
  $("#f-reset").onclick = () => {
    ["#f-search", "#f-tahun", "#f-unit", "#f-klaster", "#f-status"].forEach((id) => ($(id).value = ""));
    state.stage = null;
    state.unitFocus = null;
    pillsEl?.querySelectorAll(".unit-pill").forEach((p) => p.classList.toggle("active", (p.dataset.unit || "") === ""));
    applyFilters();
  };
}

function applyFilters() {
  const q = $("#f-search").value.trim().toLowerCase();
  const tahun = $("#f-tahun").value, unit = $("#f-unit").value, klaster = $("#f-klaster").value, status = $("#f-status").value;
  const base = state.all.filter(
    (s) =>
      (!q || s.judul.toLowerCase().includes(q)) &&
      (!tahun || String(s.tahun) === tahun) &&
      (!unit || s.unit_kode === unit || (s.kolaborasi_kode || []).includes(unit)) &&
      (!klaster || s.klaster_1 === klaster) &&
      (!status || s.status === status)
  );
  state.base = base;
  state.filtered = state.stage ? base.filter((s) => s.tahap === state.stage) : base;
  renderKpis(base);
  renderPipeline(base);
  renderTable();
  renderCharts(base);
  renderCalendar();
}

function renderKpis(list) {
  const selesai = list.filter((s) => s.status === "selesai").length;
  const menunggu = list.filter((s) => s.status === "menunggu_persetujuan").length;
  const berjalan = list.length - selesai;
  const links = list.reduce((n, s) => n + countLinks(s), 0);
  const items = [
    ["📊", "b-navy", list.length, "Total Survei"],
    ["✅", "b-green", selesai, "Selesai & Terpublikasi"],
    ["⏳", "b-blue", berjalan, "Sedang Berjalan"],
    ["🖊️", "b-purple", menunggu, "Menunggu Persetujuan"],
    ["🔗", "b-gold", links, "Tautan Publikasi"],
  ];
  $("#kpis").innerHTML = items
    .map(([i, c, v, l]) => `<div class="card kpi"><div class="kpi-icon badge ${c}">${i}</div><div><div class="kpi-value">${v}</div><div class="kpi-label">${l}</div></div></div>`)
    .join("");
}

function renderPipeline(list) {
  $("#pipeline").innerHTML = STAGES.map((st) => {
    const n = list.filter((s) => s.tahap === st.tahap).length;
    const cls = [st.approval ? "approval" : "", st.tahap === 10 ? "final" : "", state.stage === st.tahap ? "active" : ""].join(" ");
    return `<div class="pipe ${cls}" data-stage="${st.tahap}" title="${esc(st.nama)} · ${esc(st.pelaksana)}"><div class="n">${n}</div><div class="l">${st.tahap}. ${esc(st.singkat)}</div></div>`;
  }).join("");
  $("#pipeline").querySelectorAll("[data-stage]").forEach((el) =>
    el.addEventListener("click", () => {
      const t = Number(el.dataset.stage);
      state.stage = state.stage === t ? null : t;
      applyFilters();
    })
  );
}

function renderTable() {
  const rows = state.filtered;
  $("#table-info").textContent = `Menampilkan ${rows.length} survei` + (state.stage ? ` pada tahap "${STAGES[state.stage - 1].nama}" (klik tahap lagi untuk membatalkan)` : "");
  if (!rows.length) {
    $("#tbody").innerHTML = `<tr><td colspan="8" class="empty">Tidak ada survei yang sesuai filter.</td></tr>`;
    $("#card-grid").innerHTML = `<div class="card empty span-2" style="grid-column:1/-1">Tidak ada survei yang sesuai filter.</div>`;
    return;
  }
  $("#tbody").innerHTML = rows
    .map((s, i) => {
      const kolab = (s.kolaborasi_kode || []).length ? `<br><small class="muted">+ ${esc(s.kolaborasi_kode.join(", "))}</small>` : "";
      return `<tr class="clickable" data-id="${s.id}">
        <td>${i + 1}</td>
        <td style="min-width:260px"><div class="title">${esc(s.judul)}</div>${s.jenis ? `<small class="muted">${esc(s.jenis)}</small>` : ""}</td>
        <td><span class="badge b-navy">${esc(s.unit_kode)}</span>${kolab}</td>
        <td><small>${esc(s.klaster_1 || "-")}</small></td>
        <td><small>${esc(jadwalText(s))}</small></td>
        <td>${stepperMini(s.tahap, s.status)}</td>
        <td>${statusBadge(s.status)}</td>
        <td style="min-width:160px">${linksHtml(s)}</td>
      </tr>`;
    })
    .join("");

  // Render Card Grid
  $("#card-grid").innerHTML = rows
    .map((s) => {
      const kolab = (s.kolaborasi_kode || []).length ? `<span class="badge b-gray">+${esc(s.kolaborasi_kode.join(", "))}</span>` : "";
      return `<div class="survey-card" data-id="${s.id}">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px">
            <div style="display:flex;gap:4px;flex-wrap:wrap">
              <span class="badge b-navy">${esc(s.unit_kode)}</span>
              ${kolab}
            </div>
            ${statusBadge(s.status)}
          </div>
          <h4 style="font-size:14px;font-weight:700;line-height:1.3;margin-bottom:6px">${esc(s.judul)}</h4>
          <p class="muted" style="font-size:11.5px;margin:0 0 10px">${esc(s.jenis || "Survei")}${s.klaster_1 ? ` · ${esc(s.klaster_1)}` : ""} · Thn ${s.tahun}</p>
        </div>
        <div>
          <div style="margin-bottom:8px">${stepperMini(s.tahap, s.status)}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--gray-500);border-top:1px solid var(--gray-200);padding-top:8px">
            <span>📅 ${esc(jadwalText(s))}</span>
            <span>${countLinks(s)} link</span>
          </div>
        </div>
      </div>`;
    })
    .join("");

  document.querySelectorAll("[data-id]").forEach((el) =>
    el.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      showDetail(Number(el.dataset.id));
    })
  );
}

function showDetail(id) {
  const s = state.all.find((x) => x.id === id);
  if (!s) return;
  openModal({
    size: "lg",
    title: esc(s.judul),
    subtitle: `${esc(s.unit_kode)}${(s.kolaborasi_kode || []).length ? " + " + esc(s.kolaborasi_kode.join(", ")) : ""} · Tahun ${s.tahun}`,
    body: `<div class="detail-grid">
      <div>
        <dl class="kv">
          <dt>Status</dt><dd>${statusBadge(s.status)}</dd>
          <dt>Tahap saat ini</dt><dd>${s.tahap}. ${esc(STAGES[s.tahap - 1].nama)}</dd>
          <dt>Jenis</dt><dd>${esc(s.jenis || "-")}</dd>
          <dt>Klaster</dt><dd>${esc([s.klaster_1, s.klaster_2].filter(Boolean).join(" · ") || "-")}</dd>
          <dt>Jadwal publikasi</dt><dd>${esc(jadwalText(s))}</dd>
          <dt>Pembaruan</dt><dd>${fmtDate(s.updated_at)}</dd>
        </dl>
        <div class="section-title">Tautan Publikasi</div>
        ${linksHtml(s, { empty: '<span class="muted">Belum ada tautan publikasi.</span>' })}
      </div>
      <div><div class="section-title" style="margin-top:0">Progres Tahapan</div>${stepperFull(s.tahap, s.status)}</div>
    </div>`,
  });
}

function renderCalendar() {
  const el = $("#calendar");
  const today = todayISO();
  const events = state.base
    .filter((s) => s.jadwal_publikasi)
    .map((s) => ({
      date: s.jadwal_publikasi,
      title: `${s.unit_kode} · ${s.judul}`,
      surveyId: s.id,
      type: s.status === "selesai" ? "done" : s.jadwal_publikasi < today ? "overdue" : "pub",
    }));
  mountCalendar(el, {
    events,
    onSelect: (evs, label) => {
      const m = openModal({
        title: `Jadwal Publikasi · ${esc(label)}`,
        body: evs.length
          ? evs
              .map((e) => {
                const s = state.all.find((x) => x.id === e.surveyId);
                return `<div class="reminder" data-id="${s.id}"><div class="days badge ${STATUS[s.status].cls}">${fmtDate(e.date, { day: "numeric", month: "short" })}</div><div class="info"><strong>${esc(s.judul)}</strong><small class="muted">${esc(s.unit_kode)} · ${esc(STAGES[s.tahap - 1].nama)}</small></div>${statusBadge(s.status)}</div>`;
              })
              .join("")
          : '<p class="muted" style="margin:0">Tidak ada jadwal publikasi pada periode ini.</p>',
      });
      m.el.querySelectorAll("[data-id]").forEach((r) => r.addEventListener("click", () => { m.close(); showDetail(Number(r.dataset.id)); }));
    },
  });
}

function renderCharts(list) {
  if (!window.Chart) return setTimeout(() => renderCharts(list), 200);
  const C = window.Chart;
  C.defaults.font.family = getComputedStyle(document.body).fontFamily;
  C.defaults.font.size = 11;
  const navy = "#0d3a6e", gold = "#f2a900", green = "#13895b";
  const draw = (id, cfg) => {
    state.charts[id]?.destroy();
    state.charts[id] = new C(document.getElementById(id), cfg);
  };

  // per unit
  const units = [...new Set(list.map((s) => s.unit_kode))].sort();
  draw("ch-unit", {
    type: "bar",
    data: {
      labels: units,
      datasets: [
        { label: "Selesai", data: units.map((u) => list.filter((s) => s.unit_kode === u && s.status === "selesai").length), backgroundColor: green, borderRadius: 4 },
        { label: "Berjalan", data: units.map((u) => list.filter((s) => s.unit_kode === u && s.status !== "selesai").length), backgroundColor: gold, borderRadius: 4 },
      ],
    },
    options: { maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true, ticks: { precision: 0 } } } },
  });

  // klaster
  const kl = {};
  list.forEach((s) => (kl[s.klaster_1 || "Lainnya"] = (kl[s.klaster_1 || "Lainnya"] || 0) + 1));
  draw("ch-klaster", {
    type: "doughnut",
    data: { labels: Object.keys(kl), datasets: [{ data: Object.values(kl), backgroundColor: [navy, gold, green, "#7546c9", "#2367d1", "#8592a6"] }] },
    options: { maintainAspectRatio: false, plugins: { legend: { position: "right" } }, cutout: "60%" },
  });

  // kanal
  draw("ch-kanal", {
    type: "bar",
    data: {
      labels: KANAL.map((k) => k.label),
      datasets: [{ label: "Tautan", data: KANAL.map((k) => list.reduce((n, s) => n + String(s[k.key] || "").split(/\n/).filter((u) => /^https?:/i.test(u.trim())).length, 0)), backgroundColor: navy, borderRadius: 4 }],
    },
    options: { indexAxis: "y", maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { precision: 0 } } } },
  });

  // per bulan
  const perBulan = BULAN.map((_, m) => list.filter((s) => s.jadwal_publikasi && new Date(s.jadwal_publikasi).getMonth() === m));
  draw("ch-bulan", {
    type: "bar",
    data: {
      labels: BULAN.map((b) => b.slice(0, 3)),
      datasets: [
        { label: "Selesai", data: perBulan.map((a) => a.filter((s) => s.status === "selesai").length), backgroundColor: green, borderRadius: 4 },
        { label: "Belum", data: perBulan.map((a) => a.filter((s) => s.status !== "selesai").length), backgroundColor: navy, borderRadius: 4 },
      ],
    },
    options: { maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true, ticks: { precision: 0 } } } },
  });
}

// Tabs
document.querySelectorAll("#main-tabs .tab").forEach((t) =>
  t.addEventListener("click", () => {
    document.querySelectorAll("#main-tabs .tab").forEach((x) => x.classList.toggle("active", x === t));
    $("#tab-tabel").classList.toggle("hidden", t.dataset.tab !== "tabel");
    $("#tab-kalender").classList.toggle("hidden", t.dataset.tab !== "kalender");
  })
);

// Ekspor CSV
$("#btn-csv").onclick = () => {
  const head = ["No", "Unit", "Kolaborasi", "Judul", "Jenis", "Tahun", "Klaster", "Jadwal", "Tahap", "Status", ...KANAL.map((k) => k.label)];
  const rows = state.filtered.map((s, i) => [
    i + 1, s.unit_kode, (s.kolaborasi_kode || []).join(", "), s.judul, s.jenis, s.tahun, s.klaster_1, jadwalText(s),
    STAGES[s.tahap - 1].nama, STATUS[s.status]?.label, ...KANAL.map((k) => (s[k.key] || "").replace(/\n/g, " | ")),
  ]);
  const csv = [head, ...rows].map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })),
    download: `rekap-publikasi-lan-${todayISO()}.csv`,
  });
  a.click();
};

init();
