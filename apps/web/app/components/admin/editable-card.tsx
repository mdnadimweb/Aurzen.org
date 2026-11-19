'use client';
import {createContext,useContext,useEffect,useId,useRef,useState,type ReactNode} from 'react';

/** Only one card in a group is open at a time. Opening another asks first if the open one has unsaved changes. */
type Group={open:string|null;request:(id:string|null)=>boolean;setDirty:(id:string,dirty:boolean)=>void};
const CardGroup=createContext<Group|null>(null);
const discard='Discard your unsaved changes?';
export function EditableGroup({children}:{children:ReactNode}){
  const [open,setOpen]=useState<string|null>(null);
  const dirty=useRef(new Set<string>());
  const request=(id:string|null)=>{
    if(open&&open!==id&&dirty.current.has(open)&&!confirm(discard))return false;
    if(open&&open!==id)dirty.current.delete(open);
    setOpen(id);return true;
  };
  // Leaving the page (reload, close tab) with unsaved changes asks first.
  useEffect(()=>{
    const warn=(e:BeforeUnloadEvent)=>{if(dirty.current.size){e.preventDefault();e.returnValue='';}};
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[]);
  return <CardGroup.Provider value={{open,request,setDirty:(id,d)=>{if(d)dirty.current.add(id);else dirty.current.delete(id);}}}><div className="ec-group">{children}</div></CardGroup.Provider>;
}

/** Collapsed summary row; Edit opens the form inline. Save validates on the server, then collapses.
 *  value/initial are compared to know whether there is anything to save. */
export default function EditableCard<T>({title,summary,thumb,badge,initial,render,onSave,onReset,actions,validate}:{
  title:string;summary?:ReactNode;thumb?:string;badge?:{text:string;tone?:'on'|'off'|'warn'};initial:T;
  render:(draft:T,set:(next:T)=>void,busy:boolean)=>ReactNode;onSave:(value:T)=>Promise<void>;onReset?:()=>Promise<void>;
  /** Quick actions shown on the collapsed row (toggle, reorder, delete). */
  actions?:ReactNode;validate?:(value:T)=>string;
}){
  const id=useId(),group=useContext(CardGroup);
  const [localOpen,setLocalOpen]=useState(false);
  const open=group?group.open===id:localOpen;
  const [draft,setDraft]=useState<T>(initial),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const editButton=useRef<HTMLButtonElement>(null),panel=useRef<HTMLDivElement>(null);
  const dirty=JSON.stringify(draft)!==JSON.stringify(initial);
  const problem=validate?.(draft)||'';
  useEffect(()=>{if(!open)setDraft(initial);},[initial,open]);
  useEffect(()=>{group?.setDirty(id,open&&dirty);},[open,dirty]);
  const setOpen=(next:boolean)=>{if(group)return group.request(next?id:null);setLocalOpen(next);return true;};
  const close=(force=false)=>{
    if(!force&&dirty&&!confirm(discard))return;
    group?.setDirty(id,false);setDraft(initial);setError('');setOpen(false);
    requestAnimationFrame(()=>editButton.current?.focus());
  };
  useEffect(()=>{if(open)requestAnimationFrame(()=>panel.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus());},[open]);
  async function save(){
    if(busy||!dirty||problem)return;
    setBusy(true);setError('');
    try{await onSave(draft);group?.setDirty(id,false);setOpen(false);requestAnimationFrame(()=>editButton.current?.focus());}
    catch(e){setError((e as Error).message);}
    finally{setBusy(false);}
  }
  return <section className={'ec'+(open?' is-open':'')}>
    <div className="ec__row">
      {thumb!==undefined&&<span className="ec__thumb" aria-hidden="true">{thumb&&<img src={thumb} alt="" loading="lazy"/>}</span>}
      <div className="ec__text"><h3>{title}</h3>{summary&&<p>{summary}</p>}</div>
      {badge&&<span className={'ec__badge ec__badge--'+(badge.tone||'on')}>{badge.text}</span>}
      {actions&&<div className="ec__actions">{actions}</div>}
      <button ref={editButton} type="button" className="a-btn a-btn--secondary a-btn--sm" aria-expanded={open} aria-controls={id+'-panel'} onClick={()=>open?close():setOpen(true)}>{open?'Close':'Edit'}</button>
    </div>
    {open&&<div id={id+'-panel'} ref={panel} className="ec__panel" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();close();}}}>
      <form onSubmit={e=>{e.preventDefault();void save();}}>
        <fieldset disabled={busy} className="ec__fields">{render(draft,setDraft,busy)}</fieldset>
        {(error||(dirty&&problem))&&<p className="form-error" role="alert">{error||problem}</p>}
        <div className="ec__buttons">
          {onReset&&<button type="button" className="a-btn a-btn--ghost a-btn--sm ec__reset" disabled={busy} onClick={async()=>{if(!confirm('Restore the original content for this section?'))return;setBusy(true);setError('');try{await onReset();group?.setDirty(id,false);setOpen(false);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>Restore default</button>}
          <button type="button" className="a-btn a-btn--ghost" disabled={busy} onClick={()=>close()}>Cancel</button>
          <button className="a-btn a-btn--primary" disabled={busy||!dirty||!!problem}>{busy?'Saving…':'Save changes'}</button>
        </div>
      </form>
    </div>}
  </section>;
}

/** Up/down reorder plus remove for list rows inside an open editor (keyboard and touch friendly). */
export function RowTools({index,count,onMove,onRemove,label}:{index:number;count:number;onMove:(from:number,to:number)=>void;onRemove?:()=>void;label:string}){
  return <span className="ec-rowtools">
    <button type="button" className="a-btn a-btn--ghost a-btn--sm" disabled={index===0} aria-label={'Move '+label+' up'} onClick={()=>onMove(index,index-1)}>↑</button>
    <button type="button" className="a-btn a-btn--ghost a-btn--sm" disabled={index===count-1} aria-label={'Move '+label+' down'} onClick={()=>onMove(index,index+1)}>↓</button>
    {onRemove&&<button type="button" className="a-btn a-btn--danger-ghost a-btn--sm" aria-label={'Remove '+label} onClick={()=>{if(confirm('Remove '+label+'?'))onRemove();}}>Remove</button>}
  </span>;
}
export const move=<T,>(list:T[],from:number,to:number)=>{const next=[...list];const [item]=next.splice(from,1);next.splice(to,0,item);return next;};
export const newId=(prefix='item')=>prefix+'-'+Math.random().toString(36).slice(2,8);
