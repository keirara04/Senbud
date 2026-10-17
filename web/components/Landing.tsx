import Link from "next/link";
import type { ReactNode } from "react";
import { Bud } from "./Bud";
import { CountUp, WaitlistForm } from "./LandingClient";
import { Icon, Phone } from "./Phone";
import "./landing.css";

// The landing page bands, in order. Built from docs/concepts/senbud-landing-mockup.html; every phone
// is the real app design from docs/concepts/senbud-app-screens.html.

export function Hero() {
  return (
    <section className="band cobalt hero-band" id="top" tabIndex={-1} style={{ outline: "none" }}>
      <div className="cwrap hero-grid">
        <div className="hero-copy">
          <span className="eyebrow-l">For students · iPhone and Android</span>
          <h1>
            Know what’s <em className="hl-swipe">safe to spend</em> today.
          </h1>
          <p className="lede">
            Snap a receipt or type “lunch 12, uber 8”. Senbud sets rent aside first, then tells you every morning how
            much is yours to spend. No bank login, ever.
          </p>
          <WaitlistForm place="hero" />
          <p className="small-dim">Coming to the App Store and Google Play. One email when it’s out, nothing else.</p>
          <a className="pill out plausible-event-name=Web+app plausible-event-place=hero" href="https://app.senbud.com">
            Try it in your browser
          </a>
          <ul className="promises">
            {["No bank login", "No account", "Stays on your phone", "Free plan forever"].map((t) => (
              <li key={t}>
                <Icon name="check" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="hero-art">
          <div className="bud-say">
            <Bud size={104} />
            <div className="receipt say-slip mono">
              <span className="slip-h">Good morning</span>
              <span>Rent’s covered.</span>
              <span>
                <CountUp value={19.18} /> is yours today.
              </span>
            </div>
          </div>
          <div className="zoom hero-phone">
            <Phone tab="home">
              <div className="navbar">
                <span className="lab">Thursday 16 Oct</span>
                <span className="ibtn">
                  <Icon name="gear" />
                </span>
              </div>
              <div className="scroll">
                <div className="card panel">
                  <span className="lab">Safe to spend today</span>
                  <span className="hero">$19.18</span>
                  <span className="cap pdim money">$307 left for 16 days, after rent and bills</span>
                </div>
                <div className="card">
                  <span>
                    Rent <span className="money">$650</span> in 12 days — you’re covered.
                  </span>
                </div>
                <div className="card">
                  <div className="row">
                    <span className="strong money">$412 of $1,400</span>
                    <span className="cap dim">this month</span>
                  </div>
                  <div className="track">
                    <i style={{ width: "29%" }} />
                  </div>
                  <span className="cap dim">On track.</span>
                </div>
                <div className="card">
                  <span className="lab">Today</span>
                  <span>
                    It’s been 9 days since a boba. <span className="money">$6</span> fits today. Treat yourself?
                  </span>
                  <div className="row start" style={{ gap: 16 }}>
                    <span className="tbtn">Log it</span>
                    <span className="tbtn" style={{ color: "var(--dim)" }}>
                      Not today
                    </span>
                  </div>
                </div>
              </div>
              <div className="capture">
                <span className="ibtn">
                  <Icon name="camera" />
                </span>
                <span className="input">
                  <span className="ph">lunch 12, uber 8</span>
                </span>
                <span className="ibtn">
                  <Icon name="pen" />
                </span>
              </div>
            </Phone>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Ways() {
  return (
    <section className="band paper" id="how">
      <div className="cwrap">
        <div className="sec-intro">
          <h2>
            Logging spending takes <span className="mk">two seconds.</span>
          </h2>
          <p>
            Pick whichever is laziest right now. Everything lands in the same place, and your budget, rent and treats
            update straight away.
          </p>
        </div>
        <div className="ways">
          <article className="receipt way">
            <span className="slip-h">01 · Snap it</span>
            <Icon name="camera" className="ic way-ic" />
            <h3>Photo of the receipt</h3>
            <p>Senbud reads the shop, items and prices. You check them before anything is saved.</p>
            <div className="mono way-demo snap" aria-hidden="true">
              <Line className="r1" left="Corner Deli" right="$8.40" />
              <Line className="r2" left="Iced coffee" right="$4.25" />
            </div>
            <span className="tag">Pro</span>
          </article>
          <article className="receipt way">
            <span className="slip-h">02 · Type it</span>
            <Icon name="chat" className="ic way-ic" />
            <h3>Like a text to a friend</h3>
            <p>One line can hold a whole day. Commas split it, and Senbud picks the category.</p>
            <div className="mono way-demo" aria-hidden="true">
              <div className="typed">
                <span className="tx">lunch 12, uber 8, boba 6</span>
                <span className="caret" />
              </div>
              <Line className="res" left="3 items added" right="$26.00" />
            </div>
            <span className="tag free">Free</span>
          </article>
          <article className="receipt way">
            <span className="slip-h">03 · Tap it</span>
            <Icon name="pen" className="ic way-ic" />
            <h3>Amount, category, done</h3>
            <p>Two taps, no AI involved, and it works offline in a lecture hall basement.</p>
            <div className="mono way-demo tap" aria-hidden="true">
              <Line left="Groceries" right={<span className="amt">$23.10</span>} />
              <Line left="Saved" right={<span className="saved">Today</span>} />
            </div>
            <span className="tag free">Free</span>
          </article>
        </div>
      </div>
    </section>
  );
}

// A receipt line: label, dotted leader, amount.
export function Line({ left, right, className = "" }: { left: ReactNode; right: ReactNode; className?: string }) {
  return (
    <div className={`rc-row ${className}`}>
      <span>{left}</span>
      <span className="leader" />
      <span>{right}</span>
    </div>
  );
}

export function MeetBud() {
  return (
    <section className="band paper" id="meet-bud">
      <div className="cwrap split">
        <div className="split-copy">
          <span className="eyebrow-p">Meet Bud</span>
          <h2>
            Ask Bud. It answers on a <span className="mk">receipt.</span>
          </h2>
          <p>
            Bud lives in the middle of the tab bar. Ask it anything about your money, or just tell it what you spent.
            Bud runs the same rules as the app, so the answer is never a guess, and it prints it out like a receipt.
          </p>
          <ul className="ticks">
            <li>“Can I afford a $45 concert ticket?”</li>
            <li>“How much did I spend on Uber this month?”</li>
            <li>“Split $32 badminton with Aiman.”</li>
          </ul>
          <p className="small-p">Works without AI for quick adds. Turn AI off any time in Settings.</p>
        </div>
        <div className="chat-demo notebook" role="img" aria-label="A chat with Bud. Asked if a $45 ticket is affordable, Bud prints a slip: yes, $16.37 a day after. Told lunch 12 uber 8, Bud prints the two items added, $20 for today.">
          <div className="row start" style={{ gap: 10, flexWrap: "nowrap" }}>
            <Bud size={40} />
            <span className="stack" style={{ gap: 0 }}>
              <span className="heading">Bud</span>
              <span className="cap dim">Your money buddy</span>
            </span>
          </div>
          <span className="note-me">can I afford a $45 ticket on saturday?</span>
          <div className="bud-msg">
            <Bud size={30} />
            <div className="slip-wrap">
              <div className="receipt slip mono">
                <div className="slip-h">Can I afford it?</div>
                <Line left="Concert ticket" right="$45.00" />
                <div className="slip-rule" />
                <div className="slip-big">
                  Yes. <span className="mk">$16.37</span> a day after
                </div>
                <div className="rdim" style={{ fontSize: 12 }}>
                  till the 31st, rent still covered · 3 hrs of work
                </div>
              </div>
              <div className="slip-acts">
                <span className="tbtn cap">I bought it</span>
              </div>
            </div>
          </div>
          <span className="note-me">lunch 12 uber 8</span>
          <div className="bud-msg">
            <Bud size={30} />
            <div className="slip-wrap">
              <div className="receipt slip mono">
                <div className="slip-h">Added</div>
                <Line left="Lunch" right="12.00" />
                <Line left="Uber" right="8.00" />
                <div className="slip-rule" />
                <Line className="strong" left="Today" right="$20.00" />
              </div>
              <div className="slip-acts">
                <span className="tbtn cap">Undo</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Friends() {
  return (
    <section className="band paper alt" id="friends">
      <div className="cwrap split rev">
        <div className="zoom small-phone">
          <Phone>
            <h3 className="lt" style={{ paddingTop: 48 }}>
              Friends
            </h3>
            <div className="scroll">
              <div className="card panel">
                <span className="lab">Owed to you</span>
                <span className="hero">$31</span>
              </div>
            </div>
            <div className="scrim" />
            <div className="sheet" style={{ top: 210 }}>
              <div className="grab" />
              <div className="row start" style={{ gap: 12, flexWrap: "nowrap" }}>
                <span className="avatar">S</span>
                <span className="grow stack" style={{ gap: 0 }}>
                  <span className="heading">Sarah</span>
                  <span className="cap good">owes you $14.00</span>
                </span>
                <span className="ibtn" style={{ color: "var(--dim)" }}>
                  <Icon name="x" />
                </span>
              </div>
              <div className="row">
                <span className="cap dim">Friday dinner · 10 Oct</span>
                <span className="money strong">$14.00</span>
              </div>
              <div className="sunkbox">Hey Sarah! Friday dinner was $14!</div>
              <div className="btn primary">
                <Icon name="send" />
                Send on WhatsApp
              </div>
              <div className="row" style={{ flexWrap: "nowrap" }}>
                <div className="btn secondary grow">Other apps</div>
                <div className="btn secondary grow">
                  <Icon name="copy" />
                  Copy
                </div>
              </div>
              <span className="cap dim">Opens WhatsApp with this message ready. You pick Sarah’s chat and tap send.</span>
              <div className="btn secondary" style={{ color: "var(--good)" }}>
                <Icon name="check" />
                Mark paid
              </div>
            </div>
          </Phone>
        </div>
        <div className="split-copy">
          <span className="eyebrow-p">Friends</span>
          <h2>
            Split the bill. Skip the <span className="mk">awkward group chat.</span>
          </h2>
          <ol className="steps">
            <li>
              <b>Snap the receipt</b> and say who was there.
            </li>
            <li>
              <b>Tap what each person had.</b> Shared fries split themselves.
            </li>
            <li>
              <b>Send the reminder.</b> One tap opens WhatsApp with the message already written. You hit send.
            </li>
          </ol>
          <p className="small-p">Friends are just names. Senbud never asks for their numbers or your contacts.</p>
        </div>
      </div>
    </section>
  );
}

const FLOW = [
  ["On your phone", "Everything you log", "Every expense, budget, friend and treat lives in the app on your phone. Back it up to a file whenever you like."],
  ["Only if AI is on", "One receipt photo, or one question", "Sent to read that receipt or answer that question, then forgotten. The AI keeps nothing, and you can switch it off."],
  ["Back on your phone", "The answer, saved locally", "“Corner Deli · $8.40” is stored with everything else. Senbud’s servers never keep your spending."],
];

export function Privacy() {
  return (
    <section className="band cobalt" id="privacy">
      <div className="cwrap">
        <div className="sec-intro on-cobalt">
          <h2>
            Your spending never <em>leaves your phone.</em>
          </h2>
          <p>No account to make, no bank to connect, no ads. Here’s everything that ever goes anywhere.</p>
        </div>
        <div className="flow">
          {FLOW.map(([n, h, p], i) => (
            <div key={n} style={{ display: "contents" }}>
              {i > 0 && (
                <div className="flow-arrow" aria-hidden="true">
                  <Icon name="chev" />
                </div>
              )}
              <div className="flow-card">
                <span className="flow-n">{n}</span>
                <h3>{h}</h3>
                <p>{p}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Also() {
  return (
    <section className="band paper" id="also">
      <div className="cwrap">
        <div className="sec-intro">
          <h2>Also in the app</h2>
        </div>
        <div className="also">
          <div className="also-card wrapped">
            <span className="lab">Your month, wrapped</span>
            <b className="w-big">7-Eleven</b>
            <span className="w-hl">31 visits</span>
            <span className="cap">A story of your month on the 1st. Share cards hide amounts unless you choose.</span>
          </div>
          <div className="also-card">
            <span className="lab">Subscription reminders</span>
            <Line left={<span className="strong">Spotify renews tomorrow</span>} right={<span className="money">$5.99</span>} />
            <Line left={<span className="strong">Netflix</span>} right={<span className="money">$15.49</span>} />
            <span className="cap dim">Senbud spots repeat charges and asks before tracking them.</span>
          </div>
          <div className="also-card">
            <span className="lab">Rent countdown</span>
            <b className="w-big2">12 days</b>
            <span className="cap dim">until rent. $650 is already set aside, so it never counts as spending money.</span>
          </div>
          <div className="also-card">
            <span className="lab">2-minute game</span>
            <b>The Budget Dungeon</b>
            <span className="cap dim">Dodge the Impulse Goblin and pay the Rent Dragon. Every spell is a real Senbud feature.</span>
            <Link className="pill out" href="/play">
              Play it
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

const FAQ = [
  ["Do I need to connect my bank?", "No. You add spending by photo, by typing a line, or by tapping it in. Senbud never asks for a bank login."],
  [
    "Do I need an account?",
    "No. Open the app and start. Pro is restored through your Apple or Google account, so there’s nothing to sign up for. Sync between phones may come later, and signing in will only ever be for that.",
  ],
  ["Where is my data stored?", "In the app, on your phone. Make a backup file any time, and restore it on a new phone."],
  [
    "What does the AI see?",
    "Only a receipt photo you choose to snap, or a question you ask Bud with a short summary of your month. It answers and keeps nothing. AI can be turned off.",
  ],
  ["When can I get it?", "Senbud is coming to iPhone and Android. Join the waitlist and you’ll get one email when it’s out."],
] as const;

export function Faq() {
  return (
    <section className="band paper" id="faq">
      <div className="cwrap faq-grid">
        <h2>
          Questions people <span className="mk">ask first.</span>
        </h2>
        {/* Native details: answers ship in the static HTML, and name="faq" keeps one open at a time. */}
        <div className="faq">
          {FAQ.map(([q, a], i) => (
            <details key={q} name="faq" open={i === 0}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// The closing call. Its id stays "waitlist" because other pages link to /#waitlist.
export function Join() {
  return (
    <section className="band cobalt" id="waitlist">
      <div className="cwrap final-in">
        <Bud size={132} face="yay" />
        <h2>
          Let Bud do the <em>boring part.</em>
        </h2>
        <WaitlistForm place="end" center />
        <p className="small-dim">iPhone and Android · free plan forever · no bank login</p>
      </div>
    </section>
  );
}
