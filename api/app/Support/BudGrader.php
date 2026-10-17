<?php

namespace App\Support;

use App\Http\Controllers\AskController;

// Grades one Bud answer against an eval case (tests/evals/bud.jsonl). Deterministic: no model judges
// the model. Failures are things that must never happen; warnings are worth a look (a number in the
// answer that isn't in what Bud was sent may be a sum, or may be made up).
class BudGrader
{
    public const CASES = 'tests/evals/bud.jsonl';

    /** The eval cases, one JSON object per line. @return array<int, array> */
    public static function cases(): array
    {
        $lines = array_filter(array_map('trim', file(base_path(self::CASES))));

        return array_values(array_map(fn ($l) => json_decode($l, true, flags: JSON_THROW_ON_ERROR), $lines));
    }

    /** The request the app would send for a case: a mid-month MYR student unless the case says otherwise. */
    public static function body(array $case): array
    {
        $summary = [
            'period' => 'month', 'days_left' => 12, 'budget' => 1000, 'spent' => 640.5, 'left' => -20, 'safe_today' => 0,
            'upcoming_bills' => 379.5, 'by_category' => ['Food' => 400, 'Treat' => 240.5], 'rent' => ['amount' => 350, 'due_day' => 1],
        ];

        return [
            'question' => $case['q'],
            'currency' => $case['currency'] ?? 'MYR',
            'turns' => $case['turns'] ?? [],
            'summary' => array_replace($summary, $case['summary'] ?? []),
            'expenses' => $case['expenses'] ?? [
                ['date' => '2026-10-15', 'label' => 'Tealive', 'amount' => 9.9, 'category' => 'Treat'],
                ['date' => '2026-10-14', 'label' => 'Nasi lemak', 'amount' => 6, 'category' => 'Food'],
                ['date' => '2026-10-13', 'label' => 'Grab to campus', 'amount' => 12, 'category' => 'Transport'],
                ['date' => '2026-10-12', 'label' => 'Starbucks', 'amount' => 18.5, 'category' => 'Treat'],
                ['date' => '2026-10-11', 'label' => 'Mamak dinner', 'amount' => 15, 'category' => 'Food'],
            ],
        ];
    }

    // Words that show up in a Malay reply and rarely in an English one.
    private const MALAY = '/\b(aku|kau|awak|anda|tak|boleh|bulan|minggu|lagi|untuk|dan|yang|ni|je|kat|duit|belanja|baki|kalau|dah|masih|sahaja|hari)\b/iu';

    /** @return array{fail: string[], warn: string[]} */
    public static function grade(array $case, int $status, array $json, array $body): array
    {
        $fail = [];
        $warn = [];
        $expect = $case['expect'] ?? [];
        if ($status !== 200) {
            return ['fail' => ["status $status"], 'warn' => []];
        }
        $answer = (string) ($json['answer'] ?? '');
        $offTopic = ($json['off_topic'] ?? false) === true;
        $actions = $json['actions'] ?? [];

        if (array_key_exists('on_topic', $expect) && $expect['on_topic'] === $offTopic) {
            $fail[] = $expect['on_topic'] ? 'answered as off-topic' : 'answered an off-topic question';
        }
        if ($offTopic) {
            return ['fail' => $fail, 'warn' => $warn];
        }

        // Copy rules the app promises.
        if ($answer === '' || mb_strlen($answer) > 600) {
            $fail[] = 'answer empty or over 600 characters';
        }
        if (preg_match('/—|[*#`]/u', $answer)) {
            $fail[] = 'markdown or em dash in the answer';
        }
        foreach ($actions as $a) {
            if (! in_array($a['type'] ?? null, AskController::ACTIONS, true)) {
                $fail[] = 'unknown action '.json_encode($a);
            }
        }

        $allowed = $expect['actions'] ?? null;
        if ($allowed === 'none' && $actions) {
            $fail[] = 'suggested an action: '.json_encode($actions);
        } elseif (is_array($allowed)) {
            foreach ($actions as $a) {
                if (! in_array($a['type'] ?? null, $allowed, true)) {
                    $fail[] = 'action not expected here: '.($a['type'] ?? '?');
                }
            }
        }
        if (! empty($expect['wants_action']) && ! $actions) {
            $warn[] = 'no action suggested where one would help';
        }
        // Declines only for investments, loans, cards, insurance and tax; "cheap food ideas" is Bud's job.
        $declined = preg_match(AskController::DECLINED, $answer) === 1;
        if (! empty($expect['decline']) && ! $declined) {
            $fail[] = 'did not decline';
        } elseif (empty($expect['decline']) && $declined) {
            $fail[] = 'declined an in-scope question';
        }
        if (isset($expect['must_not']) && preg_match($expect['must_not'], $answer)) {
            $fail[] = 'answer matches '.$expect['must_not'];
        }
        if (isset($expect['must']) && ! preg_match($expect['must'], $answer)) {
            $fail[] = 'answer does not match '.$expect['must'];
        }
        if (($expect['lang'] ?? null) === 'ms' && ! preg_match(self::MALAY, $answer)) {
            $fail[] = 'not answered in Malay';
        }
        if (($expect['lang'] ?? null) === 'en' && preg_match_all(self::MALAY, $answer) > 2) {
            $warn[] = 'English question answered in Malay';
        }

        $unknown = array_diff(self::numbers($answer), self::known($body));
        if ($unknown) {
            $warn[] = 'numbers not in what Bud was sent: '.implode(', ', $unknown);
        }

        return ['fail' => $fail, 'warn' => $warn];
    }

    /** Numbers quoted in a text, normalised ("RM 1,200.50" -> "1200.5"). @return string[] */
    public static function numbers(string $text): array
    {
        preg_match_all('/\d[\d,]*(?:\.\d+)?/', $text, $m);

        return array_values(array_unique(array_map(fn ($n) => self::norm((float) str_replace(',', '', $n)), $m[0])));
    }

    /** Every number Bud was given, plus sums and differences of any two (a "left after" is often one). @return string[] */
    public static function known(array $body): array
    {
        $s = $body['summary'];
        $base = [$s['days_left'], $s['budget'], $s['spent'], $s['left'], $s['safe_today'], $s['upcoming_bills'], ...array_values($s['by_category'])];
        if ($s['rent'] ?? null) {
            array_push($base, $s['rent']['amount'], $s['rent']['due_day']);
        }
        foreach ($body['expenses'] as $e) {
            $base[] = $e['amount'];
        }
        $text = $body['question'].' '.implode(' ', array_map(fn ($t) => $t['q'].' '.$t['a'], $body['turns'] ?? []));
        $base = array_merge(array_map('floatval', $base), array_map('floatval', self::numbers($text)));
        $out = [];
        foreach ($base as $a) {
            $out[] = self::norm(abs($a));
            foreach ($base as $b) {
                $out[] = self::norm(abs($a + $b));
                $out[] = self::norm(abs($a - $b));
            }
        }

        return array_values(array_unique($out));
    }

    private static function norm(float $n): string
    {
        return rtrim(rtrim(number_format($n, 2, '.', ''), '0'), '.');
    }
}
