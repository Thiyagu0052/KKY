/* Local cache plus optional Supabase shared-data adapter. */
const KEY='silver-erp-v2';
const config=window.SILVER_ERP_CONFIG||{};
const enabled=Boolean(config.supabaseUrl&&config.supabaseAnonKey&&config.supabaseUrl!=='YOUR_SUPABASE_URL');
const headers=()=>({apikey:config.supabaseAnonKey,Authorization:`Bearer ${config.supabaseAnonKey}`,'Content-Type':'application/json'});
const endpoint=()=>`${config.supabaseUrl.replace(/\/$/,'')}/rest/v1/silver_erp_records`;
export const db={
 async init(){if(!localStorage.getItem(KEY))this.save({shops:[],silverEntries:[]});if(!enabled)return;try{let r=await fetch(`${endpoint()}?select=record_type,payload`,{headers:headers()});if(!r.ok)throw Error();let rows=await r.json(),data={shops:[],silverEntries:[]};rows.forEach(x=>{if(data[x.record_type])data[x.record_type].push(x.payload)});if(rows.length)this.save(data)}catch(e){console.warn('Cloud data unavailable; using this device cache.',e)}},
 get(){return JSON.parse(localStorage.getItem(KEY)||'{"shops":[],"silverEntries":[]}')},save(data){localStorage.setItem(KEY,JSON.stringify(data))},list(type){return this.get()[type]||[]},shop(id){return this.list('shops').find(x=>x.id===id)},
 upsert(type,item){let d=this.get(),a=d[type]||[];item.id=item.id||crypto.randomUUID();let i=a.findIndex(x=>x.id===item.id);if(i>=0)a[i]=item;else a.unshift(item);d[type]=a;this.save(d);this.push(type,item);return item},
 remove(type,id){let d=this.get();d[type]=(d[type]||[]).filter(x=>x.id!==id);this.save(d);this.deleteCloud(type,id)},
 async push(type,payload){if(!enabled)return;try{await fetch(`${endpoint()}?on_conflict=record_type,record_id`,{method:'POST',headers:{...headers(),Prefer:'resolution=merge-duplicates'},body:JSON.stringify({record_type:type,record_id:payload.id,payload,updated_at:new Date().toISOString()})})}catch(e){console.warn('Cloud sync pending.',e)}},
 async deleteCloud(type,id){if(!enabled)return;try{await fetch(`${endpoint()}?record_type=eq.${encodeURIComponent(type)}&record_id=eq.${encodeURIComponent(id)}`,{method:'DELETE',headers:headers()})}catch(e){console.warn('Cloud deletion pending.',e)}},
 async replaceCloud(){if(!enabled)return;for(const type of ['shops','silverEntries'])for(const item of this.list(type))await this.push(type,item)},
 async saveImage(file){if(!file)return '';if(!enabled)return new Promise((resolve,reject)=>{let r=new FileReader;r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});let path=`${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'-')}`;let url=`${config.supabaseUrl.replace(/\/$/,'')}/storage/v1/object/${config.imageBucket||'silver-entry-images'}/${path}`;let r=await fetch(url,{method:'POST',headers:{apikey:config.supabaseAnonKey,Authorization:`Bearer ${config.supabaseAnonKey}`,'Content-Type':file.type||'application/octet-stream'},body:file});if(!r.ok)throw Error('Image upload failed');return `${config.supabaseUrl.replace(/\/$/,'')}/storage/v1/object/public/${config.imageBucket||'silver-entry-images'}/${path}`}
};
