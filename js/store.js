/* Local cache plus optional Firebase shared-data adapter. */
const KEY='silver-erp-v2';
const config=window.SILVER_ERP_CONFIG||{};
const firebaseConfig=config.firebaseConfig||{};
const supabaseConfig=config.supabase||{};
const enabled=Boolean(firebaseConfig.projectId&&firebaseConfig.apiKey&&firebaseConfig.appId&&firebaseConfig.projectId!=='YOUR_PROJECT_ID');
const supabaseEnabled=Boolean((supabaseConfig.url||config.supabaseUrl)&&(supabaseConfig.key||config.supabaseKey));
let firebaseReady=null;
let firestoreDb=null;
let storageApi=null;
let authApi=null;

async function ensureFirebase(){
  if(!enabled)return null;
  if(firebaseReady)return firebaseReady;
  if(!window.firebase)throw Error('Firebase SDK not loaded');
  firebaseReady=(async()=>{
    const app=window.firebase.apps.length?window.firebase.app():window.firebase.initializeApp(firebaseConfig);
    authApi=window.firebase.auth();
    firestoreDb=window.firebase.firestore();
    storageApi=window.firebase.storage();
    try{
      if(!authApi.currentUser)await authApi.signInAnonymously();
    }catch(e){
      console.warn('Firebase auth unavailable; continuing with local cache.',e);
    }
    return {app,auth:authApi,db:firestoreDb,storage:storageApi};
  })();
  return firebaseReady;
}

async function syncCloud(data=dbData()){
  if(!enabled)return;
  try{
    const {db}=await ensureFirebase();
    const docRef=db.collection(config.firebaseCollection||'silver_erp_app').doc('state');
    await docRef.set({shops:data.shops||[],silverEntries:data.silverEntries||[],updatedAt:window.firebase.firestore.FieldValue.serverTimestamp()}, {merge:true});
  }catch(e){
    console.warn('Cloud sync pending.',e);
  }
}

function dbData(){return JSON.parse(localStorage.getItem(KEY)||'{"shops":[],"silverEntries":[]}')}

function inferOutputType(file){
  const type=file?.type||'';
  if(type.includes('jpeg')||type.includes('jpg')) return 'image/jpeg';
  if(type.includes('png')) return 'image/png';
  if(type.includes('webp')) return 'image/webp';
  return 'image/webp';
}

async function compressImage(file, opts={maxWidth:2048,maxHeight:2048,quality:0.95,outputType:'image/webp'}){
  if(!file) return null;
  let imageBitmap = null;
  try{ imageBitmap = await createImageBitmap(file); }catch(e){ imageBitmap = null }
  let imgWidth = imageBitmap?.width || 0;
  let imgHeight = imageBitmap?.height || 0;
  if(!imgWidth || !imgHeight){
    const url = URL.createObjectURL(file);
    try{
      const img = await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url;i.crossOrigin='anonymous'});
      imgWidth = img.width; imgHeight = img.height;
      const canvas = document.createElement('canvas');
      const ratio = Math.min(1, (opts.maxWidth||2048)/imgWidth, (opts.maxHeight||2048)/imgHeight);
      canvas.width = Math.round(imgWidth * ratio);
      canvas.height = Math.round(imgHeight * ratio);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      const outType = opts.outputType || inferOutputType(file);
      const quality = outType==='image/png'?undefined:opts.quality||0.95;
      const blob = await new Promise(res=>canvas.toBlob(res, outType, quality));
      return blob || file;
    }finally{ URL.revokeObjectURL(url) }
  }
  let w = imgWidth, h = imgHeight;
  const ratio = Math.min(1, (opts.maxWidth||2048)/w, (opts.maxHeight||2048)/h);
  w = Math.round(w * ratio); h = Math.round(h * ratio);
  const canvas = (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(w,h) : document.createElement('canvas');
  if(!(canvas instanceof OffscreenCanvas)){ canvas.width = w; canvas.height = h }
  const ctx = canvas.getContext('2d');
  if(imageBitmap){ ctx.drawImage(imageBitmap,0,0,w,h); }
  else{
    const url = URL.createObjectURL(file);
    try{ const img = await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url;i.crossOrigin='anonymous'}); ctx.drawImage(img,0,0,w,h); }
    finally{ URL.revokeObjectURL(url) }
  }
  const outType = opts.outputType || inferOutputType(file);
  const quality = outType==='image/png'?undefined:opts.quality||0.95;
  if(canvas.convertToBlob) return await canvas.convertToBlob({type:outType,quality});
  const blob = await new Promise(res=>canvas.toBlob(res, outType, quality));
  return blob || file;
}

export const db={
  async init(){
    if(!localStorage.getItem(KEY))this.save({shops:[],silverEntries:[]});
    if(!enabled)return;
    try{
      const {db}=await ensureFirebase();
      const snap=await db.collection(config.firebaseCollection||'silver_erp_app').doc('state').get();
      if(snap.exists){
        const data=snap.data()||{};
        this.save({shops:data.shops||[],silverEntries:data.silverEntries||[]});
      }
    }catch(e){
      console.warn('Cloud data unavailable; using this device cache.',e);
    }
  },
  get(){return dbData()},
  save(data){localStorage.setItem(KEY,JSON.stringify(data)); void syncCloud(data);},
  list(type){return this.get()[type]||[]},
  shop(id){return this.list('shops').find(x=>x.id===id)},
  upsert(type,item){
    let d=this.get(),a=d[type]||[];
    item.id=item.id||crypto.randomUUID();
    let i=a.findIndex(x=>x.id===item.id);
    if(i>=0)a[i]=item;else a.unshift(item);
    d[type]=a;
    this.save(d);
    this.push(type,item);
    return item;
  },
  async remove(type,id){
    let d=this.get();
    let a=d[type]||[];
    const item=a.find(x=>x.id===id);
    if(type==='silverEntries' && item?.imageUrl){
      try{await this.deleteImage(item.imageUrl)}catch(e){console.warn('Image deletion failed.',e)}
    }
    d[type]=a.filter(x=>x.id!==id);
    this.save(d);
    this.deleteCloud(type,id);
  },
  async push(type,payload){
    if(!enabled)return;
    try{await syncCloud()}catch(e){console.warn('Cloud sync pending.',e)}
  },
  async deleteCloud(type,id){
    if(!enabled)return;
    try{await syncCloud()}catch(e){console.warn('Cloud deletion pending.',e)}
  },
  async deleteImage(imageUrl){
    if(!imageUrl || imageUrl.startsWith('data:')) return;
    if(supabaseEnabled){
      const supabaseUrl = supabaseConfig.url || config.supabaseUrl;
      const bucket = supabaseConfig.bucket || config.supabaseBucket || 'public';
      const publicBase = `${(supabaseUrl||'').replace(/\/$/, '')}/storage/v1/object/public/${bucket}/`;
      if(imageUrl.startsWith(publicBase)){
        const path = decodeURIComponent(imageUrl.slice(publicBase.length));
        const deleteUrl = `${(supabaseUrl||'').replace(/\/$/, '')}/storage/v1/object/${bucket}/${encodeURIComponent(path)}`;
        const supabaseKey = supabaseConfig.key || config.supabaseKey;
        const res = await fetch(deleteUrl, {method:'DELETE', headers:{'Authorization':`Bearer ${supabaseKey}`}});
        if(!res.ok) throw new Error('Supabase delete failed '+res.status);
        return;
      }
    }
    if(enabled){
      const {storage}=await ensureFirebase();
      try{
        const ref = storage.refFromURL(imageUrl);
        await ref.delete();
        return;
      }catch(e){
        console.warn('Could not delete image from Firebase storage.',e);
      }
    }
  },
  async replaceCloud(){
    if(!enabled)return;
    await syncCloud();
  },
  async saveImage(file){
    if(!file)return '';
    if(supabaseEnabled){
      const supabaseUrl = supabaseConfig.url || config.supabaseUrl;
      const supabaseKey = supabaseConfig.key || config.supabaseKey;
      const bucket = supabaseConfig.bucket || config.supabaseBucket || 'public';
      const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'-')}`;
      try{
        const compressed = await compressImage(file, {maxWidth:2048,maxHeight:2048,quality:0.95,outputType:inferOutputType(file)});
        const body = compressed instanceof Blob ? compressed : file;
        const uploadUrl = `${(supabaseUrl||'').replace(/\/$/,'')}/storage/v1/object/${bucket}/${encodeURIComponent(path)}`;
        const res = await fetch(uploadUrl, {method:'PUT',headers:{'Authorization':`Bearer ${supabaseKey}`,'x-upsert':'true'},body});
        if(!res.ok) throw new Error('Supabase upload failed '+res.status);
        const publicUrl = `${(supabaseUrl||'').replace(/\/$/,'')}/storage/v1/object/public/${bucket}/${encodeURIComponent(path)}`;
        return publicUrl;
      }catch(e){
        console.warn('Supabase upload failed, falling back to local data URL.',e);
        return new Promise((resolve,reject)=>{let r=new FileReader;r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
      }
    }
    if(!enabled)return new Promise((resolve,reject)=>{let r=new FileReader;r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
    const {storage}=await ensureFirebase();
    const path=`${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'-')}`;
    const ref=storage.ref(`${config.firebaseStoragePath||'silver-entry-images'}/${path}`);
    await ref.put(file);
    return ref.getDownloadURL();
  },
  async saveImages(files){
    const list = Array.from(files||[]).filter(Boolean);
    return Promise.all(list.map((file)=>this.saveImage(file)));
  }
};

// Load image-preview module to handle image click previews (non-blocking)
try{ import('./image-preview.js'); }catch(e){console.warn('Could not load image-preview module',e)}
