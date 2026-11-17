import type {MetadataRoute} from 'next';

// Home-screen name and icons (the AURZÉN "A" emblem on the brand burgundy).
export default function manifest():MetadataRoute.Manifest{
  return {name:'AURZÉN',short_name:'AURZÉN',start_url:'/',display:'browser',background_color:'#fbf9f5',theme_color:'#380818',
    icons:[{src:'/brand/icon-192.png',sizes:'192x192',type:'image/png'},{src:'/brand/icon-512.png',sizes:'512x512',type:'image/png'}]};
}
