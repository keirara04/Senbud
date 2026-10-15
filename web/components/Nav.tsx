import { Logo } from "./Logo";

const links = [
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-plum-line bg-plum/85 text-on-plum backdrop-blur-md">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#top" aria-label="Ledgerly home" className="inline-flex min-h-11 items-center">
          <Logo />
        </a>
        <div className="flex items-center gap-1 sm:gap-2">
          <ul className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="rounded-full px-3 py-2 text-sm text-on-plum-dim transition-colors hover:text-on-plum">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <a
            href="#waitlist"
            className="inline-flex min-h-11 items-center rounded-full bg-lilac px-4 text-sm font-semibold text-plum transition-transform hover:-translate-y-px active:translate-y-0"
          >
            Get early access
          </a>
        </div>
      </nav>
    </header>
  );
}
