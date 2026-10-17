import { Bud } from "./Bud";
import { Line } from "./Landing";
import { ProPrice } from "./LandingClient";
import { Icon } from "./Phone";

const FREE = [
  "Type or tap in your spending",
  "One budget with reminders",
  "Safe to spend today and rent countdown",
  "Can I afford it? and hours of work",
  "Treat jar",
  "Split bills by hand and track IOUs",
  "Bud, 10 questions a day",
  "Export everything, any time",
];

type Mark = "yes" | "part" | "no";
const COMPARE: [Parameters<typeof Icon>[0]["name"], string, Mark, string, string][] = [
  ["camera", "Add spending", "part", "Type or tap", "Plus snap receipts and screenshots"],
  ["chat", "Bud, the assistant", "part", "10 questions a day", "Ask or add as much as you like"],
  ["budgets", "Budgets", "part", "One overall budget", "Several, category limits, until payday"],
  ["friends", "Splitting with friends", "part", "By hand, with IOUs", "Item by item from the receipt"],
  ["bell", "Subscriptions", "no", "Not included", "Spotted for you, reminded before renewal"],
  ["share", "Wrapped", "part", "Monthly basics", "Full story, share cards, year-end edition"],
  ["lock", "Export and privacy", "yes", "Everything, any time", "Same. Never behind a paywall"],
];

function Check({ mark }: { mark: Mark }) {
  return <span className={`ck ${mark}`} aria-hidden="true">{mark === "yes" && <Icon name="check" />}</span>;
}

export function Pricing() {
  return (
    <section className="band paper alt" id="pricing">
      <div className="cwrap">
        <div className="sec-intro">
          <h2>
            Free stays free. <span className="mk">Pro does the typing.</span>
          </h2>
          <p>
            Everything you need to stay on budget is free. Pro takes the typing off your hands and catches the money that
            slips away.
          </p>
        </div>
        <div className="prices2">
          <div className="price-card free">
            <span className="lab">Free</span>
            <div className="price">$0</div>
            <span className="cap dim">forever, no card needed</span>
            <ul className="plist">
              {FREE.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <a className="pill out wide" href="#waitlist">
              Start free
            </a>
          </div>

          {/* A highlighter glow travels around the Pro card's border. */}
          <div className="pro-wrap">
            <div className="price-card pro">
              <Bud size={72} face="yay" className="pro-bud" />
              <ProPrice />
              <span className="plus">Everything in Free, plus</span>
              {/* The three benefits from the in-app paywall, each shown working. */}
              <div className="perks">
                <div className="perk">
                  <div className="perk-txt">
                    <b>Snap receipts</b>
                    <span>Take a photo. Senbud reads the shop, items and prices.</span>
                  </div>
                  <div className="receipt perk-demo mono" aria-hidden="true">
                    <div className="slip-h">Corner Deli</div>
                    <Line left="Bagel" right="3.75" />
                    <Line left="Iced coffee" right="4.25" />
                    <div className="perk-found">2 items found, ready to check</div>
                  </div>
                </div>
                <div className="perk">
                  <div className="perk-txt">
                    <b>Unlimited assistant</b>
                    <span>Ask or add as much as you like.</span>
                  </div>
                  <div className="perk-demo meter" aria-hidden="true">
                    <div className="m-row">
                      <span>Free</span>
                      <span className="m-bar">
                        <i style={{ width: "100%" }} />
                      </span>
                      <span>10/day</span>
                    </div>
                    <div className="m-row pro-row">
                      <span>Pro</span>
                      <span className="m-bar">
                        <i className="inf" />
                      </span>
                      <span>No limit</span>
                    </div>
                  </div>
                </div>
                <div className="perk">
                  <div className="perk-txt">
                    <b>Subscription reminders</b>
                    <span>A heads-up the day before Spotify or Netflix renews.</span>
                  </div>
                  <div className="perk-demo note-demo" aria-hidden="true">
                    <span className="cap">Tomorrow</span>
                    <b>Spotify renews</b>
                    <span className="money">$5.99</span>
                  </div>
                </div>
              </div>

              <div className="worth">
                <span className="worth-n">$119.88</span>
                <span>
                  is what one forgotten $9.99 subscription costs in a year. Pro is $39. Catch one and it has paid for itself
                  three times over.
                </span>
              </div>

              <a className="pill hl wide plausible-event-name=CTA plausible-event-place=pro" href="#waitlist">
                Join the Pro waitlist
              </a>
              <span className="cap" style={{ textAlign: "center" }}>
                Founding price stays the same when Pro opens. Cancel any time in your App Store settings.
              </span>
            </div>
          </div>
        </div>

        <div className="compare2">
          <table>
            <caption className="sr-only">Free and Pro compared</caption>
            <thead>
              <tr>
                <th scope="col">
                  <span className="eyebrow-p">Compare plans</span>
                </th>
                <th scope="col">
                  <span className="ch">Free</span>
                  <span className="cp">$0</span>
                </th>
                <th scope="col" className="pc top">
                  <span className="ch">Pro</span>
                  <span className="cp">
                    $3.25<small> / month, billed yearly</small>
                  </span>
                  <span className="best">Best value</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map(([icon, feature, mark, free, pro]) => (
                <tr key={feature}>
                  <th scope="row">
                    <span className="feat">
                      <Icon name={icon} />
                      {feature}
                    </span>
                  </th>
                  <td data-label="Free">
                    <Check mark={mark} />
                    <span>{free}</span>
                  </td>
                  <td className="pc" data-label="Pro">
                    <Check mark="yes" />
                    <span>{pro}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td />
                <td>
                  <a className="pill out" href="#waitlist">
                    Start free
                  </a>
                </td>
                <td className="pc bottom">
                  <a className="pill hl plausible-event-name=CTA plausible-event-place=compare" href="#waitlist">
                    Join the Pro waitlist
                  </a>
                </td>
              </tr>
            </tfoot>
          </table>
          <p className="legend">
            <span>
              <Check mark="yes" /> Full
            </span>
            <span>
              <Check mark="part" /> Basic
            </span>
            <span>
              <Check mark="no" /> Not in Free
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
