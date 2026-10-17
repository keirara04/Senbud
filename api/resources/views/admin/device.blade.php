@extends('admin.layout')
@section('title', 'Device')
@section('body')
<section class="card">
  <div class="label">Support ID</div>
  <h2><code>{{ $id }}</code></h2>
  @if ($events->isEmpty())
    <p class="caption">No events from this device. It may have usage stats off, its data was deleted, or the ID was mistyped.</p>
  @else
    @php($latest = $events->first(fn ($e) => $e->platform !== 'server') ?? $events->first())
    <p class="caption">{{ ['ios' => 'iOS', 'android' => 'Android', 'web' => 'Web app'][$latest->platform] ?? 'Platform unknown' }}{{ $latest->app_version ? ', version '.$latest->app_version : '' }}. First seen {{ \Illuminate\Support\Carbon::parse($first)->format('j M Y') }}. Showing the latest {{ $events->count() }} events.</p>
    <div class="scroll">
      <table>
        <tr><th>When (UTC)</th><th>Event</th><th>Details</th></tr>
        @foreach ($events as $e)
          <tr>
            <td class="num" style="white-space: nowrap; padding-right: 16px">{{ \Illuminate\Support\Carbon::parse($e->occurred_at)->format('j M, H:i') }}</td>
            <td><code>{{ $e->name }}</code></td>
            <td class="caption">{{ collect(json_decode((string) $e->props, true) ?: [])->map(fn ($v, $k) => "$k: ".(is_bool($v) ? ($v ? 'yes' : 'no') : $v))->join(', ') }}</td>
          </tr>
        @endforeach
      </table>
    </div>
    <form method="post" action="{{ route('admin.device.delete', ['id' => $id]) }}" onsubmit="return confirm('Delete every event from this device? This can’t be undone.')" style="margin-top: 16px">
      <button type="submit" class="danger">Delete this device’s data</button>
    </form>
  @endif
</section>
@endsection
