"use client";

import { useState } from "react";
import { money, untilPayday } from "@/lib/demo";

const FIELDS = [
  { id: "balance", label: "Money you have right now", hint: "Bank, cash and any card balance you can spend" },
  { id: "bills", label: "Bills due before then", hint: "Rent, phone, transport pass, anything you can't skip" },
  { id: "keep", label: "Money to keep aside", hint: "Savings or an emergency buffer. 0 is fine" },
] as const;

type Field = (typeof FIELDS)[number]["id"] | "days";

const DAY_CHIPS = [
  ["1 week", 7],
  ["2 weeks", 14],
  ["4 weeks", 28],
] as const;

const num = (v: string) => Number(v) || 0;

export function BudgetCalculator() {
  const [v, setV] = useState<Record<Field, string>>({ balance: "640", bills: "250", keep: "50", days: "14" });
  const set = (k: Field, value: string) => setV((s) => ({ ...s, [k]: value.replace(/[^\d.]/g, "") }));
  const r = untilPayday({ balance: num(v.balance), bills: num(v.bills), keep: num(v.keep), days: num(v.days) });

  return (
    <div className="grid gap-4 rounded-3xl bg-panel p-5 text-on-panel sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
      <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
        {FIELDS.map((f) => (
          <div key={f.id}>
            <label htmlFor={f.id} className="text-sm font-medium">
              {f.label}
            </label>
            <div className="mt-2 flex items-center rounded-xl bg-panel-2 pl-4 ring-1 ring-panel-line focus-within:ring-2 focus-within:ring-hl">
              <span aria-hidden="true" className="text-on-panel-dim">
                $
              </span>
              <input
                id={f.id}
                inputMode="decimal"
                autoComplete="off"
                aria-describedby={`${f.id}-hint`}
                value={v[f.id]}
                onChange={(e) => set(f.id, e.target.value)}
                className="min-h-12 w-full min-w-0 bg-transparent px-2 text-lg tabular-nums focus:outline-none"
              />
            </div>
            <p id={`${f.id}-hint`} className="mt-1.5 text-sm text-on-panel-dim">
              {f.hint}
            </p>
          </div>
        ))}
        <div>
          <label htmlFor="days" className="text-sm font-medium">
            Days until your next payday or allowance
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              id="days"
              inputMode="numeric"
              autoComplete="off"
              value={v.days}
              onChange={(e) => set("days", e.target.value.replace(/\./g, ""))}
              className="min-h-12 w-24 rounded-xl bg-panel-2 px-4 text-lg tabular-nums ring-1 ring-panel-line focus:outline-none focus:ring-2 focus:ring-hl"
            />
            {DAY_CHIPS.map(([label, days]) => (
              <button
                key={label}
                type="button"
                aria-pressed={num(v.days) === days}
                onClick={() => set("days", String(days))}
                className="min-h-11 rounded-full border border-panel-line px-4 text-sm text-on-panel-dim hover:text-on-panel aria-pressed:border-hl aria-pressed:text-on-panel"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </form>

      <div aria-live="polite" className="order-first flex flex-col justify-center rounded-2xl lg:order-none bg-panel-2 p-6 sm:p-8">
        {r.short > 0 ? (
          <>
            <p className="text-sm text-on-panel-dim">You&rsquo;re short by</p>
            <p className="mt-1 font-display text-6xl tabular-nums text-[#ffc2b8]">{money(r.short)}</p>
            <p className="mt-4 text-on-panel-dim">
              Bills and savings come to more than you have. Lower the amount you keep aside, or plan where the gap
              comes from before payday.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-on-panel-dim">{r.days < 7 ? "You can spend until payday" : "You can spend each week"}</p>
            <p className="mt-1 font-display text-6xl tabular-nums text-hl">{money(r.perWeek)}</p>
            <p className="mt-4 text-lg">
              That&rsquo;s <strong className="tabular-nums">{money(r.perDay)}</strong> a day for the next {r.days}{" "}
              {r.days === 1 ? "day" : "days"}.
            </p>
            <p className="mt-2 text-sm text-on-panel-dim">Your bills and savings are already taken out.</p>
          </>
        )}
      </div>
    </div>
  );
}
