// Anonymous event counts. A no-op until an analytics provider (e.g. Plausible) is added to the site.

type Props = Record<string, string | number>;

export function track(name: string, props?: Props) {
  const w = globalThis as { plausible?: (n: string, o?: { props?: Props }) => void };
  w.plausible?.(name, props ? { props } : undefined);
}
