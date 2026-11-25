'use client';
import BrandLogo from '../../components/brand-logo';
import Icon from '../../components/admin-icons';
import PasswordInput from '../../components/admin/password-input';

import {useState,useEffect} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {api} from '../../providers';
export default function Login(){
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[configured,setConfigured]=useState<boolean|null>(null),[staff,setStaff]=useState(false),[forgot,setForgot]=useState(false);const router=useRouter();
  useEffect(()=>{api('/api/admin/session/').then(d=>{setConfigured(d.configured);if(d.authenticated)router.replace('/admin');}).catch(()=>setError('Unable to reach the server. Please refresh.'));},[router]);
  return <main className="admin admin--login">
    <section className="login-brand" aria-label="AURZÉN studio">
      <BrandLogo variant="light"/>
      <div className="login-brand__copy">
        <p className="login-brand__title">Your private studio.</p>
        <ul>
          <li><Icon name="products"/>Products, photos and offers</li>
          <li><Icon name="orders"/>Cash-on-delivery orders</li>
          <li><Icon name="lock"/>Owner and staff accounts only</li>
        </ul>
      </div>
    </section>
    <section className="login-panel">
      {forgot?<Recover staff={staff} onBack={()=>{setForgot(false);setError('');}}/>:
      <form className="a-card login-card" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');const f=new FormData(e.currentTarget);try{await api('/api/admin/session/',{method:'POST',body:JSON.stringify({password:f.get('password'),...(staff?{username:String(f.get('username')||'')}:{})})});router.replace('/admin');router.refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>
        <div className="admin-eyebrow">The studio</div>
        <h1>Welcome back.</h1>
        <p>Sign in to manage your collection and orders.</p>
        {configured===false?<div className="form-error">Admin access is not configured. Set a unique ADMIN_PASSWORD of at least 16 characters in the repository root .env.development.local file for local development, or in the API runtime environment, and restart the server.</div>:<>{staff&&<label>Username<input name="username" required autoComplete="username" autoCapitalize="none" maxLength={60}/></label>}<label>{staff?"Password":"Admin password"}<PasswordInput name="password" required autoComplete="current-password" maxLength={256}/></label><button type="button" className="login-card__forgot" onClick={()=>{setForgot(true);setError('');}}>Forgot password?</button><button className="a-btn a-btn--primary login-card__submit" disabled={busy||configured===null}><Icon name="lock"/>{busy?'Signing in…':'Sign in'}</button><button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={()=>{setStaff(!staff);setError('');}}>{staff?'Owner sign-in':'Staff sign-in'}</button></>}
        {error&&<p className="form-error" role="alert">{error}</p>}
      </form>}
      <Link className="a-btn a-btn--ghost a-btn--sm login-back" href="/"><Icon name="storefront"/>Return to the storefront</Link>
    </section>
  </main>;
}

/** Forgot password. Owner: the hosting ADMIN_PASSWORD (Render → Environment) is the recovery key. Staff: the owner resets it. */
function Recover({staff,onBack}:{staff:boolean;onBack:()=>void}){
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);const router=useRouter();
  if(staff)return <div className="a-card login-card">
    <div className="admin-eyebrow">Forgot password</div>
    <h1>Ask the owner.</h1>
    <p>Staff passwords are reset by the store owner: they open Studio → Settings → Users &amp; roles, edit your account and set a temporary password. You choose your own password at your next sign-in.</p>
    <button type="button" className="a-btn a-btn--secondary login-card__submit" onClick={onBack}>Back to sign in</button>
  </div>;
  return <form className="a-card login-card" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);if(f.get('password')!==f.get('confirm')){setError('The new passwords do not match.');return;}setBusy(true);setError('');try{await api('/api/admin/session/',{method:'POST',body:JSON.stringify({action:'recover',key:f.get('key'),password:f.get('password')})});router.replace('/admin');router.refresh();}catch(err){setError((err as Error).message);}finally{setBusy(false);}}}>
    <div className="admin-eyebrow">Forgot password</div>
    <h1>Choose a new password.</h1>
    <p>Enter your recovery key: the <strong>ADMIN_PASSWORD</strong> value in your Render dashboard (your API service → Environment). Then pick a new password for the studio.</p>
    <label>Recovery key<PasswordInput name="key" required autoComplete="off" maxLength={256}/></label>
    <label>New password<PasswordInput name="password" required minLength={10} maxLength={200} autoComplete="new-password"/></label>
    <label>Repeat new password<PasswordInput name="confirm" required minLength={10} maxLength={200} autoComplete="new-password"/></label>
    <button className="a-btn a-btn--primary login-card__submit" disabled={busy}><Icon name="lock"/>{busy?'Saving…':'Save and sign in'}</button>
    <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={onBack}>Back to sign in</button>
    {error&&<p className="form-error" role="alert">{error}</p>}
  </form>;
}
