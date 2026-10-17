@extends('admin.layout')
@section('title', 'Overview')
@php
  $names = ['ios' => 'iOS', 'android' => 'Android', 'web' => 'Web app'];
  $sum = fn ($days) => array_sum($active[$days]->all());
@endphp
@section('body')
<div class="stack">
  <section class="card panel" aria-labelledby="active-title">
    <div class="label" id="active-title">Active devices, last 7 days</div>
    <div class="hero num">{{ number_format($sum('7')) }}</div>
    <div class="stats num">
      <div class="stat"><span class="caption">Today (24h)</span><b>{{ number_format($sum('1')) }}</b></div>
      <div class="stat"><span class="caption">30 days</span><b>{{ number_format($sum('30')) }}</b></div>
      @foreach ($platforms as $p)
        <div class="stat"><span class="caption">{{ $names[$p] }}, 7 days</span><b>{{ number_format($active['7'][$p] ?? 0) }}</b></div>
      @endforeach
    </div>
  </section>

  <section class="card">
    <h2>Weekly retention</h2>
    <p class="caption" style="margin: 0">Devices grouped by the week they first opened Senbud, and the share active in each week after.</p>
    @if (empty($retention))
      <p class="caption">No devices yet.</p>
    @else
      <div class="scroll">
        <table>
          <tr><th>First week</th><th class="n">Devices</th>@foreach (range(0, 4) as $w)<th class="n">Week {{ $w }}</th>@endforeach</tr>
          @foreach ($retention as $week => $row)
            <tr>
              <td style="white-space: nowrap">{{ \Illuminate\Support\Carbon::parse($week)->format('j M') }}</td>
              <td class="n">{{ number_format($row['size']) }}</td>
              @foreach ($row['weeks'] as $pct)
                <td class="n heat" style="{{ $pct === null ? '' : 'background: color-mix(in srgb, var(--bar) '.round(35 * $pct / 100).'%, transparent)' }}">{{ $pct === null ? '' : $pct.'%' }}</td>
              @endforeach
            </tr>
          @endforeach
        </table>
      </div>
    @endif
  </section>

  <div class="masonry">
    <section class="card">
      <h2>New devices, 30 days</h2>
      <p class="caption" style="margin: 0">How far people first seen this month got. Each step counts only those who did the steps above.</p>
      <table>
        @php($prev = null)
        @foreach ($funnel as $step => $n)
          <tr><td>{{ $step }}</td><td class="n">{{ number_format($n) }}</td><td class="n muted">{{ $prev === null ? '' : ($prev ? round(100 * $n / $prev).'%' : '0%') }}</td></tr>
          @php($prev = $n)
        @endforeach
      </table>
    </section>

    <section class="card">
      <h2>Pro, 30 days</h2>
      <p class="caption" style="margin: 0">Devices that opened the paywall, and how many bought. Revenue is in RevenueCat.</p>
      <table>
        <tr><td>Saw the paywall</td><td class="n">{{ number_format($pro['paywall']) }}</td><td class="n muted"></td></tr>
        <tr><td>Bought Pro</td><td class="n">{{ number_format($pro['bought']) }}</td><td class="n muted">{{ $pro['paywall'] ? round(100 * $pro['bought'] / $pro['paywall']).'%' : '' }}</td></tr>
      </table>
    </section>

    <section class="card">
      <h2>Feature reach, 7 days</h2>
      <p class="caption" style="margin: 0">Share of active devices that used each screen or action.</p>
      @if ($reach->isEmpty())
        <p class="caption">Nothing this week.</p>
      @else
        <table>
          @foreach ($reach as $what => $r)
            <tr><td><code>{{ $what }}</code></td><td class="n">{{ number_format($r['devices']) }}</td><td class="n muted">{{ $r['share'] }}%</td></tr>
          @endforeach
        </table>
      @endif
    </section>

    <section class="card">
      <h2>App versions, 7 days</h2>
      <p class="caption" style="margin: 0">Active devices per version. Old-app workarounds can go once a version reaches zero.</p>
      <table>
        @forelse ($versions as $v => $n)
          <tr><td><code>{{ $v }}</code></td><td class="n">{{ number_format($n) }}</td></tr>
        @empty
          <tr><td class="caption">No devices this week.</td></tr>
        @endforelse
      </table>
    </section>

    <section class="card">
      <h2>Devices by platform</h2>
      <p class="caption" style="margin: 0">A device that sent any event. Reinstalls count as new.</p>
      <table>
        <tr><th>Platform</th><th class="n">24h</th><th class="n">7d</th><th class="n">30d</th></tr>
        @foreach ($platforms as $p)
          <tr><td>{{ $names[$p] }}</td>@foreach (['1', '7', '30'] as $d)<td class="n">{{ number_format($active[$d][$p] ?? 0) }}</td>@endforeach</tr>
        @endforeach
      </table>
    </section>

    <section class="card">
      <h2>App events</h2>
      <p class="caption" style="margin: 0">Per day, all platforms. {{ number_format(array_sum($appEvents->all())) }} in 30 days.</p>
      @include('admin.chart', ['series' => $appEvents, 'label' => 'App events per day'])
    </section>

    <section class="card">
      <h2>Top events, 24h</h2>
      @if ($topEvents->isEmpty())
        <p class="caption">Nothing yet today.</p>
      @else
        <table>
          @foreach ($topEvents as $name => $n)
            <tr><td><code>{{ $name }}</code></td><td class="n">{{ number_format($n) }}</td></tr>
          @endforeach
        </table>
      @endif
    </section>

    <section class="card">
      <h2>Landing site</h2>
      <p class="caption" style="margin: 0">Page views per day. {{ number_format(array_sum($siteViews->all())) }} in 30 days.</p>
      @include('admin.chart', ['series' => $siteViews, 'label' => 'Landing page views per day'])
      @if ($pages->isNotEmpty())
        <table>
          <tr><th>Top pages, 30 days</th><th class="n">Views</th></tr>
          @foreach ($pages as $path => $n)
            <tr><td><code>{{ $path }}</code></td><td class="n">{{ number_format($n) }}</td></tr>
          @endforeach
        </table>
      @endif
    </section>

    <section class="card">
      <h2>Waitlist</h2>
      <div class="stats num" style="margin-top: 8px">
        <div class="stat"><span class="caption">Signed up</span><b>{{ number_format($waitlist['total']) }}</b></div>
        <div class="stat"><span class="caption">Confirmed</span><b>{{ number_format($waitlist['confirmed']) }}</b></div>
        <div class="stat"><span class="caption">This week</span><b>{{ number_format($waitlist['week']) }}</b></div>
      </div>
      @if ($waitlist['referrers']->isNotEmpty())
        <table>
          <tr><th>Top referrers</th><th class="n">Referrals</th></tr>
          @foreach ($waitlist['referrers'] as $r)
            <tr><td>{{ $r->email }}</td><td class="n">{{ $r->referrals_count }}</td></tr>
          @endforeach
        </table>
      @endif
    </section>

    <section class="card">
      <h2>AI, 30 days</h2>
      <div class="stats num" style="margin-top: 8px">
        <div class="stat"><span class="caption">Cost</span><b>${{ number_format($ai['cost'], 2) }}</b></div>
        <div class="stat"><span class="caption">Today</span><b>${{ number_format($ai['today'], 2) }}</b></div>
        <div class="stat"><span class="caption">Calls</span><b>{{ number_format($ai['calls']) }}</b></div>
        <div class="stat"><span class="caption">Failed</span><b class="{{ $ai['failed'] ? 'bad' : 'good' }}">{{ number_format($ai['failed']) }}</b></div>
      </div>
      <table>
        <tr><td>Receipts read</td><td class="n">{{ number_format($ai['byKind']['ai_receipt'] ?? 0) }}</td></tr>
        <tr><td>Questions to Bud</td><td class="n">{{ number_format($ai['byKind']['ai_ask'] ?? 0) }}</td></tr>
        <tr><td>Tokens</td><td class="n">{{ number_format($ai['tokens']) }}</td></tr>
        <tr><td>Average per receipt</td><td class="n">${{ number_format($ai['avgCost']['ai_receipt'] ?? 0, 4) }}</td></tr>
        <tr><td>Average per question</td><td class="n">${{ number_format($ai['avgCost']['ai_ask'] ?? 0, 4) }}</td></tr>
        <tr><td>Per active device, 7 days</td><td class="n">${{ number_format($ai['perDevice'], 4) }}</td></tr>
        <tr><td>Failed today</td><td class="n {{ $ai['todayFailed'] ? 'bad' : '' }}">{{ $ai['todayCalls'] ? round(100 * $ai['todayFailed'] / $ai['todayCalls']).'%' : '0%' }} of {{ number_format($ai['todayCalls']) }}</td></tr>
      </table>
      @if ($ai['failures']->isNotEmpty())
        <table>
          <tr><th>Last failures</th><th>Kind</th><th class="n">Status</th></tr>
          @foreach ($ai['failures'] as $f)
            <tr><td class="num">{{ \Illuminate\Support\Carbon::parse($f['at'])->format('j M, H:i') }}</td><td>{{ $f['name'] === 'ai_receipt' ? 'Receipt' : 'Question' }}</td><td class="n bad">{{ $f['status'] ?: 'No reply' }}</td></tr>
          @endforeach
        </table>
      @endif
    </section>
  </div>
</div>
@endsection
