import { Logo } from "./Logo";

const links = [
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-panel-line bg-panel/85 text-on-panel backdrop-blur-md">
      <nav aria-label="Main" className="flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-10">
        <a href="#top" aria-label="Senbud home" className="inline-flex min-h-11 items-center">
          <Logo />
        </a>
        <div className="flex items-center gap-1 sm:gap-2">
          <ul className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="rounded-full px-3 py-2 text-sm text-on-panel-dim transition-colors hover:text-on-panel">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <a
            href="#waitlist"
            className="inline-flex min-h-11 items-center rounded-full bg-hl px-4 text-sm font-semibold text-panel transition-transform hover:-translate-y-px active:translate-y-0"
          >
            Get early access
          </a>
        </div>
      </nav>
    </header>
  );
}
