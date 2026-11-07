import { readdir, readFile } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const migrationsDir=resolve(root,'migrations');
const connectionString=process.env.DATABASE_URL;
if(!connectionString){console.error('DATABASE_URL is missing. Add your Supabase Postgres connection string to .env.');process.exit(1)}

let parsed;
try { parsed=new URL(connectionString); if(!['postgres:','postgresql:'].includes(parsed.protocol))throw new Error(); }
catch { console.error('DATABASE_URL must be a valid postgresql:// connection string.');process.exit(1); }

const env={...process.env,
  PGHOST:parsed.hostname,
  PGPORT:parsed.port||'5432',
  PGDATABASE:decodeURIComponent(parsed.pathname.slice(1))||'postgres',
  PGUSER:decodeURIComponent(parsed.username),
  PGPASSWORD:decodeURIComponent(parsed.password),
  PGSSLMODE:parsed.searchParams.get('sslmode')||'require',
  PGCONNECT_TIMEOUT:'10'
};

function runPsql(args, input) {
  return new Promise((resolvePromise,reject)=>{
    const child=spawn('psql',args,{env,stdio:['pipe','inherit','inherit'],windowsHide:true});
    child.on('error',error=>reject(new Error(`Could not start psql (${error.message}). Install the PostgreSQL command-line tools and retry.`)));
    child.on('close',code=>code===0?resolvePromise():reject(new Error(`psql exited with status ${code}.`)));
    if(input)child.stdin.end(input);else child.stdin.end();
  });
}

await runPsql(['-X','-v','ON_ERROR_STOP=1','-c','create table if not exists public.schema_migrations (version text primary key, applied_at timestamptz not null default now())']);
const files=(await readdir(migrationsDir)).filter(name=>/^\d{3}_[a-z0-9_-]+\.sql$/i.test(name)).sort();
for(const file of files){
  const version=basename(file,'.sql');
  const check=`select exists(select 1 from public.schema_migrations where version='${version}')`;
  const result=await new Promise((resolvePromise,reject)=>{
    const child=spawn('psql',['-X','-qAt','-v','ON_ERROR_STOP=1','-c',check],{env,stdio:['ignore','pipe','inherit'],windowsHide:true});
    let output='';child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>output+=chunk);
    child.on('error',reject);child.on('close',code=>code===0?resolvePromise(output.trim()):reject(new Error(`Could not check migration ${version}.`)));
  });
  if(result==='t'){console.log(`skip ${version} (already applied)`);continue;}
  console.log(`apply ${version}`);
  const sql=await readFile(resolve(migrationsDir,file),'utf8');
  const transactionSql=`${sql}\ninsert into public.schema_migrations(version) values ('${version}') on conflict do nothing;\n`;
  await runPsql(['-X','-v','ON_ERROR_STOP=1','--single-transaction','--file','-'],transactionSql);
}
console.log('Database migrations are up to date.');
