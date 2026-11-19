'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {activeAnnouncements,linkHref} from '@aurzen/shared/site';
import {useStore} from '../providers';

/** Studio → Announcement bar: one or more messages that fade slowly from one to the next. */
export default function AnnouncementBar(){
  const {site,categoryTree,now}=useStore();
  const items=activeAnnouncements(site,now||Date.now());
  const [index,setIndex]=useState(0);
  const seconds=site.announcement.interval;
  useEffect(()=>{
    if(items.length<2||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const timer=setInterval(()=>setIndex(i=>i+1),seconds*1000);
    return()=>clearInterval(timer);
  },[items.length,seconds]);
  if(!items.length)return null;
  const current=items[index%items.length];
  const body=<>{current.text}{current.detail&&<> <span>{current.detail}</span></>}</>;
  return <div className="announcement store-header-announcement announcement-rotator" key={current.id}>
    {current.link?<Link href={linkHref(current.link,categoryTree)}>{body}</Link>:body}
  </div>;
}
