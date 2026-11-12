'use client';
import BrandLogo from '../../components/brand-logo';

import {useState,useEffect} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {api} from '../../providers';
export default function Login(){
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[configured,setConfigured]=useState<boolean|null>(null);const router=useRouter();
  useEffect(()=>{api('/api/admin/session').then(d=>{setConfigured(d.configured);if(d.authenticated)router.replace('/admin');}).catch(()=>setError('Unable to reach the server. Please refresh.'));},[router]);
  return <main className="login-page"><BrandLogo/><form className="panel" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');const f=new FormData(e.currentTarget);try{await api('/api/admin/session',{method:'POST',body:JSON.stringify({password:f.get('password')})});router.replace('/admin');router.refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>
    <div className="eyebrow">THE STUDIO</div><h1>Welcome back.</h1><p>Sign in to manage your collection and orders.</p>
    {configured===false?<div className="form-error">Admin access is not configured. Set a unique ADMIN_PASSWORD of at least 16 characters in the repository root .env.development.local file for local development, or in the API runtime environment, and restart the server.</div>:<><label>Admin password<input name="password" type="password" required autoComplete="current-password" maxLength={256}/></label><button className="primary" disabled={busy||configured===null}>{busy?'Signing in…':'Sign in ↗'}</button></>}
    {error&&<p className="form-error" role="alert">{error}</p>}
  </form><Link className="text-link" href="/">Return to the storefront</Link></main>;
}
