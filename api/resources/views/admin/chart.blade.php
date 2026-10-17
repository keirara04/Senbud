{{-- One series per day for the last 30 days. $series: [Y-m-d => count]. Each column's title is its tooltip. --}}
@php($max = max(1, ...array_map(fn ($d) => (int) ($series[$d] ?? 0), $days)))
<div class="bars" role="img" aria-label="{{ $label }}, last 30 days, peak {{ $max }} a day">
  @foreach ($days as $d)
    @php($n = (int) ($series[$d] ?? 0))
    <span title="{{ \Illuminate\Support\Carbon::parse($d)->format('D j M') }}: {{ number_format($n) }}"><i style="height: {{ $n ? max(2, round($n / $max * 100)) : 0 }}%"></i></span>
  @endforeach
</div>
<div class="axis caption num"><span>{{ \Illuminate\Support\Carbon::parse($days[0])->format('j M') }}</span><span>Today</span></div>
