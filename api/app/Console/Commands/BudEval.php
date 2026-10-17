<?php

namespace App\Console\Commands;

use App\Support\BudGrader;
use Illuminate\Console\Command;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

// Runs Bud's eval set against the real model (P3.1). Needs OPENROUTER_API_KEY; costs a few cents a run.
// Each case goes through the real route, so validation, the prompt and the action filter are all what
// the app gets. Run it after every prompt or model change.
class BudEval extends Command
{
    protected $signature = 'bud:eval {--only= : run cases whose id starts with this}';

    protected $description = 'Grade Bud against tests/evals/bud.jsonl with the real model';

    public function handle(Kernel $kernel): int
    {
        if (! config('services.openrouter.key')) {
            $this->error('Set OPENROUTER_API_KEY first.');

            return self::FAILURE;
        }
        // A one-off unlimited key for this process only, so the run skips the rate limits and the
        // off-topic pause that real devices get.
        config(['app.unlimited_key' => $unlimited = Str::random(40)]);
        $only = (string) $this->option('only');
        $cases = array_filter(BudGrader::cases(), fn ($c) => $only === '' || str_starts_with($c['id'], $only));
        $failed = 0;
        $warned = 0;
        foreach ($cases as $case) {
            $body = BudGrader::body($case);
            $request = Request::create('/v1/agent/ask', 'POST', server: [
                'CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json', 'HTTP_X_DEVICE_ID' => (string) Str::uuid(),
                'HTTP_X_UNLIMITED_KEY' => $unlimited,
            ], content: json_encode($body));
            $response = $kernel->handle($request);
            $json = json_decode((string) $response->getContent(), true) ?? [];
            ['fail' => $fail, 'warn' => $warn] = BudGrader::grade($case, $response->getStatusCode(), $json, $body);

            $mark = $fail ? '<fg=red>FAIL</>' : ($warn ? '<fg=yellow>warn</>' : '<fg=green>ok</>  ');
            $this->line(sprintf('%s  %-16s %s', $mark, $case['id'], Str::limit((string) ($json['answer'] ?? $json['error'] ?? ''), 90)));
            foreach ([...$fail, ...$warn] as $note) {
                $this->line("      $note");
            }
            $failed += $fail ? 1 : 0;
            $warned += $warn && ! $fail ? 1 : 0;
        }
        $this->newLine();
        $this->line(sprintf('%d cases: %d failed, %d with warnings', count($cases), $failed, $warned));

        return $failed ? self::FAILURE : self::SUCCESS;
    }
}
