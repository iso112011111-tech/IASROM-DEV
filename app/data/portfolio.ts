// ข้อมูลทั้งหมดของส่วน Tech Stack / Projects / Team — แก้ไขที่ไฟล์นี้ไฟล์เดียว

export type LangId = "ts" | "js" | "py" | "go" | "sql" | "php";

export interface Language {
  id: LangId;
  name: string;
  short: string;
  color: string;
}

export const LANGUAGES: Language[] = [
  { id: "ts", name: "TypeScript", short: "TS", color: "#3178c6" },
  { id: "js", name: "JavaScript", short: "JS", color: "#e0b300" },
  { id: "py", name: "Python", short: "PY", color: "#f2c43d" },
  { id: "go", name: "Go", short: "GO", color: "#00add8" },
  { id: "sql", name: "SQL", short: "SQL", color: "#e38c00" },
  { id: "php", name: "PHP", short: "PHP", color: "#777bb4" },
];

export interface Project {
  id: string;
  title: string;
  category: string;
  summary: string;
  details: string;
  langs: LangId[];
  stack: string[];
  highlights: string[];
  year: number;
  hue: number; // สีพื้นการ์ด
  image: string; // ภาพหน้าจอผลงาน ใน public/projects/
}

export const PROJECTS: Project[] = [
  {
    id: "erp",
    title: "ระบบ Backoffice / ERP",
    category: "Web App",
    summary: "จัดการสต็อก ออเดอร์ และบัญชีในที่เดียว",
    details: "ระบบหลังบ้านสำหรับร้านค้าไอที รวมสต็อกหลายสาขา ออกใบเสนอราคาและใบกำกับภาษี พร้อมหน้าภาพรวมยอดขายที่อัปเดตทันที",
    langs: ["ts", "sql"],
    stack: ["Next.js", "PostgreSQL", "Prisma", "Tailwind"],
    highlights: ["Dashboard ยอดขายแบบเรียลไทม์", "สต็อกหลายสาขาในระบบเดียว", "ออกใบเสนอราคา / ใบกำกับภาษีเป็น PDF"],
    year: 2026,
    hue: 160,
    image: "/projects/erp.svg",
  },
  {
    id: "line-oa",
    title: "LINE OA จองคิวคลินิก",
    category: "LINE / LIFF",
    summary: "จองคิว เลือกเวลา และแจ้งเตือนผ่าน LINE",
    details: "ระบบจองคิวผ่าน LINE OA + LIFF ผู้ใช้เลือกบริการ วันและเวลาได้เอง เจ้าหน้าที่อนุมัติจากมือถือ และข้อมูลทั้งหมดเก็บใน Google Sheets ผ่าน Google Apps Script",
    langs: ["js"],
    stack: ["LIFF", "Google Apps Script", "Google Sheets", "Vercel"],
    highlights: ["จองได้ในไม่กี่คลิกโดยไม่ต้องลงแอปเพิ่ม", "จำกัดจำนวนคิวต่อช่วงเวลาได้", "แจ้งผลการอนุมัติกลับทาง LINE"],
    year: 2026,
    hue: 140,
    image: "/projects/line-oa.svg",
  },
  {
    id: "cctv",
    title: "CCTV AI Monitor",
    category: "AI / Vision",
    summary: "ตรวจจับคนและรถจากกล้องวงจรปิด",
    details: "โปรแกรม Python อ่านภาพจากกล้อง IP ผ่าน RTSP ตรวจจับคนและยานพาหนะด้วยโมเดล YOLO แล้วส่งภาพแจ้งเตือนเข้า LINE ของผู้ดูแลทันที",
    langs: ["py"],
    stack: ["Python", "OpenCV", "YOLO", "FastAPI"],
    highlights: ["ดูหลายกล้องพร้อมกันในจอเดียว", "ตีกรอบวัตถุที่ตรวจพบ", "แจ้งเตือนพร้อมภาพเข้า LINE"],
    year: 2025,
    hue: 200,
    image: "/projects/cctv.svg",
  },
  {
    id: "stock",
    title: "ระบบคลังสินค้า + บาร์โค้ด",
    category: "Web App",
    summary: "รับเข้า–เบิกจ่ายด้วยการสแกนบาร์โค้ด",
    details: "ระบบคลังสินค้าสำหรับร้านอุปกรณ์ไอที สแกนบาร์โค้ดจากมือถือเพื่อรับเข้าและเบิกจ่าย แจ้งเตือนเมื่อสินค้าต่ำกว่าจุดสั่งซื้อ และส่งออกรายงานเป็น Excel",
    langs: ["py", "sql"],
    stack: ["Python", "Flask", "MySQL", "Bootstrap"],
    highlights: ["สแกนบาร์โค้ดผ่านกล้องมือถือ", "แจ้งเตือนสินค้าใกล้หมด", "Export รายงานเป็น Excel"],
    year: 2025,
    hue: 170,
    image: "/projects/stock.svg",
  },
  {
    id: "pos",
    title: "ระบบ POS ร้านกาแฟ",
    category: "Web App",
    summary: "ขายหน้าร้านบนแท็บเล็ต รับชำระด้วย QR",
    details: "ระบบขายหน้าร้านที่ใช้งานบนแท็บเล็ต แยกหมวดเมนู คิดส่วนลดสมาชิกและ VAT อัตโนมัติ รองรับชำระด้วย QR พร้อมเพย์ และสรุปยอดขายรายวัน",
    langs: ["ts", "sql"],
    stack: ["React", "Node.js", "MySQL"],
    highlights: ["หน้าจอออกแบบสำหรับจอสัมผัส", "QR พร้อมเพย์ในตัว", "สรุปยอดปิดร้านรายวัน"],
    year: 2025,
    hue: 25,
    image: "/projects/pos.svg",
  },
  {
    id: "helpdesk",
    title: "ระบบแจ้งซ่อม IT Helpdesk",
    category: "Web App",
    summary: "แจ้งปัญหา ติดตามงาน และเก็บประวัติซ่อม",
    details: "ระบบแจ้งซ่อมภายในองค์กร พนักงานแจ้งปัญหาได้เอง ทีมไอทีรับงานและเลื่อนสถานะบนบอร์ดแบบ Kanban พร้อมเก็บประวัติการซ่อมของอุปกรณ์แต่ละเครื่อง",
    langs: ["php", "sql"],
    stack: ["PHP", "MySQL", "Bootstrap", "XAMPP"],
    highlights: ["บอร์ดติดตามงานแบบ Kanban", "จัดลำดับความเร่งด่วน", "ประวัติการซ่อมรายอุปกรณ์"],
    year: 2024,
    hue: 220,
    image: "/projects/helpdesk.svg",
  },
  {
    id: "bi",
    title: "Dashboard รายงานยอดขาย",
    category: "Data / BI",
    summary: "รายงานผู้บริหารที่อัปเดตเองทุกเช้า",
    details: "ดึงข้อมูลจาก SQL Server มาทำรายงานยอดขายด้วย Power BI กรองตามปี สาขา และหมวดสินค้าได้ และตั้ง Power Automate ส่งสรุปให้ผู้บริหารทุกเช้า",
    langs: ["sql"],
    stack: ["SQL Server", "Power BI", "Power Automate"],
    highlights: ["กรองข้อมูลตามปี / สาขา / หมวด", "รีเฟรชข้อมูลอัตโนมัติ", "ส่งสรุปทางอีเมลทุกเช้า"],
    year: 2026,
    hue: 205,
    image: "/projects/bi.svg",
  },
  {
    id: "api",
    title: "Payment Dashboard + API",
    category: "Backend",
    summary: "รับชำระ QR พร้อมเพย์และติดตามธุรกรรม",
    details: "บริการ API ภาษา Go สำหรับสร้าง QR พร้อมเพย์ ตรวจสอบสลิป และยิง Webhook แจ้งสถานะไปยังระบบร้านค้า พร้อมหน้า Dashboard ดูธุรกรรมแบบเรียลไทม์",
    langs: ["go", "sql"],
    stack: ["Go", "PostgreSQL", "Redis", "Docker"],
    highlights: ["สร้าง QR พร้อมเพย์ตามยอดเงิน", "Webhook แจ้งสถานะการชำระ", "ออกแบบให้ขยายระบบได้ง่าย"],
    year: 2025,
    hue: 190,
    image: "/projects/api.svg",
  },
  {
    id: "shop",
    title: "เว็บร้านค้าอุปกรณ์ไอที",
    category: "E-commerce",
    summary: "หน้าร้านออนไลน์พร้อมตะกร้าและชำระเงิน",
    details: "เว็บ E-commerce บน WordPress / WooCommerce ปรับแต่งธีมด้วย PHP ให้ตรงแบรนด์ มีระบบโปรโมชัน เชื่อมการชำระเงินและขนส่ง",
    langs: ["php", "sql"],
    stack: ["WordPress", "WooCommerce", "MySQL"],
    highlights: ["ธีมปรับแต่งเองทั้งหมด", "ระบบโปรโมชันและคูปอง", "รองรับมือถือเต็มรูปแบบ"],
    year: 2024,
    hue: 260,
    image: "/projects/shop.svg",
  },
  {
    id: "school",
    title: "เว็บไซต์โรงเรียน",
    category: "Website",
    summary: "เว็บประชาสัมพันธ์พร้อมระบบรับสมัครออนไลน์",
    details: "เว็บไซต์ประชาสัมพันธ์ของโรงเรียน ครูลงข่าวได้เองผ่านหลังบ้าน มีหน้าหลักสูตร และฟอร์มรับสมัครนักเรียนออนไลน์",
    langs: ["js", "php"],
    stack: ["HTML5", "CSS3", "JavaScript", "PHP"],
    highlights: ["ครูลงข่าวได้เองผ่านหลังบ้าน", "ฟอร์มรับสมัครออนไลน์", "ออกแบบ Responsive ทุกหน้าจอ"],
    year: 2024,
    hue: 140,
    image: "/projects/school.svg",
  },
  {
    id: "room",
    title: "ระบบจองห้องประชุม",
    category: "Web App",
    summary: "ดูตารางว่างและจองห้องในปฏิทินเดียว",
    details: "ระบบจองห้องประชุมภายในบริษัท แสดงตารางการใช้ห้องแบบรายสัปดาห์ ป้องกันการจองซ้อน และแจ้งเตือนก่อนถึงเวลาประชุม",
    langs: ["ts", "sql"],
    stack: ["Next.js", "MySQL", "Tailwind"],
    highlights: ["ปฏิทินรายสัปดาห์แยกสีตามห้อง", "ป้องกันการจองเวลาซ้อน", "แจ้งเตือนก่อนเริ่มประชุม"],
    year: 2026,
    hue: 265,
    image: "/projects/room.svg",
  },
];

export type SkillIcon = "code" | "braces" | "file" | "grid" | "atom" | "globe" | "phone" | "server" | "bolt" | "db" | "window" | "monitor" | "branch" | "github" | "send" | "chart" | "image" | "pen" | "terminal" | "wrench";

export interface SkillGroup {
  id: string;
  tag: string;
  title: string;
  skills: { name: string; level: number; icon: SkillIcon }[];
}

export const SKILL_GROUPS: SkillGroup[] = [
  {
    id: "frontend",
    tag: "CLIENT_SIDE",
    title: "Frontend",
    skills: [
      { name: "HTML5", level: 90, icon: "code" },
      { name: "CSS3", level: 85, icon: "braces" },
      { name: "JavaScript", level: 80, icon: "file" },
      { name: "TypeScript", level: 70, icon: "file" },
      { name: "Bootstrap", level: 80, icon: "grid" },
      { name: "ReactJS", level: 75, icon: "atom" },
      { name: "NextJS", level: 70, icon: "globe" },
      { name: "Flutter", level: 65, icon: "phone" },
      { name: "C++", level: 65, icon: "code" },
    ],
  },
  {
    id: "backend",
    tag: "SERVER_SIDE",
    title: "Backend & Data",
    skills: [
      { name: "PHP", level: 75, icon: "braces" },
      { name: "Python", level: 70, icon: "code" },
      { name: "NodeJS", level: 70, icon: "server" },
      { name: "Go", level: 65, icon: "bolt" },
      { name: "MySQL", level: 80, icon: "db" },
      { name: "SQL Server", level: 70, icon: "db" },
      { name: "SQL", level: 75, icon: "file" },
      { name: "API", level: 80, icon: "window" },
      { name: "Remote Desktop", level: 70, icon: "monitor" },
      { name: "pgAdmin 4", level: 65, icon: "db" },
    ],
  },
  {
    id: "tools",
    tag: "CREATIVE_TOOLS",
    title: "Tools & Design",
    skills: [
      { name: "Git", level: 80, icon: "branch" },
      { name: "GitHub", level: 85, icon: "github" },
      { name: "Microsoft Office", level: 90, icon: "grid" },
      { name: "Postman", level: 75, icon: "send" },
      { name: "Power Automate", level: 70, icon: "bolt" },
      { name: "Power BI", level: 75, icon: "chart" },
      { name: "Photoshop", level: 80, icon: "image" },
      { name: "Figma", level: 70, icon: "pen" },
      { name: "VS Code", level: 90, icon: "terminal" },
      { name: "XAMPP", level: 80, icon: "wrench" },
    ],
  },
];

export interface TeamMember {
  name: string;
  nickname: string;
  role: string;
  handles?: string[]; // งานที่ติดต่อคนนี้ได้ (ใช้ในส่วนติดต่อเรา)
  photo?: string; // เช่น "/team/so.jpg" (วางไฟล์ไว้ใน public/team/)
  facebook?: string;
  instagram?: string;
}

export const TEAM: TeamMember[] = [
  { name: "สิรวิชญ์ บุญญาสถิตย์", nickname: "โซ่", role: "Software Engineer", handles: ["เว็บไซต์", "แอปพลิเคชัน", "ระบบหลังบ้าน", "LINE OA / LIFF", "Dashboard / รายงาน"], photo: "/team/iso.jpg", facebook: "https://www.facebook.com/sosirawit/" },
  { name: "สุริยา ยอดพงษา", nickname: "อาม", role: "ช่างเทคนิคคอมพิวเตอร์", handles: ["ซ่อมคอม / โน้ตบุ๊ก", "ติดตั้งกล้อง CCTV", "ระบบเครือข่าย", "ดูแลไอทีสำนักงาน"], photo: "/team/arm.jpg", facebook: "https://www.facebook.com/suriya.yodpongsa.7" },
];

// ช่องทางติดต่อกลาง — ใส่ค่าแล้วจะแสดงในส่วน "ติดต่อเรา" อัตโนมัติ (เว้นว่างไว้ = ไม่แสดง)
export const CONTACT: { phone?: string; email?: string; line?: string; hours?: string } = {
  phone: "",
  email: "",
  line: "@891dpcst", // LINE OA ของทีม
  hours: "",
};

// ลิงก์เพิ่มเพื่อน LINE OA ของทีม (ใช้ในเมนูบน การ์ดทีม และการ์ดติดต่อ)
export const LINE_OA_URL = "https://line.me/R/ti/p/@891dpcst";

// =========================================================
// ภาษาอังกฤษ (EN) — ข้อความแปลของข้อมูลด้านบน อ้างอิงตาม id / nickname
// =========================================================

type ProjectText = Pick<Project, "title" | "category" | "summary" | "details" | "highlights">;

export const PROJECTS_EN: Record<string, ProjectText> = {
  erp: {
    title: "Backoffice / ERP System",
    category: "Web App",
    summary: "Stock, orders and accounting in one place",
    details: "A back-office system for an IT retailer: multi-branch stock, quotations and tax invoices, plus a sales overview that updates instantly.",
    highlights: ["Real-time sales dashboard", "Multi-branch stock in one system", "Quotations / tax invoices as PDF"],
  },
  "line-oa": {
    title: "LINE OA Clinic Booking",
    category: "LINE / LIFF",
    summary: "Book a slot, pick a time, get notified on LINE",
    details: "A booking system on LINE OA + LIFF. Users choose the service, date and time themselves, staff approve from their phone, and all data is stored in Google Sheets via Google Apps Script.",
    highlights: ["Book in a few taps — no extra app", "Limit bookings per time slot", "Approval results sent back via LINE"],
  },
  cctv: {
    title: "CCTV AI Monitor",
    category: "AI / Vision",
    summary: "Detect people and vehicles from CCTV",
    details: "A Python program that reads IP camera feeds over RTSP, detects people and vehicles with a YOLO model, and instantly sends snapshot alerts to the admin's LINE.",
    highlights: ["Watch multiple cameras on one screen", "Bounding boxes on detected objects", "Snapshot alerts sent to LINE"],
  },
  stock: {
    title: "Inventory + Barcode System",
    category: "Web App",
    summary: "Stock in and out by scanning barcodes",
    details: "An inventory system for an IT equipment shop. Scan barcodes with a phone to receive and issue stock, get alerts when items fall below reorder level, and export reports to Excel.",
    highlights: ["Scan barcodes with a phone camera", "Low-stock alerts", "Export reports to Excel"],
  },
  pos: {
    title: "Café POS System",
    category: "Web App",
    summary: "Tablet point of sale with QR payments",
    details: "A point-of-sale system for tablets with menu categories, automatic member discounts and VAT, PromptPay QR payments and a daily sales summary.",
    highlights: ["Touch-first interface", "Built-in PromptPay QR", "End-of-day sales summary"],
  },
  helpdesk: {
    title: "IT Helpdesk System",
    category: "Web App",
    summary: "Report issues, track work, keep repair history",
    details: "An internal helpdesk: staff report issues themselves, the IT team picks up tickets and moves them across a Kanban board, and each device keeps its own repair history.",
    highlights: ["Kanban board for tracking tickets", "Priority levels", "Repair history per device"],
  },
  bi: {
    title: "Sales Report Dashboard",
    category: "Data / BI",
    summary: "An executive report that refreshes every morning",
    details: "Pulls data from SQL Server into a Power BI sales report, filterable by year, branch and product category, with Power Automate emailing a summary to management every morning.",
    highlights: ["Filter by year / branch / category", "Automatic data refresh", "Morning email summary"],
  },
  api: {
    title: "Payment Dashboard + API",
    category: "Backend",
    summary: "PromptPay QR payments with transaction tracking",
    details: "A Go API that generates PromptPay QR codes, verifies payment slips and fires webhooks to the merchant's system, with a real-time transaction dashboard.",
    highlights: ["PromptPay QR per amount", "Payment status webhooks", "Designed to scale easily"],
  },
  shop: {
    title: "IT Equipment Online Store",
    category: "E-commerce",
    summary: "Online storefront with cart and checkout",
    details: "An e-commerce site on WordPress / WooCommerce with a custom PHP theme matched to the brand, promotions, and integrated payment and shipping.",
    highlights: ["Fully custom theme", "Promotions and coupons", "Fully mobile-friendly"],
  },
  school: {
    title: "School Website",
    category: "Website",
    summary: "News site with online admissions",
    details: "A school website where teachers post news themselves through the back office, with curriculum pages and an online admission form.",
    highlights: ["Teachers post news via the back office", "Online admission form", "Responsive on every screen"],
  },
  room: {
    title: "Meeting Room Booking",
    category: "Web App",
    summary: "See availability and book rooms in one calendar",
    details: "An internal meeting-room booking system with a weekly schedule, double-booking prevention and reminders before meetings start.",
    highlights: ["Weekly calendar colour-coded by room", "Prevents double booking", "Reminders before meetings"],
  },
};

// ชื่อภาษาอังกฤษ — โปรดตรวจการสะกดชื่อ-นามสกุลให้ถูกต้อง
export const TEAM_EN: Record<string, Pick<TeamMember, "name" | "nickname" | "role" | "handles">> = {
  "โซ่": {
    name: "Sirawit Boonyasathit",
    nickname: "So",
    role: "Software Engineer",
    handles: ["Websites", "Applications", "Back-office systems", "LINE OA / LIFF", "Dashboards / reports"],
  },
  "อาม": {
    name: "Suriya Yodpongsa",
    nickname: "Arm",
    role: "Computer Technician",
    handles: ["PC / laptop repair", "CCTV installation", "Networking", "Office IT support"],
  },
};

export const localizeProject = (p: Project, lang: "th" | "en"): Project => (lang === "en" && PROJECTS_EN[p.id] ? { ...p, ...PROJECTS_EN[p.id] } : p);
export const localizeMember = (m: TeamMember, lang: "th" | "en"): TeamMember => (lang === "en" && TEAM_EN[m.nickname] ? { ...m, ...TEAM_EN[m.nickname] } : m);
