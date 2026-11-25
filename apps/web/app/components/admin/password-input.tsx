'use client';
// Password field with an eye button to show or hide what was typed. Use it inside a <label>.
import {useState,type InputHTMLAttributes} from 'react';
import Icon from '../admin-icons';

export default function PasswordInput(props:Omit<InputHTMLAttributes<HTMLInputElement>,'type'>){
  const [shown,setShown]=useState(false);
  return <span className="pw-field">
    <input {...props} type={shown?'text':'password'} autoCapitalize="none" spellCheck={false}/>
    <button type="button" className="pw-field__toggle" aria-label={shown?'Hide password':'Show password'} aria-pressed={shown} title={shown?'Hide password':'Show password'} onClick={()=>setShown(s=>!s)}>
      <Icon name={shown?'eyeOff':'eye'}/>
    </button>
  </span>;
}
