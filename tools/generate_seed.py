"""
Generator file supabase/02_seed.sql dari Google Spreadsheet "Rekap Publikasi LAN".

- Mengunduh spreadsheet sebagai .xlsx (agar hyperlink asli ikut terbaca, bukan sekadar teks "Link")
- Membaca sheet "AnalisisSuvei 2026"
- Menebak tahap/status survei dari kolom Keterangan
- Menulis SQL seed yang siap dijalankan di Supabase SQL Editor

Cara pakai (cukup Python 3 bawaan, tanpa library tambahan):
    python tools/generate_seed.py
Syarat: spreadsheet dapat diakses "Siapa saja yang memiliki link".
"""
import io
import re
import sys
import zipfile
import urllib.request
import calendar
import xml.etree.ElementTree as ET
from pathlib import Path

SHEET_ID = "1dZbVC-lcYubhuDVSN-PjvZl0R6-huTFePcHDW6eJtqE"
SHEET_NAME = "AnalisisSuvei 2026"
OUT = Path(__file__).resolve().parent.parent / "supabase" / "02_seed.sql"

M = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS = {"m": M}

UNITS = [
    ("SKPP", "SKPP"),
    ("SKMP", "SKMP"),
    ("SKMK", "SKMK"),
    ("SKTAN", "SKTAN"),
    ("DAPKK", "DAPKK"),
    ("DSPK2AN", "DSPK2AN"),
    ("STIA JKT", "Politeknik STIA LAN Jakarta"),
    ("STIA BDG", "Politeknik STIA LAN Bandung"),
    ("STIA MKS", "Politeknik STIA LAN Makassar"),
]

BULAN = {"januari": 1, "februari": 2, "maret": 3, "april": 4, "mei": 5, "juni": 6, "juli": 7,
         "agustus": 8, "september": 9, "oktober": 10, "november": 11, "desember": 12}

LINK_COLS = {"I": "jurnal", "J": "media_online", "K": "web_lan", "L": "web_unit",
             "M": "ig_lan", "N": "ig_unit", "O": "yt_lan", "P": "yt_unit"}


def read_sheet(data: bytes):
    z = zipfile.ZipFile(io.BytesIO(data))
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rid = next(s.get(f"{{{R}}}id") for s in wb.find("m:sheets", NS) if s.get("name") == SHEET_NAME)
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    target = next(r.get("Target") for r in rels if r.get("Id") == rid)
    path = "xl/" + target.lstrip("/").replace("xl/", "")

    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS):
            shared.append("".join(t.text or "" for t in si.iter(f"{{{M}}}t")))

    sheet = ET.fromstring(z.read(path))
    relpath = path.replace("worksheets/", "worksheets/_rels/") + ".rels"
    targets = {}
    if relpath in z.namelist():
        targets = {r.get("Id"): r.get("Target") for r in ET.fromstring(z.read(relpath))}
    links = {}
    hl = sheet.find("m:hyperlinks", NS)
    if hl is not None:
        for h in hl:
            t = targets.get(h.get(f"{{{R}}}id"))
            if t:
                links[h.get("ref")] = t

    rows = []
    for row in sheet.find("m:sheetData", NS):
        cells = {}
        for c in row:
            ref = c.get("r")
            v = c.find("m:v", NS)
            f = c.find("m:f", NS)
            if c.get("t") == "s" and v is not None:
                val = shared[int(v.text)]
            elif c.get("t") == "inlineStr":
                val = "".join(t.text or "" for t in c.iter(f"{{{M}}}t"))
            else:
                val = v.text if v is not None else ""
            link = links.get(ref)
            if not link and f is not None and f.text and "HYPERLINK" in f.text.upper():
                m = re.search(r'HYPERLINK\(\s*"([^"]+)"', f.text, re.I)
                link = m.group(1) if m else None
            cells[re.match(r"[A-Z]+", ref).group(0)] = (val or "", link)
        rows.append(cells)
    return rows


def q(v):
    """Literal SQL aman (atau NULL)."""
    if v is None or (isinstance(v, str) and v.strip() == ""):
        return "null"
    if isinstance(v, (int, float)):
        return str(int(v))
    return "'" + str(v).replace("'", "''") + "'"


def num(s):
    try:
        return int(float(s))
    except (TypeError, ValueError):
        return None


def parse_jadwal(label, tahun):
    """'Januari (4)' -> tanggal akhir minggu ke-4 Januari. '2025' -> None."""
    label = (label or "").strip()
    if re.fullmatch(r"\d{4}(\.0)?", label):
        label = label[:4]
    m = re.match(r"([A-Za-z]+)\s*(\d{4})?\s*\((\d)\)", label)
    if not m:
        return None, label
    bulan = BULAN.get(m.group(1).lower())
    if not bulan:
        return None, label
    year = int(m.group(2)) if m.group(2) else (tahun or 2026)
    minggu = int(m.group(3))
    day = min(minggu * 7, calendar.monthrange(year, bulan)[1])
    return f"{year:04d}-{bulan:02d}-{day:02d}", label


def infer_stage(ket, tahun):
    k = (ket or "").lower().strip()
    if k.startswith("selesai"):
        return 10, "selesai"
    if not k and tahun and tahun < 2026:
        return 10, "selesai"
    if "revisi" in k or "perbaikan" in k:
        return 7, "revisi"
    if "penyusunan laporan" in k or "penyusunan policy brief" in k:
        return 7, "berjalan"
    if "pengumpulan" in k or "penyebaran instrumen" in k or "instumen" in k:
        return 6, "berjalan"
    if "penyusunan instrumen" in k or "validasi instrumen" in k:
        return 3, "berjalan"
    if "jurnal" in k or "dipaparkan" in k:
        return 9, "berjalan"
    return 1, "draft"


def main():
    url = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=xlsx"
    print("Mengunduh", url)
    rows = read_sheet(urllib.request.urlopen(url).read())

    seen, report, items = set(), [], []
    for r in rows[1:]:
        judul = re.sub(r"\s+", " ", r.get("C", ("", None))[0]).strip()
        if not judul:
            continue
        key = judul.lower()
        if key in seen:
            report.append(f"DUPLIKAT dilewati: {judul}")
            continue
        seen.add(key)

        units = [u.strip() for u in r["B"][0].split(",") if u.strip()]
        tahun = num(r["F"][0])
        tgl, label = parse_jadwal(r["E"][0], tahun)
        if not tahun:
            tahun = int(tgl[:4]) if tgl else 2026
        ket = r.get("Q", ("", None))[0].strip()
        tahap, status = infer_stage(ket, tahun)
        if status == "draft":
            report.append(f"PERLU CEK (tahap belum diketahui -> draft): {judul}")

        pubs = {}
        for col, field in LINK_COLS.items():
            text, link = r.get(col, ("", None))
            urls = [link] if link else []
            urls += [u for u in re.findall(r"https?://\S+", text) if u not in urls]
            if urls:
                pubs[field] = "\n".join(urls)
            if re.search(r"link\s*2", text, re.I):
                report.append(f"MULTI-LINK (hanya {len(urls)} URL terbaca) kolom {field}: {judul}")

        items.append(dict(judul=judul, unit=units[0], kolab=units[1:], jenis=r["D"][0].strip(),
                          tahun=tahun, k1=r["G"][0].strip(), k2=r["H"][0].strip(),
                          tahap=tahap, status=status, tgl=tgl, label=label,
                          ket=ket, pubs=pubs))

    out = ["-- =====================================================================",
           "--  File 2/2 : Data awal (master unit + migrasi data spreadsheet)",
           "--  Dibuat otomatis oleh tools/generate_seed.py - jangan diedit manual",
           f"--  Jumlah survei: {len(items)}",
           "-- =====================================================================", "",
           "insert into public.units (kode, nama) values"]
    out.append(",\n".join(f"  ({q(k)}, {q(n)})" for k, n in UNITS))
    out.append("on conflict (kode) do nothing;\n")
    out.append("do $seed$")
    out.append("declare v_id bigint;")
    out.append("begin")
    out.append("  if exists (select 1 from public.surveys) then")
    out.append("    raise notice 'Tabel surveys sudah berisi data, seed dilewati';")
    out.append("    return;")
    out.append("  end if;\n")
    for it in items:
        if it["kolab"]:
            kolab = "array(select id from public.units where kode in (" + \
                    ", ".join(q(k) for k in it["kolab"]) + "))"
        else:
            kolab = "'{}'"
        out.append(
            "  insert into public.surveys (judul, unit_id, unit_kolaborasi, jenis, tahun, klaster_1, klaster_2,"
            " tahap, status, jadwal_publikasi, jadwal_label, keterangan)\n"
            f"  values ({q(it['judul'])}, (select id from public.units where kode = {q(it['unit'])}), {kolab},"
            f" {q(it['jenis'])}, {it['tahun']}, {q(it['k1'])}, {q(it['k2'])}, {it['tahap']}, {q(it['status'])},"
            f" {q(it['tgl'])}, {q(it['label'])}, {q(it['ket'])})\n  returning id into v_id;")
        if it["pubs"]:
            cols = ", ".join(it["pubs"].keys())
            vals = ", ".join(q(v) for v in it["pubs"].values())
            out.append(f"  insert into public.survey_publications (survey_id, {cols}) values (v_id, {vals});")
        if it["tgl"] and it["status"] != "selesai":
            out.append(f"  insert into public.survey_schedule (survey_id, tahap, rencana_selesai)"
                       f" values (v_id, 9, {q(it['tgl'])});")
        out.append("")
    out.append("end $seed$;")
    OUT.write_text("\n".join(out) + "\n", encoding="utf-8")

    print(f"OK -> {OUT} ({len(items)} survei)")
    print("\n".join(report) if report else "Tidak ada catatan.")


if __name__ == "__main__":
    sys.exit(main())
