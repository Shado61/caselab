/* CaseLab market: every CS2 skin from the open database ByMykel/CSGO-API, in every wear, plus StatTrak™ and agents.
   The catalog and all prices live only on the server: the browser sends a listing id, never a price. */
'use strict';
const fs=require('fs'),path=require('path');
const G=require('./public/game.js');

const SRC='https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/';
const ROOT=__dirname;
const CACHE_FILE=path.join(ROOT,'data','market-catalog.json'); /* fresh copy downloaded by the server */
const BUNDLED_FILE=path.join(ROOT,'market-catalog.json');       /* copy shipped with the code, used when the database is unreachable */
const DISCOUNT=Math.min(.5,Math.max(0,Number(process.env.MARKET_DISCOUNT||'0.05'))); /* market price = Steam price minus 5% */
const PAGE=48;

/* ---------- rarity and weapon types ---------- */
const BY_COLOR={'#b0c3d9':'con','#5e98d9':'ind','#4b69ff':'mil','#8847ff':'res','#d32ce6':'cls','#eb4b4b':'cov','#e4ae39':'gld','#886a08':'gld'};
const BY_NAME={'Consumer Grade':'con','Industrial Grade':'ind','Mil-Spec Grade':'mil','Restricted':'res','Classified':'cls','Covert':'cov','Contraband':'cov',
  'Extraordinary':'gld','Distinguished':'mil','Exceptional':'res','Superior':'cls','Master':'cov'};
const SNIPERS=new Set(['AWP','SSG 08','SCAR-20','G3SG1']);
/* site item types: r rifle, s sniper, p pistol, m smg/heavy, k knife, g gloves, a agent */
const TYPES=[['pistol','Пистолеты'],['smg','Пистолеты-пулемёты'],['rifle','Винтовки'],['sniper','Снайперские'],['heavy','Тяжёлое'],['knife','Ножи'],['gloves','Перчатки'],['agent','Агенты'],['equip','Снаряжение']];
const W_OF={pistol:'p',smg:'m',rifle:'r',sniper:'s',heavy:'m',knife:'k',gloves:'g',agent:'a',equip:'p'};
function typeOf(cat,weapon){
  switch(cat){
    case 'Pistols':return 'pistol';case 'SMGs':return 'smg';case 'Heavy':return 'heavy';case 'Knives':return 'knife';case 'Gloves':return 'gloves';case 'Equipment':return 'equip';
    case 'Rifles':return SNIPERS.has(weapon)?'sniper':'rifle';
  }
  return 'rifle';
}
const WEAR_BY_NAME={'Factory New':'FN','Minimal Wear':'MW','Field-Tested':'FT','Well-Worn':'WW','Battle-Scarred':'BS'};

/* ---------- prices ----------
   Skins that drop from the site's cases keep the site's Steam price (game.js PRICE), so the market and the cases agree.
   For the rest, a stable price is worked out from rarity, weapon and the skin's name (the same skin always costs the same). */
const RANGE={con:[.03,.25],ind:[.04,.6],mil:[.06,2.5],res:[.25,9],cls:[1.2,45],cov:[4,180],gld:[70,1400]};
const HOT=new Set(['AK-47','AWP','M4A4','M4A1-S','Desert Eagle','USP-S','Glock-18','★ Karambit','★ Butterfly Knife','★ M9 Bayonet','★ Skeleton Knife','★ Talon Knife','Sport Gloves','Specialist Gloves']);
const COLD=new Set(['★ Navaja Knife','★ Gut Knife','★ Shadow Daggers','★ Falchion Knife','★ Survival Knife','Hydra Gloves','Broken Fang Gloves']);
function basePrice(name,rar,type,weapon,contraband){
  const known=G.PRICE[name];if(known)return known;
  let [lo,hi]=RANGE[rar]||RANGE.mil;
  if(type==='gloves')[lo,hi]=[70,900];
  if(contraband)[lo,hi]=[800,4000];
  if(type==='agent')[lo,hi]={mil:[2,6],res:[4,12],cls:[7,25],cov:[12,45]}[rar]||[3,10];
  const r=(G.hash(name)%10007)/10007;
  let v=lo*Math.pow(hi/lo,Math.pow(r,1.6));
  if(HOT.has(weapon))v*=1.8;else if(COLD.has(weapon))v*=.6;
  return v>=100?Math.round(v):Math.round(v*100)/100;
}
const r2=v=>Math.round(v*100)/100;
/* Doppler-style phases: gems cost much more than ordinary phases */
const PHASE={'Phase 1':.9,'Phase 2':1.25,'Phase 3':.85,'Phase 4':1.15,'Ruby':4,'Sapphire':4.5,'Black Pearl':3.5,'Emerald':5};

/* ---------- catalog ---------- */
let SKINS=[],BY_KEY=new Map(),LIST=[],WEAPONS={},loadedFrom='',loadedAt=0;
/* compact record per skin: k key, n name, wp weapon, t type, rar, img, fl [min,max float], wr wears, st StatTrak exists, b base price */
function compact(skins,agents){
  const out=[];
  for(const s of skins||[]){
    if(!s||!s.name||!s.image||!s.weapon)continue;
    const cat=s.category&&s.category.name,wp=s.weapon.name,t=typeOf(cat,wp);
    let rar=BY_COLOR[String(s.rarity&&s.rarity.color||'').toLowerCase()]||BY_NAME[s.rarity&&s.rarity.name]||'mil';
    if(t==='knife'||t==='gloves')rar='gld';
    const contraband=(s.rarity&&s.rarity.name)==='Contraband';
    const wr=(s.wears||[]).map(w=>WEAR_BY_NAME[w.name]).filter(Boolean),ph=s.phase||'';
    let b=basePrice(s.name,rar,t,wp,contraband);
    if(ph){b*=PHASE[ph]||1;b=b>=100?Math.round(b):r2(b)}
    const o={k:s.id,n:s.name,wp,t,rar,img:s.image,fl:[+s.min_float||0,s.max_float==null?1:+s.max_float],wr,st:!!s.stattrak,b};
    if(ph)o.ph=ph;
    out.push(o);
  }
  for(const a of agents||[]){
    if(!a||!a.name||!a.image)continue;
    const rar=BY_COLOR[String(a.rarity&&a.rarity.color||'').toLowerCase()]||BY_NAME[a.rarity&&a.rarity.name]||'mil';
    out.push({k:a.id,n:a.name,wp:'Агент',t:'agent',rar,img:a.image,fl:[0,0],wr:[],st:false,b:basePrice(a.name,rar,'agent','Агент',false)});
  }
  return out;
}
function index(skins){
  SKINS=skins;BY_KEY=new Map(skins.map(s=>[s.k,s]));LIST=[];WEAPONS={};
  for(const s of skins){
    (WEAPONS[s.t]=WEAPONS[s.t]||new Set()).add(s.wp);
    const wears=s.t==='agent'?['']:(s.wr.length?s.wr:['FT']); /* vanilla knives have no wear list: sold as one item */
    for(const wr of wears)for(const st of s.st?[false,true]:[false])LIST.push(listing(s,wr,st));
  }
  for(const t in WEAPONS)WEAPONS[t]=[...WEAPONS[t]].sort();
}
function listing(s,wr,st){
  const w=W_OF[s.t],wear=wr?G.WEARS.find(x=>x.s===wr):null;
  const steam=wear?G.priceOf(s.b,w,wear,st):G.priceOf(s.b,'a',G.WEARS[2],false);
  const price=Math.max(.03,r2(steam*(1-DISCOUNT)));
  const o={id:s.k+'~'+(wr||'-')+'~'+(st?1:0),k:s.k,name:s.n,wp:s.wp,t:s.t,w,rar:s.rar,img:s.img,wear:wr,wearName:wear?wear.n:'',st,steam,price,
    q:(st?'stattrak ':'')+s.n.toLowerCase().replace(/★/g,'').trim()+' '+(s.ph?s.ph.toLowerCase()+' ':'')+(wear?wear.n.toLowerCase()+' '+wr.toLowerCase():'')};
  if(s.ph)o.phase=s.ph;
  return o;
}
async function fetchJSON(url){
  const ac=new AbortController(),t=setTimeout(()=>ac.abort(),45000);
  try{const r=await fetch(url,{signal:ac.signal});if(!r.ok)throw new Error('HTTP '+r.status);return await r.json()}finally{clearTimeout(t)}
}
async function load(){
  try{
    const [skins,agents]=await Promise.all([fetchJSON(SRC+'skins.json'),fetchJSON(SRC+'agents.json')]);
    const c=compact(skins,agents);if(c.length<500)throw new Error('слишком мало скинов: '+c.length);
    index(c);loadedFrom='база ByMykel/CSGO-API';loadedAt=Date.now();
    try{fs.mkdirSync(path.dirname(CACHE_FILE),{recursive:true});fs.writeFileSync(CACHE_FILE,JSON.stringify(c))}catch(e){}
  }catch(e){
    console.warn('[market] база скинов недоступна ('+e.message+'), беру сохранённую копию');
    for(const f of [CACHE_FILE,BUNDLED_FILE]){
      try{const c=JSON.parse(fs.readFileSync(f,'utf8'));if(c.length){index(c);loadedFrom=path.basename(f);loadedAt=Date.now();break}}catch(e2){}
    }
  }
  console.log(`  Маркет: ${SKINS.length} скинов, ${LIST.length} лотов (${loadedFrom||'не загружен'})`);
}
function start(){
  load();
  setInterval(load,24*3600e3).unref(); /* new skins appear in the database after CS2 updates */
}

/* ---------- queries ---------- */
const RAR_KEYS=['con','ind','mil','res','cls','cov','gld'];
function meta(){
  return {ready:LIST.length>0,total:LIST.length,discount:DISCOUNT,types:TYPES.filter(([k])=>WEAPONS[k]),weapons:WEAPONS,
    rarities:RAR_KEYS.map(k=>[k,G.RAR[k].name,G.RAR[k].color]),wears:G.WEARS.map(w=>[w.s,w.n])};
}
function query(p){
  const q=String(p.get('q')||'').toLowerCase().replace(/[★™|]/g,' ').split(/\s+/).filter(Boolean).slice(0,6);
  const rar=String(p.get('rar')||''),type=String(p.get('type')||''),wp=String(p.get('weapon')||''),wear=String(p.get('wear')||''),st=String(p.get('st')||'');
  const min=Number(p.get('min'))||0,max=Number(p.get('max'))||0,sort=String(p.get('sort')||'price-asc');
  let list=LIST.filter(x=>(!rar||x.rar===rar)&&(!type||x.t===type)&&(!wp||x.wp===wp)&&(!wear||x.wear===wear)&&(st!=='1'||x.st)&&(st!=='0'||!x.st)
    &&(!min||x.price>=min)&&(!max||x.price<=max)&&q.every(w=>x.q.includes(w)));
  const by={'price-asc':(a,b)=>a.price-b.price,'price-desc':(a,b)=>b.price-a.price,'name':(a,b)=>a.name.localeCompare(b.name)||a.price-b.price,
    'rar':(a,b)=>G.RAR[b.rar].ord-G.RAR[a.rar].ord||b.price-a.price}[sort]||((a,b)=>a.price-b.price);
  list=list.slice().sort(by);
  const pages=Math.max(1,Math.ceil(list.length/PAGE)),page=Math.min(pages,Math.max(1,parseInt(p.get('page'),10)||1));
  return {ready:LIST.length>0,total:list.length,page,pages,items:list.slice((page-1)*PAGE,page*PAGE).map(({q,k,...x})=>x)};
}
const LIST_BY_ID=()=>{if(!LIST_BY_ID.m||LIST_BY_ID.n!==LIST)LIST_BY_ID.m=new Map(LIST.map(x=>[x.id,x])),LIST_BY_ID.n=LIST;return LIST_BY_ID.m};
function get(id){return typeof id==='string'&&id.length<80?LIST_BY_ID().get(id)||null:null}

/* the bought item: an exact copy of the listing, with a float inside both the wear range and the skin's own float range */
function makeItem(l){
  const s=BY_KEY.get(l.k);let f=0;
  if(l.wear){
    const i=G.WEARS.findIndex(x=>x.s===l.wear),lo=i>0?G.WEARS[i-1].max:0,hi=Math.min(1,G.WEARS[i].max)-1e-4;
    const a=Math.max(lo,s?s.fl[0]:0),b=Math.max(a,Math.min(hi,s?s.fl[1]:1));
    f=+(a+Math.random()*(b-a)).toFixed(4);
  }
  const it={uid:G.newUid(),id:l.name,caseId:'market',name:l.name,w:l.w,rar:l.rar,float:f,wear:l.wear,wearName:l.wearName,st:l.st,price:l.price,img:l.img,ts:Date.now()};
  if(l.phase)it.phase=l.phase;
  return it;
}
module.exports={start,load,meta,query,get,makeItem,compact,_list:()=>LIST};
