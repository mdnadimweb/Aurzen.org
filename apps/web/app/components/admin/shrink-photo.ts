// Full-resolution photos from a phone or camera are often bigger than the upload limit (4 MB, 25 megapixels).
// Before uploading, the browser makes such a photo smaller (longest side 2400 px, which is still more than the
// 1600 px the server keeps), so any photo can be uploaded straight from the device. Photos that already fit
// are uploaded untouched. The server still checks and re-encodes every photo.
import {maxImageBytes} from '@aurzen/shared/upload-limits';

export const photoTypes=['image/jpeg','image/png','image/webp'];
export const maxSourceMegabytes=50;
const maxSourceBytes=maxSourceMegabytes*1024*1024,longestSide=2400,maxPixels=24_000_000;

function encode(canvas:HTMLCanvasElement,type:string,quality:number){
  return new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,type,quality));
}

/** Returns the photo ready to upload, or throws a message for the person uploading. */
export async function shrinkPhoto(file:File):Promise<File>{
  if(!photoTypes.includes(file.type))throw new Error(file.name+': choose a JPG, PNG or WebP photo.');
  if(file.size===0)throw new Error(file.name+': this file is empty.');
  if(file.size>maxSourceBytes)throw new Error(file.name+`: photos over ${maxSourceMegabytes} MB are not supported.`);
  let bitmap:ImageBitmap;
  try{bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});}
  catch{
    // The browser cannot read it; small files still go to the server, which may manage.
    if(file.size<=maxImageBytes)return file;
    throw new Error(file.name+': this photo could not be read. Try saving it as a JPG first.');
  }
  try{
    const {width,height}=bitmap;
    if(file.size<=maxImageBytes&&width*height<=maxPixels&&Math.max(width,height)<=longestSide*1.5)return file;
    const scale=Math.min(1,longestSide/Math.max(width,height));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
    const context=canvas.getContext('2d');
    if(!context)throw new Error(file.name+': this browser could not resize the photo.');
    context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
    // PNG may be transparent: keep that with WebP where the browser can write it; otherwise use a white background and JPG.
    let type='image/jpeg';
    if(file.type==='image/png'){const probe=await encode(canvas,'image/webp',0.9);if(probe?.type==='image/webp')type='image/webp';}
    if(type==='image/jpeg'){context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);}
    context.drawImage(bitmap,0,0,canvas.width,canvas.height);
    for(const quality of [0.9,0.82,0.72]){
      const blob=await encode(canvas,type,quality);
      if(blob&&blob.size>0&&blob.size<=maxImageBytes){
        const name=file.name.replace(/\.[^.]+$/,'')+(type==='image/webp'?'.webp':'.jpg');
        return new File([blob],name,{type,lastModified:file.lastModified});
      }
    }
    throw new Error(file.name+': this photo could not be made small enough. Try a smaller copy.');
  }finally{bitmap.close();}
}
