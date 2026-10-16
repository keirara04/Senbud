<?php

namespace App\Http\Controllers;

use App\Support\OpenRouter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

// Bud answers a question in the person's own words. What the app may send is fixed by the "What gets
// sent" screen: the question, this period's totals, budget and rent, and at most the last 20 expenses.
// Like receipts, nothing is stored or logged here and OpenRouter routes only to zero-retention endpoints.
class AskController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $money = ['required', 'numeric', 'between:-10000000,10000000'];
        // validated() keeps only the keys listed here, so anything else the app sends is never forwarded.
        $data = $request->validate([
            'question' => ['required', 'string', 'max:500'],
            'currency' => ['required', 'string', 'regex:/^[A-Za-z]{3}$/'],
            'summary' => ['required', 'array'],
            'summary.period' => ['required', 'in:week,month'],
            'summary.days_left' => ['required', 'integer', 'between:1,31'],
            'summary.budget' => $money,
            'summary.spent' => $money,
            'summary.left' => $money,
            'summary.safe_today' => $money,
            'summary.upcoming_bills' => $money,
            'summary.by_category' => ['present', 'array:'.implode(',', ReceiptController::CATEGORIES)],
            'summary.by_category.*' => $money,
            'summary.rent' => ['nullable', 'array'],
            'summary.rent.amount' => ['required_with:summary.rent', 'numeric', 'between:0,10000000'],
            'summary.rent.due_day' => ['required_with:summary.rent', 'integer', 'between:1,31'],
            'expenses' => ['present', 'array', 'max:20'],
            'expenses.*.date' => ['required', 'date_format:Y-m-d'],
            'expenses.*.label' => ['required', 'string', 'max:60'],
            'expenses.*.amount' => $money,
            'expenses.*.category' => ['required', 'in:'.implode(',', ReceiptController::CATEGORIES)],
        ]);

        if (! OpenRouter::ready()) {
            return response()->json(['error' => 'assistant_unavailable'], 503);
        }

        // The numbers go in the system message and the question alone in the user message, so a
        // question can't pose as the instructions.
        $response = OpenRouter::chat([
            'messages' => [
                ['role' => 'system', 'content' => $this->prompt($data)],
                ['role' => 'user', 'content' => $data['question']],
            ],
        ], 30);
        if (! $response) {
            return response()->json(['error' => 'assistant_failed'], 502);
        }

        // Status only: an upstream error body can quote the question.
        if (! $response->successful()) {
            Log::warning('ask upstream failed', ['status' => $response->status()]);

            return response()->json(['error' => 'assistant_failed'], 502);
        }

        $answer = $response->json('choices.0.message.content');
        $answer = is_string($answer) ? trim(preg_replace('/[*#`]+/', '', $answer)) : '';
        if ($answer === '') {
            return response()->json(['error' => 'assistant_failed'], 502);
        }

        return response()->json(['answer' => mb_substr($answer, 0, 600)]);
    }

    private function prompt(array $data): string
    {
        $currency = strtoupper($data['currency']);
        $numbers = json_encode(['currency' => $currency, ...$data['summary'], 'last_expenses' => $data['expenses']], JSON_UNESCAPED_UNICODE);

        return 'You are Bud, the friendly assistant in Senbud, a budgeting app for students. Answer the '
            .'student\'s question about their own money in at most three short sentences of plain text: no '
            .'markdown, lists or emoji. Use only the numbers below; if they don\'t cover the question, say what '
            .'you can\'t see. Amounts are in '.$currency.', in major units. "left" is what remains of this '
            .$data['summary']['period'].'\'s budget after spending and upcoming bills, and "safe_today" is what '
            .'they can spend per day until the period ends. Never give investment, loan or tax advice; suggest '
            .'a qualified person instead. Their numbers: '.$numbers;
    }
}
