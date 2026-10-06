@if(session('ok'))<div class="flash flash-ok" role="status">{{ session('ok') }}</div>@endif
@if(session('erro'))<div class="flash flash-erro" role="alert">{{ session('erro') }}</div>@endif
@if($errors->any())
  <div class="flash flash-erro" role="alert">
    <ul>@foreach($errors->all() as $erro)<li>{{ $erro }}</li>@endforeach</ul>
  </div>
@endif
