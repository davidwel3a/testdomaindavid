import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
const ORIGIN = process.env.APP_ORIGIN || `http://localhost:${PORT}`;
const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SESSION_SECRET = process.env.SESSION_SECRET;
const COOKIE = 'riff_session';
const MAX_BODY = 24 * 1024;
const limits = new Map();
const MIME = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.ico':'image/x-icon' };

function ready() {
  let validUrl=false;
  try { const parsed=new URL(SUPABASE_URL||'');const local=['localhost','127.0.0.1'].includes(parsed.hostname);validUrl=['https:','http:'].includes(parsed.protocol)&&!parsed.hostname.startsWith('YOUR_')&&(local||parsed.hostname.endsWith('.supabase.co'))&&(parsed.protocol==='https:'||local); } catch {}
  const secretOk=Boolean(SESSION_SECRET&&SESSION_SECRET.length>=32&&!/^(REPLACE|YOUR)_/i.test(SESSION_SECRET));
  const keyOk=Boolean(SUPABASE_KEY&&!/^(YOUR_|REPLACE_)/i.test(SUPABASE_KEY));
  return Boolean(validUrl&&keyOk&&secretOk);
}
function send(res, status, data, headers={}) {
  res.writeHead(status, { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store', 'x-content-type-options':'nosniff', ...headers });
  res.end(JSON.stringify(data));
}
function cookieOptions(clear=false) {
  const bits = [`${COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (process.env.NODE_ENV === 'production') bits.push('Secure');
  if (clear) bits.push('Max-Age=0');
  else bits.push('Max-Age=2592000');
  return bits.join('; ');
}
function sessionKey() { return scryptSync(SESSION_SECRET, 'riff-session-cookie-v1', 32); }
function sealSession(value) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', sessionKey(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return [iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), body.toString('base64url')].join('.');
}
function openSession(value) {
  try {
    const [iv, tag, body] = value.split('.');
    const decipher = createDecipheriv('aes-256-gcm', sessionKey(), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(body, 'base64url')), decipher.final()]).toString());
  } catch { return null; }
}
function cookieValue(req) {
  const pair = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(`${COOKIE}=`));
  return pair ? decodeURIComponent(pair.slice(COOKIE.length + 1)) : null;
}
function rateLimit(req, res, key, max=12, windowMs=60000) {
  const now=Date.now(), ip=(req.socket.remoteAddress || 'unknown').replace(/^::ffff:/,'');
  const id=`${ip}:${key}`, item=limits.get(id);
  if (!item || item.until < now) { limits.set(id,{count:1,until:now+windowMs}); return false; }
  item.count++;
  if (item.count <= max) return false;
  send(res,429,{error:'Too many attempts. Wait a moment and try again.'},{'retry-after':String(Math.ceil((item.until-now)/1000))});
  return true;
}
async function readJson(req) {
  let raw='';
  for await (const chunk of req) { raw += chunk; if (raw.length > MAX_BODY) throw Object.assign(new Error('Request too large'),{status:413}); }
  if (!raw) return {};
  try { const data=JSON.parse(raw); if (!data || typeof data!=='object' || Array.isArray(data)) throw new Error(); return data; }
  catch { throw Object.assign(new Error('Invalid JSON body'),{status:400}); }
}
function validText(v,min,max) { return typeof v==='string' && v.trim().length>=min && v.trim().length<=max; }
function validUuid(v) { return typeof v==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v); }
function csrfOk(req) {
  const origin=req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(ORIGIN).origin; } catch { return false; }
}
async function supa(path, {method='GET',body,token,headers={}}={}) {
  const response=await fetch(`${SUPABASE_URL}${path}`,{
    method,
    headers:{'apikey':SUPABASE_KEY,'authorization':`Bearer ${token || SUPABASE_KEY}`,'content-type':'application/json',...headers},
    ...(body===undefined?{}:{body:JSON.stringify(body)})
  });
  const text=await response.text(); let data=null;
  try { data=text?JSON.parse(text):null; } catch { data={message:'Provider returned an invalid response'}; }
  if (!response.ok) {
    const err=new Error(data?.msg || data?.message || 'Request could not be completed');
    err.status=response.status; err.provider=data; throw err;
  }
  return data;
}
async function authSession(req,res) {
  const raw=cookieValue(req); if (!raw) return null;
  let session=openSession(raw); if (!session?.access_token) return null;
  if (session.expires_at && session.expires_at < Math.floor(Date.now()/1000)+60 && session.refresh_token && ready()) {
    try {
      const refreshed=await supa('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refresh_token}});
      session={...refreshed,expires_at:refreshed.expires_at || Math.floor(Date.now()/1000)+(refreshed.expires_in||3600)};
      res.setHeader('set-cookie',cookieOptions(false).replace(`${COOKIE}=`,`${COOKIE}=${sealSession(session)}`));
    } catch { res.setHeader('set-cookie',cookieOptions(true)); return null; }
  }
  return session;
}
function requireReady(res) { if (ready()) return true; send(res,503,{error:'Backend is not configured. Copy .env.example to .env and add your Supabase project values.'}); return false; }
async function requireSession(req,res) {
  const session=await authSession(req,res);
  if (!session?.access_token) { send(res,401,{error:'Sign in to continue.'}); return null; }
  return session;
}
async function db(path, session, options={}) { return supa(`/rest/v1/${path}`,{...options,token:session.access_token,headers:{prefer:options.prefer||'return=representation',...options.headers}}); }
function encodeCookie(res,session) { res.setHeader('set-cookie',cookieOptions(false).replace(`${COOKIE}=`,`${COOKIE}=${sealSession(session)}`)); }
function asPlaylist(row) { return {id:row.id,name:row.name,description:row.description,items:[],updated:row.updated_at}; }
function routePath(pathname) { return pathname.replace(/\/+$/,'') || '/'; }

async function api(req,res,url) {
  const path=routePath(url.pathname), method=req.method;
  if (path==='/api/health' && method==='GET') return send(res,200,{backend:ready(),mode:ready()?'supabase':'demo'});
  if (path==='/auth/callback' && method==='GET') {
    if(!requireReady(res))return true;
    const type=url.searchParams.get('type'), tokenHash=url.searchParams.get('token_hash');
    if(!tokenHash || !['signup','recovery','email','invite','magiclink'].includes(type||'')) { res.writeHead(303,{location:'/#/signin','cache-control':'no-store'}); return res.end(); }
    try {
      const data=await supa('/auth/v1/verify',{method:'POST',body:{token_hash:tokenHash,type}});
      encodeCookie(res,{...data,expires_at:data.expires_at||Math.floor(Date.now()/1000)+(data.expires_in||3600)});
      res.writeHead(303,{location:type==='recovery'?'/#/account':'/#/home','cache-control':'no-store'}); return res.end();
    } catch { res.writeHead(303,{location:'/#/signin?error=verification','cache-control':'no-store'}); return res.end(); }
  }
  if (!path.startsWith('/api/')) return false;
  if (!requireReady(res)) return true;
  if (method!=='GET' && !csrfOk(req)) return send(res,403,{error:'Request origin was not accepted.'});

  if (path==='/api/auth/signup' && method==='POST') {
    if (rateLimit(req,res,'signup',5)) return true;
    const b=await readJson(req);
    if (!validText(b.email,5,254) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email) || !validText(b.password,10,128)) return send(res,400,{error:'Enter a valid email and a password of at least 10 characters.'});
    try {
      const data=await supa('/auth/v1/signup?redirect_to='+encodeURIComponent(`${ORIGIN}/auth/callback`),{method:'POST',body:{email:b.email.trim().toLowerCase(),password:b.password,data:{display_name:validText(b.display_name||'',1,60)?b.display_name.trim():''}}});
      if(data?.access_token) encodeCookie(res,{...data,expires_at:data.expires_at||Math.floor(Date.now()/1000)+(data.expires_in||3600)});
      return send(res,202,{message:data?.access_token?'Account created.':'Check your email to verify the account.',user:data?.user?{id:data.user.id,email:data.user.email}:null});
    } catch(e) { return send(res,e.status===429?429:400,{error:'Could not create the account. Check the details and try again.'}); }
  }
  if (path==='/api/auth/login' && method==='POST') {
    if (rateLimit(req,res,'login',8)) return true;
    const b=await readJson(req);
    if (!validText(b.email,5,254) || !validText(b.password,1,128)) return send(res,400,{error:'Enter your email and password.'});
    try {
      const data=await supa('/auth/v1/token?grant_type=password',{method:'POST',body:{email:b.email.trim().toLowerCase(),password:b.password}});
      encodeCookie(res,{...data,expires_at:data.expires_at||Math.floor(Date.now()/1000)+(data.expires_in||3600)});
      return send(res,200,{user:{id:data.user.id,email:data.user.email}});
    } catch(e) { return send(res,e.status===429?429:401,{error:'Email or password was not accepted.'}); }
  }
  if (path==='/api/auth/recover' && method==='POST') {
    if (rateLimit(req,res,'recover',4)) return true;
    const b=await readJson(req); if(!validText(b.email,5,254)) return send(res,400,{error:'Enter your email address.'});
    try { await supa('/auth/v1/recover?redirect_to='+encodeURIComponent(`${ORIGIN}/auth/callback?type=recovery`),{method:'POST',body:{email:b.email.trim().toLowerCase()}}); }
    catch { /* Same response avoids revealing registered email addresses. */ }
    return send(res,200,{message:'If an account matches, a recovery link will arrive shortly.'});
  }
  if (path==='/api/auth/logout' && method==='POST') {
    const session=await authSession(req,res);
    if(session) { try { await supa('/auth/v1/logout',{method:'POST',token:session.access_token}); } catch { /* Expired sessions are cleared locally regardless. */ } }
    res.setHeader('set-cookie',cookieOptions(true)); return send(res,200,{ok:true});
  }
  if (path==='/api/auth/me' && method==='GET') {
    const session=await authSession(req,res); if(!session) return send(res,200,{user:null});
    try { const user=await supa('/auth/v1/user',{token:session.access_token}); return send(res,200,{user:{id:user.id,email:user.email,display_name:user.user_metadata?.display_name||''}}); }
    catch { res.setHeader('set-cookie',cookieOptions(true)); return send(res,200,{user:null}); }
  }
  if (path==='/api/auth/password' && method==='PATCH') {
    const session=await requireSession(req,res); if(!session)return true;
    const b=await readJson(req); if(!validText(b.password,10,128)) return send(res,400,{error:'Use at least 10 characters for the new password.'});
    try { await supa('/auth/v1/user',{method:'PUT',token:session.access_token,body:{password:b.password}}); return send(res,200,{ok:true}); }
    catch { return send(res,400,{error:'Password could not be updated.'}); }
  }
  if (path==='/api/auth/profile' && method==='PATCH') {
    const session=await requireSession(req,res); if(!session)return true;
    const b=await readJson(req);if(!validText(b.display_name,1,60))return send(res,400,{error:'Display name must contain 1 to 60 characters.'});
    try { const user=await supa('/auth/v1/user',{method:'PUT',token:session.access_token,body:{data:{display_name:b.display_name.trim()}}});return send(res,200,{display_name:user.user_metadata?.display_name||b.display_name.trim()}); }
    catch { return send(res,400,{error:'Display name could not be updated.'}); }
  }
  if (path==='/api/auth/account' && method==='DELETE') {
    const session=await requireSession(req,res); if(!session)return true;
    if(!SUPABASE_SERVICE_KEY)return send(res,503,{error:'Account deletion is not enabled. Configure SUPABASE_SERVICE_ROLE_KEY on the server first.'});
    try { const response=await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(session.user.id)}`,{method:'DELETE',headers:{apikey:SUPABASE_SERVICE_KEY,authorization:`Bearer ${SUPABASE_SERVICE_KEY}`}});if(!response.ok)return send(res,502,{error:'Account deletion could not be completed.'}); }
    catch { return send(res,502,{error:'Account deletion could not be completed.'}); }
    res.setHeader('set-cookie',cookieOptions(true));return send(res,200,{ok:true});
  }

  const session=await requireSession(req,res); if(!session)return true;
  if(path==='/api/library/saved' && method==='GET') {
    const rows=await db('saved_items?select=media_item_id,created_at&order=created_at.desc&limit=500',session);
    return send(res,200,{items:(rows||[]).map(x=>x.media_item_id)});
  }
  const savedMatch=path.match(/^\/api\/library\/saved\/([0-9a-f-]+)$/i);
  if(savedMatch && (method==='PUT'||method==='DELETE')) {
    if(!validUuid(savedMatch[1])) return send(res,400,{error:'Invalid media item.'});
    if(method==='PUT') await db('saved_items?on_conflict=user_id,media_item_id',session,{method:'POST',body:{user_id:session.user.id,media_item_id:savedMatch[1]},headers:{prefer:'resolution=merge-duplicates,return=minimal'}});
    else await db(`saved_items?media_item_id=eq.${savedMatch[1]}`,session,{method:'DELETE',headers:{prefer:'return=minimal'}});
    return send(res,200,{saved:method==='PUT'});
  }
  if(path==='/api/library/playlists' && method==='GET') {
    const rows=await db('playlists?select=id,name,description,updated_at&order=updated_at.desc&limit=200',session);
    return send(res,200,{items:(rows||[]).map(asPlaylist)});
  }
  if(path==='/api/library/playlists' && method==='POST') {
    const b=await readJson(req); if(!validText(b.name,1,100)) return send(res,400,{error:'Collection name must contain 1 to 100 characters.'});
    const rows=await db('playlists',session,{method:'POST',body:{user_id:session.user.id,name:b.name.trim(),description:typeof b.description==='string'?b.description.trim().slice(0,240):''}});
    return send(res,201,{playlist:asPlaylist(rows[0])});
  }
  const playlistMatch=path.match(/^\/api\/playlists\/([0-9a-f-]+)$/i);
  if(playlistMatch) {
    if(!validUuid(playlistMatch[1])) return send(res,400,{error:'Invalid collection.'});
    if(method==='GET') {
      const rows=await db(`playlists?id=eq.${playlistMatch[1]}&select=id,name,description,updated_at`,session);
      if(!rows.length)return send(res,404,{error:'Collection not found.'});
      const items=await db(`playlist_items?playlist_id=eq.${playlistMatch[1]}&select=id,media_item_id,position&order=position.asc`,session);
      return send(res,200,{playlist:{...asPlaylist(rows[0]),items:items||[]}});
    }
    if(method==='PATCH') {
      const b=await readJson(req); const patch={};
      if(b.name!==undefined){if(!validText(b.name,1,100))return send(res,400,{error:'Collection name must contain 1 to 100 characters.'});patch.name=b.name.trim();}
      if(b.description!==undefined){if(typeof b.description!=='string'||b.description.length>240)return send(res,400,{error:'Description is too long.'});patch.description=b.description.trim();}
      if(!Object.keys(patch).length)return send(res,400,{error:'No collection details were provided.'});patch.updated_at=new Date().toISOString();
      const rows=await db(`playlists?id=eq.${playlistMatch[1]}`,session,{method:'PATCH',body:patch});
      if(!rows.length)return send(res,404,{error:'Collection not found.'});return send(res,200,{playlist:asPlaylist(rows[0])});
    }
    if(method==='DELETE') { await db(`playlists?id=eq.${playlistMatch[1]}`,session,{method:'DELETE',headers:{prefer:'return=minimal'}});return send(res,200,{ok:true}); }
  }
  const itemsMatch=path.match(/^\/api\/playlists\/([0-9a-f-]+)\/items$/i);
  if(itemsMatch) {
    if(!validUuid(itemsMatch[1]))return send(res,400,{error:'Invalid collection.'});
    if(method==='POST') { const b=await readJson(req);if(!validUuid(b.media_item_id))return send(res,400,{error:'Invalid media item.'});if(b.position!==undefined)return send(res,400,{error:'This endpoint appends items; positional insertion is not enabled yet.'});const rows=await db('rpc/append_playlist_item',session,{method:'POST',body:{p_playlist_id:itemsMatch[1],p_media_item_id:b.media_item_id}});return send(res,201,{item:Array.isArray(rows)?rows[0]:rows}); }
    if(method==='GET') { const rows=await db(`playlist_items?playlist_id=eq.${itemsMatch[1]}&select=id,media_item_id,position&order=position.asc`,session);return send(res,200,{items:rows||[]}); }
  }
  const itemMatch=path.match(/^\/api\/playlists\/([0-9a-f-]+)\/items\/([0-9a-f-]+)$/i);
  if(itemMatch&&method==='DELETE') { if(!validUuid(itemMatch[1])||!validUuid(itemMatch[2]))return send(res,400,{error:'Invalid playlist item.'});await db(`playlist_items?id=eq.${itemMatch[2]}&playlist_id=eq.${itemMatch[1]}`,session,{method:'DELETE',headers:{prefer:'return=minimal'}});return send(res,200,{ok:true}); }
  return send(res,404,{error:'API route not found.'});
}

async function handler(req,res) {
  res.setHeader('x-content-type-options','nosniff');
  res.setHeader('referrer-policy','strict-origin-when-cross-origin');
  res.setHeader('x-frame-options','DENY');
  res.setHeader('content-security-policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; media-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
  const url=new URL(req.url,ORIGIN);
  try {
    const handled=await api(req,res,url);if(handled!==false)return;
    if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,{error:'Method not allowed.'},{allow:'GET, HEAD'});
    let pathname=decodeURIComponent(url.pathname); if(pathname==='/')pathname='/index.html';
    if(!['/index.html','/app.css','/app.js','/replica/design/tokens.css'].includes(pathname))return send(res,404,{error:'Not found.'});
    const file=resolve(ROOT,'.'+pathname);
    if(file!==ROOT && !file.startsWith(ROOT+sep))return send(res,404,{error:'Not found.'});
    let info;try{info=await stat(file);}catch{return send(res,404,{error:'Not found.'});}
    const target=info.isDirectory()?resolve(file,'index.html'):file;
    res.writeHead(200,{'content-type':MIME[extname(target)]||'application/octet-stream','cache-control':target.endsWith('.html')?'no-cache':'public, max-age=300','x-content-type-options':'nosniff'});
    if(req.method==='HEAD')return res.end();
    createReadStream(target).pipe(res);
  } catch(error) {
    if(error.provider) return send(res,502,{error:'The data service could not complete this request.'});
    const status=error.status&&error.status<500?error.status:500;
    if(status===500) console.error('Request failed:',req.method,url.pathname);
    if(!res.headersSent)send(res,status,{error:status===500?'The request could not be completed.':error.message});else res.destroy();
  }
}

if(!ready() && process.env.NODE_ENV==='production') { console.error('Supabase URL/key and SESSION_SECRET must be configured before production startup.'); process.exit(1); }
createServer(handler).listen(PORT,HOST,()=>console.log(`Riff server listening on ${HOST}:${PORT}`));
