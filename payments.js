/* CaseLab payments: balance top-ups through real payment gateways.
   card   → CloudPayments (bank cards; Kazakhstan or Russia, depending on the merchant account)
   crypto → Trybit, formerly CryptoCloud (USDT, BTC, ETH and others)
   Rules: the amount is decided only on the server; money is credited only from a webhook whose signature checks out;
   each payment is credited at most once (row lock in Postgres + status check). */
'use strict';
const crypto=require('crypto');

const env=(k,d)=>{const v=process.env[k];return v==null||v===''?d:v};
const num=(k,d)=>{const v=Number(env(k,d));return isFinite(v)?v:d};
const r2=v=>Math.round(v*100)/100;
const MIN=num('DEPOSIT_MIN_USD',1),MAX=num('DEPOSIT_MAX_USD',1000);

const CP={
  publicId:env('CLOUDPAYMENTS_PUBLIC_ID',''),secret:env('CLOUDPAYMENTS_API_SECRET',''),
  api:env('CLOUDPAYMENTS_API_URL','https://api.cloudpayments.ru').replace(/\/+$/,''),
  currency:env('CLOUDPAYMENTS_CURRENCY','RUB'),rate:num('CLOUDPAYMENTS_RATE',90), /* how many CURRENCY units cost $1 of balance */
  test:env('CLOUDPAYMENTS_TEST_MODE','0')==='1'
};
const TB={
  apiKey:env('TRYBIT_API_KEY',''),shopId:env('TRYBIT_SHOP_ID',''),secret:env('TRYBIT_SECRET_KEY',''),
  api:env('TRYBIT_API_URL','https://api.trybit.com/v2').replace(/\/+$/,'')
};
const PROVIDERS={
  card:{on:()=>!!(CP.publicId&&CP.secret),name:'Банковская карта',currency:()=>CP.currency,rate:()=>CP.rate},
  crypto:{on:()=>!!(TB.apiKey&&TB.shopId&&TB.secret),name:'Криптовалюта',currency:()=>'USD',rate:()=>1}
};

/* ---------- storage ----------
   Postgres: table caselab_payments. Without Postgres: DB.payments inside data/db.json (for local testing). */
let H=null; /* {pool, DB, save, serial} from server.js */
async function init(h){
  H=h;
  if(H.pool){
    await H.pool.query(`CREATE TABLE IF NOT EXISTS caselab_payments(
      id text PRIMARY KEY, steamid text NOT NULL, provider text NOT NULL,
      amount numeric(12,2) NOT NULL, pay_amount numeric(14,2) NOT NULL, pay_currency text NOT NULL,
      status text NOT NULL DEFAULT 'pending', ext_id text, url text, note text,
      created_at timestamptz NOT NULL DEFAULT now(), paid_at timestamptz)`);
    await H.pool.query('CREATE INDEX IF NOT EXISTS caselab_payments_user ON caselab_payments(steamid, created_at DESC)');
    await H.pool.query('CREATE UNIQUE INDEX IF NOT EXISTS caselab_payments_ext ON caselab_payments(provider, ext_id) WHERE ext_id IS NOT NULL');
  }else H.DB.payments=H.DB.payments||{};
}
const rowOut=r=>r&&{id:r.id,steamid:r.steamid,provider:r.provider,amount:+r.amount,pay_amount:+r.pay_amount,pay_currency:r.pay_currency,
  status:r.status,ext_id:r.ext_id,url:r.url,created_at:+new Date(r.created_at),paid_at:r.paid_at?+new Date(r.paid_at):null};
async function insert(p){
  if(H.pool){await H.pool.query('INSERT INTO caselab_payments(id,steamid,provider,amount,pay_amount,pay_currency) VALUES($1,$2,$3,$4,$5,$6)',
    [p.id,p.steamid,p.provider,p.amount,p.pay_amount,p.pay_currency]);return}
  H.DB.payments[p.id]=Object.assign({status:'pending',ext_id:null,url:null,created_at:Date.now(),paid_at:null},p);H.save();
}
async function update(id,f){
  if(H.pool){await H.pool.query('UPDATE caselab_payments SET status=COALESCE($2,status), ext_id=COALESCE($3,ext_id), url=COALESCE($4,url), note=COALESCE($5,note) WHERE id=$1',
    [id,f.status||null,f.ext_id||null,f.url||null,f.note||null]);return}
  const p=H.DB.payments[id];if(p){Object.assign(p,f);H.save()}
}
async function byId(id){
  if(H.pool){const r=await H.pool.query('SELECT * FROM caselab_payments WHERE id=$1',[id]);return rowOut(r.rows[0])}
  return H.DB.payments[id]||null;
}
async function byExt(provider,ext){
  if(H.pool){const r=await H.pool.query('SELECT * FROM caselab_payments WHERE provider=$1 AND ext_id=$2',[provider,ext]);return rowOut(r.rows[0])}
  return Object.values(H.DB.payments).find(p=>p.provider===provider&&p.ext_id===ext)||null;
}
async function recent(steamid,n){
  if(H.pool){const r=await H.pool.query('SELECT * FROM caselab_payments WHERE steamid=$1 ORDER BY created_at DESC LIMIT $2',[steamid,n]);return r.rows.map(rowOut)}
  return Object.values(H.DB.payments).filter(p=>p.steamid===steamid).sort((a,b)=>b.created_at-a.created_at).slice(0,n);
}
const INFLIGHT=new Set();
/* the one place where money is added. check(p) returns an error text when the notification does not match the payment */
async function credit(id,check){
  if(INFLIGHT.has(id))return {busy:true};
  INFLIGHT.add(id);
  try{
    if(!H.pool){
      const p=H.DB.payments[id];if(!p)return {err:'платёж не найден'};
      if(p.status==='succeeded')return {already:true,p};
      const e=check(p);if(e)return {err:e,p};
      const u=H.DB.users[p.steamid];if(!u)return {err:'игрок не найден',p};
      p.status='succeeded';p.paid_at=Date.now();u.bal=r2(u.bal+p.amount);u.dep=r2((u.dep||0)+p.amount);
      await H.flushNow();return {ok:true,p};
    }
    /* Postgres: the status change and the new balance are written in one transaction, queued after any save in progress */
    return await H.serial(async()=>{
      const c=await H.pool.connect();
      try{
        await c.query('BEGIN');
        const r=await c.query('SELECT * FROM caselab_payments WHERE id=$1 FOR UPDATE',[id]);
        const p=rowOut(r.rows[0]);
        if(!p){await c.query('ROLLBACK');return {err:'платёж не найден'}}
        if(p.status==='succeeded'){await c.query('COMMIT');return {already:true,p}}
        const e=check(p);if(e){await c.query('ROLLBACK');return {err:e,p}}
        const u=H.DB.users[p.steamid];if(!u){await c.query('ROLLBACK');return {err:'игрок не найден',p}}
        const after=Object.assign({},u,{bal:r2(u.bal+p.amount),dep:r2((u.dep||0)+p.amount)});
        await c.query("UPDATE caselab_payments SET status='succeeded', paid_at=now() WHERE id=$1",[id]);
        await c.query('INSERT INTO caselab_kv(k,v) VALUES($1,$2) ON CONFLICT(k) DO UPDATE SET v=EXCLUDED.v',['u:'+p.steamid,JSON.stringify(after)]);
        await c.query('COMMIT');
        u.bal=after.bal;u.dep=after.dep; /* the same change in memory, right after the commit */
        return {ok:true,p};
      }catch(e){try{await c.query('ROLLBACK')}catch(e2){}throw e}
      finally{c.release()}
    });
  }finally{INFLIGHT.delete(id)}
}

/* ---------- helpers ---------- */
const E=(code,msg)=>{const e=new Error(msg);e.code=code;return e};
const safeEq=(a,b)=>{a=Buffer.from(String(a||''));b=Buffer.from(String(b||''));return a.length===b.length&&a.length>0&&crypto.timingSafeEqual(a,b)};
const b64url=b=>Buffer.from(b).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
async function postJSON(url,headers,body){
  const ac=new AbortController(),t=setTimeout(()=>ac.abort(),20000);
  try{
    const r=await fetch(url,{method:'POST',headers:Object.assign({'Content-Type':'application/json'},headers),body:JSON.stringify(body),signal:ac.signal});
    const j=await r.json().catch(()=>null);return {ok:r.ok,status:r.status,j};
  }finally{clearTimeout(t)}
}
function parseBody(raw,ctype){
  if(/json/i.test(ctype||'')||/^\s*\{/.test(raw)){try{return JSON.parse(raw)}catch(e){return null}}
  const o={};new URLSearchParams(raw).forEach((v,k)=>{o[k]=v});return o;
}

/* ---------- public ---------- */
function config(){
  return {min:MIN,max:MAX,methods:Object.entries(PROVIDERS).filter(([,p])=>p.on()).map(([id,p])=>({id,name:p.name,currency:p.currency(),rate:p.rate()}))};
}
const LAST_CREATE={};
async function create(u,b,baseUrl){
  const method=String(b.method||''),P=PROVIDERS[method];
  if(!P||!P.on())throw E(400,'Этот способ оплаты сейчас недоступен');
  if(b.agree!==true)throw E(400,'Подтверди условия пополнения');
  const amount=b.amount;
  if(typeof amount!=='number'||!isFinite(amount)||amount<MIN||amount>MAX||r2(amount)!==amount)throw E(400,`Сумма от $${MIN} до $${MAX}, не больше двух знаков после точки`);
  const t=Date.now(),L=LAST_CREATE[u.steamid]=(LAST_CREATE[u.steamid]||[]).filter(x=>t-x<10*60e3);
  if(L.length>=5)throw E(429,'Слишком много попыток. Подожди несколько минут.');
  L.push(t);
  const pay={id:'p_'+crypto.randomBytes(12).toString('hex'),steamid:u.steamid,provider:method,amount,pay_amount:r2(amount*P.rate()),pay_currency:P.currency()};
  await insert(pay);
  const back=baseUrl+'/#pay-'+pay.id;
  try{
    let url,ext;
    if(method==='card'){
      const auth='Basic '+Buffer.from(CP.publicId+':'+CP.secret).toString('base64');
      const r=await postJSON(CP.api+'/orders/create',{Authorization:auth},{
        Amount:pay.pay_amount,Currency:CP.currency,Description:`Пополнение баланса CaseLab на $${amount}`,
        InvoiceId:pay.id,AccountId:u.steamid,SuccessRedirectUrl:back,FailRedirectUrl:back,CultureName:'ru-RU'});
      if(!r.ok||!r.j||!r.j.Success||!r.j.Model||!r.j.Model.Url)throw new Error('CloudPayments: '+((r.j&&r.j.Message)||'HTTP '+r.status));
      url=r.j.Model.Url;ext=String(r.j.Model.Id||pay.id);
    }else{
      const r=await postJSON(TB.api+'/invoice/create',{Authorization:'Token '+TB.apiKey},{shop_id:TB.shopId,amount,currency:'USD',order_id:pay.id});
      if(!r.ok||!r.j||r.j.status!=='success'||!r.j.result||!r.j.result.link)throw new Error('Trybit: '+JSON.stringify(r.j&&r.j.result||r.status).slice(0,200));
      url=r.j.result.link;ext=String(r.j.result.uuid||'').replace(/^INV-/,'');
    }
    if(!/^https:\/\//.test(url))throw new Error('платёжная система вернула странную ссылку');
    await update(pay.id,{url,ext_id:ext});
    return {id:pay.id,url};
  }catch(e){
    console.error('[pay] create failed:',e.message);
    await update(pay.id,{status:'failed',note:e.message.slice(0,300)}).catch(()=>{});
    throw E(502,'Платёжная система не ответила. Попробуй ещё раз чуть позже.');
  }
}
async function status(u,id){
  const p=await byId(String(id||''));
  if(!p||p.steamid!==u.steamid)throw E(404,'Платёж не найден');
  return {id:p.id,status:p.status,amount:p.amount,pay_amount:p.pay_amount,pay_currency:p.pay_currency,method:p.provider};
}
async function history(u){return (await recent(u.steamid,10)).map(p=>({id:p.id,status:p.status,amount:p.amount,pay_amount:p.pay_amount,pay_currency:p.pay_currency,method:p.provider,at:p.created_at}))}

/* ---------- webhooks ----------
   returns {code, body}; a 5xx makes the gateway retry later, so it is used only for our own failures (database down) */
function cpSigned(headers,raw){
  const hmac=s=>crypto.createHmac('sha256',CP.secret).update(s,'utf8').digest('base64');
  let decoded=raw;try{decoded=decodeURIComponent(raw.replace(/\+/g,' '))}catch(e){}
  const a=headers['content-hmac'],b=headers['x-content-hmac'],enc=hmac(raw),dec=hmac(decoded);
  return safeEq(a,enc)||safeEq(b,dec)||safeEq(b,enc)||safeEq(a,dec);
}
async function cloudpayments(headers,raw,kind){
  if(!PROVIDERS.card.on())return {code:404,body:{code:13}};
  if(!cpSigned(headers,raw)){console.warn('[pay] CloudPayments: bad signature');return {code:401,body:{code:13}}}
  const n=parseBody(raw,headers['content-type']);if(!n)return {code:400,body:{code:13}};
  const id=String(n.InvoiceId||''),amt=Number(n.Amount),test=String(n.TestMode)==='1'||n.TestMode===true;
  const match=p=>{
    if(p.provider!=='card')return 'другой способ оплаты';
    if(Math.abs(amt-p.pay_amount)>.009)return `сумма ${amt} вместо ${p.pay_amount}`;
    if(String(n.Currency)!==p.pay_currency)return `валюта ${n.Currency} вместо ${p.pay_currency}`;
    if(String(n.AccountId||'')!==p.steamid)return 'чужой аккаунт';
    if(test&&!CP.test)return 'тестовый платёж на боевом сайте';
    return null;
  };
  if(kind==='check'){ /* before the card is charged: may this payment go ahead? */
    const p=await byId(id);if(!p)return {code:200,body:{code:10}};
    if(p.status!=='pending')return {code:200,body:{code:13}};
    return {code:200,body:{code:match(p)?12:0}};
  }
  if(n.Status&&n.Status!=='Completed')return {code:200,body:{code:0}}; /* two-step payments: wait for the confirmation */
  const r=await credit(id,match);
  logResult('CloudPayments',id,r);
  return {code:r.busy?503:200,body:{code:0}};
}
function jwtOk(token){
  const parts=String(token||'').split('.');if(parts.length!==3)return null;
  let head,body;try{head=JSON.parse(Buffer.from(parts[0],'base64url'));body=JSON.parse(Buffer.from(parts[1],'base64url'))}catch(e){return null}
  if(!head||head.alg!=='HS256')return null;
  const sig=b64url(crypto.createHmac('sha256',TB.secret).update(parts[0]+'.'+parts[1]).digest());
  if(!safeEq(sig,parts[2]))return null;
  const now=Date.now()/1000;
  if(typeof body.exp!=='number'||body.exp<now-60)return null;
  if(typeof body.nbf==='number'&&body.nbf>now+60)return null;
  return body;
}
async function trybit(headers,raw){
  if(!PROVIDERS.crypto.on())return {code:404,body:{message:'off'}};
  const n=parseBody(raw,headers['content-type']);if(!n)return {code:400,body:{message:'bad body'}};
  if(!jwtOk(n.token)){console.warn('[pay] Trybit: bad or missing token');return {code:401,body:{message:'invalid token'}}}
  const inv=String(n.invoice_id||'').replace(/^INV-/,'');
  if(n.status!=='success')return {code:200,body:{message:'Postback received'}};
  const info=n.invoice_info&&typeof n.invoice_info==='object'?n.invoice_info:null;
  if(info&&/partial|canceled|created/.test(String(info.invoice_status||info.status||'')))return {code:200,body:{message:'Postback received'}};
  const p=(n.order_id&&await byId(String(n.order_id)))||(inv&&await byExt('crypto',inv));
  if(!p){console.warn('[pay] Trybit: unknown invoice',inv);return {code:200,body:{message:'Postback received'}}}
  const r=await credit(p.id,q=>q.provider!=='crypto'?'другой способ оплаты':(q.ext_id&&inv&&q.ext_id!==inv)?'другой счёт':null);
  logResult('Trybit',p.id,r);
  return {code:r.busy?503:200,body:{message:'Postback received'}};
}
function logResult(gw,id,r){
  if(r.ok)console.log(`[pay] ${gw}: ${id} оплачен, +$${r.p.amount} игроку ${r.p.steamid}`);
  else if(r.already)console.log(`[pay] ${gw}: ${id} уже был зачислен, повтор пропущен`);
  else if(r.err)console.warn(`[pay] ${gw}: ${id} НЕ зачислен: ${r.err}`);
}
async function webhook(provider,headers,raw,kind){
  if(!provider)provider=(headers['content-hmac']||headers['x-content-hmac'])?'cloudpayments':'trybit';
  if(provider==='cloudpayments')return cloudpayments(headers,raw,kind);
  if(provider==='trybit'||provider==='cryptocloud')return trybit(headers,raw);
  return {code:404,body:{error:'unknown provider'}};
}
module.exports={init,config,create,status,history,webhook,_credit:credit};
