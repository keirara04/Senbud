<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WaitlistTest extends TestCase
{
    use RefreshDatabase;

    public function test_valid_signup_is_stored(): void
    {
        $this->postJson('/v1/waitlist', ['email' => 'Ana@Example.com', 'feature' => 'receipt'])
            ->assertCreated()
            ->assertExactJson(['ok' => true]);

        $this->assertDatabaseHas('waitlist_signups', ['email' => 'ana@example.com', 'feature' => 'receipt']);
    }

    public function test_duplicate_email_returns_ok_without_a_second_row(): void
    {
        $this->postJson('/v1/waitlist', ['email' => 'ana@example.com', 'feature' => 'receipt'])->assertCreated();

        $this->postJson('/v1/waitlist', ['email' => 'ANA@example.com', 'feature' => 'split'])
            ->assertOk()
            ->assertExactJson(['ok' => true]);

        $this->assertDatabaseCount('waitlist_signups', 1);
        $this->assertDatabaseHas('waitlist_signups', ['email' => 'ana@example.com', 'feature' => 'receipt']);
    }

    public function test_invalid_email_is_rejected(): void
    {
        $this->postJson('/v1/waitlist', ['email' => 'not-an-email', 'feature' => 'receipt'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email')
            ->assertJsonMissingValidationErrors('feature');

        $this->assertDatabaseCount('waitlist_signups', 0);
    }

    public function test_invalid_feature_is_rejected(): void
    {
        $this->postJson('/v1/waitlist', ['email' => 'ana@example.com', 'feature' => 'crypto'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('feature')
            ->assertJsonMissingValidationErrors('email');

        $this->assertDatabaseCount('waitlist_signups', 0);
    }

    public function test_sixth_request_in_a_minute_is_rate_limited(): void
    {
        for ($i = 1; $i <= 5; $i++) {
            $this->postJson('/v1/waitlist', ['email' => "user{$i}@example.com", 'feature' => 'afford'])->assertCreated();
        }

        $this->postJson('/v1/waitlist', ['email' => 'user6@example.com', 'feature' => 'afford'])->assertTooManyRequests();

        // Another IP still gets through.
        $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.2'])
            ->postJson('/v1/waitlist', ['email' => 'user7@example.com', 'feature' => 'afford'])
            ->assertCreated();
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
