<?php

namespace Tests\Feature;

use App\Mail\WaitlistConfirmation;
use App\Models\WaitlistSignup;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class WaitlistTest extends TestCase
{
    use RefreshDatabase;

    private const PENDING = ['ok' => true, 'status' => 'pending_confirmation'];

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
    }

    private function signup(string $email, array $extra = [])
    {
        return $this->postJson('/v1/waitlist', ['email' => $email, 'feature' => 'receipt', ...$extra]);
    }

    /** The confirm path from the last email sent to $email. */
    private function confirmPath(string $email): string
    {
        $url = Mail::sent(WaitlistConfirmation::class, fn ($mail) => $mail->hasTo($email))->last()->url;

        return parse_url($url, PHP_URL_PATH);
    }

    public function test_signup_is_stored_unconfirmed_and_emails_a_confirm_link(): void
    {
        $this->signup('Ana@Example.com')->assertOk()->assertExactJson(self::PENDING);

        $row = WaitlistSignup::sole();
        $this->assertSame('ana@example.com', $row->email);
        $this->assertNull($row->confirmed_at);
        $this->assertMatchesRegularExpression('/^[A-Za-z0-9]{8}$/', $row->referral_code);

        Mail::assertSent(WaitlistConfirmation::class, fn ($mail) => $mail->hasTo('ana@example.com')
            && str_starts_with($mail->url, config('app.url').'/v1/waitlist/confirm/'));
        // Only the token's hash is stored.
        $this->assertSame(hash('sha256', basename($this->confirmPath('ana@example.com'))), $row->confirm_token);
    }

    public function test_duplicate_gets_the_same_response_and_a_rate_limited_resend(): void
    {
        $this->signup('ana@example.com')->assertOk()->assertExactJson(self::PENDING);
        $firstLink = $this->confirmPath('ana@example.com');

        // Straight away: same answer, no second email.
        $this->signup('ANA@example.com', ['feature' => 'split'])->assertOk()->assertExactJson(self::PENDING);
        Mail::assertSentCount(1);

        // After the 5-minute window: resent with a fresh link, and the old link stops working.
        $this->travel(6)->minutes();
        $this->signup('ana@example.com')->assertOk()->assertExactJson(self::PENDING);
        Mail::assertSentCount(2);
        $this->assertNotSame($firstLink, $this->confirmPath('ana@example.com'));
        $this->get($firstLink)->assertRedirect('http://localhost:3000/confirmed?status=invalid');

        $this->assertDatabaseCount('waitlist_signups', 1);
        $this->assertDatabaseHas('waitlist_signups', ['email' => 'ana@example.com', 'feature' => 'receipt']);
    }

    public function test_duplicate_of_a_confirmed_email_gets_the_same_response_and_no_email(): void
    {
        $this->signup('ana@example.com');
        $this->get($this->confirmPath('ana@example.com'));
        $this->travel(6)->minutes();

        $this->signup('ana@example.com')->assertOk()->assertExactJson(self::PENDING);
        Mail::assertSentCount(1);
    }

    public function test_confirm_marks_the_row_and_redirects_with_the_referral_code(): void
    {
        $this->signup('ana@example.com');
        $row = WaitlistSignup::sole();

        $this->get($this->confirmPath('ana@example.com'))
            ->assertRedirect("http://localhost:3000/confirmed?code={$row->referral_code}");

        $this->assertNotNull($row->fresh()->confirmed_at);
    }

    public function test_unknown_or_used_token_redirects_to_invalid(): void
    {
        $this->get('/v1/waitlist/confirm/nope')->assertRedirect('http://localhost:3000/confirmed?status=invalid');

        $this->signup('ana@example.com');
        $link = $this->confirmPath('ana@example.com');
        $this->get($link)->assertRedirectContains('?code=');
        $this->get($link)->assertRedirect('http://localhost:3000/confirmed?status=invalid');
    }

    public function test_token_expires_after_seven_days(): void
    {
        $this->signup('ana@example.com');
        $link = $this->confirmPath('ana@example.com');

        $this->travel(7)->days();
        $this->travel(1)->minutes();

        $this->get($link)->assertRedirect('http://localhost:3000/confirmed?status=invalid');
        $this->assertNull(WaitlistSignup::sole()->confirmed_at);
    }

    public function test_referrer_is_credited_once_on_confirmation_only(): void
    {
        $this->signup('ana@example.com');
        $ana = WaitlistSignup::sole();

        $this->signup('ben@example.com', ['ref' => $ana->referral_code]);
        $this->assertSame(0, $ana->fresh()->referrals_count);

        $link = $this->confirmPath('ben@example.com');
        $this->get($link);
        $this->get($link);
        $this->travel(6)->minutes();
        $this->signup('ben@example.com', ['ref' => $ana->referral_code]);

        $this->assertSame(1, $ana->fresh()->referrals_count);
    }

    public function test_unknown_ref_is_ignored(): void
    {
        $this->signup('ana@example.com', ['ref' => 'NOPE1234'])->assertOk()->assertExactJson(self::PENDING);
        $this->signup('ben@example.com', ['ref' => str_repeat('x', 500)])->assertOk();
        $this->signup('cat@example.com', ['ref' => ['not', 'a', 'string']])->assertOk();

        $this->assertSame(0, WaitlistSignup::whereNotNull('referred_by')->count());
    }

    public function test_order_command_ranks_by_referrals_then_confirmation_time(): void
    {
        foreach (['ana', 'ben', 'cat'] as $name) {
            $this->signup("{$name}@example.com");
            $this->travel(1)->minutes();
            $this->get($this->confirmPath("{$name}@example.com"));
        }
        WaitlistSignup::where('email', 'cat@example.com')->update(['referrals_count' => 2]);
        $this->signup('unconfirmed@example.com');

        $this->artisan('waitlist:order')->expectsTable(
            ['#', 'Email', 'Code', 'Referrals', 'Confirmed at'],
            WaitlistSignup::whereNotNull('confirmed_at')->get()->sortBy(fn ($r) => ['cat' => 0, 'ana' => 1, 'ben' => 2][strtok($r->email, '@')])
                ->values()->map(fn ($r, $i) => [$i + 1, $r->email, $r->referral_code, $r->referrals_count, $r->confirmed_at])->all(),
        );
    }

    public function test_invalid_email_is_rejected(): void
    {
        $this->signup('not-an-email')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email')
            ->assertJsonMissingValidationErrors('feature');

        $this->assertDatabaseCount('waitlist_signups', 0);
    }

    public function test_invalid_feature_is_rejected(): void
    {
        $this->signup('ana@example.com', ['feature' => 'crypto'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('feature')
            ->assertJsonMissingValidationErrors('email');

        $this->assertDatabaseCount('waitlist_signups', 0);
    }

    public function test_sixth_request_in_a_minute_is_rate_limited(): void
    {
        for ($i = 1; $i <= 5; $i++) {
            $this->signup("user{$i}@example.com")->assertOk();
        }

        $this->signup('user6@example.com')->assertTooManyRequests();

        // Another IP still gets through.
        $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.2'])->signup('user7@example.com')->assertOk();
    }

    public function test_cors_preflight_allows_only_the_web_origin(): void
    {
        $preflight = fn (string $origin) => $this->call('OPTIONS', '/v1/waitlist', server: [
            'HTTP_ORIGIN' => $origin,
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
        ]);

        $preflight('http://localhost:3000')->assertHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
        // With one allowed origin the header is always that origin, so browsers on any other site are refused.
        $this->assertNotSame('https://evil.example', $preflight('https://evil.example')->headers->get('Access-Control-Allow-Origin'));
    }
}
