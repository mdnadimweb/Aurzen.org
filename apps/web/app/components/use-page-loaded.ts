'use client';
import {useEffect,useState} from 'react';
// True once the page has finished its first load. Carousels use it to hold back the photos of
// hidden slides: they sit inside the viewport, so loading="lazy" alone does not delay them, and
// they would otherwise compete with the first (visible) photo for bandwidth.
export function usePageLoaded(){
  const [loaded,setLoaded]=useState(false);
  useEffect(()=>{
    if(document.readyState==='complete'){setLoaded(true);return;}
    const done=()=>setLoaded(true);
    window.addEventListener('load',done,{once:true});
    return()=>window.removeEventListener('load',done);
  },[]);
  return loaded;
}
