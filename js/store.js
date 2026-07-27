/* Local cache plus optional Firebase shared-data adapter. */
const KEY='silver-erp-v2';
const config=window.SILVER_ERP_CONFIG||{};
const firebaseConfig=config.firebaseConfig||{};
const enabled=Boolean(firebaseConfig.projectId&&firebaseConfig.apiKey&&firebaseConfig.appId&&firebaseConfig.projectId!=='YOUR_PROJECT_ID');
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

async function syncCloud(){
  if(!enabled)return;
  try{
    const {db}=await ensureFirebase();
    const docRef=db.collection(config.firebaseCollection||'silver_erp_app').doc('state');
    await docRef.set({shops:dbData().shops||[],silverEntries:dbData().silverEntries||[],updatedAt:window.firebase.firestore.FieldValue.serverTimestamp()}, {merge:true});
  }catch(e){
    console.warn('Cloud sync pending.',e);
  }
}

function dbData(){return JSON.parse(localStorage.getItem(KEY)||'{"shops":[],"silverEntries":[]}')}

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
  save(data){localStorage.setItem(KEY,JSON.stringify(data))},
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
  remove(type,id){
    let d=this.get();
    d[type]=(d[type]||[]).filter(x=>x.id!==id);
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
  async replaceCloud(){
    if(!enabled)return;
    await syncCloud();
  },
  async saveImage(file){
    if(!file)return '';
    if(!enabled)return new Promise((resolve,reject)=>{let r=new FileReader;r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
    const {storage}=await ensureFirebase();
    const path=`${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'-')}`;
    const ref=storage.ref(`${config.firebaseStoragePath||'silver-entry-images'}/${path}`);
    await ref.put(file);
    return ref.getDownloadURL();
  }
};
