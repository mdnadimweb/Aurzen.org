'use client';
import BrandLogo from '../../components/brand-logo';
import Icon from '../../components/admin-icons';

import {useState,useEffect} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {api} from '../../providers';
export default function Login(){
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[configured,setConfigured]=useState<boolean|null>(null);const router=useRouter();
  useEffect(()=>{api('/api/admin/session').then(d=>{setConfigured(d.configured);if(d.authenticated)router.replace('/admin');}).catch(()=>setError('Unable to reach the server. Please refresh.'));},[router]);
  return <main className="admin admin--login">
    <section className="login-brand" aria-label="AURZÉN studio">
      <BrandLogo/>
      <div className="login-brand__copy">
        <p className="login-brand__title">Your private studio.</p>
        <ul>
          <li><Icon name="products"/>Products, photos and offers</li>
          <li><Icon name="orders"/>Cash-on-delivery orders</li>
          <li><Icon name="lock"/>Owner access only</li>
        </ul>
      </div>
    </section>
    <section className="login-panel">
      <form className="a-card login-card" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');const f=new FormData(e.currentTarget);try{await api('/api/admin/session',{method:'POST',body:JSON.stringify({password:f.get('password')})});router.replace('/admin');router.refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>
        <div className="admin-eyebrow">The studio</div>
        <h1>Welcome back.</h1>
        <p>Sign in to manage your collection and orders.</p>
        {configured===false?<div className="form-error">Admin access is not configured. Set a unique ADMIN_PASSWORD of at least 16 characters in the repository root .env.development.local file for local development, or in the API runtime environment, and restart the server.</div>:<><label>Admin password<input name="password" type="password" required autoComplete="current-password" maxLength={256}/></label><button className="a-btn a-btn--primary login-card__submit" disabled={busy||configured===null}><Icon name="lock"/>{busy?'Signing in…':'Sign in'}</button></>}
        {error&&<p className="form-error" role="alert">{error}</p>}
      </form>
      <Link className="a-btn a-btn--ghost a-btn--sm login-back" href="/"><Icon name="storefront"/>Return to the storefront</Link>
    </section>
  </main>;
}
