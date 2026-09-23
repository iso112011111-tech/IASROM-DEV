"""Generate UI mockup screenshots (SVG) for portfolio projects."""
import colorsys, math, os, random, sys

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
W, H = 1200, 800
FONT = "'Noto Sans Thai','Sukhumvit Set','Leelawadee UI','Segoe UI',Tahoma,sans-serif"


def hsl(h, s, l):
    r, g, b = colorsys.hls_to_rgb((h % 360) / 360, l / 100, s / 100)
    return "#%02x%02x%02x" % (round(r * 255), round(g * 255), round(b * 255))


def t(x, y, s, size=14, fill="#1f2937", weight=400, anchor="start"):
    return f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{weight}" fill="{fill}" text-anchor="{anchor}">{s}</text>'


def r(x, y, w, h, fill, rx=8, extra=""):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" {extra}/>'


def bar(x, y, w, h=8, fill="#e5e7eb"):
    return r(x, y, w, h, fill, rx=h / 2)


def browser(url, body, dark=False):
    top = "#e9edf0" if not dark else "#1b1f24"
    pill = "#ffffff" if not dark else "#2a3038"
    txt = "#6b7280" if not dark else "#8b949e"
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" font-family="{FONT}">
<defs><clipPath id="c"><rect width="{W}" height="{H}" rx="18"/></clipPath>
<filter id="sh" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity=".08"/></filter></defs>
<g clip-path="url(#c)">
{r(0, 0, W, H, "#ffffff" if not dark else "#0d1117", 0)}
{r(0, 0, W, 52, top, 0)}
<circle cx="26" cy="26" r="6.5" fill="#ff5f57"/><circle cx="48" cy="26" r="6.5" fill="#febc2e"/><circle cx="70" cy="26" r="6.5" fill="#28c840"/>
{r(250, 13, 700, 27, pill, 13.5)}
<path d="M270 22.5v-2a4 4 0 0 1 8 0v2" fill="none" stroke="{txt}" stroke-width="1.6"/>{r(267, 22, 14, 10, txt, 2)}
{t(292, 31.5, url, 13, txt)}
<g transform="translate(0 52)">{body}</g>
</g></svg>'''


def sidebar(hue, items, active=1, title="Admin", dark=False):
    bg = hsl(hue, 35, 14) if dark else hsl(hue, 45, 18)
    out = [r(0, 0, 230, H - 52, bg, 0)]
    out.append(r(22, 24, 34, 34, hsl(hue, 70, 55), 9))
    out.append(t(68, 47, title, 17, "#ffffff", 700))
    for i, name in enumerate(items):
        y = 96 + i * 46
        if i == active:
            out.append(r(14, y - 4, 202, 38, "rgba(255,255,255,.12)", 9))
            out.append(r(14, y - 4, 4, 38, hsl(hue, 75, 60), 2))
        out.append(r(32, y + 7, 16, 16, "rgba(255,255,255,%s)" % (".9" if i == active else ".35"), 4))
        out.append(t(60, y + 20, name, 14, "#ffffff" if i == active else "rgba(255,255,255,.6)", 600 if i == active else 400))
    out.append(r(22, H - 52 - 72, 186, 50, "rgba(255,255,255,.07)", 12))
    out.append(f'<circle cx="46" cy="{H - 52 - 47}" r="13" fill="{hsl(hue + 30, 50, 70)}"/>')
    out.append(t(68, H - 52 - 51, "Admin", 13, "#fff", 600))
    out.append(t(68, H - 52 - 34, "ผู้ดูแลระบบ", 11, "rgba(255,255,255,.55)"))
    return "".join(out)


def topbar(x, title, sub, hue):
    return (t(x, 46, title, 24, "#111827", 700) + t(x, 70, sub, 13, "#6b7280")
            + r(W - 300, 24, 180, 38, "#f3f4f6", 10) + t(W - 284, 48, "ค้นหา...", 13, "#9ca3af")
            + r(W - 104, 24, 76, 38, hsl(hue, 60, 42), 10) + t(W - 66, 48, "+ เพิ่ม", 13, "#fff", 600, "middle"))


def line_chart(x, y, w, h, hue, seed, n=12, fill=True):
    rnd = random.Random(seed)
    vals, v = [], 50
    for _ in range(n):
        v = max(15, min(95, v + rnd.randint(-14, 18)))
        vals.append(v)
    pts = [(x + i * w / (n - 1), y + h - vals[i] / 100 * h) for i in range(n)]
    path = "M" + " L".join(f"{px:.1f} {py:.1f}" for px, py in pts)
    out = ""
    for gy in range(5):
        yy = y + gy * h / 4
        out += f'<line x1="{x}" x2="{x + w}" y1="{yy}" y2="{yy}" stroke="#eef0f3"/>'
    if fill:
        out += f'<path d="{path} L{x + w} {y + h} L{x} {y + h}Z" fill="{hsl(hue, 70, 55)}" opacity=".12"/>'
    out += f'<path d="{path}" fill="none" stroke="{hsl(hue, 65, 45)}" stroke-width="3" stroke-linejoin="round"/>'
    px, py = pts[-3]
    out += f'<circle cx="{px}" cy="{py}" r="6" fill="#fff" stroke="{hsl(hue, 65, 45)}" stroke-width="3"/>'
    return out


def bars(x, y, w, h, hue, seed, n=7):
    rnd = random.Random(seed)
    bw = w / n * .55
    out = ""
    for i in range(n):
        v = rnd.randint(30, 95)
        bx = x + i * w / n + (w / n - bw) / 2
        out += r(bx, y + h - v / 100 * h, bw, v / 100 * h, hsl(hue + (i % 2) * 25, 60, 50 + (i % 2) * 12), 5)
    return out


def card(x, y, w, h, inner=""):
    return '<g filter="url(#sh)">' + r(x, y, w, h, "#ffffff", 14, 'stroke="#eceff3"') + '</g>' + inner


def kpi(x, y, w, label, value, delta, hue):
    return card(x, y, w, 104, t(x + 20, y + 34, label, 13, "#6b7280") + t(x + 20, y + 72, value, 26, "#111827", 700)
                + r(x + w - 78, y + 52, 58, 24, hsl(hue, 70, 93), 12) + t(x + w - 49, y + 69, delta, 12, hsl(hue, 60, 35), 600, "middle"))


# ---------------------------------------------------------------- templates

def dashboard(hue, title, nav, kpis, seed, url, chart_title="ยอดขายรายเดือน"):
    x0 = 262
    b = sidebar(hue, nav, 0, title)
    b += topbar(x0, "ภาพรวม", "อัปเดตล่าสุดวันนี้ 09:30 น.", hue)
    kw = (W - x0 - 28 - 3 * 18) / 4
    for i, (lab, val, d) in enumerate(kpis):
        b += kpi(x0 + i * (kw + 18), 96, kw, lab, val, d, hue + i * 20)
    cw = (W - x0 - 28) * .62
    b += card(x0, 222, cw, 300, t(x0 + 22, 256, chart_title, 16, "#111827", 700) + line_chart(x0 + 26, 280, cw - 52, 210, hue, seed))
    x2 = x0 + cw + 18
    w2 = W - x2 - 28
    b += card(x2, 222, w2, 300, t(x2 + 22, 256, "แยกตามหมวด", 16, "#111827", 700) + donut(x2 + w2 / 2, 390, 88, hue, seed))
    b += card(x0, 540, W - x0 - 28, 190, t(x0 + 22, 574, "รายการล่าสุด", 16, "#111827", 700) + rows(x0 + 22, 596, W - x0 - 72, 4, hue, seed))
    return browser(url, b)


def donut(cx, cy, rad, hue, seed):
    rnd = random.Random(seed + 1)
    parts = [rnd.randint(15, 40) for _ in range(4)]
    tot = sum(parts)
    out, a = "", -math.pi / 2
    for i, p in enumerate(parts):
        da = p / tot * 2 * math.pi
        x1, y1 = cx + rad * math.cos(a), cy + rad * math.sin(a)
        x2, y2 = cx + rad * math.cos(a + da), cy + rad * math.sin(a + da)
        out += f'<path d="M{x1:.1f} {y1:.1f} A{rad} {rad} 0 {1 if da > math.pi else 0} 1 {x2:.1f} {y2:.1f}" fill="none" stroke="{hsl(hue + i * 35, 60, 50 + i * 6)}" stroke-width="26"/>'
        a += da
    out += t(cx, cy + 4, f"{parts[0] * 100 // tot}%", 24, "#111827", 700, "middle") + t(cx, cy + 24, "สัดส่วนสูงสุด", 11, "#6b7280", 400, "middle")
    return out


def rows(x, y, w, n, hue, seed, cols=None):
    rnd = random.Random(seed + 7)
    out = ""
    status = [("สำเร็จ", 145), ("รอดำเนินการ", 40), ("กำลังจัดส่ง", 210)]
    for i in range(n):
        yy = y + i * 30
        out += f'<circle cx="{x + 10}" cy="{yy + 10}" r="10" fill="{hsl(hue + i * 40, 50, 85)}"/>'
        out += bar(x + 32, yy + 6, rnd.randint(120, 200), 8, "#d1d5db")
        out += bar(x + w * .42, yy + 6, rnd.randint(60, 110), 8, "#e5e7eb")
        out += t(x + w * .68, yy + 15, f"฿{rnd.randint(1, 48):,},{rnd.randint(100, 999)}", 13, "#374151", 600)
        s, sh = status[i % 3]
        out += r(x + w - 104, yy - 2, 100, 24, hsl(sh, 70, 92), 12) + t(x + w - 54, yy + 14, s, 11.5, hsl(sh, 60, 32), 600, "middle")
    return out


def table_page(hue, title, nav, heads, data, url, page_title, sub, badge_col=None):
    x0 = 262
    b = sidebar(hue, nav, 1, title)
    b += topbar(x0, page_title, sub, hue)
    tw = W - x0 - 28
    b += card(x0, 96, tw, 630)
    # tabs
    for i, tab in enumerate(["ทั้งหมด", "ใช้งาน", "ใกล้หมด", "ปิดใช้งาน"]):
        tx = x0 + 22 + i * 110
        b += t(tx, 132, tab, 14, hsl(hue, 60, 40) if i == 0 else "#6b7280", 600 if i == 0 else 400)
        if i == 0:
            b += r(tx, 142, 58, 3, hsl(hue, 60, 45), 1.5)
    b += f'<line x1="{x0}" x2="{x0 + tw}" y1="146" y2="146" stroke="#eef0f3"/>'
    b += r(x0 + 16, 162, tw - 32, 40, "#f8fafc", 8)
    cw = (tw - 60) / len(heads)
    for i, h in enumerate(heads):
        b += t(x0 + 30 + i * cw, 187, h, 12.5, "#6b7280", 600)
    for j, row in enumerate(data):
        yy = 232 + j * 54
        b += f'<line x1="{x0 + 16}" x2="{x0 + tw - 16}" y1="{yy + 26}" y2="{yy + 26}" stroke="#f1f3f5"/>'
        for i, cell in enumerate(row):
            cx = x0 + 30 + i * cw
            if badge_col is not None and i == badge_col:
                good = cell in ("ปกติ", "ใช้งาน", "เสร็จแล้ว", "พร้อมขาย")
                hh = 145 if good else 30
                b += r(cx, yy - 13, 84, 24, hsl(hh, 70, 92), 12) + t(cx + 42, yy + 3, cell, 11.5, hsl(hh, 60, 32), 600, "middle")
            else:
                b += t(cx, yy + 4, cell, 13.5, "#111827" if i == 0 else "#4b5563", 600 if i == 0 else 400)
    b += t(x0 + 30, 706, f"แสดง 1–{len(data)} จาก 248 รายการ", 12.5, "#6b7280")
    for i in range(4):
        bx = x0 + tw - 170 + i * 38
        b += r(bx, 688, 30, 30, hsl(hue, 60, 45) if i == 0 else "#f3f4f6", 8) + t(bx + 15, 708, str(i + 1), 12.5, "#fff" if i == 0 else "#374151", 600, "middle")
    return browser(url, b)


def shop(hue, url, brand, products):
    b = r(0, 0, W, 70, "#ffffff", 0) + f'<line x1="0" x2="{W}" y1="70" y2="70" stroke="#eef0f3"/>'
    b += r(40, 20, 30, 30, hsl(hue, 65, 50), 8) + t(80, 42, brand, 19, "#111827", 800)
    for i, m in enumerate(["คอมพิวเตอร์", "โน้ตบุ๊ก", "อุปกรณ์เสริม", "กล้องวงจรปิด", "โปรโมชัน"]):
        b += t(330 + i * 118, 42, m, 14, hsl(hue, 60, 40) if i == 4 else "#374151", 600 if i == 4 else 400)
    b += r(W - 150, 18, 110, 34, hsl(hue, 65, 45), 17) + t(W - 95, 40, "ตะกร้า (2)", 13, "#fff", 600, "middle")
    # hero
    b += f'<defs><linearGradient id="hg" x1="0" x2="1"><stop offset="0" stop-color="{hsl(hue, 70, 30)}"/><stop offset="1" stop-color="{hsl(hue + 40, 70, 45)}"/></linearGradient></defs>'
    b += r(40, 92, W - 80, 200, "url(#hg)", 18)
    b += t(80, 160, "Back to School Sale", 34, "#fff", 800) + t(80, 196, "ลดสูงสุด 30% อุปกรณ์ไอทีทุกหมวด", 17, "rgba(255,255,255,.85)")
    b += r(80, 222, 150, 42, "#ffffff", 21) + t(155, 249, "ช้อปเลย →", 15, hsl(hue, 70, 30), 700, "middle")
    b += laptop_icon(W - 360, 120, hue)
    b += t(40, 336, "สินค้าขายดี", 20, "#111827", 800) + t(W - 40, 336, "ดูทั้งหมด →", 14, hsl(hue, 60, 40), 600, "end")
    pw = (W - 80 - 3 * 20) / 4
    for i, (name, price, old) in enumerate(products):
        px = 40 + i * (pw + 20)
        b += card(px, 356, pw, 330)
        b += r(px + 12, 368, pw - 24, 180, hsl(hue + i * 50, 40, 95), 10)
        b += product_icon(px + pw / 2, 458, i, hue + i * 50)
        if old:
            b += r(px + 20, 378, 50, 22, "#ef4444", 11) + t(px + 45, 393, "SALE", 11, "#fff", 700, "middle")
        b += t(px + 16, 578, name, 15, "#111827", 600)
        b += t(px + 16, 604, "★★★★★", 12, "#f59e0b") + t(px + 86, 604, "(128)", 11, "#9ca3af")
        b += t(px + 16, 640, price, 19, hsl(hue, 60, 38), 800)
        if old:
            b += t(px + 16 + len(price) * 11.5 + 10, 640, old, 13, "#9ca3af") + f'<line x1="{px + 16 + len(price) * 11.5 + 10}" x2="{px + 16 + len(price) * 11.5 + 10 + len(old) * 7.2}" y1="{636}" y2="{636}" stroke="#9ca3af"/>'
        b += r(px + pw - 54, 616, 38, 38, hsl(hue, 65, 45), 10) + t(px + pw - 35, 641, "+", 20, "#fff", 700, "middle")
    return browser(url, b)


def laptop_icon(x, y, hue):
    return (r(x, y, 240, 150, "#111827", 10) + r(x + 10, y + 10, 220, 130, hsl(hue + 180, 60, 60), 4)
            + r(x - 30, y + 150, 300, 16, "#d1d5db", 6) + r(x + 20, y + 30, 120, 10, "rgba(255,255,255,.7)", 5)
            + r(x + 20, y + 50, 80, 10, "rgba(255,255,255,.5)", 5) + r(x + 20, y + 80, 180, 40, "rgba(255,255,255,.25)", 6))


def product_icon(cx, cy, kind, hue):
    c = hsl(hue, 50, 35)
    if kind == 0:  # monitor
        return r(cx - 60, cy - 45, 120, 76, c, 6) + r(cx - 54, cy - 39, 108, 64, hsl(hue, 60, 70), 3) + r(cx - 6, cy + 31, 12, 16, c, 0) + r(cx - 30, cy + 45, 60, 8, c, 4)
    if kind == 1:  # keyboard
        out = r(cx - 75, cy - 28, 150, 56, c, 8)
        for j in range(3):
            for i in range(9):
                out += r(cx - 67 + i * 15.5, cy - 20 + j * 15, 11, 10, "rgba(255,255,255,.35)", 2)
        return out
    if kind == 2:  # camera
        return (r(cx - 55, cy - 22, 90, 44, c, 22) + f'<circle cx="{cx + 22}" cy="{cy}" r="16" fill="{hsl(hue, 60, 70)}"/>'
                + f'<circle cx="{cx + 22}" cy="{cy}" r="8" fill="#111"/>' + r(cx - 30, cy + 20, 8, 30, c, 3) + r(cx - 50, cy + 48, 48, 8, c, 4))
    # router
    return (r(cx - 62, cy - 5, 124, 40, c, 10) + r(cx - 50, cy - 58, 6, 55, c, 3) + r(cx + 44, cy - 58, 6, 55, c, 3)
            + "".join(f'<circle cx="{cx - 40 + i * 16}" cy="{cy + 15}" r="3.5" fill="{hsl(140, 70, 60)}"/>' for i in range(4)))


def cctv(hue, url):
    b = r(0, 0, W, H - 52, "#0b0f14", 0)
    b += r(0, 0, W, 56, "#111820", 0) + t(24, 36, "● LIVE", 14, "#ef4444", 700) + t(100, 36, "CCTV Monitor · 6 กล้อง", 15, "#e5e7eb", 600)
    b += t(W - 24, 36, "2026-03-14  14:32:08", 14, "#9ca3af", 400, "end")
    gw, gh = (W - 260 - 40) / 3, (H - 52 - 72 - 24) / 2
    scenes = ["ประตูหน้า", "ลานจอดรถ", "โถงต้อนรับ", "คลังสินค้า", "ทางเดินชั้น 2", "ประตูหลัง"]
    rnd = random.Random(3)
    for i, name in enumerate(scenes):
        gx, gy = 16 + (i % 3) * (gw + 8), 72 + (i // 3) * (gh + 8)
        base = 18 + rnd.randint(0, 10)
        b += r(gx, gy, gw, gh, hsl(200 + i * 12, 15, base), 6)
        # simple scene: floor + objects
        b += f'<path d="M{gx} {gy + gh * .62} L{gx + gw} {gy + gh * .5} L{gx + gw} {gy + gh} L{gx} {gy + gh}Z" fill="{hsl(30, 10, base + 8)}"/>'
        for k in range(3):
            ox = gx + 30 + k * (gw / 3) + rnd.randint(-10, 10)
            b += r(ox, gy + gh * .3 + rnd.randint(0, 20), rnd.randint(40, 70), rnd.randint(40, 70), hsl(210, 10, base + 14), 3)
        if i in (0, 1, 3):
            bx, by = gx + gw * (.35 + .15 * (i % 2)), gy + gh * .32
            b += f'<rect x="{bx}" y="{by}" width="46" height="{80 if i != 1 else 44}" fill="none" stroke="#22c55e" stroke-width="2"/>'
            b += r(bx, by - 18, 86 if i != 1 else 74, 16, "#22c55e", 2) + t(bx + 4, by - 6, "person 0.9%d" % (4 + i) if i != 1 else "car 0.91", 10.5, "#052e16", 700)
            if i != 1:
                b += f'<circle cx="{bx + 23}" cy="{by + 16}" r="10" fill="{hsl(20, 25, 55)}"/>' + r(bx + 10, by + 28, 26, 46, hsl(220, 30, 40), 6)
            else:
                b += r(bx + 2, by + 14, 42, 26, hsl(0, 55, 45), 6)
        b += r(gx + 8, gy + 8, 110, 20, "rgba(0,0,0,.55)", 4) + t(gx + 14, gy + 22, f"CAM-0{i + 1} {name}", 10.5, "#e5e7eb", 600)
        b += f'<circle cx="{gx + gw - 16}" cy="{gy + 18}" r="4" fill="#ef4444"/>'
    # side panel
    sx = W - 244
    b += r(sx, 72, 228, H - 52 - 88, "#111820", 10) + t(sx + 16, 102, "การแจ้งเตือน", 15, "#e5e7eb", 700)
    alerts = [("พบบุคคล", "CAM-01 ประตูหน้า", "14:31"), ("พบยานพาหนะ", "CAM-02 ลานจอดรถ", "14:29"), ("พบบุคคล", "CAM-04 คลังสินค้า", "14:22"),
              ("ส่ง LINE แล้ว", "แจ้งเตือนผู้ดูแล", "14:22"), ("พบบุคคล", "CAM-01 ประตูหน้า", "13:58")]
    for i, (a, s, tm) in enumerate(alerts):
        ay = 122 + i * 76
        col = "#22c55e" if "LINE" in a else "#f59e0b"
        b += r(sx + 12, ay, 204, 64, "#18222c", 8) + r(sx + 12, ay, 4, 64, col, 2)
        b += t(sx + 26, ay + 26, a, 13, "#f3f4f6", 600) + t(sx + 26, ay + 46, s, 11, "#9ca3af") + t(sx + 204, ay + 26, tm, 11, "#6b7280", 400, "end")
    return browser(url, b, dark=True)


def phone_booking(hue, url):
    # device mockup on soft background showing a LINE LIFF booking flow
    b = f'<defs><linearGradient id="pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{hsl(hue, 60, 94)}"/><stop offset="1" stop-color="{hsl(hue + 30, 60, 86)}"/></linearGradient></defs>'
    b += r(0, 0, W, H - 52, "url(#pg)", 0)
    b += phone(170, 40, "chat", hue) + phone(470, 40, "slots", hue) + phone(770, 40, "done", hue)
    return browser(url, b)


def phone(x, y, screen, hue):
    w, h = 260, 650
    g = hsl(142, 71, 45)  # LINE green
    out = r(x, y, w, h, "#111827", 38) + r(x + 10, y + 10, w - 20, h - 20, "#ffffff", 30) + r(x + w / 2 - 45, y + 18, 90, 22, "#111827", 11)
    ix, iy, iw = x + 22, y + 56, w - 44
    out += r(x + 10, y + 50, w - 20, 44, g if screen == "chat" else "#ffffff", 0)
    if screen == "chat":
        out += t(ix + 4, iy + 24, "‹  คลินิกทันตกรรม", 14, "#fff", 700)
        msgs = [(0, "สวัสดีค่ะ ต้องการจองคิว\nบริการใดคะ?"), (1, "จองคิวทำฟัน"), (0, "กดปุ่มด้านล่างเพื่อ\nเลือกวันและเวลาได้เลยค่ะ")]
        yy = iy + 60
        for side, m in msgs:
            lines = m.split("\n")
            bh = 22 + 18 * len(lines)
            bw = 170
            bx = ix if side == 0 else ix + iw - 110
            out += r(bx, yy, bw if side == 0 else 110, bh, "#f1f5f9" if side == 0 else hsl(142, 60, 85), 14)
            for k, ln in enumerate(lines):
                out += t(bx + 12, yy + 26 + k * 18, ln, 12.5, "#111827")
            yy += bh + 12
        out += r(ix, yy + 6, iw, 150, "#ffffff", 14, 'stroke="#e5e7eb"')
        out += r(ix, yy + 6, iw, 70, hsl(hue, 55, 88), 14) + t(ix + iw / 2, yy + 48, "🦷", 28, "#000", 400, "middle")
        out += t(ix + 14, yy + 100, "บริการทันตกรรม", 13, "#111827", 700)
        out += r(ix + 12, yy + 114, iw - 24, 30, g, 8) + t(ix + iw / 2, yy + 134, "จองคิวเลย", 13, "#fff", 700, "middle")
        out += r(x + 10, y + h - 74, w - 20, 50, "#f8fafc", 0) + r(ix, y + h - 62, iw - 40, 28, "#ffffff", 14, 'stroke="#e5e7eb"')
    elif screen == "slots":
        out += t(ix + 4, iy + 24, "เลือกวันและเวลา", 15, "#111827", 700)
        days = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"]
        for i, d in enumerate(days):
            dx = ix + i * (iw / 7)
            sel = i == 2
            out += r(dx + 2, iy + 50, iw / 7 - 4, 52, g if sel else "#f3f4f6", 10)
            out += t(dx + iw / 14, iy + 70, d, 11, "#fff" if sel else "#6b7280", 400, "middle") + t(dx + iw / 14, iy + 92, str(12 + i), 15, "#fff" if sel else "#111827", 700, "middle")
        out += t(ix, iy + 136, "ช่วงเช้า", 12.5, "#6b7280", 600)
        slots = ["08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30"]
        for i, s in enumerate(slots):
            sx, sy = ix + (i % 3) * (iw / 3), iy + 150 + (i // 3) * 46 + (30 if i >= 6 else 0)
            if i == 6:
                out += t(ix, iy + 150 + 2 * 46 + 18, "ช่วงบ่าย", 12.5, "#6b7280", 600)
            full = i in (1, 7)
            sel = i == 4
            out += r(sx + 3, sy, iw / 3 - 6, 36, g if sel else ("#f9fafb" if full else "#ffffff"), 9, f'stroke="{g if sel else "#e5e7eb"}"')
            out += t(sx + iw / 6, sy + 23, s, 13, "#fff" if sel else ("#d1d5db" if full else "#111827"), 600, "middle")
        out += r(ix, y + h - 86, iw, 46, g, 12) + t(ix + iw / 2, y + h - 57, "ยืนยันการจอง", 15, "#fff", 700, "middle")
    else:
        out += t(ix + iw / 2, iy + 24, "จองสำเร็จ", 15, "#111827", 700, "middle")
        out += f'<circle cx="{ix + iw / 2}" cy="{iy + 110}" r="42" fill="{hsl(142, 70, 92)}"/><path d="M{ix + iw / 2 - 18} {iy + 110} l12 12 l24 -26" fill="none" stroke="{g}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'
        out += t(ix + iw / 2, iy + 186, "รอเจ้าหน้าที่ยืนยัน", 16, "#111827", 700, "middle") + t(ix + iw / 2, iy + 208, "ระบบจะแจ้งผลทาง LINE", 12, "#6b7280", 400, "middle")
        out += r(ix, iy + 236, iw, 170, "#f8fafc", 14)
        for k, (a, v) in enumerate([("บริการ", "ทันตกรรม"), ("วันที่", "พ. 14 ม.ค."), ("เวลา", "10:00 น."), ("คิวที่", "A-012")]):
            out += t(ix + 16, iy + 272 + k * 36, a, 12.5, "#6b7280") + t(ix + iw - 16, iy + 272 + k * 36, v, 13, "#111827", 700, "end")
        out += r(ix, y + h - 86, iw, 46, "#ffffff", 12, f'stroke="{g}" stroke-width="1.5"') + t(ix + iw / 2, y + h - 57, "กลับหน้าแชต", 14, g, 700, "middle")
    return out


def pos(hue, url):
    b = r(0, 0, W, H - 52, "#f4f5f7", 0)
    b += r(0, 0, W, 62, "#ffffff", 0) + r(24, 14, 34, 34, hsl(hue, 60, 45), 9) + t(70, 38, "Café POS", 18, "#111827", 800)
    for i, c in enumerate(["ทั้งหมด", "กาแฟ", "ชา", "นมสด", "เบเกอรี่", "ของว่าง"]):
        cx = 230 + i * 100
        b += r(cx, 15, 88, 32, hsl(hue, 60, 45) if i == 1 else "#f3f4f6", 16) + t(cx + 44, 36, c, 13, "#fff" if i == 1 else "#374151", 600, "middle")
    items = [("อเมริกาโน่", "55"), ("ลาเต้", "65"), ("คาปูชิโน่", "65"), ("มอคค่า", "70"), ("เอสเปรสโซ่", "50"), ("คาราเมลมัคคิอาโต้", "75"),
             ("โกโก้", "60"), ("ชาไทย", "55"), ("มัทฉะลาเต้", "75"), ("ครัวซองต์", "65"), ("บราวนี่", "55"), ("ชีสเค้ก", "85")]
    cw, chh = (W - 400 - 24 - 3 * 14) / 4, 150
    for i, (n, p) in enumerate(items):
        cx, cy = 24 + (i % 4) * (cw + 14), 82 + (i // 4) * (chh + 14)
        b += card(cx, cy, cw, chh)
        b += r(cx + 10, cy + 10, cw - 20, 78, hsl(hue + 20 + i * 9, 45, 88), 10)
        b += (cup(cx + cw / 2, cy + 50, hsl(hue + i * 9, 40, 40)) if i < 9 else pastry(cx + cw / 2, cy + 50, i))
        b += t(cx + 12, cy + 112, n, 13.5, "#111827", 600) + t(cx + 12, cy + 136, f"฿{p}", 14, hsl(hue, 60, 38), 800)
    ox = W - 390
    b += r(ox, 76, 372, H - 52 - 92, "#ffffff", 16)
    b += t(ox + 20, 110, "ออเดอร์ #1042", 17, "#111827", 800) + t(ox + 352, 110, "โต๊ะ 5", 13, "#6b7280", 400, "end")
    order = [("ลาเต้ (เย็น)", 2, 130), ("มัทฉะลาเต้", 1, 75), ("ครัวซองต์", 2, 130), ("ชีสเค้ก", 1, 85)]
    for i, (n, q, p) in enumerate(order):
        oy = 140 + i * 58
        b += r(ox + 16, oy, 42, 42, hsl(hue + i * 20, 45, 90), 10) + t(ox + 70, oy + 18, n, 13.5, "#111827", 600) + t(ox + 70, oy + 36, f"x{q}", 12, "#6b7280")
        b += t(ox + 352, oy + 26, f"฿{p}", 14, "#111827", 700, "end")
    b += f'<line x1="{ox + 16}" x2="{ox + 356}" y1="384" y2="384" stroke="#eef0f3" stroke-dasharray="4 4"/>'
    for i, (a, v) in enumerate([("รวม", "฿420"), ("ส่วนลดสมาชิก", "-฿21"), ("VAT 7%", "฿27.93")]):
        b += t(ox + 20, 414 + i * 28, a, 13.5, "#6b7280") + t(ox + 352, 414 + i * 28, v, 13.5, "#374151", 600, "end")
    b += t(ox + 20, 514, "ยอดชำระ", 16, "#111827", 800) + t(ox + 352, 514, "฿426.93", 24, hsl(hue, 60, 35), 800, "end")
    for i, m in enumerate(["เงินสด", "QR พร้อมเพย์", "บัตร"]):
        mx = ox + 16 + i * 116
        b += r(mx, 540, 108, 52, hsl(hue, 60, 94) if i == 1 else "#f8fafc", 10, f'stroke="{hsl(hue, 60, 45) if i == 1 else "#e5e7eb"}"') + t(mx + 54, 571, m, 12.5, hsl(hue, 60, 30) if i == 1 else "#374151", 600, "middle")
    b += r(ox + 16, 610, 340, 54, hsl(hue, 60, 45), 12) + t(ox + 186, 643, "ชำระเงิน", 17, "#fff", 800, "middle")
    return browser(url, b)


def pastry(cx, cy, i):
    if i == 9:  # croissant
        return (f'<path d="M{cx - 42} {cy + 12} C{cx - 30} {cy - 30} {cx + 30} {cy - 30} {cx + 42} {cy + 12} C{cx + 20} {cy - 4} {cx - 20} {cy - 4} {cx - 42} {cy + 12}Z" fill="#d9a04f"/>'
                + "".join(f'<path d="M{cx + k * 16} {cy - 18 + abs(k) * 4} Q{cx + k * 16 + 4} {cy - 6} {cx + k * 18} {cy + 2}" fill="none" stroke="#a8692a" stroke-width="2.5" stroke-linecap="round"/>' for k in (-2, -1, 0, 1, 2)))
    if i == 10:  # brownie
        return r(cx - 34, cy - 20, 68, 42, "#5b3a29", 6) + r(cx - 34, cy - 20, 68, 12, "#7a4f38", 6)
    return f'<path d="M{cx - 38} {cy + 20} L{cx + 38} {cy + 20} L{cx + 38} {cy - 6} L{cx - 38} {cy - 22}Z" fill="#f6dfa4"/>' + f'<path d="M{cx - 38} {cy - 22} L{cx + 38} {cy - 6} L{cx + 38} {cy - 12} L{cx - 38} {cy - 28}Z" fill="#c2410c"/>'


def cup(cx, cy, c):
    return (f'<path d="M{cx - 18} {cy - 20} L{cx + 18} {cy - 20} L{cx + 13} {cy + 22} L{cx - 13} {cy + 22}Z" fill="{c}"/>'
            + r(cx - 22, cy - 26, 44, 8, c, 4) + f'<path d="M{cx + 17} {cy - 10} q14 2 10 14 q-3 8 -12 6" fill="none" stroke="{c}" stroke-width="3"/>')


def kanban(hue, url):
    x0 = 262
    b = sidebar(hue, ["แดชบอร์ด", "งานแจ้งซ่อม", "ทรัพย์สินไอที", "ผู้ใช้งาน", "รายงาน"], 1, "IT Desk")
    b += topbar(x0, "งานแจ้งซ่อม", "ติดตามสถานะงานของทีมไอที", hue)
    cols = [("รอรับงาน", 30, [("ปริ้นเตอร์กระดาษติด", "สูง"), ("ติดตั้งโปรแกรมบัญชี", "ปกติ"), ("อีเมลส่งไม่ออก", "สูง")]),
            ("กำลังดำเนินการ", 210, [("คอมห้องประชุมเสีย", "ด่วน"), ("ตั้งค่า WiFi แขก", "ปกติ"), ("สำรองข้อมูล Server", "ปกติ")]),
            ("รอตรวจรับ", 270, [("เปลี่ยนจอฝ่ายขาย", "ปกติ"), ("ติดตั้งกล้อง CCTV", "สูง")]),
            ("เสร็จแล้ว", 145, [("รีเซ็ตรหัสผ่าน", "ปกติ"), ("อัปเดต Windows", "ปกติ"), ("เดินสาย LAN ใหม่", "ปกติ")])]
    cw = (W - x0 - 28 - 3 * 16) / 4
    pri = {"ด่วน": 0, "สูง": 30, "ปกติ": 210}
    for i, (name, h, cards) in enumerate(cols):
        cx = x0 + i * (cw + 16)
        b += r(cx, 96, cw, 630, "#f6f7f9", 14)
        b += f'<circle cx="{cx + 20}" cy="{122}" r="5" fill="{hsl(h, 70, 50)}"/>' + t(cx + 34, 127, name, 14, "#111827", 700)
        b += r(cx + cw - 42, 111, 28, 22, "#e5e7eb", 11) + t(cx + cw - 28, 126, str(len(cards)), 12, "#374151", 700, "middle")
        for j, (title, p) in enumerate(cards):
            cy = 148 + j * 132
            b += card(cx + 10, cy, cw - 20, 118)
            b += r(cx + 24, cy + 14, 44, 20, hsl(pri[p], 80, 93), 10) + t(cx + 46, cy + 28, p, 11, hsl(pri[p], 65, 38), 700, "middle")
            b += t(cx + 76, cy + 28, f"#{2400 + i * 10 + j}", 11, "#9ca3af")
            b += t(cx + 24, cy + 58, title, 13.5, "#111827", 600)
            b += bar(cx + 24, cy + 72, cw - 110, 6, "#eef0f3")
            b += f'<circle cx="{cx + 36}" cy="{cy + 98}" r="11" fill="{hsl(hue + j * 60, 50, 75)}"/><circle cx="{cx + 52}" cy="{cy + 98}" r="11" fill="{hsl(hue + j * 60 + 120, 50, 75)}" stroke="#fff" stroke-width="2"/>'
            b += t(cx + cw - 30, cy + 102, f"{j + 1}d", 11, "#9ca3af", 400, "end")
    return browser(url, b)


def landing(hue, url):
    b = r(0, 0, W, H - 52, "#ffffff", 0)
    b += r(40, 20, 34, 34, hsl(hue, 65, 42), 17) + t(84, 43, "Green Hill School", 17, "#111827", 800)
    for i, m in enumerate(["หน้าแรก", "เกี่ยวกับเรา", "ข่าวสาร", "หลักสูตร", "รับสมัคร", "ติดต่อ"]):
        b += t(500 + i * 110, 43, m, 14, hsl(hue, 60, 38) if i == 0 else "#374151", 700 if i == 0 else 400)
    b += f'<defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{hsl(hue, 55, 28)}"/><stop offset="1" stop-color="{hsl(hue + 25, 60, 42)}"/></linearGradient></defs>'
    b += r(0, 74, W, 330, "url(#lg)", 0)
    # school building illustration
    bx, by = 700, 150
    b += r(bx, by + 60, 400, 180, "rgba(255,255,255,.95)", 6) + f'<path d="M{bx - 20} {by + 64} L{bx + 200} {by - 20} L{bx + 420} {by + 64}Z" fill="{hsl(10, 60, 55)}"/>'
    for i in range(6):
        for j in range(2):
            b += r(bx + 24 + i * 62, by + 86 + j * 64, 40, 40, hsl(hue + 180, 45, 72), 3)
    b += r(bx + 175, by + 190, 50, 50, hsl(hue, 45, 35), 3) + r(bx + 197, by - 70, 3, 60, "#fff", 0) + r(bx + 200, by - 70, 36, 22, "#ef4444", 0)
    b += t(80, 180, "เรียนรู้อย่างมีความสุข", 36, "#fff", 800) + t(80, 226, "พัฒนาผู้เรียนสู่ศตวรรษที่ 21", 36, "#fff", 800)
    b += t(80, 266, "เปิดรับสมัครนักเรียนใหม่ ปีการศึกษา 2569", 17, "rgba(255,255,255,.85)")
    b += r(80, 296, 170, 48, "#ffffff", 24) + t(165, 326, "สมัครเรียนออนไลน์", 14, hsl(hue, 60, 30), 800, "middle")
    b += r(266, 296, 130, 48, "rgba(255,255,255,.15)", 24, 'stroke="rgba(255,255,255,.6)"') + t(331, 326, "ดูหลักสูตร", 14, "#fff", 700, "middle")
    b += t(40, 448, "ข่าวประชาสัมพันธ์", 20, "#111827", 800) + t(W - 40, 448, "ดูทั้งหมด →", 14, hsl(hue, 60, 40), 600, "end")
    news = [("กีฬาสีประจำปี 2568", "12 ธ.ค."), ("ค่ายวิทยาศาสตร์ ม.ต้น", "28 พ.ย."), ("ผลสอบ O-NET ดีเยี่ยม", "15 พ.ย."), ("ประชุมผู้ปกครอง", "2 พ.ย.")]
    nw = (W - 80 - 3 * 20) / 4
    for i, (n, d) in enumerate(news):
        nx = 40 + i * (nw + 20)
        b += card(nx, 468, nw, 240)
        b += r(nx + 10, 478, nw - 20, 130, hsl(hue + i * 40, 50, 80), 10)
        b += f'<circle cx="{nx + nw / 2 - 30}" cy="{548}" r="18" fill="{hsl(hue + i * 40, 50, 65)}"/>' + f'<path d="M{nx + 30} 600 L{nx + nw / 2} 530 L{nx + nw - 30} 600Z" fill="{hsl(hue + i * 40, 45, 60)}"/>'
        b += t(nx + 16, 636, n, 14.5, "#111827", 700) + t(nx + 16, 662, d + " 2568", 12, "#6b7280")
        b += t(nx + 16, 690, "อ่านต่อ →", 12.5, hsl(hue, 60, 40), 700)
    return browser(url, b)


def calendar(hue, url):
    x0 = 262
    b = sidebar(hue, ["ปฏิทินห้อง", "การจองของฉัน", "ห้องประชุม", "อุปกรณ์", "ตั้งค่า"], 0, "Room Booking")
    b += topbar(x0, "ปฏิทินการจองห้อง", "สัปดาห์ที่ 12–16 มกราคม 2569", hue)
    cw = W - x0 - 28
    b += card(x0, 96, cw, 630)
    days = ["จันทร์ 12", "อังคาร 13", "พุธ 14", "พฤหัส 15", "ศุกร์ 16"]
    gx, colw = x0 + 70, (cw - 86) / 5
    for i, d in enumerate(days):
        b += t(gx + i * colw + colw / 2, 128, d, 13.5, hsl(hue, 60, 40) if i == 2 else "#374151", 700, "middle")
        if i == 2:
            b += r(gx + i * colw + 8, 136, colw - 16, 3, hsl(hue, 60, 45), 1.5)
    for h in range(9):
        yy = 150 + h * 62
        b += t(x0 + 22, yy + 5, f"{8 + h:02d}:00", 12, "#9ca3af") + f'<line x1="{gx}" x2="{x0 + cw - 16}" y1="{yy}" y2="{yy}" stroke="#f1f3f5"/>'
    for i in range(6):
        b += f'<line x1="{gx + i * colw}" x2="{gx + i * colw}" y1="146" y2="706" stroke="#f1f3f5"/>'
    events = [(0, 1, 1.5, "ประชุมทีมขาย", "ห้อง A", 210), (0, 4, 1, "สัมภาษณ์งาน", "ห้อง B", 30), (1, 0.5, 2, "อบรมพนักงานใหม่", "ห้องใหญ่", 150),
              (2, 1, 1, "Daily Standup", "ห้อง A", 260), (2, 3, 2, "นำเสนอลูกค้า", "ห้อง VIP", 340), (3, 2, 1.5, "ประชุมผู้บริหาร", "ห้อง VIP", 0),
              (3, 5.5, 1, "Workshop UX", "ห้อง B", 180), (4, 1.5, 1, "สรุปงานประจำสัปดาห์", "ห้องใหญ่", 120), (4, 6, 1.5, "เลี้ยงส่งพนักงาน", "ห้องใหญ่", 45)]
    for d, st, du, n, room, hh in events:
        ex, ey = gx + d * colw + 6, 150 + st * 62 + 3
        b += r(ex, ey, colw - 12, du * 62 - 6, hsl(hh, 75, 93), 8) + r(ex, ey, 4, du * 62 - 6, hsl(hh, 60, 50), 2)
        b += t(ex + 12, ey + 22, n, 12.5, hsl(hh, 60, 25), 700) + t(ex + 12, ey + 40, room + f" · {8 + int(st)}:{'30' if st % 1 else '00'}", 11, hsl(hh, 40, 40))
    # now line
    ny = 150 + 3.4 * 62
    b += f'<line x1="{gx + 2 * colw}" x2="{gx + 3 * colw}" y1="{ny}" y2="{ny}" stroke="#ef4444" stroke-width="2"/><circle cx="{gx + 2 * colw}" cy="{ny}" r="5" fill="#ef4444"/>'
    return browser(url, b)


def bi(hue, url):
    b = r(0, 0, W, H - 52, "#f3f2f1", 0)
    b += r(0, 0, W, 48, hsl(hue, 70, 22), 0) + t(20, 31, "Sales Report · Power BI", 15, "#fff", 700) + t(W - 20, 31, "อัปเดตอัตโนมัติทุกเช้า 08:00", 12.5, "rgba(255,255,255,.75)", 400, "end")
    for i, f in enumerate(["ปี: 2569", "ไตรมาส: ทั้งหมด", "สาขา: ทั้งหมด", "หมวดสินค้า: ทั้งหมด"]):
        b += r(20 + i * 190, 62, 178, 34, "#ffffff", 4, 'stroke="#e1dfdd"') + t(34 + i * 190, 84, f, 12.5, "#323130") + t(182 + i * 190, 84, "▾", 12, "#605e5c", 400, "end")
    kp = [("ยอดขายรวม", "฿12.4M"), ("กำไรขั้นต้น", "฿3.1M"), ("จำนวนออเดอร์", "8,942"), ("ลูกค้าใหม่", "1,205")]
    kw = (W - 40 - 3 * 12) / 4
    for i, (a, v) in enumerate(kp):
        kx = 20 + i * (kw + 12)
        b += r(kx, 110, kw, 90, "#ffffff", 4) + t(kx + kw / 2, 152, v, 28, hsl(hue, 60, 30), 700, "middle") + t(kx + kw / 2, 178, a, 12.5, "#605e5c", 400, "middle")
    b += r(20, 214, 700, 250, "#ffffff", 4) + t(36, 240, "ยอดขายรายเดือนเทียบปีก่อน", 13.5, "#323130", 700) + bars(40, 256, 660, 190, hue, 21, 12)
    b += line_chart(56, 270, 630, 150, hue + 180, 5, 12, False)
    b += r(732, 214, 448, 250, "#ffffff", 4) + t(748, 240, "สัดส่วนตามสาขา", 13.5, "#323130", 700) + donut(956, 350, 80, hue, 9)
    b += r(20, 476, 560, 256, "#ffffff", 4) + t(36, 502, "สินค้าขายดี 5 อันดับ", 13.5, "#323130", 700)
    for i, (n, v) in enumerate([("โน้ตบุ๊ก", 92), ("จอมอนิเตอร์", 74), ("กล้อง CCTV", 63), ("เราเตอร์", 48), ("SSD", 37)]):
        yy = 524 + i * 40
        b += t(36, yy + 16, n, 12.5, "#323130") + r(150, yy + 2, v * 3.9, 22, hsl(hue, 60, 45 + i * 5), 2) + t(150 + v * 3.9 + 8, yy + 18, f"{v}%", 11.5, "#605e5c")
    b += r(592, 476, 588, 256, "#ffffff", 4) + t(608, 502, "แนวโน้มออเดอร์รายวัน", 13.5, "#323130", 700) + line_chart(612, 524, 548, 180, hue, 31, 30)
    return browser(url, b)


def inventory(hue, url):
    return table_page(hue, "Stock", ["แดชบอร์ด", "สินค้าคงคลัง", "รับเข้า", "เบิกจ่าย", "สแกนบาร์โค้ด", "รายงาน"],
                      ["รหัสสินค้า", "ชื่อสินค้า", "หมวด", "คงเหลือ", "จุดสั่งซื้อ", "สถานะ"],
                      [["SKU-10231", "สาย LAN Cat6 305m", "เครือข่าย", "42 ม้วน", "10", "ปกติ"],
                       ["SKU-10232", "กล้อง IP 4MP", "CCTV", "8 ตัว", "15", "ใกล้หมด"],
                       ["SKU-10233", "SSD 1TB NVMe", "สตอเรจ", "65 ชิ้น", "20", "ปกติ"],
                       ["SKU-10234", "RAM DDR4 16GB", "หน่วยความจำ", "12 ชิ้น", "15", "ใกล้หมด"],
                       ["SKU-10235", "เราเตอร์ WiFi 6", "เครือข่าย", "27 ตัว", "10", "ปกติ"],
                       ["SKU-10236", "หัว RJ45 (100 ชิ้น)", "เครือข่าย", "90 กล่อง", "30", "ปกติ"],
                       ["SKU-10237", "UPS 1000VA", "ไฟฟ้า", "4 เครื่อง", "5", "ใกล้หมด"],
                       ["SKU-10238", "เมาส์ไร้สาย", "อุปกรณ์เสริม", "130 ชิ้น", "40", "ปกติ"],
                       ["SKU-10239", "จอ 24 นิ้ว IPS", "จอภาพ", "19 จอ", "10", "ปกติ"]],
                      url, "สินค้าคงคลัง", "สแกนบาร์โค้ดเพื่อรับเข้าหรือเบิกจ่ายได้ทันที", 5)


def payments(hue, url):
    return table_page(hue, "PayHub", ["ภาพรวม", "ธุรกรรม", "QR พร้อมเพย์", "Webhook", "API Keys", "ตั้งค่า"],
                      ["เลขอ้างอิง", "ร้านค้า", "ช่องทาง", "จำนวนเงิน", "เวลา", "สถานะ"],
                      [["TXN-88412", "ร้าน A", "PromptPay", "฿1,250.00", "14:32:08", "เสร็จแล้ว"],
                       ["TXN-88411", "ร้าน B", "PromptPay", "฿389.00", "14:31:55", "เสร็จแล้ว"],
                       ["TXN-88410", "ร้าน A", "โอนผ่านสลิป", "฿5,400.00", "14:30:12", "รอตรวจ"],
                       ["TXN-88409", "ร้าน C", "PromptPay", "฿120.00", "14:29:47", "เสร็จแล้ว"],
                       ["TXN-88408", "ร้าน B", "PromptPay", "฿2,099.00", "14:28:03", "เสร็จแล้ว"],
                       ["TXN-88407", "ร้าน D", "โอนผ่านสลิป", "฿760.00", "14:26:41", "รอตรวจ"],
                       ["TXN-88406", "ร้าน A", "PromptPay", "฿45.00", "14:25:19", "เสร็จแล้ว"],
                       ["TXN-88405", "ร้าน C", "PromptPay", "฿3,120.00", "14:24:02", "เสร็จแล้ว"],
                       ["TXN-88404", "ร้าน D", "PromptPay", "฿890.00", "14:22:37", "เสร็จแล้ว"]],
                      url, "ธุรกรรมทั้งหมด", "รายการชำระเงินแบบเรียลไทม์ผ่าน Webhook", 5)


MOCKUPS = {
    "erp": lambda: dashboard(160, "Backoffice", ["ภาพรวม", "สินค้า/สต็อก", "ออเดอร์", "ใบเสนอราคา", "บัญชี", "รายงาน", "ตั้งค่า"],
                             [("ยอดขายวันนี้", "฿84,250", "+12%"), ("ออเดอร์ใหม่", "126", "+8%"), ("สินค้าใกล้หมด", "14", "-3"), ("ลูกหนี้ค้างชำระ", "฿212K", "-5%")], 11, "backoffice.example.com/dashboard"),
    "line-oa": lambda: phone_booking(150, "liff.line.me/booking"),
    "cctv": lambda: cctv(200, "cctv-monitor.local/live"),
    "api": lambda: payments(190, "dashboard.payhub.example/transactions"),
    "shop": lambda: shop(250, "itshop.example.com", "IT Shop", [("จอมอนิเตอร์ 27\"", "฿5,990", "฿7,490"), ("คีย์บอร์ด Mechanical", "฿1,890", ""), ("กล้อง IP 4MP", "฿1,290", "฿1,590"), ("เราเตอร์ WiFi 6", "฿2,490", "")]),
    "bi": lambda: bi(205, "app.powerbi.com/reports/sales"),
    "pos": lambda: pos(25, "pos.example.com"),
    "helpdesk": lambda: kanban(220, "itdesk.example.com/tickets"),
    "school": lambda: landing(140, "www.greenhill-school.example"),
    "room": lambda: calendar(265, "rooms.example.com/calendar"),
    "stock": lambda: inventory(170, "stock.example.com/inventory"),
}

for key, fn in MOCKUPS.items():
    with open(os.path.join(OUT, f"{key}.svg"), "w") as f:
        f.write(fn())
print("wrote", len(MOCKUPS))
