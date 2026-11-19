'use client';
import {useState} from 'react';
import EditableCard,{EditableGroup} from './editable-card';

export type StaffAccount={id:string;username:string;name:string;role:'owner'|'staff';disabled:boolean;mustReset:boolean;created:string};
export type Me={id:string|null;name:string;role:'owner'|'staff';mustReset:boolean};
type Save=(data:Record<string,unknown>)=>Promise<void>;

/** Studio → Users & roles (owners only; the server checks this too). */
export default function UsersPanel({users,onSave}:{users:StaffAccount[];onSave:Save}){
  const [adding,setAdding]=useState(false);
  return <EditableGroup>
    <p className="hero-slide__hint"><strong>Owner</strong>: everything. <strong>Staff</strong>: orders, products (not prices or offers) and customers — no settings, storefront, marketing or accounts. You keep signing in with the main owner password; staff sign in with their username.</p>
    {users.map(u=><EditableCard key={u.id} title={u.name+' · @'+u.username} summary={(u.role==='owner'?'Owner':'Staff')+' · added '+new Date(u.created).toLocaleDateString('en-BD')+(u.mustReset?' · must choose a new password':'')} badge={u.disabled?{text:'Disabled',tone:'warn'}:{text:u.role==='owner'?'Owner':'Staff',tone:'on'}} initial={{name:u.name,username:u.username,role:u.role,disabled:u.disabled,password:''}}
      actions={<button type="button" className="a-btn a-btn--danger-ghost a-btn--sm" onClick={()=>{if(confirm('Remove the account '+u.username+'? They are signed out at once. Their past activity stays in the log.'))void onSave({action:'deleteUser',id:u.id});}}>Remove</button>}
      onSave={async v=>{await onSave({action:'saveUser',id:u.id,name:v.name,username:v.username,role:v.role,disabled:v.disabled});if(v.password)await onSave({action:'resetUserPassword',id:u.id,password:v.password});}}
      validate={v=>v.password&&v.password.length<10?'Temporary passwords need at least 10 characters.':''}
      render={(d,set)=><>
        <div className="form-pair"><label>Name<input value={d.name} maxLength={60} onChange={e=>set({...d,name:e.target.value})}/></label><label>Username<input value={d.username} maxLength={40} autoComplete="off" onChange={e=>set({...d,username:e.target.value.toLowerCase()})}/></label></div>
        <label>Role<select value={d.role} onChange={e=>set({...d,role:e.target.value as 'owner'|'staff'})}><option value="staff">Staff</option><option value="owner">Owner</option></select></label>
        <label className="ec-toggle"><input type="checkbox" checked={d.disabled} onChange={e=>set({...d,disabled:e.target.checked})}/><span>Disable this account (signs them out now)</span></label>
        <label>Set a new temporary password (optional)<input type="password" autoComplete="new-password" value={d.password} maxLength={200} onChange={e=>set({...d,password:e.target.value})}/><small className="hero-slide__hint">They must choose their own password at their next sign-in.</small></label>
      </>}/>)}
    {adding?<NewAccount onCancel={()=>setAdding(false)} onSave={async v=>{await onSave({action:'saveUser',...v});setAdding(false);}}/>:<button type="button" className="a-btn a-btn--secondary a-btn--sm" onClick={()=>setAdding(true)}>+ Add an account</button>}
  </EditableGroup>;
}
function NewAccount({onSave,onCancel}:{onSave:(v:Record<string,unknown>)=>Promise<void>;onCancel:()=>void}){
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  return <form className="a-card p-5 ec__fields" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);setError('');try{await onSave({name:f.get('name'),username:String(f.get('username')||'').toLowerCase(),role:f.get('role'),password:f.get('password')});}catch(err){setError((err as Error).message);}finally{setBusy(false);}}}>
    <h3 className="mt-0">New account</h3>
    <div className="form-pair"><label>Name<input name="name" required minLength={2} maxLength={60}/></label><label>Username<input name="username" required minLength={3} maxLength={40} pattern="[a-zA-Z0-9._\-]+" autoComplete="off"/></label></div>
    <div className="form-pair"><label>Role<select name="role" defaultValue="staff"><option value="staff">Staff</option><option value="owner">Owner</option></select></label><label>Temporary password<input name="password" type="password" required minLength={10} maxLength={200} autoComplete="new-password"/></label></div>
    <p className="hero-slide__hint">Give them the username and temporary password in person; they choose their own at the first sign-in.</p>
    {error&&<p className="form-error" role="alert">{error}</p>}
    <div className="ec__buttons"><button type="button" className="a-btn a-btn--ghost" disabled={busy} onClick={onCancel}>Cancel</button><button className="a-btn a-btn--primary" disabled={busy}>{busy?'Adding…':'Add account'}</button></div>
  </form>;
}
/** Shown instead of the studio until a staff member replaces their temporary password. */
export function ChangePassword({me,onSave}:{me:Me;onSave:Save}){
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  return <form className="a-card p-5 ec__fields change-password" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);if(f.get('password')!==f.get('confirm')){setError('The new passwords do not match.');return;}setBusy(true);setError('');try{await onSave({action:'changePassword',current:f.get('current'),password:f.get('password')});}catch(err){setError((err as Error).message);}finally{setBusy(false);}}}>
    <h2 className="mt-0">Choose your own password, {me.name}</h2>
    <p className="hero-slide__hint">Your account was given a temporary password. Choose a new one (at least 10 characters) to continue.</p>
    <label>Temporary password<input name="current" type="password" required autoComplete="current-password"/></label>
    <label>New password<input name="password" type="password" required minLength={10} maxLength={200} autoComplete="new-password"/></label>
    <label>Repeat new password<input name="confirm" type="password" required minLength={10} maxLength={200} autoComplete="new-password"/></label>
    {error&&<p className="form-error" role="alert">{error}</p>}
    <div className="ec__buttons"><button className="a-btn a-btn--primary" disabled={busy}>{busy?'Saving…':'Save new password'}</button></div>
  </form>;
}
