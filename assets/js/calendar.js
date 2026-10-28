// =====================================================================
//  Komponen kalender (tampilan Bulanan & Tahunan)
//  event: { date: 'YYYY-MM-DD', title, type: 'pub'|'deadline'|'overdue'|'done', surveyId }
// =====================================================================
import { esc, BULAN, todayISO } from "./lib.js";

const DOW = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/**
 * @param {HTMLElement} el
 * @param {{events: any[], onSelect: (events:any[], label:string) => void, initialDate?: string}} opts
 */
export function mountCalendar(el, { events, onSelect, initialDate }) {
  const start = initialDate ? new Date(initialDate + "T00:00:00") : new Date();
  const state = { y: start.getFullYear(), m: start.getMonth(), view: "month" };
  const byDate = {};
  events.forEach((e) => (byDate[e.date] ||= []).push(e));

  function render() {
    const title = state.view === "month" ? `${BULAN[state.m]} ${state.y}` : `Tahun ${state.y}`;
    el.innerHTML = `
      <div class="cal-toolbar">
        <button class="btn btn-outline btn-sm" data-nav="-1" aria-label="Sebelumnya">‹</button>
        <h4>${title}</h4>
        <button class="btn btn-outline btn-sm" data-nav="1" aria-label="Berikutnya">›</button>
        <button class="btn btn-outline btn-sm" data-today>Hari ini</button>
        <span style="flex:1"></span>
        <div class="tabs" style="margin:0;border:0">
          <button class="tab ${state.view === "month" ? "active" : ""}" data-view="month">Bulanan</button>
          <button class="tab ${state.view === "year" ? "active" : ""}" data-view="year">Tahunan</button>
        </div>
      </div>
      ${state.view === "month" ? monthHtml() : yearHtml()}
      <div class="legend" style="margin-top:10px">
        <span><i class="ev-pub"></i>Jadwal publikasi</span>
        <span><i class="ev-deadline"></i>Deadline tahap</span>
        <span><i class="ev-overdue"></i>Terlambat</span>
        <span><i class="ev-done"></i>Sudah selesai</span>
      </div>`;

    el.querySelectorAll("[data-nav]").forEach((b) =>
      b.addEventListener("click", () => {
        const d = Number(b.dataset.nav);
        if (state.view === "year") state.y += d;
        else {
          state.m += d;
          if (state.m < 0) { state.m = 11; state.y--; }
          if (state.m > 11) { state.m = 0; state.y++; }
        }
        render();
      })
    );
    el.querySelector("[data-today]").onclick = () => {
      const t = new Date();
      state.y = t.getFullYear(); state.m = t.getMonth();
      render();
    };
    el.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => { state.view = b.dataset.view; render(); }));
    el.querySelectorAll("[data-date]").forEach((c) =>
      c.addEventListener("click", () => {
        const d = c.dataset.date;
        onSelect(byDate[d] || [], new Date(d + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
      })
    );
    el.querySelectorAll("[data-month]").forEach((c) =>
      c.addEventListener("click", (e) => {
        const m = Number(c.dataset.month);
        if (e.target.closest("[data-open-month]")) { state.m = m; state.view = "month"; render(); return; }
        const prefix = iso(state.y, m, 1).slice(0, 7);
        const list = events.filter((ev) => ev.date.startsWith(prefix)).sort((a, b) => a.date.localeCompare(b.date));
        onSelect(list, `${BULAN[m]} ${state.y}`);
      })
    );
  }

  function monthHtml() {
    const first = new Date(state.y, state.m, 1);
    const offset = (first.getDay() + 6) % 7; // Senin = 0
    const days = new Date(state.y, state.m + 1, 0).getDate();
    const prevDays = new Date(state.y, state.m, 0).getDate();
    const today = todayISO();
    let html = '<div class="cal-grid">' + DOW.map((d) => `<div class="cal-dow">${d}</div>`).join("");
    const total = Math.ceil((offset + days) / 7) * 7;
    for (let i = 0; i < total; i++) {
      let y = state.y, m = state.m, d = i - offset + 1, other = false;
      if (d < 1) { other = true; m--; d = prevDays + d; }
      else if (d > days) { other = true; m++; d = d - days; }
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      const key = iso(y, m, d);
      const evs = byDate[key] || [];
      html += `<div class="cal-day ${other ? "other" : ""} ${key === today ? "today" : ""}" data-date="${key}">
        <span class="cal-num">${d}</span>
        ${evs.slice(0, 3).map((e) => `<span class="cal-ev ev-${e.type}" title="${esc(e.title)}">${esc(e.title)}</span>`).join("")}
        ${evs.length > 3 ? `<div class="cal-more">+${evs.length - 3} lainnya</div>` : ""}
      </div>`;
    }
    return html + "</div>";
  }

  function yearHtml() {
    const now = new Date();
    let html = '<div class="year-grid">';
    for (let m = 0; m < 12; m++) {
      const prefix = iso(state.y, m, 1).slice(0, 7);
      const evs = events.filter((e) => e.date.startsWith(prefix)).sort((a, b) => a.date.localeCompare(b.date));
      const isNow = now.getFullYear() === state.y && now.getMonth() === m;
      html += `<div class="year-month ${isNow ? "now" : ""}" data-month="${m}">
        <h5>${BULAN[m]} <span><span class="badge b-navy">${evs.length}</span> <a href="javascript:void(0)" data-open-month title="Buka bulan">↗</a></span></h5>
        ${evs.slice(0, 5).map((e) => `<span class="cal-ev ev-${e.type}" title="${esc(e.title)}">${Number(e.date.slice(8))} · ${esc(e.title)}</span>`).join("")}
        ${evs.length > 5 ? `<div class="cal-more">+${evs.length - 5} lainnya</div>` : ""}
      </div>`;
    }
    return html + "</div>";
  }

  render();
  return { setDate(y, m) { state.y = y; state.m = m; render(); } };
}
