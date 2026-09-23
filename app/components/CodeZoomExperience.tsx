"use client";

import React, { useEffect, useRef, useState } from "react";
import { useLang } from "../i18n";

interface ServiceTab {
  id: string;
  title: string;
  icon: string;
  badge: string;
  headline: string;
  headlineEn: string;
  codeSnippet: string[];
  features: string[];
  featuresEn: string[];
  stats: { label: string; value: string };
}

const SERVICE_TABS: ServiceTab[] = [
  {
    id: "web",
    title: "1. Web & Cloud",
    icon: "💻",
    badge: "MODERN ARCHITECTURE",
    headline: "พัฒนาเว็บไซต์และระบบ Cloud ความเร็วสูง",
    headlineEn: "Fast websites and cloud systems",
    codeSnippet: [
      "// Next.js 15 App Router + High Performance Core",
      "import { createEnterprisePlatform } from '@iasrom/web';",
      "",
      "export const config = {",
      "  framework: 'Next.js 15 (React 19)',",
      "  rendering: 'Hybrid Server / Edge Streaming',",
      "  speedScore: 100, // Lighthouse Performance",
      "  seoOptimized: true,",
      "  mobileResponsive: '100% Adaptive Design',",
      "};",
      "",
      "export default async function LaunchSite() {",
      "  return await createEnterprisePlatform({ latency: '< 50ms' });",
      "}"
    ],
    features: [
      "โหลดเร็วระดับเสี้ยววินาที (Lighthouse 100)",
      "ดีไซน์หรูหรา ใช้งานลื่นไหลบนมือถือ 100%",
      "โครงสร้างทันสมัย รองรับคนเข้าใช้งานพร้อมกัน"
    ],
    featuresEn: [
      "Sub-second load times (Lighthouse 100)",
      "Premium design, 100% smooth on mobile",
      "Modern architecture that handles many users at once"
    ],
    stats: { label: "Performance Score", value: "100/100" }
  },
  {
    id: "backoffice",
    title: "2. Backoffice & ERP",
    icon: "⚙️",
    badge: "BUSINESS AUTOMATION",
    headline: "ระบบหลังบ้าน สต็อกสินค้า และดาต้าเบสธุรกิจ",
    headlineEn: "Back-office, inventory and business databases",
    codeSnippet: [
      "// IASROM Business Intelligence Hub",
      "interface BackofficeEngine {",
      "  orders: RealtimeStream<Order>;",
      "  inventory: AutoReplenishSystem;",
      "  analytics: RevenueDashboard24_7;",
      "}",
      "",
      "export function runERPAutomation(storeId: string) {",
      "  const hub = connectSecureDatabase(storeId);",
      "  hub.syncMultiBranch({ syncInterval: 'Instant' });",
      "  return hub.generateExecutiveReport();",
      "}"
    ],
    features: [
      "จัดการออเดอร์และสต็อกสินค้าแบบ Real-time",
      "รายงานสถิติยอดขายและบัญชีแม่นยำ 100%",
      "เชื่อมต่อระบบได้หลายสาขาพร้อมกัน"
    ],
    featuresEn: [
      "Real-time order and stock management",
      "100% accurate sales and accounting reports",
      "Connect multiple branches at once"
    ],
    stats: { label: "Efficiency Boost", value: "+65%" }
  },
  {
    id: "cctv",
    title: "3. CCTV & Security",
    icon: "📹",
    badge: "SMART SURVEILLANCE",
    headline: "ติดตั้งกล้องวงจรปิด ดูสดผ่านมือถือ 24 ชม.",
    headlineEn: "CCTV installation with 24/7 live view on mobile",
    codeSnippet: [
      "// CCTV Cloud Gateway & AI Motion Detection",
      "const surveillanceCluster = new CCTVManager({",
      "  resolution: '4K Ultra HD (H.265+)',",
      "  nightVision: 'Full-Color ColorVu 24/7',",
      "  cloudBackup: true,",
      "  mobileLiveView: 'iOS & Android Ready',",
      "  aiAlert: ['HumanDetection', 'VehicleTracking'],",
      "});",
      "",
      "await surveillanceCluster.armSecuritySystem();"
    ],
    features: [
      "ภาพคมชัดระดับ 4K ทั้งกลางวันและกลางคืน",
      "แจ้งเตือนเข้ามือถือทันทีเมื่อมีสิ่งผิดปกติ",
      "ระบบบันทึกภาพลงคลาวด์ เสถียร ไม่หลุด"
    ],
    featuresEn: [
      "Sharp 4K footage day and night",
      "Instant mobile alerts on unusual activity",
      "Stable cloud recording that never drops"
    ],
    stats: { label: "Uptime Security", value: "99.99%" }
  },
  {
    id: "service",
    title: "4. IT Service & Repair",
    icon: "🔧",
    badge: "ENTERPRISE SUPPORT",
    headline: "ซ่อมคอมพิวเตอร์ วางระบบเน็ตเวิร์ก และบำรุงรักษา",
    headlineEn: "Computer repair, networking and maintenance",
    codeSnippet: [
      "// IT Infrastructure Health & Diagnostics",
      "const networkStatus = checkEnterpriseNetwork({",
      "  firewall: 'Hardware Grade Fortinet/Cisco',",
      "  lanSpeed: '10 Gbps High-Speed Backbone',",
      "  hardwareDiagnostics: 'PASS (0 Faults)',",
      "  onsiteSupport: 'Available 24 Hours',",
      "});",
      "",
      "console.log('IASROM IT Service: Systems Normal');"
    ],
    features: [
      "ซ่อมด่วนถึงที่ พร้อมตรวจเช็คสภาพเครื่องฟรี",
      "วางระบบเน็ตเวิร์ก สาย LAN และ Wi-Fi องค์กร",
      "สัญญาบริการ MA ดูแลไอทีต่อเนื่อง ไม่ทอดทิ้ง"
    ],
    featuresEn: [
      "Fast on-site repairs with a free health check",
      "Office LAN and Wi-Fi network setup",
      "MA service contracts with ongoing IT care"
    ],
    stats: { label: "Client Rating", value: "5.0 ★" }
  }
];

export default function CodeZoomExperience() {
  const { lang, t } = useLang();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    let animId: number;
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalScrollable = rect.height - window.innerHeight;
      if (totalScrollable <= 0) return;

      const p = Math.min(Math.max(-rect.top / totalScrollable, 0), 1);
      setScrollProgress(p);
    };

    const onScroll = () => {
      cancelAnimationFrame(animId);
      animId = requestAnimationFrame(handleScroll);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(animId);
    };
  }, []);

  // 1. LID OPENING: 0.0 -> 0.28
  // When progress = 0: lid is folded flat over keyboard (82deg).
  // When progress = 0.28: lid is standing upright (0deg to -5deg).
  const openProgress = Math.min(Math.max(scrollProgress / 0.26, 0), 1);
  const easedOpen = 1 - Math.pow(1 - openProgress, 3);
  const lidAngle = (1 - easedOpen) * 85 - 5 * easedOpen; // 85deg (closed) -> -5deg (open)

  // 2. TILT & POSITIONING
  // Tilt angles are calibrated so the screen is directly in front of the viewer
  // Closed: tilt = 46deg (nice 3D angle of closed lid)
  // Open: tilt = 16deg (screen is facing upright, perfectly flat and visible!)
  const overallTilt = 46 - easedOpen * 30;

  // Screen display wake-up
  const screenAwakeOpacity = Math.min(Math.max((scrollProgress - 0.06) / 0.16, 0), 1);

  // Active service tab (0, 1, 2, 3) across 0.26 to 0.90
  const tabPhase = Math.min(Math.max((scrollProgress - 0.26) / 0.60, 0), 1);
  const activeTabIndex = Math.min(Math.floor(tabPhase * SERVICE_TABS.length), SERVICE_TABS.length - 1);
  const currentTab = SERVICE_TABS[activeTabIndex];

  // Number of code lines visible based on progression in current tab
  const subTabProgress = (tabPhase * SERVICE_TABS.length) - activeTabIndex;
  const linesToShow = Math.max(4, Math.floor(subTabProgress * currentTab.codeSnippet.length));

  // Intro text fade out when scrolling
  const introOpacity = Math.max(1 - scrollProgress * 4.5, 0);
  const introY = -scrollProgress * 50;

  // Live service banner (shows when laptop is open)
  const bannerOpacity = Math.min(Math.max((scrollProgress - 0.25) / 0.15, 0), 1);

  return (
    <section ref={containerRef} className="mac-showcase-section">
      {/* จุดที่เมนู "บริการของเรา" เลื่อนมา: ตอนจอเปิดแล้วและเริ่มแสดงบริการ */}
      <span id="services" className="mac-services-anchor" aria-hidden="true" />
      <div className="mac-sticky-container">
        {/* Studio Lighting */}
        <div className="studio-light-top" />
        <div className="studio-desk-surface" />

        {/* Intro Header (Visible when laptop is closed) */}
        <div 
          className="mac-intro-header"
          style={{
            opacity: introOpacity,
            transform: `translateY(${introY}px)`,
            pointerEvents: introOpacity < 0.1 ? 'none' : 'auto'
          }}
        >
          <div className="mac-intro-pill">
            <span>IASROM-DEV • INNOVATIVE DIGITAL SOLUTIONS</span>
          </div>
          <h1 className="mac-intro-title">
            {t("เว็บไซต์ ระบบหลังบ้าน และไอที", "Websites, back-office systems & IT")}<br />
            <em>{t("ที่ช่วยให้ธุรกิจเติบโตอย่างมั่นคง", "that help your business grow steadily")}</em>
          </h1>
          <p className="mac-intro-subtitle">
            {t("ออกแบบ พัฒนา และดูแลระบบดิจิทัลระดับมืออาชีพ พร้อมบริการคุณตลอด 24 ชั่วโมง", "Professional design, development and care for your digital systems — here for you 24/7")}
          </p>
          <div className="mac-scroll-hint">
            <span className="mouse-scroller">
              <span className="mouse-dot"></span>
            </span>
            <span>{t("เลื่อนลงเพื่อเปิดหน้าจอและสำรวจผลงาน", "Scroll down to open the screen and explore our work")}</span>
          </div>
        </div>

        {/* 3D LAPTOP STAGE (COMPACT & 100% IN VIEWPORT) */}
        <div className="mac-stage-viewport">
          <div 
            className="macbook-integrated-unit"
            style={{
              transform: `rotateX(${overallTilt}deg)`,
              willChange: "transform",
            }}
          >
            {/* 1. SCREEN LID (UPPER HALF) */}
            <div 
              className="macbook-lid-unit"
              style={{
                transform: `rotateX(${lidAngle}deg)`,
                willChange: "transform"
              }}
            >
              {/* BACK OF LID (Visible when closed) */}
              <div className="lid-back-cover">
                <div className="lid-metal-sheen">
                  <div className="iasrom-lid-logo">
                    <span className="logo-icon">⚡</span>
                    <span className="logo-name">IASROM-DEV</span>
                    <span className="logo-caption">ENTERPRISE DIGITAL PLATFORM</span>
                  </div>
                </div>
              </div>

              {/* FRONT OF LID (The Retina Screen) */}
              <div 
                className="lid-front-display"
                style={{ opacity: screenAwakeOpacity }}
              >
                <div className="display-outer-bezel">
                  {/* Camera Notch */}
                  <div className="screen-notch-bar">
                    <span className="camera-lens-dot"></span>
                    <span className="camera-green-light"></span>
                  </div>

                  {/* SCREEN IDE CONTENT */}
                  <div className="screen-ide-workspace">
                    {/* IDE Header Bar */}
                    <div className="ide-bar">
                      <div className="traffic-buttons">
                        <span className="tb red"></span>
                        <span className="tb yellow"></span>
                        <span className="tb green"></span>
                      </div>

                      {/* Tabs */}
                      <div className="ide-tab-scroller">
                        {SERVICE_TABS.map((tab, idx) => (
                          <div
                            key={tab.id}
                            className={`ide-tab-pill ${idx === activeTabIndex ? "active" : ""}`}
                          >
                            <span>{tab.icon}</span>
                            <span>{tab.title}</span>
                          </div>
                        ))}
                      </div>

                      <div className="ide-uptime-badge">
                        <span className="green-blink-dot"></span>
                        <span>ONLINE 24/7</span>
                      </div>
                    </div>

                    {/* IDE Split View (Code on Left, Features on Right) */}
                    <div className="ide-two-columns">
                      {/* Left: Code Editor */}
                      <div className="ide-code-pane">
                        <div className="code-sub-bar">
                          <span className="file-badge">📄 {currentTab.id}.service.ts</span>
                          <span className="lang-badge">TypeScript 5</span>
                        </div>
                        <div className="code-lines-scroll">
                          {currentTab.codeSnippet.slice(0, linesToShow).map((line, lIdx) => (
                            <div key={lIdx} className="code-row-wrap">
                              <span className="gutter-number">{lIdx + 1}</span>
                              <span className="gutter-code">{renderCleanSyntax(line)}</span>
                            </div>
                          ))}
                          {linesToShow < currentTab.codeSnippet.length && (
                            <div className="code-row-wrap">
                              <span className="gutter-number">{linesToShow + 1}</span>
                              <span className="code-cursor">|</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Feature Overview */}
                      <div className="ide-info-pane">
                        <div className="info-badge">{currentTab.badge}</div>
                        <h2 className="info-headline">{lang === "en" ? currentTab.headlineEn : currentTab.headline}</h2>

                        <div className="info-bullet-list">
                          {(lang === "en" ? currentTab.featuresEn : currentTab.features).map((feat, fIdx) => (
                            <div key={fIdx} className="bullet-row">
                              <span className="bullet-check">✓</span>
                              <span className="bullet-text">{feat}</span>
                            </div>
                          ))}
                        </div>

                        <div className="info-metrics-bar">
                          <span className="metric-title">{currentTab.stats.label}</span>
                          <span className="metric-score">{currentTab.stats.value}</span>
                        </div>
                      </div>
                    </div>

                    {/* IDE Footer */}
                    <div className="ide-footer-strip">
                      <div className="footer-left">
                        <span>● Connected to IASROM Core</span>
                        <span>UTF-8</span>
                      </div>
                      <div className="footer-right">
                        <span>Production Ready</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* HINGE AXIS */}
            <div className="macbook-hinge-bar"></div>

            {/* 2. KEYBOARD BASE (LOWER HALF) */}
            <div className="macbook-base-deck">
              <div className="base-metal-surface">
                {/* Speakers + Keys */}
                <div className="deck-grid">
                  <div className="speaker-mesh left"></div>
                  <div className="keyboard-grid-keys">
                    <div className="kb-row row-1">
                      <span className="kb-key">esc</span>
                      <span className="kb-key">F1</span>
                      <span className="kb-key">F2</span>
                      <span className="kb-key">F3</span>
                      <span className="kb-key">F4</span>
                      <span className="kb-key">F5</span>
                      <span className="kb-key">F6</span>
                      <span className="kb-key">F7</span>
                      <span className="kb-key">F8</span>
                      <span className="kb-key">F9</span>
                      <span className="kb-key">F10</span>
                      <span className="kb-key">F11</span>
                      <span className="kb-key">F12</span>
                      <span className="kb-key touch-id"></span>
                    </div>
                    <div className="kb-row">
                      <span className="kb-key">~</span>
                      <span className="kb-key">1</span>
                      <span className="kb-key">2</span>
                      <span className="kb-key">3</span>
                      <span className="kb-key">4</span>
                      <span className="kb-key">5</span>
                      <span className="kb-key">6</span>
                      <span className="kb-key">7</span>
                      <span className="kb-key">8</span>
                      <span className="kb-key">9</span>
                      <span className="kb-key">0</span>
                      <span className="kb-key">-</span>
                      <span className="kb-key">+</span>
                      <span className="kb-key key-backspace">delete</span>
                    </div>
                    <div className="kb-row">
                      <span className="kb-key key-tab-size">tab</span>
                      <span className="kb-key">Q</span>
                      <span className="kb-key">W</span>
                      <span className="kb-key">E</span>
                      <span className="kb-key">R</span>
                      <span className="kb-key">T</span>
                      <span className="kb-key">Y</span>
                      <span className="kb-key">U</span>
                      <span className="kb-key">I</span>
                      <span className="kb-key">O</span>
                      <span className="kb-key">P</span>
                      <span className="kb-key">[</span>
                      <span className="kb-key">]</span>
                      <span className="kb-key">\</span>
                    </div>
                    <div className="kb-row">
                      <span className="kb-key key-caps-size">caps</span>
                      <span className="kb-key">A</span>
                      <span className="kb-key">S</span>
                      <span className="kb-key">D</span>
                      <span className="kb-key">F</span>
                      <span className="kb-key">G</span>
                      <span className="kb-key">H</span>
                      <span className="kb-key">J</span>
                      <span className="kb-key">K</span>
                      <span className="kb-key">L</span>
                      <span className="kb-key">;</span>
                      <span className="kb-key">&apos;</span>
                      <span className="kb-key key-enter-size">return</span>
                    </div>
                    <div className="kb-row">
                      <span className="kb-key key-shift-size">shift</span>
                      <span className="kb-key">Z</span>
                      <span className="kb-key">X</span>
                      <span className="kb-key">C</span>
                      <span className="kb-key">V</span>
                      <span className="kb-key">B</span>
                      <span className="kb-key">N</span>
                      <span className="kb-key">M</span>
                      <span className="kb-key">,</span>
                      <span className="kb-key">.</span>
                      <span className="kb-key">/</span>
                      <span className="kb-key key-shift-size">shift</span>
                    </div>
                    <div className="kb-row row-last">
                      <span className="kb-key">fn</span>
                      <span className="kb-key">ctrl</span>
                      <span className="kb-key">opt</span>
                      <span className="kb-key key-cmd-size">cmd</span>
                      <span className="kb-key key-space-size"></span>
                      <span className="kb-key key-cmd-size">cmd</span>
                      <span className="kb-key">opt</span>
                      <span className="kb-key">◀</span>
                      <span className="kb-key">▲▼</span>
                      <span className="kb-key">▶</span>
                    </div>
                  </div>
                  <div className="speaker-mesh right"></div>
                </div>

                {/* Trackpad */}
                <div className="deck-trackpad"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Clean Floating Service Guide Bar (When open) */}
        <div 
          className="mac-open-guide-bar"
          style={{
            opacity: bannerOpacity,
            pointerEvents: bannerOpacity > 0.4 ? 'auto' : 'none',
          }}
        >
          <div className="guide-pill">
            <span className="guide-dot"></span>
            <b>{t("บริการที่กำลังแสดง", "Now showing")}: {currentTab.title}</b>
            <span className="guide-divider">|</span>
            <span>{t("เลื่อนลงเพื่อดูบริการถัดไป", "Scroll for the next service")}</span>
            <a href="#projects" className="guide-cta-link">{t("ข้ามไปดูผลงาน", "Skip to our work")} ↓</a>
          </div>
        </div>
      </div>
    </section>
  );
}

// Clean syntax colorizer
function renderCleanSyntax(line: string) {
  if (line.startsWith("//")) {
    return <span className="sc-comment">{line}</span>;
  }
  if (line.startsWith("import")) {
    return (
      <>
        <span className="sc-keyword">import </span>
        <span className="sc-normal">{line.replace("import ", "")}</span>
      </>
    );
  }
  if (line.includes("export default") || line.includes("export const") || line.includes("export function") || line.includes("interface")) {
    return (
      <>
        <span className="sc-keyword">{line.split(" ")[0]} </span>
        <span className="sc-decl">{line.split(" ")[1]} </span>
        <span className="sc-func">{line.split(" ").slice(2).join(" ")}</span>
      </>
    );
  }
  if (line.includes(":")) {
    const parts = line.split(":");
    return (
      <>
        <span className="sc-property">{parts[0]}</span>:
        <span className="sc-val">{parts.slice(1).join(":")}</span>
      </>
    );
  }
  return <span className="sc-normal">{line}</span>;
}
