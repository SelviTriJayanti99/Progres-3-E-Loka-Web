(function(){
'use strict';
const $=id=>document.getElementById(id);
const rp=n=>'Rp'+Number(n).toLocaleString('id-ID');
const dt=s=>new Date(String(s).replace(' ','T'));
const fmt=s=>dt(s).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'});
const OSTAT=['baru','diproses','selesai','dibatalkan'],BSTAT=['menunggu','dikonfirmasi','selesai','dibatalkan'];
let user=null,hist={orders:[],bookings:[]},editId=null,gEditId=null,curTab='orders',pending=null;

function el(t,txt,cls){const e=document.createElement(t);if(txt!=null)e.textContent=txt;if(cls)e.className=cls;return e}
function msg(id,t,ok){const m=$(id);m.className='msg '+(ok?'ok':'err');m.textContent=t}
function toast(t){const e=$('toast');e.textContent=t;e.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>{e.hidden=true},3500)}
function tag(t,s){return el('span',t,'tag s-'+s)}
function addRow(tb,cells){const tr=document.createElement('tr');cells.forEach(c=>{const td=document.createElement('td');td.appendChild(c instanceof Node?c:document.createTextNode(String(c)));tr.appendChild(td)});tb.appendChild(tr)}
function sel(opts,cur,fn){
  const s=el('select',null,'sm');
  opts.forEach(o=>{const p=el('option',o);p.value=o;s.appendChild(p)});
  s.value=cur;
  s.onchange=async()=>{try{await fn(s.value);cur=s.value;loadStats().catch(()=>{})}catch(e){s.value=cur;toast(e.message)}};
  return s;
}

async function api(file,action,data){
  const o={credentials:'same-origin'};
  if(data!==undefined){o.method='POST';o.headers={'Content-Type':'application/json'};o.body=JSON.stringify(data)}
  let res;
  try{res=await fetch('api/'+file+'.php?action='+action,o)}
  catch(e){throw new Error('Server tidak terjangkau. Buka lewat http://localhost/loka-web/ dan pastikan Apache & MySQL menyala.')}
  let j={};try{j=await res.json()}catch(e){}
  if(res.status===401&&user){user=null;show('login');throw new Error('Sesi berakhir, silakan masuk lagi.')}
  if(!res.ok)throw new Error(j.error||'Permintaan '+file+'/'+action+' gagal (HTTP '+res.status+'). Jalankan website melalui XAMPP.');
  return j;
}

function show(v){
  ['home','info','article','register','login','dash','admin'].forEach(n=>{$('v-'+n).hidden=(n!==v)});
  const nav=$('nav');nav.innerHTML='';
  const b=(t,cls,fn)=>{const e=el('button',t,cls);e.onclick=fn;nav.appendChild(e)};
  b('Katalog','ghost',goCatalog);
  if(user)b('Keluar','ghost',logout);
  else{b('Masuk','ghost',()=>show('login'));b('Daftar','',()=>show('register'))}
  $('h-reg').hidden=$('h-log').hidden=!!user;$('h-dash').hidden=!user;
  window.scrollTo(0,0);
}
async function enter(){
  if(user.role==='admin'){show('admin');await renderAdmin()}
  else{show('dash');await renderDash();applyPending()}
}
function applyPending(){
  if(!pending)return;
  const p=pending;pending=null;
  tab(p.tab);
  if(p.game)chooseOrderGame(p.game);
  if(p.menu&&mById(p.menu))cartSet(p.menu,1);
}
function goCatalog(){
  if($('v-home').hidden)show('home');
  requestAnimationFrame(()=>$('catalog').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'}));
}
async function logout(){
  try{await api('auth','logout',{})}catch(e){}
  user=null;pending=null;cart.clear();$('order-game').value='';show('home');
}

$('footer-year').textContent = String(new Date().getFullYear());
document.querySelectorAll('[data-footer-section]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const section = $(a.dataset.footerSection);
    if ($('v-home').hidden) show('home');
    const target = section && !section.hidden ? section : $('catalog');
    requestAnimationFrame(() => target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'}));
  });
});
document.querySelectorAll('[data-footer-page]').forEach(a => {
  a.addEventListener('click', e => { e.preventDefault(); openInfoPage(a.dataset.footerPage); });
});
document.querySelectorAll('[data-footer-action]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    if (a.dataset.footerAction === 'booking') needAccount({tab:'order'},'Masuk untuk booking meja sekaligus memilih game dan menu.');
    else if (a.dataset.footerAction === 'login') show('login');
    else window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});
  });
});

$('h-reg').onclick=$('to-reg').onclick=()=>show('register');
$('h-log').onclick=$('to-login').onclick=()=>show('login');
$('h-cat').onclick=goCatalog;
$('h-dash').onclick=()=>{if(user)enter()};
document.querySelector('.logo').onclick=()=>{if(user)enter();else show('home')};

$('f-reg').onsubmit=async e=>{
  e.preventDefault();
  const name=$('r-name').value.trim(),email=$('r-email').value.trim().toLowerCase(),phone=$('r-phone').value.trim(),password=$('r-pass').value;
  if(!name||!email||!phone||!password)return msg('r-msg','Lengkapi semua kolom.');
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return msg('r-msg','Format email belum benar.');
  if(!/^[0-9+][0-9\s-]{8,15}$/.test(phone))return msg('r-msg','Nomor WhatsApp belum benar.');
  if(password.length<6)return msg('r-msg','Kata sandi minimal 6 karakter.');
  if(password!==$('r-pass2').value)return msg('r-msg','Kata sandi tidak sama.');
  try{const r=await api('auth','register',{name,email,phone,password});user=r.user;$('f-reg').reset();msg('r-msg','',true);enter()}
  catch(err){msg('r-msg',err.message)}
};
$('f-log').onsubmit=async e=>{
  e.preventDefault();
  const email=$('l-email').value.trim().toLowerCase(),password=$('l-pass').value;
  if(!email||!password)return msg('l-msg','Isi email dan kata sandi.');
  try{const r=await api('auth','login',{email,password});user=r.user;$('f-log').reset();msg('l-msg','',true);enter()}
  catch(err){msg('l-msg',err.message)}
};

/* ---------- Dashboard pelanggan ---------- */
$('b-date').min=$('b-date').value=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Makassar',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function tab(t){
  document.querySelectorAll('#v-dash .tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.t===t));
  ['order','hist','prof'].forEach(n=>{$('t-'+n).hidden=(n!==t)});
}
document.querySelectorAll('#v-dash .tabs button').forEach(b=>{b.onclick=()=>tab(b.dataset.t)});

async function renderDash(){
  $('d-hi').textContent='Halo, '+user.name.split(' ')[0]+'!';
  $('s-since').textContent=dt(user.created_at).toLocaleDateString('id-ID',{month:'short',year:'numeric'});
  $('p-name').value=user.name;$('p-email').value=user.email;$('p-phone').value=user.phone;
  if(!shopMenu.length)skeleton($('s-grid'),6);
  // Menu dan riwayat DIAMBIL TERPISAH: error riwayat tidak boleh menyembunyikan menu.
  const results=await Promise.allSettled([api('user','menu'),api('user','history')]);
  if(results[0].status==='fulfilled'){
    setShopMenu(results[0].value.menu || []);
  }else{
    // Katalog publik tetap bisa menyediakan menu walaupun endpoint pelanggan gagal.
    try{const menuData=await api('catalog','menu');setShopMenu(menuData.menu || []);}
    catch(menuErr){setShopMenu([]);toast('Menu gagal dimuat: '+menuErr.message);}
  }
  if(results[1].status==='fulfilled'){
    hist=results[1].value;
    $('s-ord').textContent=hist.orders.length;
    $('s-book').textContent=hist.bookings.length;
    renderHist();
  }else{
    hist={orders:[],bookings:[]};
    $('s-ord').textContent='—';$('s-book').textContent='—';
    renderHist();
    toast('Riwayat belum dapat dimuat. Menu tetap bisa dipilih. Jika database lama, jalankan migrate.php.');
    console.warn('Riwayat pelanggan:',results[1].reason);
  }
}
function renderHist(){
  const rows=[];
  hist.orders.forEach(o=>rows.push({t:o.created_at,k:'Pesanan',d:(o.booking_id?'Booking #'+o.booking_id+' · ':'')+o.qty+'x '+o.item_name+(o.game_title?' · Game: '+o.game_title:''),i:rp(o.total),s:o.status,can:o.status==='baru',type:'order',id:o.id}));
  hist.bookings.forEach(b=>rows.push({t:b.created_at,k:'Booking',d:'#'+b.id+' · '+b.booking_date+' pukul '+String(b.booking_time).slice(0,5)+(b.order_count?' · '+b.order_count+' menu':''),i:b.people+' orang',s:b.status,can:b.status==='menunggu',type:'booking',id:b.id}));
  rows.sort((a,b)=>a.t<b.t?1:a.t>b.t?-1:0);
  const tb=$('h-body');tb.innerHTML='';
  rows.forEach(r=>{
    let act='';
    if(r.can){
      act=el('button','Batalkan','ghost sm');
      act.onclick=async()=>{
        if(!confirm('Batalkan '+r.k.toLowerCase()+' ini?'))return;
        try{await api('user','cancel',{type:r.type,id:r.id});await renderDash()}catch(e){toast(e.message)}
      };
    }
    addRow(tb,[tag(r.k,'diproses'),r.d,r.i,tag(r.s,r.s),fmt(r.t),act]);
  });
  $('h-empty').hidden=rows.length>0;
}
function updateBookingSummary(){
  const date=$('b-date').value,time=$('b-time').value,people=$('b-ppl').value;
  $('order-booking-summary').textContent=date&&time&&people ? `📅 ${date} · ${time} WITA · ${people} orang` : 'Lengkapi jadwal booking di langkah pertama.';
}
['b-date','b-time','b-ppl'].forEach(id=>$(id).addEventListener('input',updateBookingSummary));
updateBookingSummary();
$('p-btn').onclick=async()=>{
  const name=$('p-name').value.trim(),phone=$('p-phone').value.trim();
  if(!name||!phone)return msg('p-msg','Nama dan nomor tidak boleh kosong.');
  try{const r=await api('user','profile',{name,phone});user=r.user;msg('p-msg','Profil disimpan.',true);$('d-hi').textContent='Halo, '+user.name.split(' ')[0]+'!'}
  catch(e){msg('p-msg',e.message)}
};

/* ---------- Dashboard admin ---------- */
async function loadStats(){
  const s=await api('admin','stats');
  $('st-users').textContent=s.users;$('st-orders').textContent=s.orders;$('st-books').textContent=s.bookings;
  $('st-rev').textContent=rp(s.revenue);$('st-new').textContent=s.orders_new;$('st-pend').textContent=s.bookings_pending;$('st-login').textContent=s.logins_today;
}
async function loadOrders(){
  const r=await api('admin','orders'),tb=$('ao-body');tb.innerHTML='';
  r.orders.forEach(o=>addRow(tb,['#'+o.id,o.user_name+' ('+o.user_email+')',o.qty+'× '+o.item_name,o.game_title ? '🎲 '+o.game_title : '— Tanpa boardgame',o.booking_id ? '#'+o.booking_id+' · '+o.booking_date+' '+String(o.booking_time).slice(0,5) : '—',rp(o.total),
    sel(OSTAT,o.status,v=>api('admin','order_status',{id:o.id,status:v})),fmt(o.created_at)]));
  if(!r.orders.length)addRow(tb,['','Belum ada pesanan.','','','','','','']);
}
async function loadBooks(){
  const r=await api('admin','bookings'),tb=$('ab-body');tb.innerHTML='';
  r.bookings.forEach(b=>addRow(tb,['#'+b.id,b.user_name+' ('+b.user_phone+')',b.booking_date+' pukul '+String(b.booking_time).slice(0,5),b.people,b.order_count ? b.order_count+' menu' : 'Belum ada menu',
    sel(BSTAT,b.status,v=>api('admin','booking_status',{id:b.id,status:v}))]));
  if(!r.bookings.length)addRow(tb,['','Belum ada booking.','','','','']);
}
function resetMenuForm(){editId=null;$('m-name').value='';$('m-price').value='';$('m-cat').value='Makanan';$('m-desc').value='';$('m-img').value='';$('m-active').checked=true;$('m-btn').textContent='Tambah menu';$('m-cancel').hidden=true}
async function loadMenu(){
  const r=await api('admin','menu'),tb=$('am-body');tb.innerHTML='';
  r.menu.forEach(m=>{
    const on=+m.is_active===1,act=el('div',null,'acts2');
    const e=el('button','Ubah','ghost sm');
    e.onclick=()=>{editId=m.id;$('m-name').value=m.name;$('m-price').value=m.price;$('m-cat').value=m.category;$('m-desc').value=m.description||'';$('m-img').value=m.image_url||'';$('m-active').checked=on;$('m-btn').textContent='Simpan perubahan';$('m-cancel').hidden=false;$('m-name').focus()};
    const d=el('button','Hapus','danger sm');
    d.onclick=async()=>{
      if(!confirm('Hapus menu "'+m.name+'"?'))return;
      try{await api('admin','menu_delete',{id:m.id});if(editId===m.id)resetMenuForm();loadMenu();loadCatalog()}catch(x){toast(x.message)}
    };
    act.append(e,d);
    addRow(tb,[m.name,m.category,rp(m.price),tag(on?'Aktif':'Nonaktif',on?'selesai':'dibatalkan'),act]);
  });
}
$('m-cancel').onclick=resetMenuForm;
$('m-btn').onclick=async()=>{
  const name=$('m-name').value.trim(),price=parseInt($('m-price').value,10);
  if(!name||!price||price<1)return toast('Isi nama dan harga menu dengan benar.');
  try{await api('admin','menu_save',{id:editId,name,price,category:$('m-cat').value,description:$('m-desc').value.trim(),image_url:$('m-img').value.trim(),active:$('m-active').checked});toast('Menu disimpan.');resetMenuForm();loadMenu();loadCatalog()}
  catch(e){toast(e.message)}
};
async function loadUsers(){
  const r=await api('admin','users'),tb=$('au-body');tb.innerHTML='';
  r.users.forEach(u=>{
    let act='';
    if(u.role==='user'){
      act=el('button','Hapus','danger sm');
      act.onclick=async()=>{
        if(!confirm('Hapus akun '+u.name+' beserta pesanan dan booking-nya?'))return;
        try{await api('admin','user_delete',{id:u.id});loadUsers();loadStats().catch(()=>{})}catch(x){toast(x.message)}
      };
    }
    addRow(tb,[u.name,u.email,u.phone,tag(u.role,u.role==='admin'?'selesai':'diproses'),u.orders,u.bookings,act]);
  });
}
function devUA(u){
  u=String(u||'');
  const b=/Edg\//.test(u)?'Edge':/OPR\//.test(u)?'Opera':/Chrome\//.test(u)?'Chrome':/Firefox\//.test(u)?'Firefox':/Safari\//.test(u)?'Safari':'Lainnya';
  const o=/Windows/.test(u)?'Windows':/Android/.test(u)?'Android':/iPhone|iPad/.test(u)?'iOS':/Mac OS/.test(u)?'macOS':/Linux/.test(u)?'Linux':'?';
  return b+' / '+o;
}
const LSTAT={berhasil:'selesai',gagal:'dibatalkan',keluar:'diproses'};
async function loadLogins(){
  const r=await api('admin','logins'),tb=$('al-body');tb.innerHTML='';
  r.logins.forEach(l=>addRow(tb,[fmt(l.created_at),l.user_name||'-',l.email,tag(l.status,LSTAT[l.status]),l.ip_address||'-',devUA(l.user_agent)]));
  if(!r.logins.length)addRow(tb,['','Belum ada riwayat login.','','','','']);
}
/* ---------- Admin: kelola boardgame ---------- */
function resetGameForm(){
  gEditId=null;
  ['gm-title','gm-genre','gm-desc','gm-img'].forEach(i=>{$(i).value=''});
  $('gm-min').value=2;$('gm-max').value=4;$('gm-dur').value=30;$('gm-diff').value='mudah';
  $('gm-avail').checked=true;$('gm-active').checked=true;
  $('gm-btn').textContent='Tambah game';$('gm-cancel').hidden=true;
}
async function loadGames(){
  const r=await api('admin','games'),tb=$('ag-body');tb.innerHTML='';
  const dl=$('gm-genres');dl.innerHTML='';
  [...new Set(r.games.map(g=>g.genre))].sort().forEach(x=>{const o=document.createElement('option');o.value=x;dl.appendChild(o)});
  r.games.forEach(g=>{
    const act=el('div',null,'acts2');
    const e=el('button','Ubah','ghost sm');
    e.onclick=()=>{
      gEditId=g.id;$('gm-title').value=g.title;$('gm-genre').value=g.genre;
      $('gm-min').value=g.min_players;$('gm-max').value=g.max_players;$('gm-dur').value=g.duration;
      $('gm-diff').value=g.difficulty;$('gm-desc').value=g.description;$('gm-img').value=g.image_url||'';
      $('gm-avail').checked=+g.is_available===1;$('gm-active').checked=+g.is_active===1;
      $('gm-btn').textContent='Simpan perubahan';$('gm-cancel').hidden=false;$('gm-title').focus();
    };
    const d=el('button','Hapus','danger sm');
    d.onclick=async()=>{
      if(!confirm('Hapus game "'+g.title+'"?'))return;
      try{await api('admin','game_delete',{id:g.id});if(gEditId===g.id)resetGameForm();loadGames();loadCatalog()}catch(x){toast(x.message)}
    };
    act.append(e,d);
    const st=+g.is_active!==1?tag('Disembunyikan','dibatalkan'):(+g.is_available===1?tag('Tersedia','selesai'):tag('Dipakai','diproses'));
    const thumb=el('div',null,'admin-game-title');
    if(g.image_url){const im=el('img',null,'admin-game-thumb');im.src=encodeURI(g.image_url);im.alt='';im.loading='lazy';im.onerror=()=>im.remove();thumb.append(im)}
    thumb.append(el('span',g.title));
    addRow(tb,[thumb,g.genre,playersTxt(g),g.duration+' mnt',g.difficulty,st,act]);
  });
  if(!r.games.length)addRow(tb,['Belum ada game.','','','','','','']);
}
$('gm-cancel').onclick=resetGameForm;
$('gm-btn').onclick=async()=>{
  const d={
    id:gEditId,title:$('gm-title').value.trim(),genre:$('gm-genre').value.trim(),
    min_players:parseInt($('gm-min').value,10),max_players:parseInt($('gm-max').value,10),
    duration:parseInt($('gm-dur').value,10),difficulty:$('gm-diff').value,
    description:$('gm-desc').value.trim(),image_url:$('gm-img').value.trim(),available:$('gm-avail').checked,active:$('gm-active').checked
  };
  if(!d.title||!d.genre)return toast('Isi judul dan genre game.');
  if(!(d.min_players>=1)||!(d.max_players>=d.min_players)||d.max_players>20)return toast('Jumlah pemain belum benar.');
  if(!(d.duration>=5&&d.duration<=480))return toast('Durasi harus 5-480 menit.');
  try{await api('admin','game_save',d);toast('Game disimpan.');resetGameForm();loadGames();loadCatalog()}
  catch(e){toast(e.message)}
};

/* ---------- Konten admin ---------- */
const contentModels = {
  articles: [
    ["title","Judul",150,true],
    ["category_id","Kategori","category"],
    ["description","Deskripsi",255],
    ["content","Konten",20000,true,"textarea"],
    ["authors","Penulis",150,true],
    ["images","Gambar (satu URL atau path img/ per baris)",4096,false,"images"],
    ["is_published","Terbitkan","checkbox"]
  ],
  categories: [
    ["name","Nama kategori",100,true],
    ["description","Deskripsi",255]
  ],
  pages: [
    ["title_pages","Judul halaman",150,true],
    ["description","Deskripsi",255],
    ["content","Konten",20000,true,"textarea"],
    ["authors","Penulis",150,true],
    ["images","Gambar (satu URL atau path img/ per baris)",4096,false,"images"],
    ["is_published","Terbitkan","checkbox"]
  ],
  hero_sections: [
    ["badge","Label",100],
    ["title","Judul utama",150,true],
    ["highlight","Sorotan judul",100],
    ["description","Deskripsi",255],
    ["image_url","Background hero (URL atau path img/)",255,false,"image"],
    ["catalog_label","Teks tombol katalog",60,true]
  ],
  web_settings: [
    ["site_name","Nama situs",100,true],
    ["brand_name","Nama merek",60,true],
    ["tagline","Tagline",100],
    ["description","Deskripsi situs",255]
  ],
  networkings: [
    ["name","Nama jaringan atau mitra",100,true],
    ["url","URL (http:// atau https://)",255,true,"url"],
    ["description","Deskripsi",255],
    ["is_active","Tampilkan di beranda","checkbox"]
  ]
};
const contentNames = {"articles":"Article","categories":"Category","pages":"Pages","hero_sections":"Hero Section","web_settings":"Web Settings","networkings":"Networkings"};
const contentSingletons = ['hero_sections', 'web_settings'];

async function loadContent(model) {
  const panel = $('ap-' + model);
  const loading = el('p', 'Memuat data…');
  panel.replaceChildren(el('h3', 'Kelola ' + contentNames[model]), loading);
  const action = name => name + '&model=' + model;
  let result;
  try {
    result = await api('cms', action('list'));
  } catch (error) {
    loading.textContent = error.message;
    return;
  }
  if (!loading.isConnected) return;
  const {rows, categories = []} = result;
  const singleton = contentSingletons.includes(model);
  const fields = contentModels[model];
  const form = el('form');
  const inputs = {};
  let editing = null;
  let busy = false;
  for (const [key, label, limit, required, type] of fields) {
    const input = el(limit === 'category' ? 'select' : ['textarea', 'images'].includes(type) ? 'textarea' : 'input');
    const caption = el('label', label);
    input.id = model + '-' + key;
    caption.htmlFor = input.id;
    if (limit === 'category') {
      input.add(new Option('Tanpa kategori', ''));
      for (const category of categories) input.add(new Option(category.name, category.id));
    } else if (limit === 'checkbox') {
      input.type = 'checkbox';
      caption.className = 'check';
      caption.prepend(input);
    } else {
      input.maxLength = limit;
      input.required = Boolean(required);
      if (input.tagName === 'TEXTAREA') input.rows = type === 'images' ? 3 : 5;
      else if (type === 'url') input.type = 'url';
    }
    inputs[key] = input;
    form.append(caption);
    if (limit !== 'checkbox') form.append(input);
  }

  // Ubah background hero langsung dari dashboard, dengan pilihan gambar lokal dan pratinjau.
  let heroPreview = null;
  if (model === 'hero_sections') {
    const wrap = el('div', null, 'hero-picker');
    wrap.append(el('h4', 'Pilih background Hero Section'));
    wrap.append(el('p', 'Klik pilihan gambar, atau tulis URL HTTPS / path img/ pada kolom Background hero. Kosongkan untuk kembali ke background gradasi.', 'cms-admin-hint'));
    const choices = el('div', null, 'hero-presets');
    const presets = [
      ['', 'Gradasi gelap'],
      ['img/catan game.jpg', 'Catan'],
      ['img/Ticket to Ride game.jpeg', 'Ticket to Ride'],
      ['img/Dixit game.jpeg', 'Dixit'],
      ['img/Kopi susu loka.jpg', 'Kopi Loka'],
      ['img/Nasi Goreng Loka spesial.jpg', 'Menu Loka']
    ];
    heroPreview = el('div', null, 'hero-admin-preview');
    const previewText = el('span', 'Makan, Minum & Main Bersama');
    heroPreview.append(previewText);
    function updateHeroPreview() {
      const value = inputs.image_url.value.trim();
      const safe = safeImagePath(value);
      heroPreview.style.backgroundImage = safe
        ? `linear-gradient(90deg,rgba(8,12,20,.83),rgba(8,12,20,.48)),url("${encodeURI(safe).replace(/"/g,'%22')}")`
        : '';
      heroPreview.classList.toggle('has-photo', !!safe);
      previewText.textContent = [inputs.title.value, inputs.highlight.value].filter(Boolean).join(' ') || 'Makan, Minum & Main Bersama';
      choices.querySelectorAll('button').forEach(b=>b.classList.toggle('selected', b.dataset.src === value));
    }
    for (const [path, label] of presets) {
      const btn = el('button', null, 'hero-choice ghost');
      btn.type='button'; btn.dataset.src=path;
      if (path) { const im = el('img'); im.src=path; im.alt=''; im.loading='lazy'; btn.append(im); }
      btn.append(el('span',label));
      btn.onclick=()=>{inputs.image_url.value=path;updateHeroPreview();};
      choices.append(btn);
    }
    inputs.image_url.addEventListener('input',updateHeroPreview);
    inputs.title.addEventListener('input',updateHeroPreview);
    inputs.highlight.addEventListener('input',updateHeroPreview);
    wrap.append(choices,heroPreview);
    form.append(wrap);
    heroPreview.update = updateHeroPreview;
  }
  const save = el('button');
  const cancel = el('button', 'Batal', 'ghost');
  cancel.type = 'button';
  const actions = el('div', null, 'acts2 row');
  actions.append(save, cancel);
  form.append(actions);
  const status = el('p', '', 'msg err');
  status.setAttribute('role', 'alert');
  form.append(status);

  function selectRow(row) {
    editing = row;
    for (const [key, , limit] of fields) {
      if (limit === 'checkbox') inputs[key].checked = Number(row?.[key]) === 1;
      else inputs[key].value = row?.[key] ?? '';
    }
    status.textContent = '';
    cancel.hidden = singleton || !row;
    save.textContent = singleton || row ? 'Simpan perubahan' : 'Tambah data';
    if (heroPreview) heroPreview.update();
  }
  cancel.onclick = () => selectRow(null);
  selectRow(singleton ? rows[0] : null);
  const heading = el('h3', 'Kelola ' + contentNames[model]);
  const hint = el('p', singleton ? 'Perubahan akan tampil di beranda setelah disimpan.' : `${rows.length} data tersimpan. Artikel dan halaman yang belum diterbitkan hanya terlihat oleh admin.`, 'cms-admin-hint');
  panel.replaceChildren(heading, hint, form);
  form.onsubmit = async event => {
    event.preventDefault();
    if (busy) return;
    const data = {id: editing?.id ?? 0};
    for (const [key, , limit] of fields) {
      data[key] = limit === 'checkbox' ? inputs[key].checked : inputs[key].value.trim();
    }
    await change('save', data, 'Data disimpan.');
  };

  async function change(name, data, message) {
    busy = save.disabled = true;
    status.textContent = '';
    try {
      await api('cms', action(name), data);
    } catch (error) {
      status.textContent = error.message;
      return;
    } finally {
      busy = save.disabled = false;
    }
    toast(message);
    refreshPublicContent();
    if (form.isConnected) loadTab(model);
  }

  if (singleton) return;
  if (!rows.length) {
    panel.append(el('p', 'Belum ada data.', 'empty'));
    return;
  }
  const wrapper = el('div', null, 'tw');
  const table = el('table');
  const header = table.createTHead().insertRow();
  for (const title of [fields[0][1], 'Status / Kategori', 'Dibuat', 'Diperbarui', 'Tindakan']) {
    header.append(el('th', title));
  }
  const tbody = table.createTBody();
  for (const row of rows) {
    const edit = el('button', 'Edit', 'ghost sm');
    edit.onclick = () => {
      if (busy) return;
      selectRow(row);
      inputs[fields[0][0]].focus();
    };
    const remove = el('button', 'Hapus', 'ghost sm');
    remove.onclick = () => {
      if (busy) return;
      const question = model === 'categories'
        ? 'Hapus kategori ini? Artikel terkait akan tetap ada tanpa kategori.'
        : 'Hapus data ini?';
      if (confirm(question)) change('delete', {id: row.id}, 'Data dihapus.');
    };
    const rowActions = el('div', null, 'acts2');
    rowActions.append(edit, remove);
    let summary = '–';
    if ('is_published' in row) summary = Number(row.is_published) ? 'Terbit' : 'Draf';
    if ('is_active' in row) summary = Number(row.is_active) ? 'Aktif' : 'Nonaktif';
    const category = categories.find(item => String(item.id) === String(row.category_id));
    if (category) summary += ' · ' + category.name;
    addRow(tbody, [row[fields[0][0]], summary, fmt(row.created_at), fmt(row.updated_at), rowActions]);
  }
  wrapper.append(table);
  panel.append(wrapper);
}

function safeImagePath(path) {
  if (typeof path !== 'string') return '';
  const x = path.trim();
  if (!x || /[\\"'<>\x00-\x1f]/.test(x)) return '';
  if (/^https:\/\//i.test(x)) { try {return new URL(x).href;} catch {return '';} }
  return /^img\/(?!.*(?:^|\/)\.\.?\/)[^?#:]+$/i.test(x) ? x : '';
}

let cmsPublicArticles = [], cmsPublicPages = [];
function readerParagraphs(target, content) {
  const value = String(content || '').replace(/\r/g, '');
  for (const part of value.split(/\n\s*\n/).filter(Boolean)) {
    const p = el('p', part.trim());
    p.style.whiteSpace = 'pre-line';
    target.append(p);
  }
}
function readerCover(target, item, key) {
  const first = (item.images || '').split('\n').map(v=>v.trim()).find(v=>safeImagePath(v));
  if (!first) return;
  const img = el('img', null, 'reading-cover'); img.src = encodeURI(first); img.alt = item[key];
  img.onerror = () => img.remove();target.append(img);
}
function openArticlePage(item) {
  const target = $('article-content');target.replaceChildren();
  target.append(el('span', item.category || 'ARTIKEL LOKA', 'reading-kicker'));
  target.append(el('h1', item.title));
  if(item.description)target.append(el('p', item.description, 'reading-lead'));
  target.append(el('p', [item.authors || 'Tim Loka', item.created_at ? dt(item.created_at).toLocaleDateString('id-ID',{dateStyle:'long'}) : ''].filter(Boolean).join(' · '), 'reading-meta'));
  readerCover(target,item,'title');
  const content=el('div',null,'reading-body');readerParagraphs(content,item.content);target.append(content);
  const bottom=el('button','← Semua artikel','ghost'); bottom.onclick=backToArticles;target.append(bottom);
  show('article'); history.replaceState(null,'','#baca-artikel');
}
function backToArticles(){show('home');requestAnimationFrame(()=>$('home-articles').scrollIntoView({behavior:'smooth'}));}
function openInfoPage(mode, selected) {
  const pages=cmsPublicPages;
  const byName = mode === 'about'
    ? pages.find(p=>/tentang/i.test(p.title_pages))
    : pages.find(p=>/informasi pengunjung/i.test(p.title_pages)) || pages.find(p=>/panduan booking|informasi|panduan/i.test(p.title_pages));
  const item = selected || byName;
  const target = $('info-content');target.replaceChildren();
  $('info-about-btn').classList.toggle('active',mode==='about');
  $('info-guide-btn').classList.toggle('active',mode==='guide');
  target.append(el('span',mode==='about'?'TENTANG LOKA':'INFORMASI LOKA','reading-kicker'));
  target.append(el('h1', item ? item.title_pages : (mode==='about'?'Tentang Loka Boardgame Cafe':'Informasi & Panduan Pengunjung')));
  target.append(el('p',item?.description || (mode==='about'?'Makan, minum, main bersama.':'Informasi katalog, pemesanan, dan kunjungan ke Loka.'),'reading-lead'));
  if(item) {readerCover(target,item,'title_pages');const content=el('div',null,'reading-body');readerParagraphs(content,item.content);target.append(content);}
  else {
    const content=el('div',null,'reading-body');
    readerParagraphs(content,mode==='about'
      ? 'Loka Boardgame Cafe adalah konsep tempat berkumpul yang memadukan pengalaman kafe dengan aktivitas bermain boardgame. Kamu bisa memilih permainan, menikmati makanan dan minuman, serta menghabiskan waktu bersama teman atau keluarga.\n\nMelalui website Loka, pengunjung dapat melihat katalog game, memilih menu, mengirim pesanan, dan mengajukan booking meja.'
      : 'Cara menikmati Loka\n\n1. Jelajahi katalog boardgame dan pilih game yang cocok untuk kelompokmu.\n2. Daftar atau masuk, lalu pilih boardgame pada bagian pemesanan.\n3. Tambahkan menu makanan atau minuman dan kirim pesanan.\n4. Untuk reservasi meja, buka fitur Booking Meja dan lengkapi tanggal, jam, serta jumlah pengunjung.\n5. Pantau status pesanan atau booking melalui Riwayat.\n\nUntuk pertanyaan lebih lanjut, hubungi akun Instagram resmi @lokaboardgamecafe.');
    target.append(content);
  }
  const link=el('a','Kunjungi Instagram Loka ↗','reading-social');link.href='https://www.instagram.com/lokaboardgamecafe?dlrf=b3U1ZXlpZGo1Ymc0';link.target='_blank';link.rel='noopener noreferrer';target.append(link);
  show('info'); history.replaceState(null,'',mode==='about'?'#tentang-loka':'#informasi-loka');
}
$('info-about-btn').onclick=()=>openInfoPage('about');
$('info-guide-btn').onclick=()=>openInfoPage('guide');
$('info-back').onclick=()=>show('home');
$('article-back').onclick=backToArticles;
function contentCard(item, titleKey, isArticle) {
  const card = el('article', null, 'cms-content-card');
  const firstImage = (item.images || '').split('\n').map(url => url.trim()).find(Boolean);
  if (firstImage && safeImagePath(firstImage)) {
    const img = el('img', null, 'cms-cover');
    img.src = safeImagePath(firstImage);
    img.loading = 'lazy';
    img.alt = item[titleKey];
    img.onerror = () => img.remove();
    card.append(img);
  }
  const body = el('div', null, 'cms-card-body');
  if (isArticle) body.append(el('span', item.category || 'Artikel Loka', 'cms-category'));
  body.append(el('h3', item[titleKey]));
  if (item.description) body.append(el('p', item.description, 'cms-excerpt'));
  const meta = [item.authors, item.created_at ? dt(item.created_at).toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'}) : ''].filter(Boolean);
  if (meta.length) body.append(el('p', meta.join(' • '), 'cms-meta'));
  const readBtn = el('button', isArticle ? 'Baca artikel lengkap →' : 'Buka halaman informasi →', 'cms-read-button');
  readBtn.type = 'button';
  readBtn.onclick = () => isArticle ? openArticlePage(item) : openInfoPage('cms', item);
  body.append(readBtn);
  card.append(body);
  return card;
}

let publicContentRequest = 0;
async function refreshPublicContent() {
  const request = ++publicContentRequest;
  let data;
  try {
    data = await api('cms', 'public');
  } catch {
    return;
  }
  if (request !== publicContentRequest) return;

  if (data.settings) {
    document.title = data.settings.site_name;
    $('site-brand').textContent = data.settings.brand_name;
    $('footer-brand').textContent = data.settings.brand_name;
    $('site-tagline').textContent = data.settings.tagline;
    $('site-description').content = data.settings.description;
  }
  if (data.hero) {
    const hero = data.hero;
    $('home-badge').textContent = hero.badge;
    $('home-badge').parentElement.hidden = !hero.badge;
    $('home-title').replaceChildren(document.createTextNode(hero.title + ' '), el('span', hero.highlight));
    $('home-desc').textContent = hero.description;
    $('h-cat').textContent = hero.catalog_label;
    // Background hero, bukan gambar kecil di bawah deskripsi.
    const heroRoot = $('loka-hero');
    const bg = safeImagePath(hero.image_url || '');
    heroRoot.style.setProperty('--hero-photo', bg ? `url("${encodeURI(bg).replace(/"/g,'%22')}")` : 'none');
    heroRoot.classList.toggle('hero-with-photo', !!bg);
  }

  const articles = Array.isArray(data.articles) ? data.articles : [];
  cmsPublicArticles = articles;
  const articleSection = $('home-articles');
  const articleList = articleSection.querySelector('.cms-list');
  articleSection.hidden = !articles.length;
  const categorySelect = $('article-category');
  const selectedCategory = categorySelect.value;
  categorySelect.replaceChildren(new Option('Semua kategori', ''));
  for (const name of [...new Set(articles.map(item => item.category).filter(Boolean))].sort((a,b) => a.localeCompare(b,'id'))) {
    categorySelect.add(new Option(name, name));
  }
  categorySelect.value = [...categorySelect.options].some(opt => opt.value === selectedCategory) ? selectedCategory : '';
  function renderArticles() {
    articleList.replaceChildren();
    const query = $('article-search').value.trim().toLocaleLowerCase('id-ID');
    const selected = categorySelect.value;
    const matching = articles.filter(item => (!selected || item.category === selected) &&
      (!query || [item.title,item.description,item.content,item.authors,item.category].join(' ').toLocaleLowerCase('id-ID').includes(query)));
    $('article-count').textContent = `${matching.length} dari ${articles.length} artikel`;
    $('article-empty').hidden = !!matching.length;
    for (const item of matching) articleList.append(contentCard(item, 'title', true));
  }
  $('article-search').oninput = renderArticles;
  categorySelect.onchange = renderArticles;
  renderArticles();

  const pages = Array.isArray(data.pages) ? data.pages : [];
  cmsPublicPages = pages;
  const pagesSection = $('home-pages');
  const pagesList = pagesSection.querySelector('.cms-list');
  pagesList.replaceChildren();
  pagesSection.hidden = !pages.length;
  for (const item of pages) pagesList.append(contentCard(item, 'title_pages', false));

  // Tautan yang ditambahkan melalui CMS Networkings tampil juga di footer.
  const footerNetworks = $('footer-network-links');
  footerNetworks.replaceChildren();
  const officialInstagram = 'instagram.com/lokaboardgamecafe';
  for (const item of (Array.isArray(data.networkings) ? data.networkings : [])) {
    if (!item.url || !/^https?:\/\//i.test(item.url)) continue;
    try {
      const u = new URL(item.url);
      if (u.hostname.replace(/^www\./i, '').toLowerCase() === 'instagram.com' &&
          u.pathname.replace(/\/$/, '').toLowerCase() === '/lokaboardgamecafe') continue;
    } catch { continue; }
    const a = el('a', item.name + ' ↗');
    a.href = item.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    footerNetworks.append(a);
  }

  const section = $('home-networkings');
  const list = section.querySelector('.cms-list');
  list.replaceChildren();
  const networkings = Array.isArray(data.networkings) ? data.networkings : [];
  section.hidden = !networkings.length;
  for (const item of networkings) {
    const card = el('article', null, 'cms-network-card');
    const link = el('a', item.name + ' ↗', 'cms-network-link');
    link.href = item.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    const icon = el('span', /instagram/i.test(item.name + item.url) ? '◎' : '↗', 'cms-network-icon');
    card.append(icon,link);
    if (item.description) card.append(el('p', item.description));
    list.append(card);
  }
}

const LOADERS={orders:loadOrders,books:loadBooks,menu:loadMenu,games:loadGames,users:loadUsers,logins:loadLogins};
async function loadTab(t){try{await (LOADERS[t] ? LOADERS[t]() : loadContent(t))}catch(e){toast(e.message)}}
function atab(t){
  curTab=t;
  document.querySelectorAll('#v-admin .tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.a===t));
  [...Object.keys(LOADERS), ...Object.keys(contentModels)].forEach(n=>{$('ap-'+n).hidden=(n!==t)});
  loadTab(t);
}
document.querySelectorAll('#v-admin .tabs button').forEach(b=>{b.onclick=()=>atab(b.dataset.a)});
async function renderAdmin(){
  $('a-hi').textContent='Masuk sebagai '+user.name+' ('+user.email+')';
  loadStats().catch(e=>toast(e.message));
  atab(curTab);
}

/* ---------- Katalog publik ---------- */
const NS_ICON=(inner)=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+inner+'</svg>';
const GENRE_ICON={
  strategi:'<path d="M12 2l8.66 5v10L12 22l-8.66-5V7z"/>',
  keluarga:'<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  party:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16v4M17 18h4"/>',
  kooperatif:'<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/>',
  abstrak:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  _:'<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1" fill="currentColor" stroke="none"/><circle cx="15.5" cy="8.5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="8.5" cy="15.5" r="1" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1" fill="currentColor" stroke="none"/>'
};
const I_USERS='<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>';
const I_CLOCK='<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>';
const I_CUP='<path d="M10 2v2"/><path d="M14 2v2"/><path d="M6 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/>';
const I_FORK='<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>';
const DIFF={mudah:1,sedang:2,sulit:3};
let games=[],menuList=[],gf={q:'',genre:'',ppl:'',sort:'title'};

const slug=g=>String(g).toLowerCase().replace(/[^a-z0-9]/g,'');
function ico(inner,cls){const s=el('span',null,cls);s.innerHTML=NS_ICON(inner);return s}
function playersTxt(g){return +g.min_players===+g.max_players?g.min_players+' pemain':g.min_players+'-'+g.max_players+' pemain'}
function metaItem(inner,txt,cls){const li=el('li',null,cls);li.innerHTML=NS_ICON(inner);li.appendChild(document.createTextNode(txt));return li}
function skeleton(grid,n){grid.innerHTML='';for(let i=0;i<n;i++)grid.appendChild(el('div',null,'skel'))}

function gameCard(g){
  const on=+g.is_available===1,sl=slug(g.genre);
  const c=el('article',null,'gcard'+(on?'':' off'));
  const cover=el('div',null,'cover g-'+sl);
  const fallback=()=>{if(!cover.querySelector('.cover-ic'))cover.prepend(ico(GENRE_ICON[sl]||GENRE_ICON._,'cover-ic'));};
  if(g.image_url || /exploding\s*kittens/i.test(g.title)){
    const img=el('img',null,'game-photo');
    img.src=encodeURI(/exploding\s*kittens/i.test(g.title) ? 'img/exploding-kittens.jpg' : String(g.image_url));img.alt='Foto boardgame '+g.title;img.loading='lazy';
    img.onerror=()=>{img.remove();fallback()};
    cover.appendChild(img);
  }else fallback();
  cover.append(el('span',g.genre,'ctag'),el('span',on?'Tersedia':'Sedang dipakai','avail '+(on?'on':'off')));
  const body=el('div',null,'cbody');
  body.appendChild(el('h4',g.title));
  if(g.description)body.appendChild(el('p',g.description));
  const meta=el('ul',null,'meta');
  meta.append(metaItem(I_USERS,playersTxt(g)),metaItem(I_CLOCK,g.duration+' mnt'));
  const lv=el('li',null,'lv');lv.title='Kesulitan: '+g.difficulty;
  const dots=el('span',null,'dots');dots.setAttribute('aria-hidden','true');
  for(let i=1;i<=3;i++)dots.appendChild(el('i',null,i<=(DIFF[g.difficulty]||1)?'on':''));
  lv.append(dots,document.createTextNode(g.difficulty));
  meta.appendChild(lv);
  body.appendChild(meta);
  if(on){const choose=el('button','Pilih game & pesan menu →','game-pick');choose.type='button';choose.onclick=()=>needAccount({tab:'order',game:g.id},'Masuk atau daftar untuk memilih game dan memesan menu.');body.append(choose);}
  c.append(cover,body);
  return c;
}
function needAccount(p,txt){
  if(user&&user.role==='admin'){toast('Akun admin tidak bisa memesan atau booking.');return}
  pending=p;
  if(user)enter();
  else{toast(txt);show('register')}
}

function populateOrderGame() {
  const picker=$('order-game'),previous=picker.value;
  picker.replaceChildren(new Option('Tanpa boardgame',''));
  for(const g of games.filter(g=>Number(g.is_available)===1))picker.add(new Option(g.title+' · '+playersTxt(g),String(g.id)));
  if([...picker.options].some(x=>x.value===previous))picker.value=previous;
  updateOrderGameSummary();
}
function chooseOrderGame(id) {
  const select=$('order-game');
  if([...select.options].some(o=>o.value===String(id)))select.value=String(id);
  updateOrderGameSummary();
}
function updateOrderGameSummary(){
  const picked=games.find(g=>String(g.id)===$('order-game').value);
  $('order-game-summary').textContent='Game pilihan: '+(picked?picked.title:'Tanpa boardgame');
  $('order-game-hint').textContent=picked ? '✓ '+picked.title+' dipilih. Sekarang pilih makanan atau minuman di bawah.':'Pilih game terlebih dahulu jika ingin bermain, atau lanjut pesan menu tanpa game.';
}
$('order-game').onchange=updateOrderGameSummary;
function renderGames(){
  const q=gf.q.trim().toLowerCase(),n=+gf.ppl||0;
  const r=games.filter(g=>(!gf.genre||g.genre===gf.genre)
    &&(!q||(g.title+' '+g.genre).toLowerCase().includes(q))
    &&(!n||(+g.min_players<=n&&+g.max_players>=n)));
  const by={title:(a,b)=>a.title.localeCompare(b.title,'id')};
  by.duration=(a,b)=>a.duration-b.duration||by.title(a,b);
  by.diff=(a,b)=>(DIFF[a.difficulty]||0)-(DIFF[b.difficulty]||0)||by.title(a,b);
  by.players=(a,b)=>b.max_players-a.max_players||by.title(a,b);
  r.sort(by[gf.sort]||by.title);
  const grid=$('g-grid');grid.innerHTML='';
  r.forEach(g=>grid.appendChild(gameCard(g)));
  const filtered=!!(gf.q||gf.genre||gf.ppl);
  $('g-empty').hidden=r.length>0;
  $('g-empty-t').textContent=games.length?'Tidak ada game yang cocok dengan filter ini.':'Belum ada game di katalog.';
  $('g-reset').hidden=!filtered;
  $('g-count').textContent=games.length?'Menampilkan '+r.length+' dari '+games.length+' game':'';
}
function buildChips(){
  const box=$('g-chips');box.innerHTML='';
  const counts={};games.forEach(g=>{counts[g.genre]=(counts[g.genre]||0)+1});
  const mk=(label,val,n)=>{
    const b=el('button',label,'chip');b.type='button';b.dataset.g=val;
    b.setAttribute('aria-pressed',String(gf.genre===val));
    b.appendChild(el('small',n));
    b.onclick=()=>{gf.genre=val;syncChips();renderGames()};
    box.appendChild(b);
  };
  if(!games.length)return;
  mk('Semua','',games.length);
  Object.keys(counts).sort((a,b)=>a.localeCompare(b,'id')).forEach(k=>mk(k,k,counts[k]));
}
function syncChips(){document.querySelectorAll('#g-chips .chip').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.g===gf.genre)))}
function renderMenuList(){
  const grid=$('m-grid');grid.innerHTML='';
  sortMenu(menuList).forEach(m=>grid.appendChild(productCard(m,false)));
  $('m-empty').hidden=menuList.length>0;
}
async function loadCatalog(){
  $('c-err').hidden=true;
  skeleton($('g-grid'),6);skeleton($('m-grid'),6);
  try{
    const [g,m]=await Promise.all([api('catalog','games'),api('catalog','menu')]);
    games=g.games;menuList=m.menu;
    $('cc-games').textContent=games.length;$('cc-menu').textContent=menuList.length;
    buildChips();renderGames();renderMenuList();populateOrderGame();
  }catch(e){
    $('g-grid').innerHTML='';$('m-grid').innerHTML='';$('g-count').textContent='';
    $('c-err-t').textContent=e.message;$('c-err').hidden=false;
  }
}
function resetFilters(){
  gf={q:'',genre:'',ppl:'',sort:gf.sort};
  $('g-q').value='';$('g-ppl').value='';syncChips();renderGames();
}
$('g-q').oninput=e=>{gf.q=e.target.value;renderGames()};
$('g-ppl').onchange=e=>{gf.ppl=e.target.value;renderGames()};
$('g-sort').onchange=e=>{gf.sort=e.target.value;renderGames()};
$('g-reset').onclick=resetFilters;
$('c-retry').onclick=loadCatalog;
$('c-cta').onclick=()=>needAccount({tab:'order'},'Masuk untuk booking meja, memilih game dan memesan menu sekaligus.');
document.querySelectorAll('.seg button').forEach(b=>{
  b.onclick=()=>{
    document.querySelectorAll('.seg button').forEach(x=>x.setAttribute('aria-selected',String(x===b)));
    $('cp-games').hidden=b.dataset.c!=='games';$('cp-menu').hidden=b.dataset.c!=='menu';
  };
});

/* ---------- Katalog menu: kartu produk + keranjang ---------- */
const CAT_ORDER=['Makanan','Minuman','Cemilan'];
const I_COOKIE='<path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01"/><path d="M16 15.5v.01"/><path d="M12 12v.01"/><path d="M11 17v.01"/><path d="M7 14v.01"/>';
const CAT_ICON={Makanan:I_FORK,Minuman:I_CUP,Cemilan:I_COOKIE};
const catRank=c=>{const i=CAT_ORDER.indexOf(c);return i<0?99:i};
const sortMenu=l=>l.slice().sort((a,b)=>catRank(a.category)-catRank(b.category)||a.name.localeCompare(b.name,'id'));
const cart=new Map(),cartLi=new Map();
let shopMenu=[],sf={q:'',cat:''};
const mById=id=>shopMenu.find(x=>+x.id===+id);
const cartQty=id=>cart.get(+id)||0;

function menuMedia(m){
  const box=el('div',null,'pimg c-'+slug(m.category||''));
  const art=()=>box.prepend(ico(CAT_ICON[m.category]||I_FORK,'pimg-ic'));
  if(m.image_url){
    const im=document.createElement('img');
    im.src=String(m.image_url).replace(/ /g,'%20');im.alt=m.name;im.loading='lazy';
    im.onerror=()=>{im.remove();art()};
    box.appendChild(im);
  }else art();
  box.appendChild(el('span',m.category||'Menu','ctag'));
  return box;
}
function stepper(id){
  const w=el('div',null,'step');
  const mi=el('button','\u2212','step-b'),pl=el('button','+','step-b');
  mi.type=pl.type='button';
  mi.setAttribute('aria-label','Kurangi');pl.setAttribute('aria-label','Tambah');
  mi.onclick=()=>cartSet(id,cartQty(id)-1);
  pl.onclick=()=>cartSet(id,cartQty(id)+1);
  w.append(mi,el('span',String(cartQty(id)),'step-n'),pl);
  return w;
}
function fillCtl(box,m){
  const q=cartQty(m.id),st=box.querySelector('.step');
  if(q>0&&st){st.querySelector('.step-n').textContent=q;return}
  const had=box.contains(document.activeElement);
  box.innerHTML='';
  if(q>0)box.appendChild(stepper(m.id));
  else{const b=el('button','Tambah','sm add');b.type='button';b.onclick=()=>cartSet(m.id,1);box.appendChild(b)}
  if(had)(box.querySelector('.step-b:last-of-type')||box.querySelector('.add')).focus();
}
function productCard(m,shop){
  const c=el('article',null,'pcard');
  const body=el('div',null,'pbody');
  body.appendChild(el('h4',m.name));
  if(m.description)body.appendChild(el('p',m.description));
  const foot=el('div',null,'pfoot');
  foot.appendChild(el('b',rp(m.price),'price'));
  if(shop){const box=el('div',null,'ctl');box.dataset.ctl=m.id;fillCtl(box,m);foot.appendChild(box)}
  else{
    const b=el('button','Pesan','ghost sm');b.type='button';
    b.onclick=()=>needAccount({tab:'order',menu:m.id},'Masuk atau daftar dulu untuk memesan. Pilihanmu akan disimpan.');
    foot.appendChild(b);
  }
  body.appendChild(foot);
  c.append(menuMedia(m),body);
  return c;
}

function cartSet(id,q){
  id=+id;q=Math.max(0,Math.min(50,q));
  if(q)cart.set(id,q);else cart.delete(id);
  const m=mById(id);
  if(m)document.querySelectorAll('[data-ctl="'+id+'"]').forEach(b=>fillCtl(b,m));
  renderCart();
}
function cartItem(m){
  const li=el('li',null,'ci');
  li.append(el('b',m.name),el('span',null,'ci-sub'),el('small',rp(m.price)+' / porsi'),stepper(m.id));
  return li;
}
function renderCart(){
  const list=$('cart-list');
  cartLi.forEach((li,id)=>{if(!cart.has(id)){li.remove();cartLi.delete(id)}});
  let n=0,total=0;
  cart.forEach((q,id)=>{
    const m=mById(id);
    if(!m){cart.delete(id);return}
    n+=q;total+=q*m.price;
    let li=cartLi.get(id);
    if(!li){li=cartItem(m);cartLi.set(id,li);list.appendChild(li)}
    li.querySelector('.step-n').textContent=q;
    li.querySelector('.ci-sub').textContent=rp(q*m.price);
  });
  $('cart-empty').hidden=n>0;$('cart-foot').hidden=n===0;$('cart-bar').hidden=n===0;
  $('cart-total').textContent=rp(total);$('cb-n').textContent=n;$('cb-t').textContent=rp(total);
  if(n===0)closeCart();
}
function openCart(){$('cart').classList.add('open');$('cart-bd').hidden=false}
function closeCart(){$('cart').classList.remove('open');$('cart-bd').hidden=true}
$('cart-bar').onclick=openCart;$('cart-x').onclick=closeCart;$('cart-bd').onclick=closeCart;
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCart()});

function buildShopChips(){
  const box=$('s-chips');box.innerHTML='';
  const counts={};shopMenu.forEach(m=>{counts[m.category]=(counts[m.category]||0)+1});
  if(sf.cat&&!counts[sf.cat])sf.cat='';
  if(!shopMenu.length)return;
  const mk=(label,val,n)=>{
    const b=el('button',label,'chip');b.type='button';b.dataset.g=val;
    b.setAttribute('aria-pressed',String(sf.cat===val));
    b.appendChild(el('small',n));
    b.onclick=()=>{sf.cat=val;document.querySelectorAll('#s-chips .chip').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.g===sf.cat)));renderShop()};
    box.appendChild(b);
  };
  mk('Semua','',shopMenu.length);
  Object.keys(counts).sort((a,b)=>catRank(a)-catRank(b)||a.localeCompare(b,'id')).forEach(k=>mk(k,k,counts[k]));
}
function renderShop(){
  const q=sf.q.trim().toLowerCase();
  const r=shopMenu.filter(m=>(!sf.cat||m.category===sf.cat)&&(!q||(m.name+' '+(m.description||'')).toLowerCase().includes(q)));
  const grid=$('s-grid');grid.innerHTML='';
  r.forEach(m=>grid.appendChild(productCard(m,true)));
  $('s-empty').hidden=r.length>0;
}
function setShopMenu(list){
  shopMenu=sortMenu(list);
  buildShopChips();renderShop();renderCart();
}
$('s-q').oninput=e=>{sf.q=e.target.value;renderShop()};
// Konfirmasi tampil hanya SETELAH API memastikan transaksi berhasil.
let orderSuccessPreviousFocus=null;
function closeOrderSuccess(){
  const modal=$('order-success');modal.hidden=true;
  document.body.classList.remove('order-confirmed-open');
  if(orderSuccessPreviousFocus&&document.contains(orderSuccessPreviousFocus))orderSuccessPreviousFocus.focus();
}
function showOrderSuccess(receipt){
  orderSuccessPreviousFocus=document.activeElement;
  $('success-booking').textContent=receipt.booking_date+' · '+receipt.booking_time+' · '+receipt.people+' orang (#'+receipt.booking_id+')';
  $('success-game').textContent=receipt.selected_game_name||'Tanpa boardgame';
  $('success-qty').textContent=receipt.items+' item';
  $('success-total').textContent=rp(receipt.total);
  $('order-success').hidden=false;
  document.body.classList.add('order-confirmed-open');
  $('order-success').querySelector('.order-success-dialog').focus();
}
$('success-history').onclick=()=>{closeOrderSuccess();tab('hist');document.querySelector('#v-dash .tabs').scrollIntoView({behavior:'smooth',block:'start'});};
$('success-more').onclick=()=>{closeOrderSuccess();tab('order');document.querySelector('.game-order-step').scrollIntoView({behavior:'smooth',block:'start'});};
$('order-success').addEventListener('click',e=>{if(e.target===$('order-success'))closeOrderSuccess();});
document.addEventListener('keydown',e=>{
  if($('order-success').hidden)return;
  if(e.key==='Escape'){e.preventDefault();closeOrderSuccess();return;}
  if(e.key==='Tab'){
    const nodes=[...$('order-success').querySelectorAll('button:not([disabled])')];
    if(!nodes.length)return;
    if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes[nodes.length-1].focus();}
    else if(!e.shiftKey&&document.activeElement===nodes[nodes.length-1]){e.preventDefault();nodes[0].focus();}
  }
});
$('o-btn').onclick=async()=>{
  if(!cart.size)return;
  const items=[...cart].map(([menu_id,qty])=>({menu_id,qty})),btn=$('o-btn');
  btn.disabled=true;
  const oldLabel=btn.innerHTML;
  btn.textContent='Memproses booking & pesanan…';
  try{
    const date=$('b-date').value,time=$('b-time').value,people=Number($('b-ppl').value);
    if(!date||!time||!Number.isInteger(people)||people<1||people>12)throw new Error('Lengkapi tanggal, jam dan jumlah tamu terlebih dahulu.');
    const r=await api('user','checkout',{items,game_id:Number($('order-game').value)||null,date,time,people});
    msg('o-msg','',true);
    // Menampilkan nama dan total dari respons server yang berhasil, bukan dari perkiraan browser.
    cart.clear();renderCart();closeCart();
    showOrderSuccess(r);
    // Gagal memuat ulang riwayat tidak mengubah status transaksi yang sudah berhasil.
    try{await renderDash()}catch(err){console.warn('Penyegaran riwayat gagal:',err);}
  }catch(e){msg('o-msg','Pesanan belum berhasil dikirim. '+e.message)}
  finally{btn.disabled=false;btn.innerHTML=oldLabel}
};

(async function boot(){
  refreshPublicContent();
  loadCatalog();
  try{user=(await api('auth','me')).user}
  catch(e){const b=$('boot-err');b.textContent=e.message;b.hidden=false}
  if(user)enter();else show('home');
})();
})();
