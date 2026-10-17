@extends('admin.layout')
@section('title', 'Waitlist')
@section('body')
<section class="card">
  <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center; justify-content: space-between">
    <div>
      <h2>Waitlist</h2>
      <p class="caption" style="margin: 0">{{ number_format($confirmed->count()) }} confirmed, {{ number_format($pending->count()) }} waiting to confirm{{ $q !== '' ? ', matching “'.$q.'”' : '' }}.</p>
    </div>
    <form method="get" action="{{ route('admin.waitlist.csv') }}"><button type="submit">Download CSV</button></form>
  </div>
  <form method="get" role="search" style="margin-top: 16px">
    <input name="q" value="{{ $q }}" placeholder="Search by email" aria-label="Search by email" autocomplete="off">
    <button type="submit">Search</button>
  </form>
</section>

@foreach (['Confirmed, in invite order' => $confirmed, 'Waiting to confirm' => $pending] as $title => $rows)
  <section class="card" style="margin-top: 16px">
    <h2>{{ $title }}</h2>
    @if ($rows->isEmpty())
      <p class="caption">Nobody here.</p>
    @else
      <div class="scroll">
        <table>
          <tr>@if ($loop->first)<th class="rank">#</th>@endif<th>Email</th><th class="n">Referrals</th><th class="n">{{ $loop->first ? 'Confirmed' : 'Signed up' }}</th><th></th></tr>
          @foreach ($rows as $i => $s)
            <tr>
              @if ($loop->parent->first)<td class="rank">{{ $i + 1 }}</td>@endif
              <td style="white-space: nowrap; padding-right: 16px">{{ $s->email }}</td>
              <td class="n">{{ $s->referrals_count }}</td>
              <td class="n" style="white-space: nowrap">{{ ($s->confirmed_at ?? $s->created_at)?->format('j M') }}</td>
              <td class="n">
                <form method="post" action="{{ route('admin.waitlist.delete', $s) }}" onsubmit="return confirm(@js('Remove '.$s->email.' from the waitlist? People they referred stay on it.'))" style="display: inline">
                  <button type="submit" class="link">Remove</button>
                </form>
              </td>
            </tr>
          @endforeach
        </table>
      </div>
    @endif
  </section>
@endforeach
@endsection
