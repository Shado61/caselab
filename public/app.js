(function(){
'use strict';
/* ---------- basics ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>'$'+(v>=1000?Math.round(v).toLocaleString('en-US'):(Math.round(v*100)/100).toFixed(2).replace(/\.00$/,''));
const reduceMotion=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const PREF_KEY='caselab.prefs';
const PREF=(()=>{try{return Object.assign({snd:true,fast:false},JSON.parse(localStorage.getItem(PREF_KEY)||'{}'))}catch(e){return {snd:true,fast:false}}})();
const savePref=()=>{try{localStorage.setItem(PREF_KEY,JSON.stringify(PREF))}catch(e){}};
let busy=false,lastRun=null,sellAllArmed=false;
const UI={cat:'all',sort:'price-asc',inv:'new'};

/* ---------- server ---------- */
/* S = the signed-in player as the server sees it; a guest gets an empty player that cannot spend anything */
const GUEST=()=>Object.assign(freshUser(),{guest:true,name:'Гость'});
let S=GUEST(),OWNER_SET=true,ANNOUNCE='',LIVE={online:0,players:0,feed:[]};
async function api(path,data){
  const opt=data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)};
  let r;try{r=await fetch(path,Object.assign({credentials:'same-origin'},opt))}catch(e){throw new Error('Нет связи с сервером')}
  const j=await r.json().catch(()=>({error:'Ошибка сервера'}));
  if(!r.ok)throw new Error(j.error||'Ошибка');
  if(j.me)setMe(j.me);
  return j;
}
function setMe(me){S=me?me:GUEST();ensureBP(S)}
async function loadMe(){
  try{const j=await api('/api/me');setMe(j.user);OWNER_SET=j.ownerSet;ANNOUNCE=j.announce||''}catch(e){toast(e.message)}
}
const needLogin=()=>{if(S.guest){showLogin();return true}return false};
function showLogin(){
  $('#modal').innerHTML=`<div class="scrim" data-act="close"><div class="modal glass" style="--rc:#66c0f4" role="dialog" aria-modal="true">
    <div class="kick">Вход</div><h2>Войди через Steam</h2><p class="sub">Аккаунт, баланс и инвентарь хранятся на сервере. Пароль от Steam сайт не видит: вход идёт на странице Steam.</p>
    <div class="btns" style="margin-top:16px"><a class="btn steam" href="/auth/steam">${STEAM_ICON}Войти через Steam</a><button class="btn" data-act="close">Позже</button></div></div></div>`;
}
const STEAM_ICON='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-9.96 9.17l5.36 2.22a2.8 2.8 0 0 1 1.6-.5h.16l2.39-3.46v-.05a3.79 3.79 0 1 1 3.79 3.79h-.09l-3.4 2.43v.13a2.84 2.84 0 0 1-5.63.56L2.4 14.7A10 10 0 1 0 12 2zm-4.53 15.2-1.23-.51a2.13 2.13 0 1 0 1.17-2.91l1.27.53a1.57 1.57 0 1 1-1.21 2.89zm9.46-7.73a2.52 2.52 0 1 0-2.52 2.52 2.53 2.53 0 0 0 2.52-2.52zm-4.42 0a1.9 1.9 0 1 1 1.9 1.9 1.9 1.9 0 0 1-1.9-1.9z"/></svg>';

/* ---------- item art: original detailed SVG drawings ---------- */
/* parts: s skin, a skin (darker panel), m metal, d dark, g grip, k skin tone, D dark on top, l line */
const P=(d,c)=>({d,c});
const SHAPES={
 ak:[
  P('M4 47 Q3 40 9 38 L44 31 L54 32 L54 44 L46 47 L14 55 Q5 56 4 47Z','s'),
  P('M118 24 L160 24 L160 28 L118 28Z','m'),
  P('M152 32 L188 32 L188 35.5 L152 35.5Z','m'),
  P('M177 25 L181 25 L183 32 L176 32Z','m'),
  P('M186 30 L197 30 L197 37 L186 37Z','d'),
  P('M58 22 L114 22 L120 27 L56 27Z','m'),
  P('M52 27 L122 27 L124 30 L124 43 L52 43Z','s'),
  P('M122 30 L152 30 L155 33 L155 40 L122 42Z','a'),
  P('M66 43 L77 43 L72 64 Q66 66 61 63Z','g'),
  P('M88 43 L102 43 Q106 57 115 67 L100 74 Q89 60 88 43Z','s'),
  P('M74 43 Q75 52 86 52 L88 43','l'),
  P('M126 33 H150 M126 37 H150','l'),
  P('M60 31 H116','l')
 ],
 m4:[
  P('M44 33 L60 33 L60 39 L44 39Z','m'),
  P('M3 33 Q3 30 7 30 L40 29 L46 31 L46 43 L40 45 L8 46 Q3 46 3 42Z','s'),
  P('M164 30.5 L197 30.5 L197 39.5 L164 39.5Z','d'),
  P('M62 22 L122 22 L122 27 L62 27Z','d'),
  P('M58 27 L126 27 L126 43 L58 43Z','s'),
  P('M126 27 L164 27 L164 43 L126 43Z','a'),
  P('M98 43 L110 43 L113 66 L101 67Z','d'),
  P('M72 43 L83 43 L78 63 Q72 65 67 62Z','g'),
  P('M80 43 Q81 51 92 51 L94 43','l'),
  P('M129 31 H161 M129 35 H161 M129 39 H161','l'),
  P('M66 24.5 H118','l'),
  P('M168 32 V38 M174 32 V38 M180 32 V38','l')
 ],
 awp:[
  P('M126 34.5 L188 34.5 L188 38.5 L126 38.5Z','m'),
  P('M186 32 L198 32 L198 41 L186 41Z','d'),
  P('M80 24 L86 24 L86 30 L80 30Z','m'),
  P('M100 24 L106 24 L106 30 L100 30Z','m'),
  P('M2 46 Q2 36 10 35 L42 30 L58 30 L58 46 L46 47 L38 41 L28 41 L24 52 L7 53 Q2 53 2 46Z','s'),
  P('M56 30 L124 30 L128 34 L128 43 L56 45Z','s'),
  P('M70 17 L114 17 L114 24 L70 24Z','d'),
  P('M60 14 L72 15 L72 26 L60 27Z','d'),
  P('M112 13 L128 12 L128 29 L112 28Z','d'),
  P('M88 45 L102 45 L102 55 L88 55Z','d'),
  P('M60 45 L71 45 L66 63 Q60 64 55 61Z','g'),
  P('M71 45 Q72 53 82 53 L84 45','l'),
  P('M108 30 L111 26 L117 27 Q118 30 114 31','l'),
  P('M64 37 H122','l'),
  P('M74 19 H110','l')
 ],
 deagle:[
  P('M168 20 L180 20 L180 30 L168 30Z','m'),
  P('M38 43 L82 43 L78 77 L38 77 Q32 64 38 43Z','g'),
  P('M24 16 L174 16 L178 20 L178 36 L24 36Z','s'),
  P('M34 36 L166 36 L166 43 L34 43Z','a'),
  P('M82 43 Q84 62 104 60 L110 43','l'),
  P('M30 20 V32 M35 20 V32 M40 20 V32 M45 20 V32','l'),
  P('M50 26 H164','l'),
  P('M44 50 L74 50 M43 58 L73 58 M42 66 L72 66','l')
 ],
 glock:[
  P('M34 44 L74 44 L66 77 L28 77 Q26 60 34 44Z','g'),
  P('M24 18 L168 18 Q172 18 172 22 L172 36 L24 36Z','s'),
  P('M30 36 L164 36 L160 44 L30 44Z','a'),
  P('M74 44 Q76 60 96 58 L100 44','l'),
  P('M30 22 V32 M34 22 V32 M38 22 V32 M42 22 V32','l'),
  P('M36 52 L66 52 M34 60 L64 60 M32 68 L62 68','l')
 ],
 usp:[
  P('M112 24 L196 24 L196 36 L112 36Z','d'),
  P('M22 44 L56 44 L50 77 L16 77 Q14 60 22 44Z','g'),
  P('M14 22 L112 22 L114 25 L114 37 L14 37Z','s'),
  P('M20 37 L106 37 L104 44 L20 44Z','a'),
  P('M56 44 Q58 58 76 57 L80 44','l'),
  P('M20 25 V34 M24 25 V34 M28 25 V34','l'),
  P('M124 27 V33 M136 27 V33 M148 27 V33 M160 27 V33 M172 27 V33 M184 27 V33','l')
 ],
 smg:[
  P('M6 31 L30 29 L30 35 L10 37 L10 44 L4 44Z','m'),
  P('M140 30 L174 30 L174 36 L140 36Z','m'),
  P('M172 28.5 L190 28.5 L190 37.5 L172 37.5Z','d'),
  P('M34 21 L134 21 L134 25 L34 25Z','d'),
  P('M28 25 L140 25 L144 29 L144 41 L28 41Z','s'),
  P('M110 29 L144 29 L144 41 L110 41Z','a'),
  P('M92 41 L104 41 L106 70 L94 70Z','d'),
  P('M48 41 L60 41 L54 64 Q48 66 43 63Z','g'),
  P('M60 41 Q61 50 72 50 L74 41','l'),
  P('M36 33 H106','l')
 ],
 karambit:[
  P('M30 44 Q62 38 96 42 L104 58 Q70 62 40 64 Q28 60 30 44Z','g'),
  P('M14 54 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0Z M19 54 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0Z','m'),
  P('M96 44 Q124 6 184 10 Q154 20 134 40 Q120 54 104 58Z','s'),
  P('M92 40 L100 38 L110 58 L102 60Z','m'),
  P('M104 50 Q126 20 170 13','l'),
  P('M44 48 L46 60 M58 46 L60 59 M72 45 L74 58','l')
 ],
 butterfly:[
  P('M92 28 L100 28 L100 48 L92 48Z','m'),
  P('M98 33 L170 30 Q188 30 198 38 Q186 44 170 44 L98 44Z','s'),
  P('M8 30 L98 31 L98 38 L8 38 Q4 34 8 30Z','g'),
  P('M8 39 L98 39 L98 46 L8 47 Q4 43 8 39Z','g'),
  P('M20 33 h12 v3 h-12Z M42 33 h12 v3 h-12Z M64 33 h12 v3 h-12Z M20 42 h12 v3 h-12Z M42 42 h12 v3 h-12Z M64 42 h12 v3 h-12Z','D'),
  P('M106 40 L176 40','l'),
  P('M106 36 L168 34','l')
 ],
 bayonet:[
  P('M4 33 L12 33 L12 44 L4 44Z','m'),
  P('M80 30 L172 30 Q190 32 198 39 Q186 46 172 47 L80 47Z','s'),
  P('M70 22 L82 22 L82 55 L70 55Z','m'),
  P('M10 31 L72 31 L72 46 L10 46 Q4 38.5 10 31Z','g'),
  P('M86 37 L160 37','l'),
  P('M22 31 V46 M34 31 V46 M46 31 V46 M58 31 V46','l')
 ],
 bowie:[
  P('M4 33 L12 33 L12 44 L4 44Z','m'),
  P('M80 28 L150 28 L164 34 Q186 34 198 40 Q184 50 160 51 L80 51Z','s'),
  P('M70 20 L82 20 L82 58 L70 58Z','m'),
  P('M10 31 L72 31 L72 47 L10 47 Q4 39 10 31Z','g'),
  P('M90 28 l4 -3 l4 3 l4 -3 l4 3 l4 -3 l4 3 l4 -3 l4 3 l4 -3 l4 3','l'),
  P('M88 40 L150 40','l'),
  P('M22 31 V47 M34 31 V47 M46 31 V47 M58 31 V47','l')
 ],
 falchion:[
  P('M4 33 L12 33 L12 44 L4 44Z','m'),
  P('M80 30 Q140 26 196 14 Q190 38 160 47 L80 47Z','s'),
  P('M70 24 L82 24 L82 53 L70 53Z','m'),
  P('M10 31 Q40 28 72 31 L72 46 Q40 48 10 46 Q4 38.5 10 31Z','g'),
  P('M88 38 Q140 34 184 20','l')
 ],
 flip:[
  P('M12 30 L100 30 L100 48 L12 48 Q4 39 12 30Z','g'),
  P('M98 30 L176 28 Q194 34 192 42 L98 47Z','s'),
  P('M96 27 L104 27 L104 51 L96 51Z','m'),
  P('M97 39 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0Z','D'),
  P('M110 41 L184 38','l'),
  P('M24 34 L90 34 M24 44 L90 44','l')
 ],
 gut:[
  P('M12 30 L100 30 L100 48 L12 48 Q4 39 12 30Z','g'),
  P('M98 30 L118 30 Q126 38 136 30 L176 29 Q194 34 192 42 L98 47Z','s'),
  P('M96 27 L104 27 L104 51 L96 51Z','m'),
  P('M110 41 L184 38','l'),
  P('M24 34 L90 34 M24 44 L90 44','l')
 ],
 daggers:[
  P('M54 34 L66 34 L66 46 L54 46Z','m'),
  P('M66 30 L176 38 Q186 40 196 40 Q186 42 176 42 L66 50Z','s'),
  P('M40 14 Q52 12 54 16 L54 64 Q52 68 40 66 Q34 40 40 14Z','g'),
  P('M72 40 L190 40','l'),
  P('M42 24 H52 M42 34 H52 M42 44 H52 M42 54 H52','l')
 ],
 glove:[
  P('M68 60 L132 60 L134 79 L66 79Z','a'),
  P('M72 62 Q66 42 74 30 L126 30 Q134 42 128 62Z','s'),
  P('M76 32 L76 12 Q76 6 82 6 Q88 6 88 12 L88 32Z','s'),
  P('M90 30 L90 6 Q90 0 96 0 Q102 0 102 6 L102 30Z','s'),
  P('M104 30 L104 8 Q104 2 110 2 Q116 2 116 8 L116 30Z','s'),
  P('M118 32 L118 16 Q118 10 123 10 Q128 10 128 16 L128 34Z','s'),
  P('M74 50 Q60 46 52 34 Q48 26 55 25 Q62 25 68 34 L76 40Z','s'),
  P('M78 30 L126 30 L124 38 L80 38Z','D'),
  P('M71 54 L129 54 L129 60 L71 60Z','D'),
  P('M76 21 H88 M90 17 H102 M104 19 H116 M118 23 H128','l'),
  P('M70 66 H130 M70 72 H130 M82 40 Q100 46 120 40 M100 30 V54','l')
 ],
 agent:[
  P('M44 50 Q33 57 31 80 L53 80 Q55 64 61 56Z','s'),
  P('M156 50 Q167 57 169 80 L147 80 Q145 64 139 56Z','s'),
  P('M48 52 Q60 44 82 42 L118 42 Q140 44 152 52 L150 80 L50 80Z','s'),
  P('M91 33 L109 33 L111 45 L89 45Z','k'),
  P('M66 47 L134 47 L137 80 L63 80Z','a'),
  P('M66 47 L73 40 L82 47Z M134 47 L127 40 L118 47Z','a'),
  P('M84 40 L100 49 L116 40 L115 46 L100 53 L85 46Z','a'),
  P('M100 3 Q119 3 120 20 Q120 36 100 38 Q80 36 80 20 Q81 3 100 3Z','k'),
  P('M80 17 q-5 3 0 9Z M120 17 q5 3 0 9Z','k'),
  P('M70 61 h13 v16 h-13Z M85 61 h13 v16 h-13Z M102 61 h13 v16 h-13Z M117 61 h13 v16 h-13Z','D'),
  P('M121 49 h9 v10 h-9Z','D'),
  P('M36 60 h11 v8 h-11Z','D'),
  P('M70 65 h13 M85 65 h13 M102 65 h13 M117 65 h13 M66 56 H134','l'),
  P('M128 49 L133 36','l'),
  P('M100 19 L97.5 25.5 L101 26 M95 31 Q100 32.5 105 31','l'),
  P('M61 56 Q60 68 58 80 M139 56 Q140 68 142 80','l')
 ]
};
const HATS=[
 [P('M76 22 Q76 -2 100 -2 Q124 -2 124 22 L124 24 L76 24Z','a'),P('M84 13 H116 V21 H84Z','D'),P('M78 8 Q100 0 122 8','l'),P('M89 25.5 h6 v2 h-6Z M105 25.5 h6 v2 h-6Z','D')],
 [P('M76 24 Q76 -1 100 -1 Q124 -1 124 24 L124 26 L76 26Z','a'),P('M82 16 H118 V24 H82Z','D')],
 [P('M79 17 Q80 1 100 1 Q120 1 121 17Z','a'),P('M118 14 L138 18 L120 19Z','a'),P('M89 25 h6 v2 h-6Z M105 25 h6 v2 h-6Z','D')],
 [P('M78 20 Q78 0 100 0 Q122 0 122 20 L122 22 L78 22Z','a'),P('M78 18 H122','l'),P('M89 27 h6 v2 h-6Z M105 27 h6 v2 h-6Z','D')],
 [P('M78 24 Q78 3 100 3 Q122 3 122 24 Q122 42 100 44 Q78 42 78 24Z','D'),P('M86 21 h28 v6 h-28Z','k'),P('M90 23 h5 v2 h-5Z M105 23 h5 v2 h-5Z','D')]
];
const RIVETS={"ak": "60,35 70,35 110,35 116,31 136,36 30,42", "m4": "64,31 74,31 114,31 120,35 130,29 160,29 24,37", "awp": "62,34 72,34 116,34 92,20 30,38", "deagle": "150,26 160,26 60,40 120,40 58,60", "glock": "140,27 60,40 120,40 50,60", "usp": "90,28 60,40 36,60", "smg": "40,33 96,33 120,33 52,53", "karambit": "98,47 26,54 70,50", "butterfly": "96,32 96,44 30,38 80,38", "bayonet": "76,30 76,48 16,38", "bowie": "76,28 76,50 16,38", "falchion": "76,30 76,48 16,38", "flip": "26,39 60,39", "gut": "26,39 60,39", "daggers": "47,20 47,60 60,40", "glove": "82,57 100,57 118,57", "agent": "84,64 116,64"};
const TONES=['#e3bd9c','#cc9e78','#a97754','#7c5438'];
const CAMO={forest:['#4a5a33','#2f3a22','#6b7a45','#1e2416'],safari:['#b59a6a','#8a7148','#d1bb8a','#5e4c30'],urban:['#8d939c','#5d636b','#b8bec6','#3a3e44'],night:['#22252c','#3a3f4a','#14161a','#50566a'],rust:['#7a3e1d','#a2582a','#4a2614','#c47a3e'],scorch:['#2b211b','#5a3f2c','#120d0a','#7a5a3c']};
function shapeOf(it){
  const n=split(it.name)[0].toLowerCase();
  switch(it.w){
    case 'r':return /m4|famas/.test(n)?'m4':'ak';
    case 's':return 'awp';
    case 'p':return /desert/.test(n)?'deagle':/usp/.test(n)?'usp':'glock';
    case 'm':return 'smg';
    case 'k':return /karambit/.test(n)?'karambit':/butterfly/.test(n)?'butterfly':/gut/.test(n)?'gut':/flip/.test(n)?'flip':/bowie|huntsman/.test(n)?'bowie':/falchion/.test(n)?'falchion':/dagger/.test(n)?'daggers':'bayonet';
    case 'g':return 'glove';
    default:return 'agent';
  }
}
const f1=v=>v.toFixed(1);
function skinPattern(it,id,r){
  const s=(split(it.name)[1]||it.name).toLowerCase(),R=RAR[it.rar],h=hash(it.name);
  const H=it.rar==='gld'?40+h%14:(R.hue+(h%70)-35+360)%360,H2=(H+40+(h>>>9)%90)%360;
  const C=(hh,sa,l,a)=>`hsl(${Math.round(hh)%360} ${sa}% ${l}%${a!=null?' / '+a:''})`;
  let defs='',g='';
  const rect=f=>`<rect width="200" height="80" fill="${f}"/>`;
  const grad=(stops,x2,y2,k)=>{defs+=`<linearGradient id="${id}${k||'f'}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map((c,i)=>`<stop offset="${(i/(stops.length-1)).toFixed(2)}" stop-color="${c}"/>`).join('')}</linearGradient>`;return rect(`url(#${id}${k||'f'})`)};
  const blur=sd=>{defs+=`<filter id="${id}b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${sd}"/></filter>`;return `filter="url(#${id}b)"`};
  const blobs=(n,cols,a,b,extra)=>{let o='';for(let i=0;i<n;i++){const x=r()*210-5,y=r()*90-5,rx=a+r()*(b-a),ry=rx*(.45+r()*.6),t=r()*180;o+=`<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(rx)}" ry="${f1(ry)}" transform="rotate(${t|0} ${f1(x)} ${f1(y)})" fill="${cols[i%cols.length]}"${extra||''}/>`}return o};
  const swirls=(n,col,w)=>{let o='';for(let i=0;i<n;i++){const x=r()*200,y=r()*80;o+=`<path d="M${f1(x)} ${f1(y)} c${f1(r()*60-30)} ${f1(r()*40-20)} ${f1(r()*60-30)} ${f1(r()*40-20)} ${f1(r()*80-40)} ${f1(r()*30-15)}" fill="none" stroke="${col}" stroke-width="${f1(w*(.5+r()))}" stroke-linecap="round"/>`}return o};
  const camo=(pal,n)=>rect(pal[0])+blobs(n,pal.slice(1),6,18);
  if(/marble fade/.test(s)){
    g=grad([C(H,90,62),C(H2,85,56),C(H2+70,75,44)],200,60)+swirls(16,'rgba(255,255,255,.35)',1.2)+swirls(10,'rgba(0,0,0,.25)',1);
  }else if(/fade/.test(s)){
    g=grad([C(H,92,62),C(H2,88,58),C(H2+60,80,46)],200,24);
  }else if(/doppler/.test(s)){
    const hh=/gamma/.test(s)?120+h%60:(h%2?215:285);
    g=rect(C(hh,55,10))+`<g ${blur(5)}>${blobs(14,[C(hh,90,45,.9),C(hh+30,85,35,.8),C(hh-20,70,25,.9)],8,22)}</g>`;
    for(let i=0;i<40;i++)g+=`<circle cx="${f1(r()*200)}" cy="${f1(r()*80)}" r="${f1(.4+r()*.8)}" fill="${C(hh,90,80,.7)}"/>`;
  }else if(/web/.test(s)){
    const base=/crimson|blood/.test(s)?C(358,72,34):/emerald/.test(s)?C(150,60,28):C(H,60,32);
    g=rect(base);const cx=40+r()*120,cy=20+r()*40,N=18,ang=[];
    for(let i=0;i<N;i++)ang.push(i/N*Math.PI*2+r()*.15);
    let w='';ang.forEach(a=>{w+=`M${f1(cx)} ${f1(cy)} L${f1(cx+Math.cos(a)*240)} ${f1(cy+Math.sin(a)*240)} `});
    for(let k=1;k<9;k++){const rr=k*14+r()*4;let d='';ang.concat(ang[0]).forEach((a,i)=>{const x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;d+=(i?'Q'+f1(cx+Math.cos(a-.17)*rr*.86)+' '+f1(cy+Math.sin(a-.17)*rr*.86)+' ':'M')+f1(x)+' '+f1(y)+' '});w+=d}
    g+=`<path d="${w}" fill="none" stroke="rgba(8,8,10,.92)" stroke-width=".9"/>`;
  }else if(/case hardened/.test(s)){
    g=grad(['#9aa1ab','#6e747d'],0,80)+`<g ${blur(3.5)}>${blobs(22,['#2f5fb8','#c99a2e','#4a3aa8','#d8b450','#1f3f8a'],6,16,' opacity=".85"')}</g>`;
  }else if(/tiger/.test(s)){
    g=rect(C(32,92,54));let d='';
    for(let x=-10;x<210;x+=9+r()*7){const t=3+r()*4;d+=`M${f1(x)} -2 Q${f1(x+r()*10-5)} 20 ${f1(x+r()*8-4)} 40 T${f1(x+r()*10-5)} 82 L${f1(x+t)} 82 Q${f1(x+t+r()*8-4)} 60 ${f1(x+t+r()*6-3)} 40 T${f1(x+t)} -2Z `}
    g+=`<path d="${d}" fill="rgba(25,12,4,.88)"/>`;
  }else if(/ddpat|forest/.test(s))g=camo(CAMO.forest,30);
  else if(/safari|giraffe|amphib/.test(s))g=camo(CAMO.safari,30);
  else if(/urban|masked|slate|turtle/.test(s))g=camo(CAMO.urban,30);
  else if(/night|nocts|charred/.test(s))g=camo(CAMO.night,26);
  else if(/rust/.test(s))g=camo(CAMO.rust,28);
  else if(/scorch|stained|snakebite/.test(s))g=camo(CAMO.scorch,28);
  else if(/slaughter|blood|crimson|code red|redline/.test(s)){
    g=rect(C(355,75,40))+blobs(26,[C(350,80,26,.75),C(5,70,55,.5)],4,10);
  }else if(/blue steel/.test(s)){
    g=grad(['#9fb4d6','#4f6ea4','#2c3f66'],60,80)+swirls(8,'rgba(255,255,255,.2)',1);
  }else if(/lore|gold|arabesque|bismuth|royale|mogul|emperor|empress|king/.test(s)){
    g=grad(['#f6dc87','#c8962c','#7d5410'],140,80)+swirls(22,'rgba(90,55,5,.55)',1)+swirls(10,'rgba(255,245,200,.5)',.8);
  }else if(/plaid|weave|kimono|overprint/.test(s)){
    g=rect(C(H,55,32));
    for(let i=0;i<11;i++){const y=r()*80,x=r()*200,w=2+r()*5;g+=`<rect x="0" y="${f1(y)}" width="200" height="${f1(w)}" fill="${C(i%2?H2:H+180,60,55,.45)}"/><rect x="${f1(x)}" y="0" width="${f1(w)}" height="80" fill="${C(i%2?H:H2,60,20,.45)}"/>`}
  }else if(/fire|flame|blaze|chantico|wildfire|fuel|vulcan/.test(s)){
    defs+=`<linearGradient id="${id}fl" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffd23a"/><stop offset=".5" stop-color="#ff6a1a"/><stop offset="1" stop-color="#b3120f"/></linearGradient>`;
    g=rect('#1b1012');let d='';
    for(let x=-10;x<210;x+=10+r()*10){const hgt=30+r()*45,w=10+r()*12;d+=`M${f1(x)} 82 Q${f1(x+w*.2)} ${f1(82-hgt*.6)} ${f1(x+w*.5+r()*8-4)} ${f1(82-hgt)} Q${f1(x+w*.8)} ${f1(82-hgt*.5)} ${f1(x+w)} 82Z `}
    g+=`<path d="${d}" fill="url(#${id}fl)" opacity=".95"/>`;
  }else if(/water|aqua|hydro|mint|emerald|jade|lightning|electric|cobalt|spear/.test(s)){
    const hh=/emerald|jade|mint|spear/.test(s)?155:/lightning|electric/.test(s)?265:200;
    g=rect(C(hh,70,24));
    for(let i=0;i<12;i++){const y=i*8+r()*4-4;g+=`<path d="M-5 ${f1(y)} Q25 ${f1(y-6)} 50 ${f1(y)} T100 ${f1(y)} T150 ${f1(y)} T205 ${f1(y)}" fill="none" stroke="${C(hh+r()*30-15,85,40+r()*30,.7)}" stroke-width="${f1(1.5+r()*3)}"/>`}
  }else{
    const sat=it.rar==='mil'?55:75;
    g=rect(C(H,sat*.6,20));
    for(let i=0;i<7;i++){const x=r()*220-20,w=14+r()*40,k=r()*50-25,col=[C(H,sat,52),C(H2,sat,46),C(H+180,sat*.7,62),'#e9edf3','#14161c'][i%5];
      g+=`<path d="M${f1(x)} -2 L${f1(x+w)} -2 L${f1(x+w+k)} 82 L${f1(x+k)} 82Z" fill="${col}" opacity="${f1(.55+r()*.4)}"/>`}
    for(let i=0;i<6;i++){const y=6+r()*68;g+=`<path d="M0 ${f1(y)} H${f1(40+r()*160)}" stroke="${i%2?'#fff':C(H2,90,60)}" stroke-width="${f1(.6+r()*1.2)}" opacity=".7"/>`}
    for(let i=0;i<4;i++){const x=r()*190,y=r()*72;g+=`<rect x="${f1(x)}" y="${f1(y)}" width="${f1(4+r()*10)}" height="${f1(2+r()*3)}" rx="1" fill="${C(H2,90,65)}"/>`}
  }
  return {defs,g};
}
const ART_CACHE=new Map();let ART_N=0;
function buildArt(it){
  const id='§',r=rng(hash(it.name));
  const sh=shapeOf(it);
  let parts=SHAPES[sh];
  if(sh==='agent')parts=parts.concat(HATS[hash(it.name)%HATS.length]);
  const tone=TONES[(hash(it.name)>>>3)%TONES.length];
  const pat=skinPattern(it,id,r);
  const skin=parts.filter(p=>p.c==='s'||p.c==='a');
  let defs=pat.defs+
   `<clipPath id="${id}c">${skin.map(p=>`<path d="${p.d}" clip-rule="evenodd"/>`).join('')}</clipPath>`+
   `<linearGradient id="${id}m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1f4f9"/><stop offset=".45" stop-color="#a3abbb"/><stop offset="1" stop-color="#4c5363"/></linearGradient>`+
   `<linearGradient id="${id}d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a505e"/><stop offset=".5" stop-color="#262a33"/><stop offset="1" stop-color="#121418"/></linearGradient>`+
   `<linearGradient id="${id}k" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${tone}"/><stop offset="1" stop-color="${tone}" stop-opacity=".75"/></linearGradient>`+
   `<linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset=".3" stop-color="#fff" stop-opacity=".05"/><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient>`;
  const fillOf=c=>c==='m'?`url(#${id}m)`:c==='k'?`url(#${id}k)`:`url(#${id}d)`;
  let under='',over='',lines='',edge='',shade='';
  parts.forEach(p=>{
    if(p.c==='l'){lines+=p.d+' ';return}
    if(p.c==='s'||p.c==='a'){
      shade+=`<path d="${p.d}" fill="url(#${id}s)" fill-rule="evenodd"/>`;
      if(p.c==='a')shade+=`<path d="${p.d}" fill="rgba(0,0,0,.28)" fill-rule="evenodd"/>`;
    }else{
      const el=`<path d="${p.d}" fill="${fillOf(p.c==='D'?'d':p.c)}" fill-rule="evenodd"/>`;
      if(p.c==='D')over+=el;else under+=el;
      if(p.c==='m')over+=`<path d="${p.d}" fill="none" stroke="rgba(255,255,255,.35)" stroke-width=".6" fill-rule="evenodd" transform="translate(0 .6)"/>`;
    }
    edge+=p.d+' ';
  });
  let wear='';
  if(it.float>.38){
    const n=it.float>.45?26:12;let d='';
    for(let i=0;i<n;i++){const x=r()*200,y=r()*80;d+=`M${f1(x)} ${f1(y)} l${f1(r()*8-4)} ${f1(r()*3-1.5)} `}
    wear=`<path d="${d}" stroke="rgba(230,235,245,.55)" stroke-width=".7" stroke-linecap="round"/>`;
  }
  const gloss=`<path d="M0 10 L200 2 L200 9 L0 17Z" fill="rgba(255,255,255,.1)"/>`;
  defs+=`<pattern id="${id}h" width="6" height="10.4" patternUnits="userSpaceOnUse"><path d="M3 0 L6 1.7 L6 5.2 L3 6.9 L0 5.2 L0 1.7Z M3 6.9 V10.4" fill="none" stroke="rgba(0,0,0,.22)" stroke-width=".45"/></pattern>`+
   `<filter id="${id}n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="${hash(it.name)%97}"/><feColorMatrix type="matrix" values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .9 0"/></filter>`+
   `<filter id="${id}L" x="-4%" y="-8%" width="108%" height="116%"><feGaussianBlur in="SourceAlpha" stdDeviation="1.6" result="b"/><feSpecularLighting in="b" surfaceScale="3.2" specularConstant="1" specularExponent="24" lighting-color="#fff" result="sp"><feDistantLight azimuth="240" elevation="38"/></feSpecularLighting><feComposite in="sp" in2="SourceAlpha" operator="in" result="spi"/><feComposite in="SourceGraphic" in2="spi" operator="arithmetic" k1="0" k2="1" k3=".6" k4="0"/></filter>`+
   `<radialGradient id="${id}r" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#9ea6b6"/><stop offset="1" stop-color="#2a2f38"/></radialGradient>`;
  const hex=(it.w==='g'||/^(?!.*(fade|doppler|web|tiger|case hardened|ddpat|safari|urban|night|rust|forest|mesh)).*$/.test((split(it.name)[1]||'').toLowerCase()))?`<rect width="200" height="80" fill="url(#${id}h)"/>`:'';
  const noise=`<rect width="200" height="80" filter="url(#${id}n)" opacity=".16" style="mix-blend-mode:overlay"/>`;
  const rim=parts.filter(p=>p.c!=='l').map(p=>p.d).join(' ');
  const rv=(RIVETS[shapeOf(it)]||'').split(' ').filter(Boolean).map(q=>{const [x,y]=q.split(',');return `<circle cx="${x}" cy="${y}" r="1.35" fill="url(#${id}r)" stroke="rgba(0,0,0,.6)" stroke-width=".35"/>`}).join('');
  const body=`<g filter="url(#${id}L)">${under}<g clip-path="url(#${id}c)">${pat.g}${hex}${noise}${wear}${gloss}</g>${shade}${over}</g><path d="${rim}" fill="none" stroke="rgba(255,255,255,.22)" stroke-width=".7" transform="translate(-.4 -.7)"/><path d="${edge}" fill="none" stroke="rgba(6,8,12,.8)" stroke-width="1" stroke-linejoin="round"/>${lines?`<path d="${lines}" fill="none" stroke="rgba(6,8,12,.55)" stroke-width="1" stroke-linecap="round"/><path d="${lines}" fill="none" stroke="rgba(255,255,255,.18)" stroke-width=".5" transform="translate(0 .8)"/>`:''}${rv}`;
  const sil=`<path d="${edge}" fill="#06080c"/>`;
  let out;
  if(it.w==='g'){
    out=`<g transform="translate(128 6) rotate(10) scale(.84) translate(-100 0)"><g transform="translate(1.2 1.8)">${sil}</g>${body}<path d="${edge}" fill="rgba(0,0,0,.32)"/></g><g transform="translate(78 4) rotate(-8) scale(.9) translate(-100 0)"><g transform="translate(1.4 2)">${sil}</g>${body}</g>`;
  }else if(it.w==='a'){
    out=`<g transform="translate(1 1.5)" opacity=".7">${sil}</g>${body}`;
  }else{
    out=`<g transform="translate(100 40) rotate(-7) scale(.92) translate(-100 -40)"><g transform="translate(1.6 2.6)" opacity=".85">${sil}</g><g transform="translate(.8 1.3)">${sil}</g>${body}</g>`;
  }
  return `<svg viewBox="0 0 200 80" aria-hidden="true"><defs>${defs}</defs>${out}</svg>`;
}
const IMG={"P2000 | Fire Elemental":"data:image/jpeg;base64,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","MP7 | Bloodsport":"data:image/jpeg;base64,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","SSG 08 | Blood in the Water":"data:image/jpeg;base64,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","Desert Eagle | Code Red":"data:image/jpeg;base64,/9j/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCACPAQADASIAAhEBAxEB/8QAGwAAAgMBAQEAAAAAAAAAAAAAAAECAwQFBgf/xAA7EAACAgECBAIGCAUDBQAAAAABAgADEQQSBSExQRNRBiIyYXGRFCNSYoGhscEVQnLR4UOS8CQzU2OC/8QAGQEBAQEBAQEAAAAAAAAAAAAAAAECAwQF/8QAJBEBAQACAgICAgIDAAAAAAAAAAECEQMSITEEQRMiFCMyUYH/2gAMAwEAAhEDEQA/APmgjEQkhKgjEBGJQxHARwgjhHAI5bTpbb1LVhTjsWAJ+A7yBRgMleXnAjHCEAhHCAoRwgKEcICixJRQFDEcIEYpKKBEiKSIiMCMRkjImBExSRkZFRMIzFAlGIRiUMCOISUIBJCIRwLEpdwMAZIyBnmR8JZRpjY3rnw0X2mIkdPT9JvqqzjLYLfZXqT+ABljaoXWMq+wBlAeeBkAf890xldeI78XHLLll6idjvprV8EE1Y5BiMk94tQlDW70tFW4BmVs43d8HEzfSLMFDYWwTnnuEnqHo02nQ6lBuYbjg7WUEcv7xqnbju/DRRoPpGcamlcfaJ/XGJpPAdWU3VlLR/62DTDTeL6aWVSrsoU4nc4dalQBBBbvzmO1ejHgx3rTi26HVUttsosU+RQyB01+M+E3ynvdHezjLHr2mT0gZnTT6SgANex3BSB6q9f2l7ZJeHjnvbxJBBwQQffCd6zh+hYANo9bUftKwcSp+D6ANga96z5WVETo8dk34caE7lHoyLwSOJ6QZ9kFiCR59I7fRDiSKXrNVqjnlHBk7R0nByWb04UJddpbaThgD/Sc4lJ5dRiWWX055YZY3VgijhKyUUcIEYjHAwIyJElFAiZEiSIiMiokRSUUBiSiEcqGJIRCMQHHGnggk33CpAOu0sT7gBBbtCzYW9z8VxM3KR1w4ss/TXpQKtDqL2IG/wCpU/Hmx+WB+MxUadgpfcQGO4kdlE0cQ1CPpatNXSwrQciGzkk5JP8AztIVXq+VIZUbC816KJxytt3H0eLjwxkwy9s76W2z2r7Au3cVHLHkJBuGs15Y15XIyWbJJ7CdDxqGIJdebb2Gew6CT3mtSxPNBvPvY9Jnvk6T43FfKg12VANQ210Oxf6u5j02uuqtWhSCVDVpy6A9W+Pvkm5+qucoAo/qMo1KAOGq5Mv1a47+ZiW+ms+OT9o7Ol44+nsFtqP4G3YiofLufMmU8d1d/E10+t0YdvCDK1a83UZ9rA7Z5TPYni0+GOW3kJq9H+JUcKt3ahXZS247ObZH7d4xyTm+PueHFHHuIaVsGy2s9w2R+s0J6W6z/UZbB94T3o9JuBapQt9qKp7X1f4MhZwn0V4ipddNoLM96yFP5ETtM3zsuC4uJqPSL+JcNGkNKVlRyK/zAdpyOH8KXVvY9d19IHet8Gei1XojoTk6Wy6kfdbcB84aPhOt4erJVqKrVY5xZVz+YM56su69f5MMsZjJpxU4TxKknwOJvjydQc/GU6peMUD60aa9em4pjHynoLX1lZ+s0dZ99dhH5EfvKmvRky+nuUe9Qw/IzNvl3xxlx1uvLHVahV+s0BIHVlP+I112iBxdTqK//nM7t9uktUoHVfMOCvP8ZydRpcO2CHHYqQczcyefl4tefFFVvCbyANc1RP8A5F5D9Juq4IupGdLxTQ2nyNm0zjmpWG01gfhiWnQaLwwxUbvMS97HPH4+OTo6n0c4ppaWusoVql6ulikTE2i1S4zS3PnjvM66Z87aNReg9zGW208T02me4atnVVyQ+Dn5y96k+Njq27R2BD9arZH8oH7wuNJCtUrLnOQTn5TH9O1racam7T1vWM+sVI/SdTScUfXaC2izS11naGW5gMIozntymt15umOrdsMRkic84jNuSEI4oEoCEcIYjEQkoBjMgaKm6oPlLBCRUtPWufC57W6DPQzpaPTguqYBRRlj7hOdV/3Ux9ofrO66rpeG32nk9rlVH3QTOeWO8o93Fz9eLLfv6cDiVmVtdUUsxwvq9OfWV10qVXqG6nBxzk9/MnMg95C4AE1ljt5+PkmHubWKlykbbnGDkZ54MCbtOVcrXZt6dvxmD6XeGwuOZxNFusppBFxZ2xyCjpOVxsr34cuOWNs8L14mVf19MwB+ycwfUaVmLVq/iHsykTCnFK3I8SpgB3UDpNYtV6yyK4VgMZXGY6TZPlZXDfaWjxEbKhkzjoTI2tur2lQVPykWdsc6n2+RGczNRp2ZQwJTn0yZesn25TmyzuteWurUX0qDTfdQR02uRn850tL6TcRpyG1jWgD/AFAG/WcTc62YSyxj26H9ZFlsBy/q/wBSFYrWFmN9PT2eld+wm6imwea5Uyg+kNV/qPVdWMdVIb+04SMr0sjLk/ylWB/KIkopGNuexBEz5drljbueHbXW6Js/9WQW+2pGPxibREgW1tXap7Kwyf3nK0iVbgHcM3kDN9uoWlfWGcdsSXLV8N4cUyx3lWhNHa7eoHrXuDkYlo0i7sCzcV65UETNVqN1f1TMnfAMT63UVsCLN3mpAMzu12nHjjN6dSpV27DtDZx6oxKNbQr0FCcg8iD3lX8V8NgpqRyBgkDHOU3cUFhG6kqq8z62ZPtrePXVZXoLaQ6TcyVeQPSW6uwnQ0aFCEN/JjjGKxgf3P4SF2v09iGyvcSOQUrjMxNZbqrt1jZPw6DyE9GEvuvk/JvHP1xXsFDEJnaDyz5SMlImdXhRhHFCnHFGIRIRxCMQHCEIGnh9Zt11K7dwDgke4TbxzUB28Nf5ZPhVX0fSvq36tyXPl3nL1VhttZvfI19M4EovOO8vY7RmZLSGgPS1iy8FshV5kyrVadm1DV4zhuo5zRpUfwSag2D1A5ky9bmSxhS3rOo8Res533t68Z/X10xppDYMKPVBG4+QnRAwMDkJGnNRuAUkWAEfvJA55zpHks1dKdW2yoNjofLOJkDW3AVA5Hyz8Z0jWtqMHGRylVdQrsfAHLkJi/5ad5LOLv8A8Rr0taKNwDHzMn4KA5GVPuYiWQm9PPLYpbThm3Ft3uZQRIHTEH1QoHkpKzTFHWNzlzn2ymht3stjzYK0g9Q3AZAJ9zJ/ibopnpHSc+X3GOq3UVOFRy3uBV5Y99oOW2g/eQrLiiHmVB9+JE0ocYLDHkxmbxuk+Vda8sd2rZbFTYG5ZyhyJNNfWcrYu3PumgUqLA5JJHnJMiP7SA/ES/jmk/lZy7lYyF3+p7B5j3zRUm1cnqZNa0X2VAjM3I81u7sojGYpWUYQMIDgIQgSEcUcBy/R6Z9XqUpTueZ8hKJ2+HGjR6dwWB1LLkj7KyKfFtQtFIpr9hRgCeescliQCM9zNGu1DXXEk5Eynl+EKixYA5z+MznLMFHUnEssbPIYHwkaXRbgz/yjIkt1G8Me2Uh6k2hRWjEIOWB3k9BSV+t3FT2xLCquQxPI9JpVQqhQMATGHl6fk/rZZTZy3WtD54JXMYNfTZYnyaKE3r/Tzfkt9za2iyhbFFz4qLDfy54lbbN7FDlScg+cUImOrtrLl7YTCTQhCE04CEIQCKOKAQhCAoQhAUUZigIxGMxGBEwgYQCOGDHgwHHFgxgGBdo6/F1VaHoTzm7Xmqp7ra8BreROewmXQvVTa117lEVfax0mTWa6m6zFdysvn0kVWWyeciTjOZXuyMgj5xMxxCoWMCeUob55lh9Y4HUy81qiFtgbHTMxlXo4cLlupaRclTjpz+E2yrTJ9XuHeXYM1jPDnzZbyKEeDDBmnEoQ2mGDAIQ2mG0wCEMGG0wCEMGGDAUI8GGDAjCPBhgwIxR7TDaYETEZLaYipgQhHtMNphV4SPZJQhC2R7I8x5gSF1tWkuppUHxgAST2E5x0VIUeMVUnseRM6GZVdR4xyX7YwwBExcdvRhz3Gas3HHspRbCKmYDscyS13Mvqsr46joZsbQ8/ZQj7jFfy6SHh2U52syj76Z/MSayizLiyvmaLT6O42eI6FVXrnE6H0C7wS5QmsYBbyzKa7Lvoobaj4OMo4J+RnQq4wV0NmlfS3YbbufwycY+HKc8plb5j2cWfFhjrGqErCoFHQCS2wVgFAzmPcJ3fLvstkWyS3Q3SoWyGyPdDMBbIbI8wyYC2RbJLJizAWyGySzCBHZDZJwgV7IbJOECvZDZLIoFZSLZLTFAqKe6GyWGKBWMx848R4kVHBhiTAjAgVGvd1J+cgdMp65+c07Y8QMf0OvyPzMPoNX3v9xmzEe0SjD/DqCc7X/3mTXRVL0VvxYzZtj2iEZwmBgCMZHaX7RHtECjn5R5PlLtohtECnJ8o8n3y3YI9ggU5+MN3xl2wQ2CBVuhulmwQ2iBXuhuEntENogR3iG4SW0RbRAjuEe6PaItsBboZhiGIBuizDEUAJihiEiv/2Q==","AK-47 | Redline":"data:image/jpeg;base64,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","M4A1-S | Chantico's Fire":"data:image/jpeg;base64,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","AWP | Wildfire":"data:image/jpeg;base64,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","AK-47 | Bloodsport":"data:image/jpeg;base64,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","Desert Eagle | Blaze":"data:image/jpeg;base64,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","AWP | Oni Taiji":"data:image/jpeg;base64,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","AK-47 | Fire Serpent":"data:image/jpeg;base64,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","M4A4 | Howl":"data:image/jpeg;base64,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","★ Karambit | Crimson Web":"data:image/jpeg;base64,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","★ Butterfly Knife | Crimson Web":"data:image/jpeg;base64,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","Glock-18 | Water Elemental":"data:image/jpeg;base64,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","USP-S | Cortex":"data:image/jpeg;base64,/9j/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCACPAQADASIAAhEBAxEB/8QAHAAAAgIDAQEAAAAAAAAAAAAAAAECAwQFBgcI/8QAQhAAAQQBAgQCBwUEBgsAAAAAAQACAxEEBRITITFRIkEGFDJhcYGRFVKhwdEjcpKxFjNCYtLhBzRDREVzgoOTwvH/xAAaAQEBAAMBAQAAAAAAAAAAAAAAAQIDBAUG/8QAIhEBAAICAQQDAQEAAAAAAAAAAAECAxEhBBITMSJBUWGh/9oADAMBAAIRAxEAPwDzhNCFUCEIQCEIQCEIQCEIQCEIQJCaECQhCBITSQCSaSASTQgRSTSQJIppIEkVJJBFJMoRUUwhHmoMtCE1UJCE0BRPQEo2nsVssLNhihfjTtLY2xtk3NNHc6/ypHrenX/XS/xIrW0rMfGly52wwM3vd0F0tg3I0wnnkyhXTO03xSYupHH3RbS4sG49b5/IIjJj9HNRh08StxYnOFueQ5rzXKgFjf0e1XOJfDhi2cnAUz8OS6T0O1aSbQwXkTOa8t3nzpb0Z7vOMfUroriiY287J1c0tNeHnbvRPXR/w95+Dm/qoO9GNcb10yf6D9V6WM8V/Uj+JSGc09YyPgVfDDCOut/P9eXO0DWG9dNyf/Haqfo+pxt3P07Ka26swuq/ovWW5rXENbE8uJoAHqq87VInSR4oa4tgsvc0ggvPl8lPDzp1dPmtmtqIeSuwctvtYk4+MZ/RVuhlYLfE9oHdpC9WGbj/AHX/AMITOZivBa4OIIogt5fzV8D0vD/XkiLHdd7kaDpEfiD5Q0nzHRVxaBpMoJEzwO5af0WvxX/Gm0TX24UkDqQPmlYPmPqvU9A0rRNPzuJLNC+NzS10c0Qc1x8jzHKl2B0HRZmhx0rCcCLB4Def4LC1Zr7YxMS+fEUvfn+ifo6/29DwT/2gtDq3oVo2MTPHpuO3HJ58q2H9FKxudLEbeP0ptx5ni2wvcLqw09V6UfRjQg6xhsBFHk8/LzVOV6Nw7QcNmzmdzXSED81snFbW2XbLzZwLSQ4EEciD5JL0DF9EsLJlm9dx3brG17Jj4u/KuS4/W9LfpOqz4nicxh3McR1aehWE0mI3LDbXJKSRWIiUlJJBFATQistJNCISaE0Ec48bDiZDGeNybI66BaCSP5rXeq5X3fxC2aEGr9XyvuH6qxunZ08bnRsDtjbI3c1sFlYD3icsYfbaQeXu5IN76CkQab6rkkxF8pLXVY+BXX8CHp65GvKHiduTPLBlSRvjlppY410HktvpvpPqz5osWZjZHSPDBJYA5nqbXTjyxrUvM6jpbTM3rG9vQ24zPLLh+qfqzT0yoT/1LS8HVx1fiH3cZqsj+14w54ZhukHsbp2bQe57/BbZvH65K9PaZ1r/AFvDjPgBiZPGydwt8l8oWd/3j5LHdgceINx2RMfHyDQ+y9vc/wB5aSc60xjmiPHka5257uOwukd3PP6DyWtZrGZBLuYyLdG7kWvaRf1SvPO+X0PS4seKnxnl0n2dkeRiPweEvs/K+635OC0U+sTSSmSHFaGuAJb4fCfMDn0VEuraqD+xwYHt/vThp+iz7tRt1d8a9uik07KkYWmKwfeFU3Ts1jQ31d3LtS58azq1E5OmGJo6Fkm8H6Hkofb8oZv9XkLe43dO6d0fcuTNbulvp8HMDLdA4DuaV8Gdk4GQyZkh2irBPL/4ubj9JI7/AGkTxXlTj+Sv/pLilp3sO2udtd+id1Z9zC4sVbVnul6ji5keZjNniPhd5dj5hU6vi/aGj5eGSf20Lmj41Y/GlwGhem2HgZZhe4+rvoEm+XY9F2GJ6V6VmTiHFyWzy0SGRncaHnS4clYrbj0wjfqXkbZJQ3a577NscC4+XT6I9cyT42zyAj9p7Z9roT8Vsdd0rMj13M9XwMp2OZi+MtgcRR59a99fJaqQPxiGyY+Qw2eT4iCWlYKyWahlR8m5MrWjw8nn2XJ5uoZGVgxOmne90DuGST1Hlffz691Q3CzJGtIxp6f4RcZFn3ILXVkQSRSscWk0Y3CnDnz5e6kga1IppFEJIppFBFCaPNBloQhUCEIpAITpFIErIJOFM1/ZQpOkEZHxRNLGNklLnOe54bXM/kqDIyQAPjyGbTbXMHO/qslJRVImrpkaiD8T/iUvW3t/37Uvqf8AErEUiIHUJiCw5+pbfj/mqg/HHXLy2/GP/NZCCARR5oLMXAjzhcOrVXUSNoj8FtMDSGQNlbPl42UX1ssDwrnDixnIp7fAeivGPDH4Wxtoe5bK3iPol1HCijhycaOSNnEitu08rILT+S0OPlSCOWB04ha+g9jrBBAr5hY3Bj+436LHy8YOi3MFEdlcl4vrhYnjUtlx9opsj319xrj+Somy8tmSJWNndEPaa6I0fqsXGhbwQbNnzDiq3yZGNPQmfR6EOK1xELGm5bqwnG2HQZnE9S2+Z79F0XoNjZx9K8bLfg+rQtY9rgXixY8/OyVr9CyJsiKnv3OHm7mt6GusESNDx7Lg2j9bXRGCJj23+DddxLofTrI1mPSIvsSWWObigvMbqJbR/Ol5nnZnpCGtZm6W7iuJJyJGF7pPj1Xf4uv5mNTNSa3Jh8ntFPH5Fb4wYmr6eHQPFXbHVzaexC1Tj7Z+Xpy5O+sTqOXisePlOJdJBLbj0ETj+S9D0TJmxtAjxMl8rbBFGQ01p8qVetZH2PG8zMp7eg7riMzWc3McS6Utb91vJbu3Hj5nl53kz9RHbEaYWTDwMmWG74by0H4FVKbiSSSbJ6lRpcr0o9colKlKkkEUJ0hBlUik0IEmhCoEJoUCQmhAkJoQJCaECQmhUUzN5B19FZYc0OA5FD27mkdwq4HUNk+5lf2tthRVinCYxM0yc2jy7+5NjYHn/WmN/eaQgPgYDGckO58ntjRFLW7RVV7lP1eKSN8khotHh95VmzHoH1oOHZsbr+ipmnZG8COGWSIjxE0D8gis/wBHMr9oGkgEGiuxj2N5hed6fMPXuJG1zYzypxuiu5w5w+BjiLIXbjtuvLvwzurONEAgWrcDIm07LbNA4lr3Br4b5PBNfI9lg8clx7LN05wdmMdViMGT6Dl+JCztzWdteXXbNpYX+k6S3adt5se17tw8+YXBL0X00gbl6M6MNuTBfvjI7VTx+a86XDasxPLz8d63jcEkpJLFsKlEqSEEKRXNSRSDJQnSKVCQnSKUCQpUhUJJSpCCKFKkUgihSRSCKFKkUgihSpFIInmlSlSKQRRSlSSCwxtcGSsFO8yAt7puQBj+I8+i02P4muj+auxZjDOGeR5rrx8w66X1Xbe8W+n81u9BbTJch3LxBvxDfEfx2hc214rcTVLpYg7D0tkTh4i0NPxPjd/6hZ2/HN1uTsxa/UpS2aN4eL3XuHe+q85zcY4ebLjn/ZuIHvHl+C9Ba4GiuW9KoKyosho5PGxx946fh/JYZq/Hbx+iyav2z9ufpFKVJUuN6yNJEKVIpBCkUpUikGVSVKzaUbVRXSKVm09kbSgrpOlPaeyNp7IIUilPaUbSghSKU9pRtKCFIpT2lG09kEKRSnsKNhQQpFKew9kbCgrpFKzYUbCgrpFKzYUuGUCiO2QE9PNX8GV+Q0RsAF9XGgPiVTwytqzJmjhY9myyOpbZ/ELdimfUML5/FVusDSMd0TZsiYSVVi9kY+fV3yC2GVOZS1rXb2iyXdNzibJr6LS4k0uQ0ySPLnEdXFZge+qod+q6or9y8fP1F8vEsjaKux9VrdfiM+mPoc46ePl1/ArMbKSKbtruDaUzRNA6LruBH15K2jcTDRjtNLxP44akqVxic0kEcxyKOGV5z6JTSVK7hlLhlBTtQBzV3DKBGVBs+AEcAK60WqKeCEuCOyuvklaIq4QS4QVqLRVXCCOEFZaVoIcMI4YU7StBHhjsjhhS3I3II8MdkcMdk9yN3uQLhjsjhjsnv9yN/uKBcMdk+EEb/cnvQLhBHCCe8I4oQLhBZEeTiRY5ZM5wczrUbiB8wFRxmjufcBZKpLYHwTmeOQTv9htUsq2mvMNeTHGSNSz8PVcMNcAZCGnq2Nx/JWTahhZcewTSNYPaBY5t/guXnh9Wj2CUOc72g03t9xVDIpZDTWud8As/PZzz0WPe4mXSNnxMCZs0Ezg0mnsbzDgs6DWsPKl9VxnSxySNIa5zOi5aLS8mTqGs/ecthhaUYJRLJIHFvQNFKxmsW6OkxxPLMyYAMmQActxpVcEdll7EbAtM+3XXiIiWHwR2RwFmbBaNiKwuB7k+B7lmbEbEC2hG0ItLmgNoRtCLQgNgRsHZHNHNAbR2Rtb2S5oQPa3sjY3slRRSB7W9ktreydIpAUzsim9kqT2oDw9kvD2T2opAvD2S8P3VPajaghQ+6FEsB/shXbUbUGNJiRzN2vaa9xpYztDxXmy+YH/mErZhqe1BqxoOJ1LpiffIVMaJidpD8ZCtmAikGAzR8VpsMP8AEVkx4scfs2Pmr6RSCIZXmns96lSEEdqW0qykUghtKA0qdJ0oP//Z","MP9 | Hypnotic":"data:image/jpeg;base64,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","SCAR-20 | Cyrex":"data:image/jpeg;base64,/9j/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCACPAQADASIAAhEBAxEB/8QAGwABAAIDAQEAAAAAAAAAAAAAAAECAwQFBgf/xAA+EAABBAEDAgQEAgYIBwEAAAABAAIDEQQFEiExQQYTUXEUImGRQoEVIzJSobEHFkNUcsHR4SREYmSCg/CS/8QAGQEBAAMBAQAAAAAAAAAAAAAAAAECAwQF/8QAIxEBAAMBAAIBBAMBAAAAAAAAAAECEQMSIQQiMUFRE2Gh8P/aAAwDAQACEQMRAD8A+bIiICIiAiIgIiICIiAiIgIiICIiCFKIghSiICIiAiIgIiICIiAiIgKQoUhBCIiAiIgIiICIiAiIgIiICIiAirLK2CMyPG6uA26sruaLgtz44YpcDGdkSxGdrRNI1xYDXPNX39kHFReuf4RdI9rBps8Id1fHkh9fkRz91ysjw69riMbKjlP7koMTv48fxQcZFszadmY9edAY7NDcRyfpzysM8UsWK9+1wc1wA46oKItt+JLJhwSxQvkGzc9zGE7felqljmkAtcCeljqghFdsMj3FrWPc8C9oYTx68KHMez9tjm+4pBVERAREQEREBSFCkICIiAiIghFKIIRFKCEQvEYLjGX12BpbMrcXyopW3EHn9ku5590Gsi6LNEz5o2yw4cz43t3NcHA36H2T9Baj/ccgD12g+6nJV8q/tzkW87R81nXGyL9PK/3VDpuUDXw8494iFCdhy89jn49tF7XWfZWwcrKxXDMjleHbTE0g8gdx7Ut92HOzkxvB442O/wBFgfjF/L2OFDuCES2ovFessc0DKl4Pcqv9ZM5jnEyA2b5C1fh2tuh0B/F6K4iAugzi+hHZBbL8TZE+BLhux4CZej/L+dvseyZetY7sJ8LcOJz3xhm9zac36g+tqpMcT2GT8LvossmNDmBs8IGxxIHmNo1+SC+kavI7FOPvERaQTRrdXS/ZZdN1fFxcqaSR25glIYOvykc17m1h/RUDmbWzMLj22GvuqP0/F+FdE2SMywgF4DSD90G9o2r4sGfm+TjynFcd7QHkOYPqQuufE2h7y3/jdt95S4fYryEWGAdjXOG7jk0qyYjInR7pgfMNNIII60g6WpTYORkeZg+YW2QS/qf/AL/Jaayz4bcOR8ccrZWNdQfVF31pY0EIilBCKUQQpCIEBXMUjQ0ljgHCwa6qiiLUZcPHONsY8h+7zTGHuH0F9kFwx7jQY4n0AQxyNFuY4D1IVWa5PHM1whgkYDyx+M3n8ws0XiAtyS9unxAOMnAB6Orj8iDXuUGFLHqFvjxBAOuis/8A05XHiPEHXRL/APY5BzbHqEseq6P9YsOqOiu9/NP+ik+IdPd10N35Sf7INATRBj90Dw5rfkcz5tx+ovi1XK1PFdhBr8GRkwAG4mmu5vkLoY3iPSoM3zHaTL5YZwz4gtIffUED07LS8R67hasIxi4UkLmfifMX39wg914Y0mDL0zA1GIyuIhDQN1AUSCKXfmwJ5YHxMM0W9tB8bqc36hfJvD+pHFhc1+cYdrmloc419aHZZ3+IMweZs1GUE+YR+sPd4I/gtY6ZGY47fGmZ3XvHeGNSHLNc1NpB7uDv5rYy9I1XIn342p5GK2gNjY2uF+vK8DF4hzhkDdqjquStzyR1FcL0bNQ8THHZLDk4Zie0Fm+7I+vKtW2+sRPG2xETsuk3TtYZjTRP1B80peDHK+BvygdRXe1pjS9bjyTPlZbMiAXujGMNx44qlWTUtbOHG/zYRk/2o3nYBz0/gtvQ5/ETstk2cyLyZGWyRsh3NvoA36q0+ns0515RGVyZYtH8O+IM7Lzv0nisxYgy8dr427XO/CCRzXqur+gdaAo6foMlf9uQu5lZuTgRPnp80LWkuYOXNodR6j1HZeDxf6TtQlieZ6jkLjtAaA1o7fhN+9rmmdckzMzstrVfCuTM5pn0PSCSP7Evb/IrW/q1K5oa7w5pxaP3ch4P81uYPjPP1POZHHtmF04t6NHr0Xdl1HM8l5jc0vDTt3ihf1W1K7Dg69JrfP3/AN+3nZPCDHY5czwhG8lvHk6gQSfpavjeCdNxWOY+CVzj+1ulIPsvZ6XqUrtLbkZBY0Cy49hXVcGfxVJqjZ8jStjmwWNskXMlE37dDSrWMtMY37xaKxs5LlnwvpzpXxtjlaxg5qY3uPNf/eq5k/gzBkLA85LGs6N3Aj+K+k4hZ8CzcGyGRoe5+2rJF2PRcnUtQfg21+MyU2NoHceqvWaW/C/G1udstHlv+Pm+XjwYetDTxG+aAxh5ElWw89HdaXoMTwnoeqabFmw5c2LvsOYXhwa4GiOR6rBr+o4+bJhk4m17JyGvDasEEHn3CnD0/K8pwlinfiyPMjDCN1XW5pA+ou/qqTEeWQ0+TEUtsTkLz/0dS/8ALak130kir+RK52V4G1jFAd+okaejmyVf3C9azNI2sbBl30A8l1rpwRz5OBKwvlErhbWvYQGHt16n1VrVrDm+N1te31R6fIsvDyMGYw5MRjeOx7+ywgX0F+y+lxmLJcRmY0U4YKAewGitLM0OJml5eRjzyRGBhka1rGDnrVgXSi3OY9w6Ot6c+s89eBUhbeoTNyJWyiJsZc3nb3WoOqySIiICIiAiIgIiICpLFDM1vmMG9oprt1cfVXWtkSMZKAXyOc5vytDtoafrfVBVuHM9m9r2bbq2q50/IbEXukaGgWSeyywZE02dDGZrxnuZ5gjOwxguo/n917U+C8MMkDdUzXShp/VveCPpYU6jxh4AREG25DQRz0PZWcyZxt2ZZ+pK7UumNj+ODcgOdhOa19toOJ9OVoJspj19moA8URkj17rajzcuN27448f9RU2UsqNlOy226hqJbX6RcL7F7lqS5Wbi45bDlAtB4a0mxfoidkQ7vhtsWUxomzZBI6Oy1uSWuLrN/L7LsZWEwSeUzIy+P2z8Q77LRw9HgZnaVkRsA3OjLh2JK6+ZBWrTYLRTWyEur8LOo+9gLo53ifUq8eXOnSevSfURuONM7VIYJg1ua7BYN0bm5dcDq6j9ei2PD2jTDTvMlfl4pkeXNAlpxB7mvdbOs6T8Zi5Bhln3vYGthZJtbxxS1dLk07SXvOVm+TKBs2TyNtvrwCVOZZw9O38tbW/M/wBPSSTYOk6XhuzdXzYBIwBrWyk9BzxXZcEnI1Fnmy6rluaCS0ecCGi+O3os73aLrLoJNS1XFHw7n+SyGblzDz831tcjMy8LCwCzB8sl7zTR2+p9VnzyJmZetwvFK+doaGqZD8TWsOI5sk2OPnPmPBAPI6het8Jsw5NCfmZTI5fn2M3USSBVC188yY3ZU3myyOLqoUAKC2Ys3LghZDHkPbHGKY3igqzMTbWXW9r7MQ+jsx8QZQyXQQ7uha0cV6LtHG0yPFOR5Mflhu6wvkX6Tzv70/8Agrz6zqWREIn5j/LH4RQCm81nMYcKXrP1z6e6hnijbO+JrGusyBg6WvNO8S5EzsjG3SnzQ9jmCttcrQ0POlj1drMmbfG4cB3de61HAdj+G8mXEghEskZvc2trK5r6q95iY06WrfvPhX7vm034P8IWMK8gIcAfQKoWDZCIiAiIgIiICIiAqviZK2nNaQOTu9O/PZWWrlT/ACPjZ/hsdz3+3+aDVLXTzl8bfLZfG0dF9E0nxi2LChl1XFf5jgWtyIgHCTb1sdQeR9F4uCPyoWs9Bz7rcL2S6UzEJ+cZDnD/AAlov+SDE95eXPN3M8zG+vJ4v8v5qilztzi4cDt7dlCAiIgIKsWLHcIiD0UfjaSCfHDdMaY4XNIAeOQOw4XWf450PLznzSYU2KZWN3vcz8Q46i+KXg6/XNs8WFtcfMAOpKmJydhS9IvXxl9M09+i6mGuxtWis/gDg4/bqvnutYJfrWbDYIZO4hx6O57fdaTooybcwbh0PooMjz1e4/8AkVa15t91OfGvOdhHwTsIxRueHtcZC1zTwegW5kwRtgY6JwPFkXyuVmsc+pXZG3bwGucefZZ8KfdGOenCpLWIxKKz27XEduyqiREUoN3BlLfLl6uhd3Hb7L6XPljK8K5MnU/DuB+y+UxvLCfRwo8LqYviyTE0XL06VpcZWFsdN6X3Uq/lyn9R7KB1UNk8xocAR7qQoWQiWotBKKLS0EootLQSiiwloJ9lpsYJMlrWgbIh27lbEkgZG53oFixWBke4/tO6oNlZMSNmR8SYtzpYYi9/TaG2Afz5WDctzRr+PkjZEX+fjyxkN4u2kj+SDWRU3ccpuQXRU3pvQXRU3JvQVPM4F9wtgOq+e5WsWudIHNI6j8VLNvla4OcWyEdPmaf9EF7u1RA5xaTTT7O6fkqbigTR+bE5nqOFp4MmyTYe63LckhbI4H4aGMgVcYIJ+pQZ3fMwHuFjVAS3panc70QXRVs+im/oglQiIJQKFKDHai02lNhQLUWp2FNhQRaWrbE2IKpZVtqbfqUGHJkqVuK4Nka1247COT791lI5O0UOw9FEUXlS+ZG97XXfBWTp3KDHtK2tNldjanjTbi0NkbZDq4PCwbh6rDkZLYQ02b7EBBsZOLLj5MkMzdr2OIIu1i2FbWXqLNTynZTY3Rl9bg6uTVEhYrQYthUbHeiy7k3IMW13oga790rLvUbkFKPp/FTQ7paWgfL6lTQ/eKi0QTYHcpvUUpQSHJu+qikpBO5RuKUppBG4qOVakpBHKkFTSAILIoRBKKqIJtLUcpSBaWlJtQLSylJSAeVG1voPsppTSCtD0CfkrUlIKpStSUgpSUr0lIKbVNK1JSCtJSvtSkFKU0rUlIK0lK1JSCtKaU0lIISlNJSCFISlICD/2Q==","AK-47 | Vulcan":"data:image/jpeg;base64,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","M4A4 | Desolate Space":"data:image/jpeg;base64,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","AWP | Lightning Strike":"data:image/jpeg;base64,/9j/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCACPAQADASIAAhEBAxEB/8QAGwAAAgMBAQEAAAAAAAAAAAAAAAECAwUEBgf/xABBEAACAgIBAgQDBQUEBwkAAAABAgADBBESBSETMUFRBmFxFCIygZFCUpKhsTPR4fAVFkVTYnLBIzRDRFRzgoOT/8QAGAEBAQEBAQAAAAAAAAAAAAAAAAECAwT/xAAeEQEAAwACAwEBAAAAAAAAAAAAAQIRAzESIVETYf/aAAwDAQACEQMRAD8A+cQhHNMiOAjgEIRwHHFHAI9QjgGoQjgENQhAeoo4QFHCEBahHFAUI4QFFHCBGKSigRMRkojAjFJRQIwjhAIQjgEcIxANRwhAcYijgMQ1HCARwhANQ1HCAoRwgEIQ15/KAtQjhAUNQMBAUUZhAjFJRQFEYzFAiYpIxQIwjMIBCEcAjhHAI4hHAcYhHAIRwhQIQhCOXMzfs1iVoql39WPYCanT/s2bjraa2Xe96s13HY+YmF1THse5LUUsOOjr0lFWS+P91CdfKFesbDxADrxQfT76n/pOazEKq7I4JUb4N2Y/T0MwT1K4DuxgM/IRRYA+v3tdoGsBVamktB2O4KkaPtK8HFHFiXUbfS/eP6TMpzcjHRruPZm58t+8pHUMjxS/iHTNtgDrcmj0bYzhmUsnNTory7y+vpdrf2t1NPyZuR/QbmC2avOtqduQdlQP6zqp+JbkQJpRrt5S6Nv/AEXjaAGRex9SKO38zOe3p9aKTXklmH7LVkb/ADnGPia4jRIlTdXZmLE+Z3AsigrmwBz+13jhETEZKKAojHEYCMjJRQImEcBAIQjVq1YeKxVN9yo2YABHNROjpZWLUyGKN+E+F5j9ZS3TXViNXHR9KT/fCuKOd1WFj2vYnitQ9WgwyCEJ33BHy1L16VjHt9up/j/wgZYjmr/ovCH+0af4j/dAdOwR559Wv+Y/3QMuE1h07p5/2hX/ABH+6c2Vh4yAfZcoXt6oFO/6QOKOT8C7/c2fwGMYuQT2otP0rMqK4BQe2h/KXjCy/wD0t/8A+Tf3SOX0XqV2Or14VzjfkF7/AKRkqhdj21UC045cN+EAA7mfe4ygKVQ7VgWUEEj8ptJh9TWtfteTZiIoACWciT9AJynldeLU1Zdi2cLfDHBnrYdj277/AFiayrOxyVQFqH5DzXjofzj+1VuCBQo7efJZ7qz4Tx8vFNmHnZK3AbUWvyG/Y+0xr+kdVxGZbqFAPqtXIH8wsvhYx5fGrVLTWgLnz2o2fz1OyzGoyCfExnQ63y46m/R8M9UzspMmvhQFUqXNfhgj9BubOV0DpeJUA+TlNaACzm0AD561/KWOO0zmGPnx6ZTvYyQB89Tqx+gX2BbUquur9ClZIP5z0T4rX/8AcsbJvQHXibUD+kkvSMsj+zy1P7oAmvytAyvsOWP/AClw/wDrMicPJHnjWj6oZp2dPyKRvI6ZnunlzqtH9NSVOHi3HX2TP/5WvVT/AEj8rJjHOPePOmwf/EyJptH/AIb/AMJmr1Gnp/TVrORgdRUWb1wuVt68/SYNwyxc4qcGvkeBY99em5i1Zr2Y6DW480b9JDifY/pOfWcRoun6yJTM/fT9ZkdOj7Q4trejqcvhZf76/rEUzAezqd+u4HSQR5giKQQXcybHDA+0sgISjI3tdfzl8oyexWJIei6D1d6OmrRxB8N20T5+867fiXJotIRU7nl3E8306zSOP+L/AKSeRZtgd+kiuzL69kWdVOU9GPaTQFZXTY7E9+3r3m38PfEt+X1GvBysHB8J62KlatNsenfznl8WtL8kNYbdLWdmo9x3Hn8pq4Rwacyu5WtRkBC8tce/vO1K2nPiw9B1jAXHH2nBwKCo7vWEOx8x3mNT12xdh8HHXv8A7vvPS4fUBxC3Hfs4leb0DA6kxtXdVh7l6vI/UT0Zk+yYZKfEDfseCny4RH4myfFKBUVAOzrWO59pd/qYQ3bP7f8Atd/6y0fD3T8Ig5Nz3a9GOh+gmtiejJcuPm9T6lYVxEQ6/FY6jS/UzQHVaejjRsXJyv2rOAGvp7TM6p1VvANGABTQvbko1v6Tzb0Gwk2WuSfnMXtFe06eqyPifqdqs1dg+Q0DKE6z1NlBbKCMR3AK9p4/NxjQFdXZgTohj5TsxKl8IOynXvMRyRMj0TdSy0BewLZ8yN7mCclKkvz+LVZDW/iTy4ntoyrItyvtK01XAVtsnQ8hObNtycdRX4osqcdwyiL8lZ9D1vT+uGqpLca9slQgNp46NZPpv1m5i/FFLKA7qD7Ntf8ACeS6JkWYuCtlNSrW/wCNNdiZbndU6RRai2Y1qs/4jX5J9Z0iYiseS69PmfElXD7tyg+yfeJmQtzdSJyMvdOIh+6p87DOP7X0Ktga7jk2a2FBJnPldTsym2V4gdlHoPylm9a9Sky0rut2oQmMwx6x2B9f8Jx257Wd7Oovvezq0zMJ5HZ7n5w3OM838TWpX1+3GP3Mp3Hs22EnkdT6XnVG3LazHsXzsVGP+fzmROHqTjweHJgSOXZtDsfUeszPNPxddtzdKyHULnu4Rt7Wptn6wfXIlN8CfukjWxMdcbJRRdSpDN3HEdxNKnIN9QFj/wDbJsOn7vz+hnObzZFhkTJGKZRGKSMUCMPWOL1gEoyh2UzolGT+FfrEqeG3Hl8yIZLnakSFB4hvrI3sDx95lWj0C9K+ot4jcQ1ZHl9JtXdOqt+/QQpPft+EzzfSwPthDMqkIfxNr2ne2RXVarDMFfA70p857OK2VHarZuD5Bgv6rOujrhQ/eQqfdGmevxFSvZrEf6A7kj17Abu2O7H5V7nbzr9Go3xC5Gl8Zj7cpWxyczb5B8Gn1X1P1ma3xLj0f2eHYoPqVAkqOop1M7NwUD9jyiL1no089+dY8NeNStoD3nDPUdPxqclbKrkBrI4yOX8NYeLUty5DupfiVcga/Mec8/NWd1MebuxDZgm0jsXCr8zLb0WjHSvXcDZmhkV0UhW8QPw/Co8hMy+3xGLN6zzK5EC22Kyt4bLsHmCNiW2LiFGF9bXMAeJRtAdvpGIMOSke41NIyMe696mRrrCikaQMdS0lS4DHQE6KMBKGY8uQI8vKX+Em98Rv31J7Nc1CFco6XQAI3qdkQAHpJShQhCEBmTefteeKx+Eto/Qf5M1SdDZ9Jw4CI91uQg0pPFR7CRXdrQ7ThzA2PkV5dY3r7rj3E7pC2tbamrbyYagPasquh5Iw2p9xEZRhJYlDK3Hir6A5dwfXt7TogRMDGYoQjF6xwgKU5QJRdHXfzl0qyf7LY9DEq51JVSfnOe88mHf0lyi2xdIm/mfKBwbHO2dR/ORXV0T7EHtOWu+w49tzVa7pyvqmgOPc9piVYr1E8bR3/wCGOyu5dFbCw9QAAZ3peta+0ad7VM6tXUtfbuB6yuUoVWtQHZj68hrUfiTnM7Oix0WxCjjYPpM8Y1+Jd4lI5r7Tr8SLxZInBqdN+ImxVCsjlR+wynY+hk+o/FSZSjHNTVLyB23nMjxTIs4YaIBHzm55JmMNd63pkLtXB/ORKKi6Xeh7nczvDq3sJxPup1JqxXyZjv3O5ywdmxDkJzc2MY5GVF/IQ5CVBGMkKj7yiZcRcxF4Xzj8IQDmIuYj8JY/DX2gcubkGrHIA2W+7r5SeNX4WOiga7bMuapGHdQfqIcdDQkUd4d4a+cX5iEVa4ZaffVEu+6xPv6GXOpVip8wdSjIra2oqApO9jZ1LFe9kHjlSwGvuj/O4U4obi3CHDUjuG+8CHMRcxKQrH0khW3tCp+IIeJIippIUn3gLnFzlgqA8zJhUECjlDZnR9wekNp7CEc/f2j037pnRtY+Qgc4V/3TLFrPqsnzi5mBIVLruIcEEjyMJRMBBJAr8pVr5x6gW8hDkJTqPRkFnMRc5DUeoEi5keZhqGoByMXIyWotQFsw2Y9RagG4txxQFCEDAUcUICjgIQDRiIPvJQ1AhxPvDRlmocYFejDUs4w4wIRyXGPjAhHqT4w4wI6j1Jaj1AhqPUlqPUCOo9R6hqAtQ1HqGoChHqGoCij1AiBGEeotQFCOLUBGKOGoCijhA//Z","AK-47 | Frontside Misty":"data:image/jpeg;base64,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","M4A1-S | Cyrex":"data:image/jpeg;base64,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"};
/* ---------- real CS2 item images from the open skins database (ByMykel/CSGO-API) ---------- */
const SKIN_API='https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/';
const SKIN_FILES=['skins.json','agents.json']; /* skins.json: weapons, knives, gloves; agents.json: agents */
const REMOTE_IMG={};
/* names on the site that are spelled differently in the database */
const ALIAS={'★ Karambit | Night Stripe':'★ Karambit | Night','★ Bowie Knife | Night Stripe':'★ Bowie Knife | Night'};
const normName=s=>String(s||'').replace(/[★™]/g,'').replace(/StatTrak/gi,'').replace(/\s+/g,' ').trim().toLowerCase();
const BAD_IMG=new Set(),ITEM_BY_NAME={};
function remoteImg(name){const u=REMOTE_IMG[normName(ALIAS[name]||name)];return u&&!BAD_IMG.has(u)?u:null}
/* a picture that did not load is swapped back to the site's own picture */
window.__clImgFail=function(img){
  BAD_IMG.add(img.getAttribute('src'));
  const box=img.closest('.art');if(!box)return;
  const it=ITEM_BY_NAME[box.dataset.name];
  if(it){const t=document.createElement('div');t.innerHTML=drawnArt(box.closest('.sc')?{...it,scene:1}:it);box.replaceWith(t.firstElementChild)}else img.remove();
};
/* walks every item picture on the page and puts the real image into it (adds <img> where there is none) */
function applySkinImages(root){
  (root||document).querySelectorAll('.art[data-name]').forEach(box=>{
    const src=remoteImg(box.dataset.name);if(!src)return;
    let img=box.querySelector('img');
    if(img&&img.getAttribute('src')===src)return;
    if(!img){box.innerHTML='';img=document.createElement('img');img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';img.alt=box.dataset.name;box.appendChild(img)}
    img.onerror=()=>window.__clImgFail(img);box.classList.add('photo');img.src=src;
  });
}
async function loadSkinImages(){
  const lists=await Promise.all(SKIN_FILES.map(f=>fetch(SKIN_API+f).then(r=>r.ok?r.json():[]).catch(()=>[])));
  let n=0;
  lists.flat().forEach(x=>{if(x&&x.name&&x.image){const k=normName(x.name);if(!REMOTE_IMG[k]){REMOTE_IMG[k]=x.image;n++}}});
  if(!n){console.info('CaseLab: база скинов недоступна (нет интернета или файл открыт в окне просмотра) — показаны картинки сайта');return}
  ART_CACHE.clear&&ART_CACHE.clear();
  applySkinImages();
  /* new cards (reel, drops, inventory) get the image automatically through art(); this catches anything drawn in between */
  new MutationObserver(m=>m.forEach(r=>r.addedNodes.forEach(nd=>{if(nd.nodeType===1)applySkinImages(nd.matches&&nd.matches('.art[data-name]')?nd.parentNode:nd)}))).observe(document.body,{childList:true,subtree:true});
}
function art(it){
  ITEM_BY_NAME[it.name]=it;
  const real=remoteImg(it.name);
  if(real)return `<div class="art photo" data-name="${it.name.replace(/"/g,'&quot;')}" style="--rc:${RAR[it.rar].color}"><img src="${real}" alt="${it.name.replace(/"/g,'&quot;')}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="__clImgFail(this)"></div>`;
  return drawnArt(it);
}
function drawnArt(it){
  if(IMG[it.name]&&!it.scene)return `<div class="art photo" data-name="${it.name.replace(/"/g,'&quot;')}" style="--rc:${RAR[it.rar].color}"><img src="${IMG[it.name]}" alt="" loading="lazy" decoding="async"></div>`;
  const key=it.name+'|'+(it.float>.45?2:it.float>.38?1:0);
  let t=ART_CACHE.get(key);
  if(!t){t=buildArt(it);ART_CACHE.set(key,t)}
  const R=RAR[it.rar];
  return `<div class="art" data-name="${it.name.replace(/"/g,'&quot;')}" style="--rc:${R.color}">${t.split('§').join('a'+(++ART_N)+'_')}</div>`;
}

const DESIGN={"rushb": {"a": "#ff5a36", "b": "#2a0f08", "p": "stripes", "e": "🏃", "t": "RUSH B"}, "eco": {"a": "#c9b458", "b": "#2b2508", "p": "money", "e": "🪙", "t": "ECO"}, "clutch": {"a": "#ff3b4f", "b": "#1a0508", "p": "grid", "e": "❤️", "t": "1 HP"}, "silver": {"a": "#b9c3d6", "b": "#262c38", "p": "hex", "e": "🥈", "t": "SILVER"}, "global": {"a": "#ffcf5a", "b": "#3a2600", "p": "stars", "e": "🦅", "t": "GLOBAL"}, "sigma": {"a": "#9aa3b2", "b": "#0d0f14", "p": "carbon", "e": "🗿", "t": "SIGMA"}, "rizz": {"a": "#ff5fb4", "b": "#3a0824", "p": "hearts", "e": "😏", "t": "RIZZ"}, "ohio": {"a": "#b8d43a", "b": "#1f2a06", "p": "camo", "e": "🌽", "t": "OHIO"}, "brainrot": {"a": "#b05cff", "b": "#1e0838", "p": "zigzag", "e": "🧠", "t": "BRAINROT"}, "stonks": {"a": "#2fe08a", "b": "#06251a", "p": "chart", "e": "📈", "t": "STONKS"}, "muchwow": {"a": "#f2c14e", "b": "#3a2805", "p": "dots", "e": "🐶", "t": "WOW"}, "fine": {"a": "#ff8a1f", "b": "#3a1000", "p": "flames", "e": "🔥", "t": "FINE"}, "aura": {"a": "#5ff0ff", "b": "#14093a", "p": "sparkle", "e": "✨", "t": "AURA"}, "npc": {"a": "#8fa3b8", "b": "#151b23", "p": "circuit", "e": "🤖", "t": "NPC"}, "cringe": {"a": "#ff6ad5", "b": "#1c0f2e", "p": "checker", "e": "🤡", "t": "CRINGE"}, "ggez": {"a": "#2ee6c8", "b": "#062a26", "p": "chevron", "e": "🏆", "t": "GG EZ"}, "tilt": {"a": "#ff2d2d", "b": "#220404", "p": "zigzag", "e": "😤", "t": "TILT"}, "tokyo": {"a": "#ff3fa4", "b": "#0a1a3a", "p": "waves", "e": "🏮", "t": "TOKYO"}, "desert": {"a": "#e0b070", "b": "#3a2410", "p": "camo", "e": "🏜️", "t": "DESERT"}, "frost": {"a": "#9fe8ff", "b": "#0b2a40", "p": "ice", "e": "❄️", "t": "FROST"}, "space": {"a": "#7b6cff", "b": "#05061a", "p": "stars", "e": "🪐", "t": "COSMOS"}, "dragon": {"a": "#ff4a2a", "b": "#2a0a00", "p": "scales", "e": "🐉", "t": "DRAGON"}, "red": {"a": "#e8433a", "b": "#3a0808", "p": "flames", "e": "🔥", "t": "RED"}, "blue": {"a": "#3a7bff", "b": "#081638", "p": "waves", "e": "💧", "t": "BLUE"}, "agents1": {"a": "#4b8fd0", "b": "#0c1d30", "p": "camo", "e": "🕵️", "t": "AGENTS"}, "green": {"a": "#2bd27a", "b": "#06301a", "p": "hex", "e": "☢️", "t": "GREEN"}, "gloves1": {"a": "#ff8a2a", "b": "#3a1604", "p": "stripes", "e": "🧤", "t": "GLOVES"}, "purple": {"a": "#a066ff", "b": "#1e0a42", "p": "dots", "e": "💎", "t": "PURPLE"}, "ak": {"a": "#e07035", "b": "#2a1006", "p": "carbon", "e": "💥", "t": "AK-47"}, "pink": {"a": "#ff4fa3", "b": "#3a0822", "p": "hearts", "e": "💗", "t": "PINK"}, "agents2": {"a": "#2fc3d4", "b": "#06262c", "p": "circuit", "e": "🎖️", "t": "AGENTS"}, "awp": {"a": "#26b8f0", "b": "#06243a", "p": "grid", "e": "🎯", "t": "AWP"}, "gloves2": {"a": "#e4ae39", "b": "#2e2004", "p": "chevron", "e": "🥊", "t": "ELITE"}, "knife": {"a": "#e83a52", "b": "#24050b", "p": "zigzag", "e": "🔪", "t": "KNIFE"}, "gold": {"a": "#ffd04f", "b": "#4a3000", "p": "stars", "e": "👑", "t": "GOLD"}, "karambit": {"a": "#d64be6", "b": "#2a0632", "p": "scales", "e": "🗡️", "t": "KARAMBIT"}, "legend": {"a": "#ffd36e", "b": "#0d0a05", "p": "sparkle", "e": "🏆", "t": "LEGEND"}};
/* ---------- original 3D case design (SVG, drawn by the site) ---------- */
let CASE_N=0;
function casePattern(id,p,a,b){
  const pat=(w,h,body,extra)=>`<pattern id="${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse" ${extra||''}>${body}</pattern>`;
  switch(p){
    case 'carbon':return pat(6,6,`<rect width="3" height="3" fill="#fff" opacity=".10"/><rect x="3" y="3" width="3" height="3" fill="#fff" opacity=".10"/><rect x="3" width="3" height="3" fill="#000" opacity=".25"/><rect y="3" width="3" height="3" fill="#000" opacity=".25"/>`);
    case 'hex':case 'ice':return pat(14,24,`<path d="M7 0l7 4v8l-7 4-7-4V4zM7 16v8" fill="none" stroke="${p==='ice'?'#fff':a}" stroke-width=".8" opacity="${p==='ice'?.5:.45}"/>`);
    case 'stripes':return pat(10,10,`<rect width="4" height="10" fill="${a}" opacity=".35"/>`,'patternTransform="rotate(35)"');
    case 'camo':return pat(40,30,`<path d="M2 6q8-6 14 0t10 8-8 8-14-2zM24 2q10 0 12 6t-6 6-8-6zM26 20q8-2 12 4t-10 6-6-6z" fill="${a}" opacity=".35"/><path d="M14 14q6-2 8 3t-6 5-4-4z" fill="#000" opacity=".3"/>`);
    case 'dots':return pat(8,8,`<circle cx="4" cy="4" r="1.6" fill="${a}" opacity=".6"/>`);
    case 'waves':return pat(24,10,`<path d="M0 5q6-5 12 0t12 0" fill="none" stroke="${a}" stroke-width="1.4" opacity=".55"/>`);
    case 'circuit':return pat(24,24,`<path d="M0 6h8l4 4h12M6 24v-8l4-4M18 0v6" fill="none" stroke="${a}" stroke-width=".9" opacity=".55"/><circle cx="12" cy="10" r="1.6" fill="${a}" opacity=".8"/><circle cx="6" cy="16" r="1.3" fill="${a}" opacity=".8"/>`);
    case 'flames':return pat(16,18,`<path d="M8 18c-5 0-7-4-5-8 1 2 2 3 3 3-1-4 1-8 4-11 0 4 3 5 4 9 1 4-1 7-6 7z" fill="${a}" opacity=".45"/>`);
    case 'hearts':return pat(14,14,`<path d="M7 11 3 7a2.3 2.3 0 0 1 4-3 2.3 2.3 0 0 1 4 3z" fill="${a}" opacity=".5"/>`);
    case 'grid':return pat(10,10,`<path d="M10 0H0v10" fill="none" stroke="${a}" stroke-width=".7" opacity=".45"/>`);
    case 'chevron':return pat(16,10,`<path d="M0 8l8-6 8 6" fill="none" stroke="${a}" stroke-width="2" opacity=".4"/>`);
    case 'zigzag':return pat(12,8,`<path d="M0 6l3-4 3 4 3-4 3 4" fill="none" stroke="${a}" stroke-width="1.4" opacity=".5"/>`);
    case 'stars':return pat(26,22,`<path d="M6 3l1 3h3l-2.5 2 1 3L6 9.3 3.5 11l1-3L2 6h3z" fill="${a}" opacity=".55"/><circle cx="19" cy="15" r="1" fill="#fff" opacity=".7"/><circle cx="14" cy="5" r=".6" fill="#fff" opacity=".6"/>`);
    case 'sparkle':return pat(22,22,`<path d="M11 3l1.5 6.5L19 11l-6.5 1.5L11 19l-1.5-6.5L3 11l6.5-1.5z" fill="${a}" opacity=".45"/>`);
    case 'scales':return pat(12,8,`<path d="M0 8a6 6 0 0 1 12 0M-6 4a6 6 0 0 1 12 0M6 4a6 6 0 0 1 12 0" fill="none" stroke="${a}" stroke-width=".9" opacity=".55"/>`);
    case 'money':return pat(16,16,`<text x="3" y="12" font-size="11" font-weight="700" font-family="Arial" fill="${a}" opacity=".4">$</text>`);
    case 'chart':return pat(40,24,`<path d="M0 20l8-4 6 3 8-8 6 2 12-11" fill="none" stroke="${a}" stroke-width="1.4" opacity=".6"/><path d="M0 24V0" stroke="${a}" stroke-width=".4" opacity=".3"/>`);
    case 'checker':return pat(12,12,`<rect width="6" height="6" fill="#ff5fd0" opacity=".45"/><rect x="6" y="6" width="6" height="6" fill="#5fe8ff" opacity=".45"/><rect x="6" width="6" height="6" fill="#ffe15f" opacity=".25"/>`);
  }
  return pat(10,10,'');
}
/* ---------- case scenes ----------
   themed cases: open glowing case with several skins lying and leaning around it
   meme cases: the same plus a big meme mascot and a meme caption */
const REAL_DESIGN={kilowatt:{a:'#38e1ff',b:'#06202c',p:'circuit',e:'⚡',t:'KILOWATT'},revolution:{a:'#ff4f8b',b:'#2a0614',p:'stripes',e:'🔥',t:'REVOLUTION'},
  dreams:{a:'#a77bff',b:'#140a2e',p:'stars',e:'🌙',t:'DREAMS'},fracture:{a:'#ff7a3c',b:'#2a0e04',p:'zigzag',e:'💥',t:'FRACTURE'}};
/* meme pictures: mascot emoji, caption (top/bottom, classic meme style), extra floating bits */
const MEME={
  rushb:{m:'🏃',top:'RUSH B',bot:'НЕ СТОП!',fx:['💨','💨']},
  eco:{m:'🪙',top:'ЭКО',bot:'РАУНД',fx:['🔫','🪙']},
  clutch:{m:'😰',top:'1 HP',bot:'1 VS 5',fx:['❤️','🎯']},
  silver:{m:'🥈',top:'SILVER',bot:'ELITE',fx:['🫠','🥲']},
  global:{m:'🦅',top:'GLOBAL',bot:'ELITE',fx:['👑','⭐']},
  sigma:{m:'🗿',top:'SIGMA',bot:'GRINDSET',fx:['🍷','🤫']},
  rizz:{m:'😏',top:'W',bot:'RIZZ',fx:['💘','😳']},
  ohio:{m:'🌽',top:'ONLY IN',bot:'OHIO',fx:['👽','🛸']},
  brainrot:{m:'🧠',top:'BRAIN',bot:'ROT',fx:['💀','🌀']},
  stonks:{m:'📈',top:'STONKS',bot:'',fx:['💸','🤑'],chart:true},
  muchwow:{m:'🐶',top:'',bot:'',fx:['✨'],doge:['much wow','such case','very skin','wow']},
  fine:{m:'☕',top:'ВСЁ',bot:'НОРМАЛЬНО',fx:['🔥','🔥','🔥']},
  aura:{m:'😎',top:'+1000',bot:'АУРЫ',fx:['✨','💫']},
  npc:{m:'🤖',top:'NPC',bot:'MODE',fx:['💬','⚙️']},
  cringe:{m:'🤡',top:'КРИНЖ',bot:'',fx:['😬','🙈']},
  ggez:{m:'🏆',top:'GG',bot:'EZ',fx:['🎉','🥇']},
  tilt:{m:'😤',top:'ТИЛЬТ',bot:'',fx:['💢','🖥️']}
};
const SCENE_SLOTS=[ /* x,y,w in % of the scene, rotation, layer: b = behind the case, f = in front */
  {x:-4,y:20,w:52,r:-38,z:'b'},{x:52,y:16,w:52,r:34,z:'b'},
  {x:-6,y:66,w:50,r:-6,z:'f'},{x:56,y:69,w:48,r:9,z:'f'},{x:26,y:80,w:44,r:-2,z:'f'}];
function caseShow(c){
  const seen=new Set(),out=[];
  c.all.slice().sort((a,b)=>b.base-a.base).forEach(x=>{if(!seen.has(x.name)&&out.length<5){seen.add(x.name);out.push(x)}});
  return out;
}
function caseScene(c,big){
  const d=DESIGN[c.id]||REAL_DESIGN[c.id];if(!d)return '';
  const n='sc'+(++CASE_N)+'_',a=d.a,b=d.b,meme=MEME[c.id];
  const lbl=d.t.length>8?Math.max(6,10-(d.t.length-8)*.6):10;
  const items=caseShow(c),ag=c.cat==='agents';
  const piece=(it,i)=>{const s=SCENE_SLOTS[i];const up=it.w==='a';
    return `<div class="sc-it ${s.z} ${up?'up':''}" style="left:${s.x}%;top:${up?s.y-12:s.y}%;width:${up?s.w*.62:s.w}%;--r:${up?0:s.r}deg;--i:${i}">${art({name:it.name,w:it.w,rar:it.rar,float:.1,scene:1})}</div>`};
  const behind=items.map((it,i)=>SCENE_SLOTS[i].z==='b'?piece(it,i):'').join('');
  const front=items.map((it,i)=>SCENE_SLOTS[i].z==='f'?piece(it,i):'').join('');
  const back=`<svg class="sc-back" viewBox="0 0 240 220" aria-hidden="true"><defs>
    <linearGradient id="${n}l" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${b}"/><stop offset="1" stop-color="color-mix(in srgb,${a} 30%,#0a0d14)"/></linearGradient>
    <radialGradient id="${n}o" cx=".5" cy=".55"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".25" stop-color="${a}" stop-opacity=".95"/><stop offset="1" stop-color="${b}" stop-opacity=".9"/></radialGradient>
    <linearGradient id="${n}beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${a}" stop-opacity=".75"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></linearGradient>
    ${casePattern(n+'f','dots',a,b)}</defs>
    <path d="M72 98 212 124 226 54 86 28z" fill="url(#${n}l)"/><path d="M72 98 212 124 226 54 86 28z" fill="url(#${n}f)" opacity=".6"/>
    <path d="M80 90 204 113 215 59 91 36z" fill="none" stroke="${a}" stroke-opacity=".7" stroke-width="1.5"/>
    <path d="M86 28 226 54 228 46 88 20z" fill="color-mix(in srgb,${a} 60%,#222)"/>
    <path class="sc-beam" d="M28 120 168 146 212 124 72 98z M40 118 70 -20 200 0 200 124z" fill="url(#${n}beam)"/>
    <path d="M28 120 168 146 212 124 72 98z" fill="url(#${n}o)"/>
  </svg>`;
  const frontSvg=`<svg class="sc-front" viewBox="0 0 240 220" aria-hidden="true"><defs>
    <linearGradient id="${n}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".6" stop-color="color-mix(in srgb,${a} 45%,${b})"/><stop offset="1" stop-color="${b}"/></linearGradient>
    <linearGradient id="${n}m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f6fb"/><stop offset=".5" stop-color="#9aa3b5"/><stop offset="1" stop-color="#4a5266"/></linearGradient>
    <linearGradient id="${n}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="${n}e" cx=".4" cy=".35"><stop offset="0" stop-color="color-mix(in srgb,${b} 60%,#333)"/><stop offset="1" stop-color="#05070b"/></radialGradient>
    ${casePattern(n+'p',d.p,a,b)}</defs>
    <g transform="matrix(1 -.5 0 1 168 146)">
      <rect width="44" height="50" fill="${b}"/><rect width="44" height="50" fill="url(#${n}p)" opacity=".7"/><rect width="44" height="50" fill="#000" opacity=".4"/>
      <rect x="12" y="14" width="20" height="20" rx="3" fill="#0a0d14" opacity=".8"/><rect x="15" y="17" width="14" height="14" rx="2" fill="url(#${n}m)" opacity=".75"/>
      <rect width="44" height="3" fill="${a}" opacity=".9"/>
    </g>
    <g transform="matrix(1 .1857 0 1 28 120)">
      <rect width="140" height="50" fill="url(#${n}a)"/><rect width="140" height="50" fill="url(#${n}p)"/><rect width="140" height="18" fill="url(#${n}g)"/>
      <rect width="140" height="3.5" fill="color-mix(in srgb,${a} 50%,#fff)"/>
      <rect x="10" y="6" width="12" height="12" rx="2" fill="url(#${n}m)" stroke="#1a1f2b" stroke-width=".8"/><rect x="12.5" y="10" width="7" height="2" fill="#1a1f2b"/>
      <rect x="118" y="6" width="12" height="12" rx="2" fill="url(#${n}m)" stroke="#1a1f2b" stroke-width=".8"/><rect x="120.5" y="10" width="7" height="2" fill="#1a1f2b"/>
      <rect x="28" y="22" width="68" height="20" rx="3" fill="#06080d" opacity=".82" stroke="${a}" stroke-opacity=".9" stroke-width="1.2"/>
      <text x="62" y="36" text-anchor="middle" font-family="Unbounded,Chakra Petch,Arial" font-weight="700" font-size="${lbl*.9}" letter-spacing=".4" fill="${a}">${esc(d.t)}</text>
      <circle cx="112" cy="32" r="12" fill="url(#${n}e)" stroke="${a}" stroke-width="1.8"/>
      <text x="112" y="37.5" text-anchor="middle" font-size="14">${d.e}</text>
      <rect y="46" width="140" height="4" fill="#000" opacity=".4"/>
    </g>
    <path d="M28 120 168 146 212 124" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.2"/>
    <path d="M168 146v50M28 120v50l140 26 44-22v-50" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="1"/>
  </svg>`;
  let memeTop='',memeCap='';
  if(meme){
    const fx=(meme.fx||[]).map((e,i)=>`<i style="--i:${i};left:${[8,78,46,20,64][i%5]}%;top:${[14,8,-4,40,36][i%5]}%">${e}</i>`).join('');
    const doge=(meme.doge||[]).map((w,i)=>`<b class="doge" style="left:${[4,58,10,64][i%4]}%;top:${[6,10,34,38][i%4]}%;color:${['#ff4fd8','#3cf','#ffe14f','#7cff6b'][i%4]};--r:${[-12,10,-6,8][i%4]}deg">${esc(w)}</b>`).join('');
    const chart=meme.chart?`<svg class="stonk" viewBox="0 0 100 60"><path d="M2 54 22 40 34 46 52 24 64 30 94 4" fill="none" stroke="#2fe08a" stroke-width="5" stroke-linejoin="round"/><path d="M84 2h12v12" fill="none" stroke="#2fe08a" stroke-width="5"/></svg>`:'';
    memeTop=`<div class="sc-meme">${chart}<div class="mascot">${meme.m}</div><div class="fx">${fx}</div>${doge}</div>`;
    memeCap=(meme.top?`<b class="cap t">${esc(meme.top)}</b>`:'')+(meme.bot?`<b class="cap b">${esc(meme.bot)}</b>`:'');
  }
  const sparks=Array.from({length:6},(_,i)=>`<i style="--x:${12+((hash(c.id+i)%76))}%;--d:${(i*.41)%2.4}s;--s:${2+hash(c.id+'s'+i)%3}px"></i>`).join('');
  return `<div class="cr scene${big?' big':''}${meme?' memes':''}" style="--h:${c.hue};--a:${a};--dl:${-(hash(c.id)%40)/10}s" aria-hidden="true"><div class="sc">
    <div class="sc-orb"></div><div class="sc-rays"></div>${memeTop}${behind}${back}<div class="sc-smoke"><i></i><i></i><i></i></div>${frontSvg}${front}
    <div class="sc-sparks">${sparks}</div>${memeCap}</div></div>`;
}
function crate(c,id,spin){return caseScene(c,spin)}

/* ---------- sound ---------- */
let AC=null;
function ac(){
  if(!PREF.snd)return null;
  try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();return AC}catch(e){return null}
}
function beep(f,d,v,type,when){
  const a=ac();if(!a)return;
  try{
    const o=a.createOscillator(),g=a.createGain(),t=a.currentTime+(when||0);
    o.type=type||'triangle';o.frequency.value=f;
    g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);
    o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+d+.03);
  }catch(e){}
}
const tick=()=>beep(620+Math.random()*120,.045,.045,'square');
function reveal(rar){
  const n=RAR[rar].ord+1,notes=[523,659,784,988,1319];
  for(let i=0;i<n;i++)beep(notes[i],.35,.06,'triangle',i*.09);
}

function itemCard(it,extra){
  const [w,s]=split(it.name);
  return `<div class="item" style="--rc:${RAR[it.rar].color}">${art(it)}
    <div class="w">${it.st?'StatTrak™ ':''}${w}</div><div class="n" title="${it.name}">${s||w}</div>
    <div class="row"><span>${it.wear?it.wear+' · '+it.float.toFixed(3):(it.chance?it.chance:'')}</span><b>${money(it.price)}</b></div>${extra||''}</div>`;
}

/* ---------- header ---------- */
function updateHeader(){
  $('#bal').textContent=S.guest?'—':money(S.bal);
  $('#invCount').textContent=S.inv.length;
  $('#bpLvl').textContent=bpLevel(S);
  $('#sndBtn').innerHTML=PREF.snd
    ?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>'
    :'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6m0-6 6 6"/></svg>';
  $('#acct').innerHTML=S.guest
    ?`<a class="btn steam sm" href="/auth/steam">${STEAM_ICON}<span>Войти через Steam</span></a>`
    :`<button class="me-chip" data-act="menu">${S.avatar?`<img src="${esc(S.avatar)}" alt="" referrerpolicy="no-referrer">`:'<span class="ava0">'+esc(S.name[0]||'?')+'</span>'}<span class="nm">${esc(S.name)}</span>${S.admin?'<span class="adm">ADMIN</span>':''}</button>`;
  $('#navAdmin').hidden=!S.admin&&!(!S.guest&&!OWNER_SET);
  document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('on',a.dataset.nav===route().page));
  $('#annc').innerHTML=ANNOUNCE?`<div class="annc">📢 ${esc(ANNOUNCE)}</div>`:'';
}
function toast(msg){
  const t=$('#toast');t.innerHTML=`<div class="toast" role="status">${esc(msg)}</div>`;
  clearTimeout(toast.t);toast.t=setTimeout(()=>t.innerHTML='',2800);
}
function lvlUp(l){if(l){toast(`Батл пасс: уровень ${l}! Забери награду`);for(let i=0;i<4;i++)beep([523,659,784,1047][i],.3,.06,'triangle',i*.08)}}

/* ---------- live drops ---------- */
async function pollLive(){
  try{const r=await fetch('/api/live');LIVE=await r.json();if((LIVE.announce||'')!==ANNOUNCE){ANNOUNCE=LIVE.announce||'';updateHeader()}renderLive()}catch(e){}
}
function renderLive(){
  $('#online').textContent=LIVE.online;
  const el=$('#liveStrip');if(!el)return;
  if(!LIVE.feed.length){el.innerHTML='<div class="live-empty">Здесь появятся крутые дропы игроков</div>';return}
  el.innerHTML=LIVE.feed.map(f=>{const [w,s]=split(f.item);return `<div class="lv" style="--rc:${RAR[f.rar].color}" title="${esc(f.n)} · ${esc(f.src)}">
    ${art({name:f.item,w:f.w,rar:f.rar,float:.1})}<div class="lv-t"><small>${esc(f.n)}</small><b>${esc(s||w)}</b><em>${money(f.price)}</em></div></div>`}).join('');
}

/* ---------- routing ---------- */
function route(){
  const h=(location.hash||'#cases').slice(1);
  if(h.startsWith('case-')){const c=CASE(h.slice(5));if(c)return {page:'case',c}}
  if(['inventory','upgrade','pass','admin'].includes(h))return {page:h};
  return {page:'cases'};
}
function render(){
  const r=route(),v=$('#view');
  document.documentElement.style.setProperty('--glow',r.page==='case'?`hsl(${r.c.hue} 85% 58%)`:'#8b5cff');
  if(r.page==='cases')v.innerHTML=viewCases();
  else if(r.page==='case'){v.innerHTML=viewCase(r.c);initReel(r.c)}
  else if(r.page==='upgrade')v.innerHTML=viewUpgrade();
  else if(r.page==='pass')v.innerHTML=viewPass();
  else if(r.page==='admin'){v.innerHTML=viewAdmin();adminLoad()}
  else v.innerHTML=viewInventory();
  updateHeader();
}
window.addEventListener('hashchange',()=>{closeModal();render();if(!busy)window.scrollTo(0,0)});

/* ---------- views ---------- */
function viewCases(){
  const best=S.best?`${split(S.best.name)[1]||S.best.name} · ${money(S.best.price)}`:'—';
  let list=CASES.filter(c=>UI.cat==='all'||c.cat===UI.cat);
  list=list.slice().sort((a,b)=>UI.sort==='price-asc'?a.price-b.price:b.price-a.price);
  const lo=Math.min(...CASES.map(c=>c.price)),hi=Math.max(...CASES.map(c=>c.price));
  return `<section class="hero glass tilt"><div class="tilt-in">
      <div class="hero-txt"><div class="kick3d">CS2 · кейсы · апгрейды · батл пасс</div>
      <h1 class="h3d" data-text="CASELAB">CASELAB</h1>
      <p>${CASES.length} кейсов от ${money(lo)} до ${money(hi)}: мемы, цвета, перчатки, агенты, ножи и настоящие кейсы CS2. Цены скинов — как в Steam.</p>
      <div class="feats"><span class="feat"><b>●</b>${LIVE.online} онлайн</span><span class="feat"><b>●</b>${LIVE.players} игроков</span><span class="feat"><b>●</b>Вход через Steam</span></div>
      ${S.guest?`<div class="actions" style="margin-top:18px"><a class="btn steam" href="/auth/steam">${STEAM_ICON}Войти через Steam</a></div>`:''}</div>
      <div class="stats glass" aria-label="Твоя статистика">
        <div><span>Баланс</span><b class="good">${S.guest?'—':money(S.bal)}</b></div>
        <div><span>Открыто кейсов</span><b>${S.opened}</b></div>
        <div><span>Выпало на сумму</span><b>${money(S.found)}</b></div>
        <div><span>Лучший дроп</span><b title="${esc(best)}">${esc(best)}</b></div>
      </div></div></section>
    <section><div class="sec-h"><h2 class="h2-3d">Кейсы</h2>
      <div class="tabs" role="tablist">${CATS.map(([k,n])=>`<button class="tab ${UI.cat===k?'on':''}" data-act="cat" data-v="${k}">${n}</button>`).join('')}</div>
      <select class="sel" data-act="csort" aria-label="Сортировка кейсов"><option value="price-asc" ${UI.sort==='price-asc'?'selected':''}>Сначала дешёвые</option><option value="price-desc" ${UI.sort==='price-desc'?'selected':''}>Сначала дорогие</option></select></div>
    <div class="grid-cases">${list.map(c=>{const rk=rank(c.price);return `<a class="case tilt ${c.img?'case-real':MEME[c.id]?'case-meme':''}" href="#case-${c.id}" style="--h:${c.hue};--rk:${rk[2]}"><div class="tilt-in">
      <span class="rank">${rk[1]}</span>${c.img?'<span class="case-tag">CS2</span>':MEME[c.id]?'<span class="case-tag">МЕМ</span>':''}${crate(c,'c'+c.id)}<h3>${esc(c.name)}</h3>
      <div class="top-drop">Дроп от ${money(c.min)} · топ до <b>${money(c.max)}</b></div>
      <div class="meta"><span class="price">${money(c.price)}</span><span class="open-pill">Открыть →</span></div></div></a>`}).join('')}</div></section>`;
}
function viewCase(c){
  const bar=TIERS.map(k=>`<i style="--rc:${RAR[k].color};flex:${c.tc[k]}" title="${RAR[k].name} ${fmtCh(c.tc[k])}"></i>`).join('');
  const odds=RLIST.map(k=>`<div class="odd glass" style="--rc:${RAR[k].color}">${RAR[k].name}<b>${fmtCh(c.tc[k])}</b><s>в игре ${RAR[k].real}%</s></div>`).join('');
  const blocks=RLIST.map(k=>{const arr=c.list[k];
    return `<div class="rar-block" style="--rc:${RAR[k].color}"><h3>${RAR[k].name}<span>${arr.length} предм. · вместе ${fmtCh(c.tc[k])}</span></h3>
      <div class="items">${arr.map(t=>itemCard({...t,wear:'',float:0,price:t.base,chance:'шанс '+fmtCh(t.chance)})).join('')}</div></div>`}).join('');
  const rk=rank(c.price),cant=!S.guest&&S.bal<c.price;
  return `<a class="back" href="#cases">← Все кейсы</a>
  <section class="banner glass" style="--h:${c.hue}">${crate(c,'h'+c.id,true)}
    <div style="flex:1;min-width:230px"><div class="kick3d">${rk[1]}</div><h1 class="h3d sm" data-text="${esc(c.name)}">${esc(c.name)}</h1><p>Цена ${money(c.price)}. Средняя выплата ${Math.round(c.ev*100)}% цены. Цены предметов — как на Steam Market.</p>
      <div class="rules"><span class="rule">Дешевле всего: <b>${money(c.min)}</b></span><span class="rule">Дороже всего: <b>${money(c.max)}</b></span></div></div>
  </section>
  <section style="display:grid;gap:14px">
    <div class="reel-wrap glass"><div class="marker"></div><div class="reel" id="reel"><div class="strip" id="strip"></div></div></div>
    <div class="actions">
      <button class="btn primary b3d" data-act="open" data-case="${c.id}" data-n="1">${S.guest?'Войти и открыть':'Открыть за '+money(c.price)}</button>
      ${S.guest?'':`<button class="btn b3d" data-act="open" data-case="${c.id}" data-n="5">×5 за ${money(c.price*5)}</button>`}
      <button class="btn b3d ghost" data-act="demo" data-case="${c.id}">Демо-прокрутка</button>
      <label class="fast" for="fastChk"><input type="checkbox" id="fastChk" data-act="fast" ${PREF.fast?'checked':''}>Быстро</label>
    </div>
    <p class="hint">${S.guest?'Войди через Steam, чтобы открывать кейсы.':cant?'<span class="bad">Не хватает баланса.</span> Деньги выдаёт администратор.':'Выпавшее можно продать или поставить в апгрейд.'} Демо-прокрутка ничего не списывает и ничего не даёт.</p>
  </section>
  <section><div class="sec-h"><h2 class="h2-3d">Шансы</h2><small>Чем дороже скин, тем реже он выпадает</small></div><div class="oddsbar" aria-hidden="true">${bar}</div><div class="oddtable">${odds}</div></section>
  <section><div class="sec-h"><h2 class="h2-3d">Что может выпасть</h2><small>Цены Steam Market, «После полевых»</small></div>${blocks}</section>`;
}
function viewInventory(){
  if(S.guest)return loginWall('Инвентарь');
  const total=S.inv.reduce((a,b)=>a+b.price,0),mode=UI.inv;
  const list=S.inv.slice().sort((a,b)=>mode==='price'?b.price-a.price:mode==='rar'?(RAR[b.rar].ord-RAR[a.rar].ord)||(b.price-a.price):b.ts-a.ts);
  const head=`<div class="sec-h"><div><h1 class="h2-3d" style="font-size:32px">Инвентарь</h1><small>${S.inv.length} предм. на ${money(total)}</small></div>
    <div class="inv-actions"><select class="sel" data-act="sort" aria-label="Сортировка">
      <option value="new" ${mode==='new'?'selected':''}>Сначала новые</option><option value="price" ${mode==='price'?'selected':''}>Сначала дорогие</option><option value="rar" ${mode==='rar'?'selected':''}>По редкости</option></select>
      <button class="btn sm ${sellAllArmed?'danger':''}" data-act="sellall" ${S.inv.length?'':'disabled'}>${sellAllArmed?'Точно продать всё?':'Продать всё за '+money(total)}</button></div></div>`;
  if(!S.inv.length)return head+`<div class="empty glass"><div>Пока пусто. Открой первый кейс.</div><a class="btn primary" href="#cases">К кейсам</a></div>`;
  return head+`<div class="items">${list.map(it=>itemCard(it,`<button class="btn sm" style="margin-top:8px" data-act="sell" data-uid="${it.uid}">Продать</button>`)).join('')}</div>`;
}
function loginWall(t){return `<section class="empty glass" style="padding:60px 20px"><h1 class="h2-3d">${t}</h1><div>Войди через Steam, чтобы видеть свой аккаунт.</div><a class="btn steam" href="/auth/steam">${STEAM_ICON}Войти через Steam</a></section>`}

/* ---------- opening ---------- */
async function open(cid,n){
  if(busy)return;if(needLogin())return;
  const c=CASE(cid);
  if(S.bal<c.price*n-1e-9){toast('Не хватает баланса. Деньги выдаёт администратор.');return}
  busy=true;setBusy(true);
  let res;try{res=await api('/api/open',{cid,n})}catch(e){busy=false;setBusy(false);toast(e.message);return}
  lastRun={cid,n};updateHeader();
  const drops=res.drops;
  const finish=()=>{
    busy=false;setBusy(false);updateHeader();
    const top=drops.slice().sort((a,b)=>RAR[b.rar].ord-RAR[a.rar].ord||b.price-a.price)[0];
    reveal(top.rar);showResult(drops,c);lvlUp(res.lvl);pollLive();
  };
  if(n===1&&route().page==='case'&&route().c.id===cid)runReel(c,drops[0],finish);
  else{beep(520,.1,.05);setTimeout(finish,reduceMotion()?100:500)}
}
function demo(cid){
  if(busy)return;const c=CASE(cid),d=makeDrop(c);busy=true;setBusy(true);
  runReel(c,d,()=>{busy=false;setBusy(false);reveal(d.rar);toast(`Демо: выпал бы ${d.name} (${money(d.price)})`)});
}
function setBusy(b){document.querySelectorAll('[data-act="open"],[data-act="demo"],#fastChk').forEach(x=>x.disabled=b)}
function diffLine(price,base){
  const d=Math.round((price-base)*100)/100;
  return d>=0?`<span class="good">+${money(d)} к цене кейса</span>`:`<span class="bad">−${money(-d)} от цены кейса</span>`;
}
function showResult(drops,c){
  const m=$('#modal'),sum=drops.reduce((a,b)=>a+b.price,0);let html;
  if(drops.length===1){
    const it=drops[0],R=RAR[it.rar],[w,s]=split(it.name);
    html=`<div class="scrim" data-act="close"><div class="modal glass" style="--rc:${R.color}" role="dialog" aria-modal="true" aria-label="Выпавший предмет">
      <div class="kick">${R.name}</div><h2>${it.st?'StatTrak™ ':''}${esc(w)}</h2><div class="sub">${esc(s||'')}</div>
      ${art(it)}
      <div class="facts">${it.wear?`<span>${it.wearName}</span><span>·</span><span>Float ${it.float.toFixed(4)}</span>`:`<span>Агент</span>`}${it.st?'<span class="tag st">StatTrak™</span>':''}</div>
      <div class="total">${money(it.price)}</div><p class="hint" style="margin:2px 0 16px">${diffLine(it.price,c.price)}</p>
      <div class="btns"><button class="btn primary b3d" data-act="again" id="focusMe">Открыть ещё</button><button class="btn" data-act="sellm" data-uids="${it.uid}">Продать за ${money(it.price)}</button><button class="btn" data-act="close">Оставить</button></div></div></div>`;
  }else{
    const best=Math.max(...drops.map(d=>RAR[d.rar].ord)),col=RAR[TIERS[best]].color;
    html=`<div class="scrim" data-act="close"><div class="modal glass wide" style="--rc:${col}" role="dialog" aria-modal="true" aria-label="Результаты открытия">
      <div class="kick">Открыто ×${drops.length}</div><h2>${esc(c.name)}</h2>
      <div class="items">${drops.map(d=>itemCard(d)).join('')}</div>
      <div class="total">Всего на ${money(sum)}</div><p class="hint" style="margin:2px 0 16px">${diffLine(sum,c.price*drops.length)}</p>
      <div class="btns"><button class="btn primary b3d" data-act="again" id="focusMe">Открыть ещё ×${drops.length}</button><button class="btn" data-act="sellm" data-uids="${drops.map(d=>d.uid).join(',')}">Продать всё за ${money(sum)}</button><button class="btn" data-act="close">Оставить</button></div></div></div>`;
  }
  m.innerHTML=html;const f=$('#focusMe');if(f)f.focus();
}
const closeModal=()=>{$('#modal').innerHTML=''};
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
async function sell(uids){
  try{const r=await api('/api/sell',{uids});toast('Продано за '+money(r.gain));return r.gain}catch(e){toast(e.message);return 0}
}

/* ---------- reel ---------- */
const REEL={data:[],idx:8,jit:0};
let reelEl,stripEl;
function rc(it){const [w,s]=split(it.name);return `<div class="rc" style="--rc:${RAR[it.rar].color}">${art(it)}<small>${w}<b>${s||w}</b></small><em>${money(it.price)}</em></div>`}
function metrics(){
  const a=stripEl.children[0],b=stripEl.children[1];
  return {cw:a.offsetWidth,step:b.offsetLeft-a.offsetLeft};
}
function posFor(idx,jit){const m=metrics();return idx*m.step+m.cw/2+jit-reelEl.clientWidth/2}
function setStrip(data){stripEl.className='strip';stripEl.innerHTML=data.map(rc).join('')}
function initReel(c){
  reelEl=$('#reel');stripEl=$('#strip');
  REEL.data=Array.from({length:40},()=>makeDrop(c));REEL.idx=8;REEL.jit=0;
  setStrip(REEL.data);
  stripEl.style.transform=`translate3d(${-posFor(8,0)}px,0,0)`;
}
window.addEventListener('resize',()=>{if(!busy&&stripEl&&stripEl.isConnected)stripEl.style.transform=`translate3d(${-posFor(REEL.idx,REEL.jit)}px,0,0)`});

function runReel(c,win,done){
  const IDX=52,keep=REEL.data.slice(REEL.idx-8,REEL.idx+6);
  const data=keep.slice();
  while(data.length<IDX+10)data.push(makeDrop(c));
  data[IDX]=win;
  setStrip(data);
  const p0=posFor(8,REEL.jit);
  stripEl.style.transform=`translate3d(${-p0}px,0,0)`;
  const jit=(Math.random()-.5)*(metrics().cw-30);
  const p1=posFor(IDX,jit),m=metrics();
  const dur=reduceMotion()?900:(PREF.fast?1800:6800);
  const t0=performance.now();let last=-1;
  const strip=stripEl,reel=reelEl;
  (function frame(now){
    const t=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-t,4);
    const pos=p0+(p1-p0)*e;
    strip.style.transform=`translate3d(${-pos}px,0,0)`;
    const cur=Math.floor((pos+reel.clientWidth/2)/m.step);
    if(cur!==last){last=cur;tick()}
    if(t<1)requestAnimationFrame(frame);
    else{
      strip.classList.add('done');strip.children[IDX].classList.add('win');
      setTimeout(()=>{
        if(strip.isConnected){
          REEL.data=data.slice(IDX-8);REEL.idx=8;REEL.jit=jit;
          setStrip(REEL.data);strip.style.transform=`translate3d(${-posFor(8,jit)}px,0,0)`;
        }
        done();
      },reduceMotion()?200:700);
    }
  })(performance.now());
}

function coin(txt,cls){return `<div class="coin3d ${cls||''}"><div class="coin-in">${Array.from({length:7},(_,i)=>`<i style="--z:${i}"></i>`).join('')}<b>${txt}</b></div></div>`}
function rewardCard(tr,l,lvl){
  const r=bpReward(tr,l),got=S.bp.got[tr].includes(l),open=l<=lvl&&(tr==='free'||S.bp.prem);
  let inner;
  if(r.t==='item'){const s=SKIN(r.name);inner=art({name:r.name,w:s.w,rar:s.rar,float:.2})+`<small>${esc(split(r.name)[1]||r.name)}</small><em>${money(s.base)}</em>`}
  else inner=`<div class="cash3d">${money(r.v)}</div><small>Демо-баланс</small>`;
  const col=r.t==='item'?RAR[SKIN(r.name).rar].color:(tr==='prem'?'#e4ae39':'#4cd38a');
  const state=got?'got':open?'ready':'locked';
  const btn=got?'<span class="rw-st">Получено ✓</span>':open?`<button class="btn sm primary" data-act="bpclaim" data-tr="${tr}" data-l="${l}">Забрать</button>`:`<span class="rw-st">${tr==='prem'&&!S.bp.prem?'Премиум':'Ур. '+l}</span>`;
  return `<div class="rw3d ${tr} ${state}" style="--rc:${col}" ${state==='ready'?`data-act="bpclaim" data-tr="${tr}" data-l="${l}"`:''}><div class="rw-face">${inner}${btn}</div></div>`;
}
function taskCard(t,T){
  const p=Math.min(t.goal,T.p[t.key]||0),done=p>=t.goal,claimed=T.done[t.id];
  const fmt=v=>t.money?money(v):Math.floor(v);
  return `<div class="task3d ${claimed?'claimed':done?'done':''}"><div class="task-face">
    <div class="task-top"><b>${t.txt}</b><span class="xp">+${t.xp} XP</span></div>
    <div class="pbar"><i style="width:${p/t.goal*100}%"></i></div>
    <div class="task-bot"><span>${fmt(p)} / ${fmt(t.goal)}</span>${claimed?'<span class="good">Выполнено ✓</span>':done?`<button class="btn sm primary" data-act="bptask" data-id="${t.id}">Забрать XP</button>`:''}</div></div></div>`;
}
function viewPass(){
  if(S.guest)return loginWall('Батл пасс');
  ensureBP(S);
  const lvl=bpLevel(S),xpIn=lvl>=BP_MAX?BP_XP:S.bp.xp%BP_XP;
  const ready=[...Array(lvl)].reduce((n,_,i)=>n+(!S.bp.got.free.includes(i+1)?1:0)+(S.bp.prem&&!S.bp.got.prem.includes(i+1)?1:0),0);
  const cols=Array.from({length:BP_MAX},(_,i)=>{const l=i+1;return `<div class="bp-col ${l<=lvl?'reached':''} ${l===lvl+1?'next':''}">
    ${rewardCard('free',l,lvl)}<div class="bp-lvl">${l}</div>${rewardCard('prem',l,lvl)}</div>`}).join('');
  return `<section class="bp-hero glass">
    <div class="bp-medal">${coin(lvl,'big')}<span>уровень</span></div>
    <div class="bp-info"><div class="kick3d">Сезон 1 · Батл пасс CaseLab</div><h1 class="h3d sm" data-text="Батл пасс">Батл пасс</h1>
      <p>Открывай кейсы, делай апгрейды и выполняй задания. За опыт растёт уровень, за каждый уровень — скин.</p>
      <div class="bp-xp"><div class="pbar big"><i style="width:${xpIn/BP_XP*100}%"></i></div><span>${lvl>=BP_MAX?'Максимальный уровень':`${xpIn} / ${BP_XP} XP до уровня ${lvl+1}`}</span></div>
      <div class="actions">${S.bp.prem?'<span class="prem-on">★ Премиум активен</span>':`<button class="btn gold3d" data-act="bpprem">★ Премиум за ${money(BP_PREM)}</button>`}
      ${ready?`<span class="rule"><b>${ready}</b> наград ждут</span>`:''}<span class="rule">Открытие кейса: <b>8 XP</b> + 1 XP за $10 · апгрейд: <b>5–15 XP</b></span></div></div>
  </section>
  <section class="tasks-grid">
    <div><div class="sec-h"><h2>Задания дня</h2><small>Новые каждый день</small></div><div class="tasks">${dailyTasks(S).map(t=>taskCard(t,S.td)).join('')}</div></div>
    <div><div class="sec-h"><h2>Задания недели</h2><small>Обновляются в понедельник</small></div><div class="tasks">${weeklyTasks(S).map(t=>taskCard(t,S.tw)).join('')}</div></div>
  </section>
  <section><div class="sec-h"><h2>Награды</h2><small>Верхний ряд — бесплатный, нижний — <b style="color:var(--gld)">★ премиум</b>. Листай вбок</small></div>
    <div class="bp-track" id="bpTrack">${cols}</div></section>`;
}
const UP={src:null,tgt:null,q:'',busy:false};
const UP_EDGE=.92,UP_MAX=80;
const upChance=(a,b)=>!a||!b?0:Math.min(UP_MAX,a.price/b.base*100*UP_EDGE);
function upTargets(src){
  const q=UP.q.trim().toLowerCase();
  let list=SKINS.filter(s=>!src||s.base>src.price*1.1);
  if(q)list=list.filter(s=>s.name.toLowerCase().includes(q));
  return list.slice(0,80);
}
function targetsHTML(src){
  const list=upTargets(src);
  if(!list.length)return '<div class="empty">Ничего не нашлось</div>';
  return list.map(s=>`<button class="pick ${UP.tgt===s.name?'on':''}" data-act="uptgt" data-name="${s.name.replace(/"/g,'&quot;')}">${itemCard({...s,price:s.base,wear:'',float:0,chance:src?fmtCh(upChance(src,s)):''})}</button>`).join('');
}
function viewUpgrade(){
  if(S.guest)return loginWall('Апгрейд');
  const src=S.inv.find(i=>i.uid===UP.src)||null;if(!src)UP.src=null;
  const tgt=UP.tgt?SKIN(UP.tgt):null;
  const ch=upChance(src,tgt),mult=src&&tgt?tgt.base/src.price:0;
  const slot=(it,ph,cls)=>`<div class="up-slot ${cls}" style="--rc:${it?RAR[it.rar].color:'#2a3550'}"><div class="up-slot-in">${it?art(it)+`<div class="w">${split(it.name)[0]}</div><div class="n">${split(it.name)[1]||it.name}</div><b>${money(it.price!=null?it.price:it.base)}</b>`:`<div class="ph">${ph}</div>`}</div></div>`;
  const inv=S.inv.slice().sort((a,b)=>b.price-a.price);
  return `<section class="up-hero glass">
    <div class="sec-h"><div><h1 class="h2-3d" style="font-size:32px">Апгрейд</h1><small>Поставь свой предмет и попробуй забрать дороже. Чем больше разница в цене, тем ниже шанс.</small></div></div>
    <div class="up-stage">
      ${slot(src,'Выбери предмет<br>из инвентаря','l')}
      <div class="up-ring-wrap"><div class="up-ring" id="upRing" style="--ch:${ch}">
        ${Array.from({length:8},(_,i)=>`<div class="ring-layer" style="--z:${i}"></div>`).join('')}
        <div class="ring-spin" id="upSpin"><div class="ring-face"></div><div class="ring-ticks"></div><div class="ring-arc"></div></div>
        <div class="up-arrow"><i></i></div>
        <div class="ring-core"><b id="upPct">${ch?ch.toFixed(2)+'%':'—'}</b><span>${mult?'×'+mult.toFixed(2):'шанс'}</span></div>
      </div></div>
      ${slot(tgt?{...tgt,price:tgt.base}:null,'Выбери цель<br>справа внизу','r')}
    </div>
    <div class="actions" style="justify-content:center">
      <button class="btn primary up-go" data-act="upgo" ${src&&tgt&&!UP.busy?'':'disabled'}>${src&&tgt?`Апгрейд · ${ch.toFixed(2)}%`:'Выбери оба предмета'}</button>
      ${[1.5,2,3,5,10].map(m=>`<button class="btn sm" data-act="upmult" data-m="${m}" ${src?'':'disabled'}>×${m}</button>`).join('')}
    </div>
  </section>
  <section class="up-cols">
    <div><div class="sec-h"><h2>Твой предмет</h2><small>${S.inv.length} в инвентаре</small></div>
      ${inv.length?`<div class="items scroll">${inv.map(it=>`<button class="pick ${UP.src===it.uid?'on':''}" data-act="upsrc" data-uid="${it.uid}">${itemCard(it)}</button>`).join('')}</div>`:'<div class="empty"><div>Инвентарь пуст. Открой пару кейсов.</div><a class="btn primary" href="#cases">К кейсам</a></div>'}</div>
    <div><div class="sec-h"><h2>Цель</h2><input class="sel" style="min-width:200px" placeholder="Поиск: AWP, Karambit…" data-act="upq" value="${UP.q.replace(/"/g,'&quot;')}"></div>
      <div class="items scroll" id="upTargets">${targetsHTML(src)}</div></div>
  </section>`;
}
/* ---------- upgrade: the server decides, the wheel shows it ---------- */
async function upgo(){
  const src=S.inv.find(i=>i.uid===UP.src),tgt=SKIN(UP.tgt);
  if(!src||!tgt||UP.busy)return;
  UP.busy=true;document.querySelectorAll('[data-act^="up"]').forEach(b=>b.disabled=true);
  let res;try{res=await api('/api/upgrade',{uid:src.uid,target:tgt.name})}catch(e){UP.busy=false;toast(e.message);render();return}
  const ch=res.chance,win=res.win,deg=ch*3.6;
  const ang=win?2+Math.random()*Math.max(0,deg-4):deg+2+Math.random()*Math.max(0,356-deg-2);
  const spin=$('#upSpin'),ring=$('#upRing'),rm=reduceMotion();
  const target=((360-ang)%360+360)%360;
  const v=rm?.6:1.05,ACC=rm?100:600,DEC=rm?400:3400;let CRU=rm?100:2600;
  const accD=v*ACC/2,decD=v*DEC/3;
  CRU+=((((target-(accD+v*CRU+decD))%360)+360)%360)/v;
  const dur=ACC+CRU+DEC;
  const pos=t=>t<ACC?v*t*t/(2*ACC):t<ACC+CRU?accD+v*(t-ACC):accD+v*CRU+decD*(1-Math.pow(1-Math.min(1,(t-ACC-CRU)/DEC),3));
  ring.classList.remove('win','lose');ring.classList.add('spinning');
  let lastSeg=0,lastT=0;const t0=performance.now();
  (function frame(now){
    const t=now-t0,a=pos(Math.min(t,dur));
    spin.style.transform=`rotate(${a}deg)`;
    const seg=Math.floor(a/20);if(seg!==lastSeg&&now-lastT>45){lastSeg=seg;lastT=now;tick()}
    ring.classList.toggle('spinning',t<ACC+CRU+DEC*.55);
    if(t<dur)requestAnimationFrame(frame);
  })(t0);
  setTimeout(()=>{
    ring.classList.add(win?'win':'lose');
    if(win)reveal(res.item.rar);else beep(180,.4,.07,'sawtooth');
    setTimeout(()=>{
      UP.busy=false;UP.src=win?res.item.uid:null;
      const it=win?res.item:res.lost,R=RAR[it.rar];
      $('#modal').innerHTML=`<div class="scrim" data-act="close"><div class="modal glass" style="--rc:${win?R.color:'#ff5b5b'}" role="dialog" aria-modal="true">
        <div class="kick">${win?'Апгрейд удался':'Апгрейд не удался'}</div><h2>${esc(win?tgt.name:'Предмет сгорел')}</h2><div class="sub">Шанс был ${ch.toFixed(2)}%</div>
        ${art(it)}<div class="total ${win?'good':'bad'}">${win?'+'+money(res.item.price):'−'+money(res.lost.price)}</div>
        <div class="btns" style="margin-top:14px"><button class="btn primary b3d" data-act="close" id="focusMe">${win?'Отлично':'Ещё раз'}</button></div></div></div>`;
      render();lvlUp(res.lvl);pollLive();
    },rm?100:900);
  },dur+120);
}

/* ---------- admin panel (the server checks the owner on every request) ---------- */
const ADM={q:'',users:[],sel:null,log:[],out:[],hist:[],hi:-1};
const ADMIN_HELP=[
 ['/give <игрок> <сумма>','выдать деньги'],['/take <игрок> <сумма>','забрать деньги'],['/setbal <игрок> <сумма>','установить баланс'],
 ['/giveall <сумма>','деньги всем игрокам'],['/giveitem <игрок> <скин> [st]','выдать скин'],['/removeitem <игрок> <uid>','забрать предмет'],
 ['/clearinv <игрок>','очистить инвентарь'],['/givexp <игрок> <опыт>','опыт батл пасса'],['/premium <игрок> on|off','премиум батл пасса'],
 ['/resetbp <игрок>','сбросить батл пасс'],['/ban <игрок> [причина]','заблокировать'],['/unban <игрок>','разблокировать'],
 ['/kick <игрок>','выкинуть из аккаунта'],['/announce <текст> | off','объявление всем'],['/players [online]','список игроков'],
 ['/info <игрок>','данные игрока'],['/stats','статистика сервера'],['/help','все команды']];
function viewAdmin(){
  if(S.guest)return loginWall('Админ-панель');
  if(!S.admin){
    if(OWNER_SET)return `<section class="empty glass" style="padding:60px 20px"><h1 class="h2-3d">Нет доступа</h1><div>Админ-панель доступна только владельцу сайта.</div></section>`;
    return `<section class="empty glass" style="padding:50px 20px;max-width:560px;margin:0 auto"><h1 class="h2-3d">Стать владельцем</h1>
      <div>Владелец сайта ещё не назначен. Код показан в окне, где запущен сервер. Ввести его может только тот, у кого есть доступ к серверу.</div>
      <form class="claim" data-form="claim"><input class="sel" name="code" placeholder="Код из окна сервера" autocomplete="off" maxlength="16"><button class="btn primary b3d">Подтвердить</button></form></section>`;
  }
  const u=ADM.sel;
  return `<section class="adm-head glass"><div><div class="kick3d">Только для владельца</div><h1 class="h2-3d" style="font-size:32px">Админ-панель</h1>
      <small>Все действия выполняет сервер и записывает в журнал. У других игроков этих команд нет.</small></div>
      <div class="adm-stats" id="admStats"></div></section>
  <section class="adm-grid">
    <div class="glass adm-box"><div class="sec-h"><h2>Игроки</h2><input class="sel" data-act="admq" placeholder="Имя или SteamID" value="${esc(ADM.q)}"></div>
      <div class="adm-users" id="admUsers">${admUsersHTML()}</div></div>
    <div class="glass adm-box" id="admUser">${admUserHTML(u)}</div>
  </section>
  <section class="glass adm-box"><div class="sec-h"><h2>Консоль команд</h2><small>↑ ↓ — история · имена с пробелами в кавычках</small></div>
    <div class="console" id="admOut">${ADM.out.map(o=>`<div class="c-${o.k}">${esc(o.t)}</div>`).join('')||'<div class="c-sys">Напиши /help, чтобы увидеть все команды</div>'}</div>
    <form class="cmd" data-form="cmd"><span>&gt;</span><input name="line" id="admLine" autocomplete="off" spellcheck="false" placeholder="/give Ольга 1000"><button class="btn primary sm">Выполнить</button></form>
    <div class="cmd-help">${ADMIN_HELP.map(h=>`<button class="chip" data-act="admfill" data-v="${esc(h[0].split(' ')[0]+' ')}"><b>${esc(h[0])}</b><span>${esc(h[1])}</span></button>`).join('')}</div></section>
  <section class="glass adm-box"><div class="sec-h"><h2>Журнал действий</h2></div><div class="adm-log" id="admLog">${admLogHTML()}</div></section>`;
}
function admUsersHTML(){
  if(!ADM.users.length)return '<div class="hint">Нет игроков</div>';
  return ADM.users.map(x=>`<button class="urow ${ADM.sel&&ADM.sel.steamid===x.steamid?'on':''}" data-act="admsel" data-id="${x.steamid}">
    ${x.avatar?`<img src="${esc(x.avatar)}" alt="" referrerpolicy="no-referrer">`:`<span class="ava0">${esc(x.name[0]||'?')}</span>`}
    <span class="un"><b>${esc(x.name)}</b><small>${x.steamid}</small></span><span class="ub"><b>${money(x.bal)}</b><small>${x.items} предм.</small></span>
    ${x.online?'<i class="dot on" title="онлайн"></i>':'<i class="dot"></i>'}${x.banned?'<span class="tag bad">БАН</span>':''}${x.owner?'<span class="tag adm">ВЫ</span>':''}</button>`).join('');
}
function admUserHTML(u){
  if(!u)return '<div class="hint" style="padding:30px;text-align:center">Выбери игрока слева</div>';
  const q=v=>/\s/.test(v)?`"${v}"`:v,id=u.steamid;
  return `<div class="adm-u"><div class="adm-u-h">${u.avatar?`<img src="${esc(u.avatar)}" alt="" referrerpolicy="no-referrer">`:''}<div><h2>${esc(u.name)}</h2><small>${id} · уровень БП ${bpLevel(u)}${u.banned?' · <span class="bad">заблокирован</span>':''}</small></div>
    <a class="btn sm" href="https://steamcommunity.com/profiles/${id}" target="_blank" rel="noopener">Профиль Steam</a></div>
    <div class="adm-kv"><div><span>Баланс</span><b class="good">${money(u.bal)}</b></div><div><span>Предметов</span><b>${u.inv.length}</b></div><div><span>Открыто</span><b>${u.opened}</b></div><div><span>Потрачено</span><b>${money(u.spent)}</b></div></div>
    <form class="adm-money" data-form="money" data-id="${id}"><input class="sel" name="amt" inputmode="decimal" placeholder="Сумма, $">
      <button class="btn sm primary" name="op" value="give">Выдать</button><button class="btn sm" name="op" value="take">Забрать</button><button class="btn sm" name="op" value="setbal">Установить</button></form>
    <form class="adm-money" data-form="item" data-id="${id}"><input class="sel" name="skin" list="skinList" placeholder="Скин, например AWP | Asiimov" style="flex:1"><label class="fast"><input type="checkbox" name="st">StatTrak™</label><button class="btn sm primary">Выдать скин</button></form>
    <datalist id="skinList">${SKINS.map(s=>`<option value="${esc(s.name)}">`).join('')}</datalist>
    <div class="actions" style="margin-top:8px">
      ${u.banned?`<button class="btn sm" data-act="admrun" data-line="/unban ${id}">Разблокировать</button>`:`<button class="btn sm danger" data-act="admrun" data-line="/ban ${id}">Заблокировать</button>`}
      <button class="btn sm" data-act="admrun" data-line="/kick ${id}">Выкинуть</button>
      <button class="btn sm" data-act="admrun" data-line="/premium ${id} ${u.bp&&u.bp.prem?'off':'on'}">${u.bp&&u.bp.prem?'Снять премиум':'Дать премиум'}</button>
      <button class="btn sm" data-act="admrun" data-line="/givexp ${id} 100">+1 уровень БП</button>
      <button class="btn sm danger" data-act="admrun" data-line="/clearinv ${id}" data-confirm="1">Очистить инвентарь</button></div>
    <h3 style="margin:16px 0 8px">Инвентарь</h3>
    <div class="items small">${u.inv.slice().sort((a,b)=>b.price-a.price).slice(0,60).map(it=>itemCard(it,`<button class="btn sm" style="margin-top:6px" data-act="admrun" data-line="/removeitem ${id} ${it.uid}">Забрать</button>`)).join('')||'<div class="hint">Пусто</div>'}</div></div>`;
}
function admLogHTML(){return ADM.log.map(l=>`<div class="lrow"><span>${new Date(l.ts).toLocaleString('ru-RU')}</span><b>${esc(l.line)}</b><em>${esc(l.out)}</em></div>`).join('')||'<div class="hint">Пока пусто</div>'}
async function adminLoad(){
  if(!S.admin)return;
  try{
    const [u,l]=await Promise.all([api('/api/admin/users?q='+encodeURIComponent(ADM.q)),api('/api/admin/log')]);
    ADM.users=u.users;ADM.log=l.log;
    if(ADM.sel){const r=await api('/api/admin/user?id='+ADM.sel.steamid).catch(()=>null);ADM.sel=r?r.user:null}
    const set=(id,h)=>{const e=$(id);if(e)e.innerHTML=h};
    set('#admUsers',admUsersHTML());set('#admUser',admUserHTML(ADM.sel));set('#admLog',admLogHTML());
    const tot=ADM.users.reduce((a,b)=>a+b.bal,0);
    set('#admStats',`<div><span>Игроков</span><b>${ADM.users.length}</b></div><div><span>Онлайн</span><b>${ADM.users.filter(x=>x.online).length}</b></div><div><span>Денег у игроков</span><b>${money(tot)}</b></div>`);
  }catch(e){toast(e.message)}
}
async function adminRun(line){
  ADM.out.push({k:'in',t:'> '+line});
  try{const r=await api('/api/admin/cmd',{line});ADM.out.push({k:/^Ошибка/.test(r.out)?'err':'ok',t:r.out})}catch(e){ADM.out.push({k:'err',t:e.message})}
  ADM.out=ADM.out.slice(-80);
  const o=$('#admOut');if(o){o.innerHTML=ADM.out.map(x=>`<div class="c-${x.k}">${esc(x.t)}</div>`).join('');o.scrollTop=o.scrollHeight}
  updateHeader();adminLoad();
}

/* ---------- events ---------- */
document.addEventListener('click',async e=>{
  const el=e.target.closest('[data-act]');if(!el)return;
  const a=el.dataset.act;
  if(a==='close'){if(e.target===el||el.tagName==='BUTTON')closeModal();return}
  switch(a){
    case 'cat':UI.cat=el.dataset.v;render();break;
    case 'open':ac();open(el.dataset.case,+el.dataset.n);break;
    case 'demo':ac();demo(el.dataset.case);break;
    case 'again':closeModal();if(lastRun)open(lastRun.cid,lastRun.n);break;
    case 'sellm':{await sell(el.dataset.uids.split(','));closeModal();if(route().page!=='case')render();else updateHeader();break}
    case 'sell':await sell([el.dataset.uid]);render();break;
    case 'sellall':
      if(!sellAllArmed){sellAllArmed=true;render();setTimeout(()=>{if(sellAllArmed){sellAllArmed=false;if(route().page==='inventory')render()}},3500)}
      else{sellAllArmed=false;await sell(S.inv.map(i=>i.uid));render()}
      break;
    case 'snd':PREF.snd=!PREF.snd;savePref();updateHeader();if(PREF.snd){ac();beep(660,.1,.05)}break;
    case 'menu':
      $('#modal').innerHTML=`<div class="scrim" data-act="close"><div class="modal glass" role="dialog" aria-modal="true">
        ${S.avatar?`<img class="big-ava" src="${esc(S.avatar)}" alt="" referrerpolicy="no-referrer">`:''}<h2>${esc(S.name)}</h2><div class="sub">SteamID64: <code>${S.steamid}</code></div>
        <div class="adm-kv" style="margin:14px 0"><div><span>Баланс</span><b class="good">${money(S.bal)}</b></div><div><span>Предметов</span><b>${S.inv.length}</b></div><div><span>Уровень БП</span><b>${bpLevel(S)}</b></div></div>
        <div class="btns">${S.admin?'<a class="btn primary" href="#admin">Админ-панель</a>':''}<a class="btn" href="#inventory">Инвентарь</a><button class="btn danger" data-act="logout">Выйти</button></div></div></div>`;
      break;
    case 'logout':await fetch('/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'}});closeModal();await loadMe();render();toast('Ты вышел из аккаунта');break;
    case 'upsrc':if(!UP.busy){UP.src=UP.src===el.dataset.uid?null:el.dataset.uid;const src=S.inv.find(i=>i.uid===UP.src),t=UP.tgt&&SKIN(UP.tgt);if(src&&t&&t.base<=src.price*1.1)UP.tgt=null;render()}break;
    case 'uptgt':if(!UP.busy){UP.tgt=UP.tgt===el.dataset.name?null:el.dataset.name;render()}break;
    case 'upmult':{const src=S.inv.find(i=>i.uid===UP.src);if(!src||UP.busy)break;const want=src.price*+el.dataset.m;const list=SKINS.filter(x=>x.base>src.price*1.1);if(!list.length){toast('Дороже цели нет');break}UP.tgt=list.reduce((a,b)=>Math.abs(Math.log(b.base/want))<Math.abs(Math.log(a.base/want))?b:a).name;render();break}
    case 'upgo':ac();upgo();break;
    case 'bpclaim':try{const r=await api('/api/bp/claim',{tr:el.dataset.tr,l:+el.dataset.l});reveal(r.item.rar);toast(r.item.name+' — в инвентаре')}catch(err){toast(err.message)}render();break;
    case 'bptask':try{const r=await api('/api/bp/task',{id:el.dataset.id});toast('+'+r.xp+' XP');lvlUp(r.lvl)}catch(err){toast(err.message)}render();break;
    case 'bpprem':if(needLogin())break;try{await api('/api/bp/premium',{});reveal('gld');toast('★ Премиум открыт')}catch(err){toast(err.message)}render();break;
    case 'admsel':{try{const r=await api('/api/admin/user?id='+el.dataset.id);ADM.sel=r.user;const box=$('#admUser');if(box)box.innerHTML=admUserHTML(ADM.sel);document.querySelectorAll('.urow').forEach(b=>b.classList.toggle('on',b.dataset.id===el.dataset.id))}catch(err){toast(err.message)}break}
    case 'admrun':
      if(el.dataset.confirm&&!el.dataset.armed){el.dataset.armed=1;const t=el.textContent;el.textContent='Точно?';setTimeout(()=>{delete el.dataset.armed;el.textContent=t},3000);break}
      adminRun(el.dataset.line);break;
    case 'admfill':{const i=$('#admLine');if(i){i.value=el.dataset.v;i.focus()}break}
  }
});
document.addEventListener('submit',async e=>{
  const f=e.target.closest('[data-form]');if(!f)return;e.preventDefault();
  const k=f.dataset.form,fd=new FormData(f);
  if(k==='cmd'){const line=String(fd.get('line')||'').trim();if(!line)return;ADM.hist.unshift(line);ADM.hi=-1;f.reset();adminRun(line.startsWith('/')?line:'/'+line)}
  if(k==='money'){const op=e.submitter&&e.submitter.value||'give',amt=String(fd.get('amt')||'').trim();if(!amt){toast('Введи сумму');return}adminRun(`/${op} ${f.dataset.id} ${amt}`)}
  if(k==='item'){const s=String(fd.get('skin')||'').trim();if(!s){toast('Введи название скина');return}adminRun(`/giveitem ${f.dataset.id} ${s}${fd.get('st')?' st':''}`)}
  if(k==='claim'){try{await api('/api/admin/claim',{code:String(fd.get('code')||'')});toast('Ты владелец сайта');OWNER_SET=true;render()}catch(err){toast(err.message)}}
});
document.addEventListener('keydown',e=>{
  if(e.target.id!=='admLine')return;
  if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();ADM.hi=Math.max(-1,Math.min(ADM.hist.length-1,ADM.hi+(e.key==='ArrowUp'?1:-1)));e.target.value=ADM.hi<0?'':ADM.hist[ADM.hi]}
});
let admT=null;
document.addEventListener('input',e=>{
  const q=e.target.closest('[data-act="upq"]');
  if(q){UP.q=q.value;const box=$('#upTargets');if(box)box.innerHTML=targetsHTML(S.inv.find(i=>i.uid===UP.src)||null);return}
  const aq=e.target.closest('[data-act="admq"]');
  if(aq){ADM.q=aq.value;clearTimeout(admT);admT=setTimeout(adminLoad,250)}
});
document.addEventListener('change',e=>{
  const el=e.target.closest('[data-act]');if(!el)return;
  if(el.dataset.act==='fast'){PREF.fast=el.checked;savePref()}
  if(el.dataset.act==='sort'){UI.inv=el.value;render()}
  if(el.dataset.act==='csort'){UI.sort=el.value;render()}
});

/* ---------- 3D tilt: the outer card keeps its place (so clicks always land), the inner layer tilts ---------- */
document.addEventListener('pointermove',e=>{
  const t=e.target.closest&&e.target.closest('.tilt');
  document.querySelectorAll('.tilt.tilting').forEach(x=>{if(x!==t){x.classList.remove('tilting');x.style.removeProperty('--rx');x.style.removeProperty('--ry')}});
  if(!t||reduceMotion()||e.pointerType!=='mouse')return;
  const r=t.getBoundingClientRect(),px=(e.clientX-r.left)/r.width-.5,py=(e.clientY-r.top)/r.height-.5;
  t.classList.add('tilting');t.style.setProperty('--ry',(px*(t.classList.contains('hero')?6:14)).toFixed(2)+'deg');t.style.setProperty('--rx',(-py*(t.classList.contains('hero')?5:12)).toFixed(2)+'deg');
  t.style.setProperty('--mx',((px+.5)*100).toFixed(1)+'%');t.style.setProperty('--my',((py+.5)*100).toFixed(1)+'%');
},{passive:true});
document.addEventListener('pointerleave',()=>document.querySelectorAll('.tilt.tilting').forEach(x=>x.classList.remove('tilting')));

/* ---------- start ---------- */
(async()=>{
  await loadMe();
  if(new URLSearchParams(location.search).has('err'))toast('Вход не удался');
  render();pollLive();setInterval(pollLive,6000);setInterval(async()=>{await loadMe();updateHeader()},60000);
  loadSkinImages();
})();
window.__CL={CASES,RAR,SKINS,S:()=>S};
})();
