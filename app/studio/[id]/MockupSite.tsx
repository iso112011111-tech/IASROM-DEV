import type { Mockup } from "../../lib/mockups";

/** เรนเดอร์เว็บตัวอย่างจากข้อมูลที่ AI ออกแบบ (ข้อความทั้งหมดผ่านการตรวจแล้ว และ React escape ให้อีกชั้น) */
export default function MockupSite({ m }: { m: Mockup }) {
  const style = {
    "--m-primary": m.palette.primary, "--m-accent": m.palette.accent, "--m-bg": m.palette.bg, "--m-ink": m.palette.ink,
  } as React.CSSProperties;
  return <div className={`mk mk-${m.mood} mk-f-${m.font}`} style={style}>
    <nav className="mk-nav">
      <b className="mk-logo"><span>{m.heroIcon}</span>{m.brand}</b>
      <div className="mk-menu">{m.nav.map((n) => <span key={n}>{n}</span>)}</div>
      <span className="mk-btn sm">{m.cta}</span>
    </nav>

    <header className="mk-hero">
      <div className="mk-hero-copy">
        {m.tagline && <p className="mk-kicker">{m.tagline}</p>}
        <h1>{m.headline}</h1>
        {m.sub && <p className="mk-sub">{m.sub}</p>}
        <div className="mk-ctas"><span className="mk-btn">{m.cta}</span><span className="mk-btn ghost">ดูเพิ่มเติม</span></div>
      </div>
      <div className="mk-art" aria-hidden="true">
        <i className="b1" /><i className="b2" /><i className="b3" />
        <span className="mk-emoji">{m.heroIcon}</span>
        <div className="mk-float f1">{m.features[0]?.icon} {m.features[0]?.title}</div>
        {m.showcase.items[0] && <div className="mk-float f2"><b>{m.showcase.items[0].name}</b>{m.showcase.items[0].price && <small>{m.showcase.items[0].price}</small>}</div>}
      </div>
    </header>

    <section className="mk-features">
      {m.features.map((f) => <div key={f.title} className="mk-feature"><span>{f.icon}</span><b>{f.title}</b><p>{f.text}</p></div>)}
    </section>

    {m.showcase.items.length > 0 && <section className="mk-showcase">
      <h2>{m.showcase.title}</h2>
      <div className="mk-items">
        {m.showcase.items.map((it, i) => <div key={it.name} className="mk-item">
          <div className="mk-thumb" style={{ "--h": `${135 + i * 70}deg` } as React.CSSProperties}><span>{m.features[i % m.features.length]?.icon ?? m.heroIcon}</span></div>
          <div className="mk-item-row"><b>{it.name}</b>{it.price && <span>{it.price}</span>}</div>
          {it.note && <p>{it.note}</p>}
        </div>)}
      </div>
    </section>}

    {m.testimonial.quote && <section className="mk-quote">
      <p>“{m.testimonial.quote}”</p>
      <small>★★★★★ · {m.testimonial.author}</small>
    </section>}

    <footer className="mk-foot">
      <div><b>{m.brand}</b>{m.contact && <p>{m.contact}</p>}</div>
      <span className="mk-btn">{m.cta}</span>
    </footer>
  </div>;
}
