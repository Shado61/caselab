/* CaseLab server: Steam sign-in, player accounts, cases, upgrades, battle pass, live drops, owner-only admin panel.
   No npm packages needed: run with `node server.js` (Node 18 or newer). */
'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const G=require('./public/game.js');

/* ---------- config ---------- */
const ROOT=__dirname,CFG_FILE=path.join(ROOT,'config.json'),DB_FILE=path.join(ROOT,'data','db.json');
const DEFAULT_CFG={port:3000,baseUrl:'http://localhost:3000',ownerSteamId:'',startBalance:0,steamApiKey:'',devLogin:false};
if(!fs.existsSync(CFG_FILE))try{fs.writeFileSync(CFG_FILE,JSON.stringify(DEFAULT_CFG,null,2))}catch(e){}
const CFG=Object.assign({},DEFAULT_CFG,fs.existsSync(CFG_FILE)?JSON.parse(fs.readFileSync(CFG_FILE,'utf8')):{});
if(process.env.PORT)CFG.port=+process.env.PORT;
if(process.env.BASE_URL)CFG.baseUrl=process.env.BASE_URL;
else if(process.env.RENDER_EXTERNAL_URL)CFG.baseUrl=process.env.RENDER_EXTERNAL_URL; /* Render sets this automatically */
if(process.env.OWNER_STEAMID)CFG.ownerSteamId=process.env.OWNER_STEAMID;
if(process.env.STEAM_API_KEY)CFG.steamApiKey=process.env.STEAM_API_KEY;
CFG.baseUrl=CFG.baseUrl.replace(/\/+$/,'');
const BASE=new URL(CFG.baseUrl),SECURE=BASE.protocol==='https:';
const IS_LOCAL=['localhost','127.0.0.1','[::1]'].includes(BASE.hostname);

/* ---------- storage ----------
   With DATABASE_URL (hosting): Postgres, so data survives restarts. Without it: one JSON file in data/.
   Everything lives in memory; changes are written shortly after they happen. */
let DB={users:{},sessions:{},feed:[],log:[],announce:'',owner:''};
const PG_URL=process.env.DATABASE_URL||'';
let pool=null;const SAVED=new Map();
let saveT=null;
function save(){clearTimeout(saveT);saveT=setTimeout(flush,400)}
let flushing=Promise.resolve();
function flush(){flushing=flushing.then(flushNow).catch(e=>console.error('[db] save failed:',e.message));return flushing}
async function flushNow(){
  if(!pool){fs.mkdirSync(path.dirname(DB_FILE),{recursive:true});const tmp=DB_FILE+'.tmp';fs.writeFileSync(tmp,JSON.stringify(DB));fs.renameSync(tmp,DB_FILE);return}
  const rows=[];
  for(const id in DB.users)rows.push(['u:'+id,DB.users[id]]);
  for(const k of ['sessions','feed','log','announce','owner'])rows.push(['m:'+k,DB[k]]);
  for(const [k,v] of rows){const j=JSON.stringify(v);if(SAVED.get(k)===j)continue;
    await pool.query('INSERT INTO caselab_kv(k,v) VALUES($1,$2) ON CONFLICT(k) DO UPDATE SET v=EXCLUDED.v',[k,j]);SAVED.set(k,j)}
}
async function loadDB(){
  if(!PG_URL){fs.mkdirSync(path.dirname(DB_FILE),{recursive:true});if(fs.existsSync(DB_FILE))DB=Object.assign(DB,JSON.parse(fs.readFileSync(DB_FILE,'utf8')));return 'файл data/db.json'}
  const {Pool}=require('pg');
  const local=/@(localhost|127\.0\.0\.1)[:/]/.test(PG_URL);
  const u=new URL(PG_URL);['sslmode','channel_binding','sslrootcert'].forEach(k=>u.searchParams.delete(k)); /* ssl is set below */
  pool=new Pool({connectionString:u.toString(),ssl:local?false:{rejectUnauthorized:true},max:3});
  await pool.query('CREATE TABLE IF NOT EXISTS caselab_kv(k text PRIMARY KEY, v text NOT NULL)');
  const r=await pool.query('SELECT k,v FROM caselab_kv');
  for(const row of r.rows){SAVED.set(row.k,row.v);const v=JSON.parse(row.v);
    if(row.k.startsWith('u:'))DB.users[row.k.slice(2)]=v;else DB[row.k.slice(2)]=v}
  return 'база Postgres';
}
const stop=async()=>{try{clearTimeout(saveT);await flush()}finally{process.exit(0)}};
process.on('SIGINT',stop);process.on('SIGTERM',stop);
const ownerId=()=>CFG.ownerSteamId||DB.owner||'';
const CLAIM_TRIES={};
const CLAIM_CODE=crypto.randomBytes(4).toString('hex').toUpperCase();

/* ---------- helpers ---------- */
const now=()=>Date.now();
const r2=v=>Math.round(v*100)/100;
function send(res,code,obj,headers){
  const body=typeof obj==='string'?obj:JSON.stringify(obj);
  res.writeHead(code,Object.assign({'Content-Type':typeof obj==='string'?'text/plain; charset=utf-8':'application/json; charset=utf-8','Cache-Control':'no-store'},SEC_HEADERS,headers||{}));
  res.end(body);
}
const SEC_HEADERS={'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'same-origin'};
function cookies(req){const o={};(req.headers.cookie||'').split(';').forEach(p=>{const i=p.indexOf('=');if(i>0)o[p.slice(0,i).trim()]=decodeURIComponent(p.slice(i+1).trim())});return o}
function body(req){return new Promise((ok,bad)=>{let b='';req.on('data',c=>{b+=c;if(b.length>1e5){bad(new Error('too big'));req.destroy()}});req.on('end',()=>{try{ok(b?JSON.parse(b):{})}catch(e){bad(e)}})})}
function sessionUser(req){
  const t=cookies(req).cl_sid;const s=t&&DB.sessions[t];
  if(!s)return null;
  if(now()-s.at>30*864e5){delete DB.sessions[t];return null}
  const u=DB.users[s.id];if(!u)return null;
  u.lastSeen=now();return u;
}
const isOwner=u=>!!u&&!!ownerId()&&u.steamid===ownerId();
function publicMe(u){
  G.ensureBP(u);
  return {steamid:u.steamid,name:u.name,avatar:u.avatar,bal:u.bal,inv:u.inv,opened:u.opened,spent:u.spent,found:u.found,best:u.best,bp:u.bp,td:u.td,tw:u.tw,admin:isOwner(u)};
}
function newUser(id,name,avatar){
  const u=Object.assign(G.freshUser(),{steamid:id,name:name||('Player '+id.slice(-4)),avatar:avatar||'',bal:CFG.startBalance,created:now(),lastSeen:now(),banned:false});
  DB.users[id]=u;return u;
}
function pushFeed(u,it,src){
  DB.feed.unshift({n:u.name,a:u.avatar,item:it.name,w:it.w,rar:it.rar,price:it.price,st:it.st,src,ts:now()});
  DB.feed.length=Math.min(DB.feed.length,40);
}
function adminLog(u,line,out){DB.log.unshift({ts:now(),by:u.name,line,out:String(out).slice(0,300)});DB.log.length=Math.min(DB.log.length,300)}
/* tiny per-player rate limit for game actions */
const LAST={};function tooFast(u,ms){const t=now();if(LAST[u.steamid]&&t-LAST[u.steamid]<ms)return true;LAST[u.steamid]=t;return false}

/* ---------- Steam sign-in (OpenID 2.0) ---------- */
const STEAM_OPENID='https://steamcommunity.com/openid/login';
function steamLoginUrl(){
  const ret=CFG.baseUrl+'/auth/steam/return';
  const q=new URLSearchParams({'openid.ns':'http://specs.openid.net/auth/2.0','openid.mode':'checkid_setup','openid.return_to':ret,'openid.realm':CFG.baseUrl,
    'openid.identity':'http://specs.openid.net/auth/2.0/identifier_select','openid.claimed_id':'http://specs.openid.net/auth/2.0/identifier_select'});
  return STEAM_OPENID+'?'+q;
}
async function steamVerify(params){
  if(params.get('openid.mode')!=='id_res')return null;
  if(params.get('openid.op_endpoint')!==STEAM_OPENID)return null;
  const ret=params.get('openid.return_to')||'';
  if(!ret.startsWith(CFG.baseUrl+'/auth/steam/return'))return null;
  const m=/^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/.exec(params.get('openid.claimed_id')||'');
  if(!m)return null;
  const check=new URLSearchParams(params);check.set('openid.mode','check_authentication');
  const r=await fetch(STEAM_OPENID,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:check.toString()});
  const t=await r.text();
  return /is_valid\s*:\s*true/.test(t)?m[1]:null;
}
async function steamProfile(id){
  try{
    if(CFG.steamApiKey){
      const r=await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${encodeURIComponent(CFG.steamApiKey)}&steamids=${id}`);
      const p=(await r.json()).response.players[0];if(p)return {name:p.personaname,avatar:p.avatarmedium};
    }
    const r=await fetch(`https://steamcommunity.com/profiles/${id}/?xml=1`);const x=await r.text();
    const name=(/<steamID><!\[CDATA\[([\s\S]*?)\]\]><\/steamID>/.exec(x)||[])[1];
    const av=(/<avatarMedium><!\[CDATA\[([\s\S]*?)\]\]><\/avatarMedium>/.exec(x)||[])[1];
    return {name:name||'',avatar:av||''};
  }catch(e){return {name:'',avatar:''}}
}
function startSession(res,id){
  const t=crypto.randomBytes(24).toString('hex');DB.sessions[t]={id,at:now()};save();
  res.writeHead(302,Object.assign({Location:'/','Set-Cookie':`cl_sid=${t}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30*86400}${SECURE?'; Secure':''}`},SEC_HEADERS));res.end();
}
async function loginDone(res,id){
  let u=DB.users[id];
  const p=await steamProfile(id);
  if(!u)u=newUser(id,p.name,p.avatar);else{if(p.name)u.name=p.name;if(p.avatar)u.avatar=p.avatar}
  if(u.banned){send(res,403,'Аккаунт заблокирован'+(u.banReason?': '+u.banReason:''));return}
  startSession(res,id);
}

/* ---------- game actions ---------- */
const API={};
API['GET /api/me']=(u)=>({user:u?publicMe(u):null,ownerSet:!!ownerId(),announce:DB.announce});
API['POST /api/open']=(u,b)=>{
  need(u);const c=G.CASE(b.cid),n=Math.max(1,Math.min(10,b.n|0));
  if(!c)throw E(400,'Нет такого кейса');
  if(tooFast(u,250))throw E(429,'Слишком быстро');
  const cost=r2(c.price*n);if(u.bal<cost-1e-9)throw E(400,'Не хватает баланса. Деньги выдаёт администратор.');
  u.bal=r2(u.bal-cost);u.spent=r2(u.spent+cost);
  const drops=Array.from({length:n},()=>G.makeDrop(c));
  let lvl=G.track(u,'open',{n,paid:true,cost,cid:c.id,cat:c.cat});
  drops.forEach(d=>{u.inv.push(d);u.opened++;u.found=r2(u.found+d.price);if(!u.best||d.price>u.best.price)u.best=d;G.track(u,'drop',d);
    if(RANK(d)>=2||d.price>=c.price*3)pushFeed(u,d,c.name)});
  save();return {drops,me:publicMe(u),lvl};
};
const RANK=d=>G.RAR[d.rar].ord;
API['POST /api/sell']=(u,b)=>{
  need(u);const ids=new Set((b.uids||[]).map(String));let gain=0;
  u.inv=u.inv.filter(it=>{if(ids.has(it.uid)){gain+=it.price;return false}return true});
  gain=r2(gain);u.bal=r2(u.bal+gain);if(gain)G.track(u,'sell',gain);save();
  return {gain,me:publicMe(u)};
};
API['POST /api/upgrade']=(u,b)=>{
  need(u);if(tooFast(u,800))throw E(429,'Слишком быстро');
  const src=u.inv.find(i=>i.uid===String(b.uid)),tgt=G.SKIN(String(b.target||''));
  if(!src||!tgt)throw E(400,'Выбери предмет и цель');
  if(tgt.base<=src.price*1.1)throw E(400,'Цель должна быть дороже предмета');
  const ch=G.upChance(src,tgt),win=Math.random()*100<ch;
  u.inv=u.inv.filter(i=>i!==src);let got=null;
  if(win){got=G.makeItem(tgt,'up',{float:.15+Math.random()*.23,st:false});u.inv.push(got);if(!u.best||got.price>u.best.price)u.best=got;pushFeed(u,got,'Апгрейд '+ch.toFixed(1)+'%')}
  const lvl=G.track(u,'up',{win});save();
  return {win,chance:ch,item:got,lost:src,me:publicMe(u),lvl};
};
API['POST /api/bp/claim']=(u,b)=>{
  need(u);G.ensureBP(u);const tr=b.tr==='prem'?'prem':'free',l=b.l|0;
  if(l<1||l>G.bpLevel(u)||u.bp.got[tr].includes(l)||(tr==='prem'&&!u.bp.prem))throw E(400,'Награда недоступна');
  const r=G.bpReward(tr,l),s=G.SKIN(r.name);u.bp.got[tr].push(l);
  const it=G.makeItem(s,'bp',{float:.15+Math.random()*.2,st:false});u.inv.push(it);save();
  return {item:it,me:publicMe(u)};
};
API['POST /api/bp/task']=(u,b)=>{
  need(u);G.ensureBP(u);const t=G.TASK(String(b.id));if(!t)throw E(400,'Нет задания');
  const daily=G.TASKS_D.includes(t),T=daily?u.td:u.tw,list=daily?G.dailyTasks(u):G.weeklyTasks(u);
  if(!list.includes(t))throw E(400,'Задание сейчас не активно');
  if(T.done[t.id])throw E(400,'Уже забрано');
  if((T.p[t.key]||0)<t.goal)throw E(400,'Задание ещё не выполнено');
  T.done[t.id]=1;const lvl=G.addXP(u,t.xp);save();
  return {xp:t.xp,lvl,me:publicMe(u)};
};
API['POST /api/bp/premium']=(u)=>{
  need(u);G.ensureBP(u);if(u.bp.prem)throw E(400,'Премиум уже есть');
  if(u.bal<G.BP_PREM)throw E(400,'Не хватает баланса');
  u.bal=r2(u.bal-G.BP_PREM);u.bp.prem=true;save();return {me:publicMe(u)};
};
API['GET /api/live']=()=>{
  const t=now(),online=Object.values(DB.users).filter(x=>t-(x.lastSeen||0)<70e3).length;
  return {online,players:Object.keys(DB.users).length,feed:DB.feed.slice(0,20),announce:DB.announce};
};

/* ---------- admin (owner only) ---------- */
API['POST /api/admin/claim']=(u,b)=>{
  need(u);if(ownerId())throw E(403,'Владелец уже назначен');
  CLAIM_TRIES[u.steamid]=(CLAIM_TRIES[u.steamid]||0)+1;
  if(CLAIM_TRIES[u.steamid]>5)throw E(429,'Слишком много попыток. Перезапусти сервер и возьми новый код.');
  if(String(b.code||'').trim().toUpperCase()!==CLAIM_CODE)throw E(403,'Неверный код');
  DB.owner=u.steamid;save();console.log(`[admin] owner set to ${u.name} (${u.steamid})`);return {me:publicMe(u)};
};
API['GET /api/admin/users']=(u,b,q)=>{
  needAdmin(u);const s=(q.get('q')||'').toLowerCase(),t=now();
  return {users:Object.values(DB.users).filter(x=>!s||x.name.toLowerCase().includes(s)||x.steamid.includes(s))
    .sort((a,b)=>(b.lastSeen||0)-(a.lastSeen||0)).slice(0,200)
    .map(x=>({steamid:x.steamid,name:x.name,avatar:x.avatar,bal:x.bal,items:x.inv.length,invValue:r2(x.inv.reduce((a,b)=>a+b.price,0)),opened:x.opened,online:t-(x.lastSeen||0)<70e3,banned:x.banned,owner:x.steamid===ownerId()}))};
};
API['GET /api/admin/user']=(u,b,q)=>{needAdmin(u);const x=DB.users[q.get('id')];if(!x)throw E(404,'Нет игрока');return {user:Object.assign(publicMe(x),{banned:x.banned,banReason:x.banReason,created:x.created,lastSeen:x.lastSeen})}};
API['GET /api/admin/log']=(u)=>{needAdmin(u);return {log:DB.log.slice(0,100)}};
API['POST /api/admin/cmd']=(u,b)=>{
  needAdmin(u);const line=String(b.line||'').trim().slice(0,500);if(!line)throw E(400,'Пустая команда');
  let out;try{out=runCmd(u,line)}catch(e){out='Ошибка: '+e.message}
  adminLog(u,line,out);save();return {out,me:publicMe(u)};
};
function need(u){if(!u)throw E(401,'Войди через Steam');if(u.banned)throw E(403,'Аккаунт заблокирован')}
function needAdmin(u){need(u);if(!isOwner(u))throw E(403,'Нет доступа')}
function E(code,msg){const e=new Error(msg);e.code=code;return e}

const HELP=[
 ['/help','список команд'],
 ['/players [online]','все игроки или только онлайн'],
 ['/info <игрок>','баланс, инвентарь, статистика'],
 ['/give <игрок> <сумма>','выдать деньги'],
 ['/take <игрок> <сумма>','забрать деньги'],
 ['/setbal <игрок> <сумма>','установить баланс'],
 ['/giveall <сумма>','выдать деньги всем игрокам'],
 ['/giveitem <игрок> <название скина> [st]','выдать скин (st — StatTrak™)'],
 ['/removeitem <игрок> <uid>','забрать один предмет'],
 ['/clearinv <игрок>','очистить инвентарь'],
 ['/givexp <игрок> <опыт>','добавить опыт батл пасса'],
 ['/premium <игрок> on|off','включить или выключить премиум батл пасса'],
 ['/resetbp <игрок>','сбросить батл пасс'],
 ['/ban <игрок> [причина]','заблокировать'],
 ['/unban <игрок>','разблокировать'],
 ['/kick <игрок>','выкинуть из аккаунта (выход на всех устройствах)'],
 ['/announce <текст> | off','объявление для всех игроков'],
 ['/stats','статистика сервера']
];
function tokens(line){const out=[];const re=/"([^"]*)"|(\S+)/g;let m;while((m=re.exec(line)))out.push(m[1]!=null?m[1]:m[2]);return out}
function findPlayer(q){
  if(!q)throw new Error('укажи игрока');
  if(DB.users[q])return DB.users[q];
  const url=/steamcommunity\.com\/profiles\/(\d{17})/.exec(q);if(url&&DB.users[url[1]])return DB.users[url[1]];
  const all=Object.values(DB.users),l=q.toLowerCase();
  const ex=all.filter(x=>x.name.toLowerCase()===l);if(ex.length===1)return ex[0];
  const part=all.filter(x=>x.name.toLowerCase().includes(l));
  if(part.length===1)return part[0];
  if(part.length>1)throw new Error(`несколько игроков: ${part.slice(0,5).map(x=>x.name+' ('+x.steamid+')').join(', ')}. Укажи SteamID`);
  throw new Error('игрок не найден: '+q+'. Напиши часть ника, SteamID или «я». Ник с пробелами бери в кавычки. Список: /players');
}
function amount(v){const n=Number(String(v||'').replace(/[$,\s]/g,''));if(!isFinite(n)||n<0||n>1e7)throw new Error('сумма от 0 до 10 000 000');return r2(n)}
function runCmd(admin,line){
  const t=tokens(line.replace(/^\//,'')),cmd=(t.shift()||'').toLowerCase(),m=v=>'$'+v.toLocaleString('en-US');
  if(t[0]&&['я','me','себе','мне'].includes(t[0].toLowerCase()))t[0]=admin.steamid; /* shortcut for the admin themself */
  switch(cmd){
    case 'help':return HELP.map(h=>h[0]+' — '+h[1]).join('\n');
    case 'players':{const t0=now();const l=Object.values(DB.users).filter(x=>t[0]!=='online'||t0-(x.lastSeen||0)<70e3);return l.length?l.map(x=>`${x.name} · ${x.steamid} · ${m(x.bal)}${x.banned?' · БАН':''}`).join('\n'):'нет игроков'}
    case 'info':{const p=findPlayer(t[0]);return `${p.name} (${p.steamid})\nбаланс ${m(p.bal)} · предметов ${p.inv.length} на ${m(r2(p.inv.reduce((a,b)=>a+b.price,0)))}\nоткрыто ${p.opened} · потрачено ${m(p.spent)} · уровень БП ${G.bpLevel(p)}${p.banned?'\nзаблокирован: '+(p.banReason||''):''}`}
    case 'give':{const p=findPlayer(t[0]),a=amount(t[1]);if(!a)throw new Error('сумма больше 0');p.bal=r2(p.bal+a);return `${p.name}: +${m(a)} → ${m(p.bal)}`}
    case 'take':{const p=findPlayer(t[0]),a=amount(t[1]);p.bal=r2(Math.max(0,p.bal-a));return `${p.name}: −${m(a)} → ${m(p.bal)}`}
    case 'setbal':{const p=findPlayer(t[0]),a=amount(t[1]);p.bal=a;return `${p.name}: баланс ${m(a)}`}
    case 'giveall':{const a=amount(t[0]);if(!a)throw new Error('сумма больше 0');const l=Object.values(DB.users);l.forEach(x=>x.bal=r2(x.bal+a));return `+${m(a)} выдано ${l.length} игрокам`}
    case 'giveitem':{
      const p=findPlayer(t.shift());let st=false;if(t.length&&t[t.length-1].toLowerCase()==='st'){st=true;t.pop()}
      const q=t.join(' ').toLowerCase();if(!q)throw new Error('укажи название скина');
      let s=G.SKINS.find(x=>x.name.toLowerCase()===q);
      if(!s){const l=G.SKINS.filter(x=>x.name.toLowerCase().includes(q));if(l.length===1)s=l[0];else if(l.length>1)throw new Error('уточни: '+l.slice(0,6).map(x=>x.name).join('; '));}
      if(!s)throw new Error('скин не найден: '+q);
      const it=G.makeItem(s,'admin',{float:.15+Math.random()*.2,st:st&&s.w!=='a'&&s.w!=='g'});p.inv.push(it);return `${p.name} получил ${it.st?'StatTrak™ ':''}${it.name} (${m(it.price)})`}
    case 'removeitem':{const p=findPlayer(t[0]),i=p.inv.findIndex(x=>x.uid===t[1]);if(i<0)throw new Error('нет предмета с таким uid');const [it]=p.inv.splice(i,1);return `у ${p.name} забран ${it.name}`}
    case 'clearinv':{const p=findPlayer(t[0]),n=p.inv.length;p.inv=[];return `${p.name}: удалено предметов ${n}`}
    case 'givexp':{const p=findPlayer(t[0]),a=Math.floor(amount(t[1]));G.addXP(p,a);return `${p.name}: +${a} XP, уровень ${G.bpLevel(p)}`}
    case 'premium':{const p=findPlayer(t[0]);G.ensureBP(p);p.bp.prem=(t[1]||'on')!=='off';return `${p.name}: премиум ${p.bp.prem?'включён':'выключен'}`}
    case 'resetbp':{const p=findPlayer(t[0]);p.bp=null;p.td=null;p.tw=null;G.ensureBP(p);return `${p.name}: батл пасс сброшен`}
    case 'ban':{const p=findPlayer(t.shift());if(p.steamid===ownerId())throw new Error('нельзя заблокировать владельца');p.banned=true;p.banReason=t.join(' ');dropSessions(p);return `${p.name} заблокирован`}
    case 'unban':{const p=findPlayer(t[0]);p.banned=false;p.banReason='';return `${p.name} разблокирован`}
    case 'kick':{const p=findPlayer(t[0]);const n=dropSessions(p);return `${p.name}: закрыто сессий ${n}`}
    case 'announce':{const s=t.join(' ');DB.announce=(!s||s==='off')?'':s.slice(0,200);return DB.announce?'объявление: '+DB.announce:'объявление убрано'}
    case 'stats':{const l=Object.values(DB.users);return `игроков ${l.length} · онлайн ${l.filter(x=>now()-(x.lastSeen||0)<70e3).length}\nденег у игроков ${m(r2(l.reduce((a,b)=>a+b.bal,0)))} · предметов ${l.reduce((a,b)=>a+b.inv.length,0)}\nоткрыто кейсов ${l.reduce((a,b)=>a+b.opened,0)}`}
  }
  throw new Error('неизвестная команда, напиши /help');
}
function dropSessions(p){let n=0;for(const k in DB.sessions)if(DB.sessions[k].id===p.steamid){delete DB.sessions[k];n++}return n}

/* ---------- static files ---------- */
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon','.json':'application/json'};
function serveStatic(req,res,p){
  if(p==='/')p='/index.html';
  const f=path.normalize(path.join(ROOT,'public',decodeURIComponent(p)));
  if(!f.startsWith(path.join(ROOT,'public')+path.sep))return send(res,403,'forbidden');
  fs.readFile(f,(err,data)=>{
    if(err)return send(res,404,'not found');
    res.writeHead(200,Object.assign({'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-cache'},SEC_HEADERS));res.end(data);
  });
}

/* ---------- router ---------- */
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,CFG.baseUrl),p=url.pathname;
  try{
    if(p==='/auth/steam')return res.writeHead(302,{Location:steamLoginUrl()}),res.end();
    if(p==='/auth/steam/return'){const id=await steamVerify(url.searchParams);if(!id)return send(res,403,'Steam не подтвердил вход. Попробуй ещё раз.');return loginDone(res,id)}
    if(p==='/auth/dev'){/* local testing only: off unless devLogin is true AND the site runs on localhost */
      const ra=req.socket.remoteAddress||'';
      if(!CFG.devLogin||!IS_LOCAL||!/^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(ra))return send(res,404,'not found');
      const id=url.searchParams.get('id')||'76561190000000001';if(!/^\d{17}$/.test(id))return send(res,400,'bad id');
      if(!DB.users[id])newUser(id,url.searchParams.get('name')||'Dev '+id.slice(-3),'');return startSession(res,id);
    }
    if(p==='/auth/logout'&&req.method==='POST'){const t=cookies(req).cl_sid;if(t){delete DB.sessions[t];save()}return send(res,200,{ok:true},{'Set-Cookie':'cl_sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'})}
    if(p.startsWith('/api/')){
      const key=req.method+' '+p,fn=API[key];if(!fn)return send(res,404,{error:'нет такого запроса'});
      if(req.method==='POST'){
        const o=req.headers.origin;if(o&&o!==BASE.origin)return send(res,403,{error:'чужой сайт'});
        if(!(req.headers['content-type']||'').includes('application/json'))return send(res,415,{error:'нужен JSON'});
      }
      const u=sessionUser(req);const b=req.method==='POST'?await body(req):{};
      try{return send(res,200,fn(u,b,url.searchParams))}catch(e){return send(res,e.code||500,{error:e.code?e.message:'ошибка сервера'})}
    }
    if(req.method!=='GET')return send(res,405,'method not allowed');
    return serveStatic(req,res,p);
  }catch(e){console.error(e);send(res,500,{error:'ошибка сервера'})}
});
loadDB().then(where=>server.listen(CFG.port,()=>{
  console.log(`  Данные: ${where}`);
  console.log(`\n  CaseLab работает: ${CFG.baseUrl}  (порт ${CFG.port})`);
  if(!ownerId())console.log(`\n  Админ ещё не назначен. Войди через Steam, открой раздел «Админ» и введи код: ${CLAIM_CODE}\n  (или впиши свой SteamID64 в config.json → ownerSteamId)\n`);
  else console.log(`  Админ: ${ownerId()}\n`);
  console.log('  Не закрывайте это окно, пока пользуетесь сайтом.\n');
  if(process.platform==='win32'&&IS_LOCAL)try{require('child_process').exec(`start "" "${CFG.baseUrl}"`)}catch(e){}
}),e=>{console.error('Не удалось открыть базу данных:',e.message);process.exit(1)});
