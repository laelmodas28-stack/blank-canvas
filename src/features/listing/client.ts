import { supabase } from '@/integrations/supabase/client';
import { zipSync } from 'fflate';
export const bucket = 'intelligent-listings';
export async function callListing(action: 'analyze'|'text'|'image'|'approve'|'duplicate'|'delete', listingId: string, revision?: string, position?: number) {
 const {data,error}=await supabase.functions.invoke('intelligent-listing',{body:{action,listingId,revision,position}});
 if(error){ let message=error.message; if('context' in error && error.context instanceof Response){try{const body=await error.context.json();message=body.error??message;}catch{/* preserve transport error */}}throw new Error(message); }
 if(data?.error)throw new Error(data.error);return data;
}
export async function signedPhoto(path: string) { const {data,error}=await supabase.storage.from(bucket).createSignedUrl(path,3600);if(error)throw error;return data.signedUrl; }
export async function photoBlob(path: string, format: 'png'|'jpg') {
 const {data,error}=await supabase.storage.from(bucket).download(path);if(error)throw error;
 const bitmap=await createImageBitmap(data);const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1200;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Não foi possível exportar a imagem.');ctx.drawImage(bitmap,0,0,1200,1200);bitmap.close();
 return new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Falha ao exportar a foto.')),format==='jpg'?'image/jpeg':'image/png',.95));
}
export function saveBlob(blob: Blob,name: string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
export async function zipPhotos(images: {path:string;position:number}[],name:string){const files:Record<string,Uint8Array>={};for(const image of images)files[`${image.position+1}.png`]=new Uint8Array(await (await photoBlob(image.path,'png')).arrayBuffer());saveBlob(new Blob([zipSync(files).buffer as ArrayBuffer],{type:'application/zip'}),`${name}.zip`);}
