<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>@yield('title') | Senbud admin</title>
{{-- Tokens from docs/senbud-app-design-system.md (packages/core/src/tokens.ts). Dark is the default look, as in the app. --}}
<style>
  :root {
    --bg: #0b1033; --surface: #131a4a; --sunken: #1c2560; --text: #eef0ff; --dim: #a8b0d8;
    --accent: #c9d2ff; --bar: #c9d2ff; --good: #4fd1a5; --bad: #ff8a7d;
    --panel: #1f3fd8; --on-panel: #f4f6ff; --on-panel-dim: #c9d2ff; --highlight: #eeff5a;
    color-scheme: dark;
  }
  @media (prefers-color-scheme: light) {
    :root {
      --bg: #f5f6fa; --surface: #ffffff; --sunken: #e6e8f0; --text: #1a1c2e; --dim: #565b75;
      --accent: #1f3fd8; --bar: #1f3fd8; --good: #155a44; --bad: #9e2f22;
      color-scheme: light;
    }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font: 17px/24px -apple-system, BlinkMacSystemFont, "SF Pro Text", Roboto, "Segoe UI", sans-serif; }
  main { max-width: 1080px; margin: 0 auto; padding: 24px 16px 48px; }
  a { color: var(--accent); }
  .num { font-variant-numeric: tabular-nums; }
  header { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; justify-content: space-between; margin-bottom: 24px; }
  h1 { font-size: 28px; line-height: 34px; font-weight: 700; letter-spacing: -0.6px; margin: 0; }
  h2 { font-size: 20px; line-height: 26px; font-weight: 700; letter-spacing: -0.3px; margin: 0 0 4px; }
  .label { font-size: 12px; line-height: 16px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: var(--dim); }
  .caption { font-size: 14px; line-height: 19px; color: var(--dim); }
  form { display: flex; gap: 8px; flex: 0 1 460px; }
  input { min-height: 48px; min-width: 0; flex: 1; padding: 0 16px; border: 0; border-radius: 8px; background: var(--surface); color: var(--text); font: inherit; }
  button { min-height: 48px; padding: 0 20px; border: 0; border-radius: 8px; background: var(--accent); color: var(--bg); font: inherit; font-weight: 600; cursor: pointer; }
  .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
  .card { background: var(--surface); border-radius: 16px; padding: 16px; min-width: 0; }
  .wide { grid-column: 1 / -1; }
  .panel { background: var(--panel); color: var(--on-panel); }
  .panel .label, .panel .caption { color: var(--on-panel-dim); }
  .hero { font-size: 52px; line-height: 58px; font-weight: 800; letter-spacing: -1.4px; color: var(--highlight); }
  .stats { display: flex; flex-wrap: wrap; gap: 8px 32px; margin-top: 16px; }
  .stat b { display: block; font-size: 20px; line-height: 26px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { text-align: left; padding: 8px 0; border-top: 1px solid var(--sunken); font-size: 15px; vertical-align: top; }
  th { font-weight: 600; color: var(--dim); }
  td.n, th.n { text-align: right; font-variant-numeric: tabular-nums; padding-left: 16px; }
  .scroll { overflow-x: auto; }
  .good { color: var(--good); } .bad { color: var(--bad); }
  code { font: 14px ui-monospace, SFMono-Regular, Menlo, monospace; word-break: break-all; }
  /* Bar charts: thin bars, 4px rounded tops on the baseline, a 2px gap, the whole column is the hover target. */
  .bars { display: flex; align-items: stretch; gap: 2px; height: 120px; margin-top: 12px; border-bottom: 1px solid var(--sunken); }
  .bars span { flex: 1; display: flex; align-items: flex-end; min-width: 0; }
  .bars i { display: block; width: 100%; background: var(--bar); border-radius: 4px 4px 0 0; }
  .bars span:hover i { opacity: 0.7; }
  .axis { display: flex; justify-content: space-between; }
  .nav { display: flex; align-items: baseline; gap: 24px; flex-wrap: wrap; }
  .nav a:not(:first-child) { font-weight: 600; text-decoration: none; }
  .danger { background: transparent; color: var(--bad); border: 2px solid var(--bad); }
  .link { min-height: 0; padding: 12px 0; background: none; color: var(--bad); font-weight: 600; text-decoration: underline; }
  .heat { text-align: center; border-radius: 4px; }
  td.heat { padding: 8px 4px; }
  .muted { color: var(--dim); }
  .card input { background: var(--sunken); }
  td.rank, th.rank { text-align: right; padding-right: 12px; font-variant-numeric: tabular-nums; }
</style>
</head>
<body>
<main>
  <header>
    <nav class="nav">
      <h1><a href="{{ route('admin') }}" style="color: inherit; text-decoration: none">Senbud admin</a></h1>
      <a href="{{ route('admin.waitlist') }}">Waitlist</a>
    </nav>
    <form action="{{ route('admin.device') }}" method="get" role="search">
      <input name="id" placeholder="Paste a Support ID" aria-label="Support ID" autocomplete="off" value="{{ $id ?? '' }}">
      <button type="submit">Look up</button>
    </form>
  </header>
  @yield('body')
</main>
</body>
</html>
