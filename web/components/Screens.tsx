import type { CSSProperties } from "react";
import { Icon, Phone } from "./Phone";

// Treat jar, 78% full, its surface rippling (.jar-wave).
const COINS = [
  [40, 134], [60, 138], [80, 132], [52, 124], [72, 122], [44, 112], [64, 108], [84, 112], [56, 96], [76, 94], [86, 84],
];
const JAR = "M36 24h48v8c14 5 20 14 20 28v72c0 8-6 14-14 14H30c-8 0-14-6-14-14V60c0-14 6-23 20-28z";

function Jar() {
  return (
    <svg width="112" height="140" viewBox="0 0 120 150" aria-hidden="true" style={{ flex: "none" }}>
      <defs>
        <clipPath id="treat-jar">
          <path d={JAR} />
        </clipPath>
      </defs>
      <path d={JAR} fill="#fff" fillOpacity=".1" />
      <g clipPath="url(#treat-jar)">
        <path className="jar-wave" d="M0 77.8q12.5-5 25 0t25 0t25 0t25 0t25 0t25 0t25 0V150H0z" fill="#eeff5a" />
        {COINS.map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="6" fill="none" stroke="#c9d84a" strokeWidth="2" />
        ))}
      </g>
      <path d="M20 58h80" stroke="#c9d2ff" strokeWidth="1.5" strokeDasharray="4 4" />
      {[124, 102, 80].map((y) => (
        <path key={y} d={`M94 ${y}h8`} stroke="#f4f6ff" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round" />
      ))}
      <path d={JAR} fill="none" stroke="#f4f6ff" strokeWidth="3" strokeLinejoin="round" />
      <rect x="30" y="8" width="60" height="16" rx="5" fill="#f4f6ff" />
      <path d="M38 16h44" stroke="#1f3fd8" strokeOpacity=".35" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Budgets by category as a stamp card: ten stamps per category, filled ones in the category colour.
const LEDGER = [
  { name: "Food", spent: 158, limit: 300, color: "#9e2f22", left: "142 left" },
  { name: "Transport", spent: 96, limit: 120, color: "#1f3fd8", left: "24 left, go easy", warn: true },
  { name: "Treat", spent: 48, limit: 60, color: "#4a5000", left: "12 left" },
  { name: "Groceries", spent: 72, limit: 200, color: "#155a44", left: "128 left" },
];

export function Screens() {
  return (
    <section className="band paper alt" id="maths">
      <div className="cwrap">
        <div className="sec-intro">
          <h2>
            It does the maths you’d <span className="mk">rather skip.</span>
          </h2>
          <p>
            No charts to decode. Rent is set aside before anything else, and every answer comes back as a plain
            sentence and one number.
          </p>
        </div>
        <div className="phones-row">
          <figure>
            <div className="zoom small-phone">
              <Phone tab="home">
                <div className="navbar center">
                  <span className="back">
                    <Icon name="back" />
                    Home
                  </span>
                  <span>Can I afford it?</span>
                </div>
                <div className="scroll">
                  <div className="field">
                    <span className="lab">What does it cost?</span>
                    <span className="input" style={{ minHeight: 64, font: "700 28px/34px var(--font-display)" }}>
                      <span className="money">$45</span>
                    </span>
                  </div>
                  <div className="field">
                    <span className="lab">What is it? (optional)</span>
                    <span className="input">Concert ticket</span>
                  </div>
                  <div className="card panel">
                    <span className="title">Yes, go for it.</span>
                    <span className="lab" style={{ marginTop: 4 }}>
                      After you buy it
                    </span>
                    <span className="hero">$16.37</span>
                    <span className="cap pdim">a day till the 31st. Rent’s still covered.</span>
                    <span className="strong" style={{ borderTop: "1px solid rgb(255 255 255 / 0.2)", marginTop: 4, paddingTop: 10 }}>
                      = 3 hours of work{" "}
                      <span className="pdim" style={{ fontWeight: 400 }}>
                        at $15/hr
                      </span>
                    </span>
                  </div>
                  <div className="btn secondary">I bought it</div>
                </div>
              </Phone>
            </div>
            <figcaption>
              <b>Can I afford it?</b> Type a price. Get yes, tight or not yet, plus how many hours of work it costs.
            </figcaption>
          </figure>

          <figure>
            <div className="zoom small-phone">
              <Phone tab="treats">
                <div className="navbar" style={{ justifyContent: "flex-end" }}>
                  <span className="tbtn" style={{ paddingRight: 8 }}>
                    Edit
                  </span>
                </div>
                <h3 className="lt">Treats</h3>
                <div className="scroll">
                  <div className="card panel" style={{ gap: 6 }}>
                    <span className="lab">Treat jar</span>
                    <div className="row start" style={{ flexWrap: "nowrap", gap: 16, alignItems: "flex-end" }}>
                      <Jar />
                      <div className="stack" style={{ gap: 2, paddingBottom: 4 }}>
                        <span className="cap pdim">Goal</span>
                        <span className="strong">Concert with friends</span>
                        <span className="money">$60</span>
                        <span className="cap pdim" style={{ marginTop: 6 }}>
                          78% full
                        </span>
                      </div>
                    </div>
                    <span className="hero">$46.50</span>
                    <span className="cap pdim">= 7 bobas or 3 movies. $13.50 to your goal.</span>
                    <div className="btn hl" style={{ marginTop: 4 }}>
                      Add to jar
                    </div>
                  </div>
                  <div className="list">
                    <div className="li">
                      <span className="grow stack">
                        <span className="strong">Boba</span>
                        <span className="cap dim">every 7 days · last 9 days ago</span>
                        <span className="cap good strong">Fits today</span>
                      </span>
                      <span className="strong money">$6.00</span>
                    </div>
                  </div>
                </div>
              </Phone>
            </div>
            <figcaption>
              <b>Treat jar.</b> Leftover money fills a jar toward something fun, so a treat never comes out of rent.
            </figcaption>
          </figure>

          <figure>
            <div className="zoom small-phone">
              <Phone tab="budgets">
                <div className="navbar" style={{ justifyContent: "flex-end" }}>
                  <span className="tbtn" style={{ paddingRight: 8 }}>
                    Edit
                  </span>
                </div>
                <h3 className="lt">Budgets</h3>
                <div className="scroll">
                  <div className="card panel" style={{ gap: 4 }}>
                    <span className="lab">October · monthly</span>
                    <span className="hero">$988</span>
                    <div className="track">
                      <i style={{ width: "29%" }} />
                    </div>
                    <span className="cap pdim money">$412 of $1,400 spent. On track, 16 days to go.</span>
                  </div>
                  <div className="receipt ledger">
                    <div className="mono rdim" style={{ textAlign: "center", fontSize: 12, letterSpacing: 1.5 }}>
                      OCTOBER · BY CATEGORY
                    </div>
                    {LEDGER.map((c) => (
                      <div key={c.name} className="lg-row">
                        <div className="rc-row">
                          <span className="strong">{c.name}</span>
                          <span className="leader" />
                          <span className="mono">
                            {c.spent} / {c.limit}
                          </span>
                        </div>
                        <div className="rc-row">
                          <span className="stamps" style={{ "--c": c.color } as CSSProperties}>
                            {Array.from({ length: 10 }, (_, i) => (
                              <i key={i} className={i < Math.round((c.spent / c.limit) * 10) ? "f" : undefined} />
                            ))}
                          </span>
                          <span className={`cap ${c.warn ? "" : "rdim"}`} style={c.warn ? { color: "#8a5a00", fontWeight: 600 } : undefined}>
                            {c.left}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Phone>
            </div>
            <figcaption>
              <b>Budgets.</b> Every category is a stamp card. Ten stamps and it’s full; the words tell you how much is
              left.
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
