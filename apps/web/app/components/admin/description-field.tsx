'use client';
// Product description with simple, safe formatting: **bold**, "- " bullet lists and "## " headings,
// the same formatting the Pages section uses. A small toolbar inserts it; Preview shows the result.
import {useRef,useState} from 'react';
import {renderMarkdown} from '@aurzen/shared/site';

type Kind='bold'|'list'|'heading';

/** Applies one toolbar action to the selected text and returns the new text and selection. */
export function formatText(value:string,start:number,end:number,kind:Kind){
  const chosen=value.slice(start,end);
  if(kind==='bold'){
    const inner=chosen||'bold text';
    const next=value.slice(0,start)+'**'+inner+'**'+value.slice(end);
    return {value:next,start:start+2,end:start+2+inner.length};
  }
  // Lists and headings work on whole lines, each in its own paragraph block.
  const lineStart=value.lastIndexOf('\n',start-1)+1,lineEnd=(()=>{const i=value.indexOf('\n',end);return i<0?value.length:i;})();
  const lines=value.slice(lineStart,lineEnd).split('\n');
  // A heading is one line: the first selected line becomes the heading, the rest stays as it was below it.
  const [first,...rest]=lines;
  const done=kind==='list'?lines.map(l=>l.trim()?(/^[-*] /.test(l)?l:'- '+l.replace(/^#{2,3} /,'')):'- '):['## '+(first.replace(/^#{2,3} |^[-*] /,'').trim()||'Heading'),...(rest.length?['',...rest]:[])];
  let before=value.slice(0,lineStart),after=value.slice(lineEnd);
  // A list or heading needs a blank line around it to stand on its own.
  if(before&&!before.endsWith('\n\n'))before=before.replace(/\n?$/,'\n\n');
  if(after&&!after.startsWith('\n\n'))after=after.replace(/^\n?/,'\n\n');
  const block=done.join('\n');
  return {value:before+block+after,start:before.length,end:before.length+block.length};
}

export default function DescriptionField({initial}:{initial:string}){
  const [value,setValue]=useState(initial),[preview,setPreview]=useState(false);
  const area=useRef<HTMLTextAreaElement>(null);
  const apply=(kind:Kind)=>{
    const el=area.current;if(!el)return;
    const result=formatText(value,el.selectionStart,el.selectionEnd,kind);
    if(result.value.length>3000)return;
    setValue(result.value);
    requestAnimationFrame(()=>{el.focus();el.setSelectionRange(result.start,result.end);});
  };
  return <div className="desc-field">
    <div className="desc-field__bar" role="toolbar" aria-label="Description formatting">
      <button type="button" className="a-btn a-btn--ghost a-btn--sm" disabled={preview} onClick={()=>apply('bold')} aria-label="Bold"><strong>B</strong> Bold</button>
      <button type="button" className="a-btn a-btn--ghost a-btn--sm" disabled={preview} onClick={()=>apply('list')} aria-label="Bullet list">• List</button>
      <button type="button" className="a-btn a-btn--ghost a-btn--sm" disabled={preview} onClick={()=>apply('heading')} aria-label="Small heading">H Heading</button>
      <span className="desc-field__spacer"/>
      <button type="button" className="a-btn a-btn--secondary a-btn--sm" aria-pressed={preview} onClick={()=>setPreview(p=>!p)}>{preview?'Edit':'Preview'}</button>
    </div>
    <label className={preview?'sr-only':undefined}>Description<textarea ref={area} name="description" value={value} onChange={e=>setValue(e.target.value)} maxLength={3000} rows={8} placeholder={'Soft cotton co-ord for everyday wear.\n\n## Details\n\n- Relaxed fit\n- **Machine wash** cold'}/></label>
    {preview&&<div className="desc-field__preview rich" aria-live="polite">{value.trim()?<div dangerouslySetInnerHTML={{__html:renderMarkdown(value)}}/>:<p className="desc-field__empty">Nothing to preview yet.</p>}</div>}
    <small className="desc-field__help">{value.length}/3000 · Select text and press a button, or type **bold**, “- ” for a bullet and “## ” for a heading. Leave an empty line between paragraphs.</small>
  </div>;
}
