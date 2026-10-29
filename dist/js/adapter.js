import {createReactor,advance} from './engine.js';
// Adapter boundary: future transports must implement the same read/advance/save contract.
// This release exposes only simulated data; no MQTT or hardware connection exists.
const KEY='biobustix.educational.v1';
export class SimulationAdapter {
 constructor(){this.dataType='simulated';this.storageError='';this.reactors={};try{const raw=JSON.parse(localStorage.getItem(KEY));if(raw?.version===1&&['R-101','R-102','R-103'].every(id=>raw.reactors?.[id]?.state&&Array.isArray(raw.reactors[id].history)))this.reactors=raw.reactors;}catch{this.storageError='อ่าน session ไม่สำเร็จ เริ่ม session ใหม่';}for(const id of ['R-101','R-102','R-103']){this.reactors[id]??=createReactor(id);this.reactors[id].running=false;}}
 read(id){return this.reactors[id];}
 advance(seconds){for(const r of Object.values(this.reactors))if(r.running)advance(r,seconds*r.speed);}
 save(){try{localStorage.setItem(KEY,JSON.stringify({version:1,reactors:this.reactors}));this.storageError='';}catch{this.storageError='บันทึกในเครื่องไม่ได้ · โปรด Export CSV ก่อนปิดหน้า';}}
 reset(id){this.reactors[id]=createReactor(id);this.save();}
 clear(){localStorage.removeItem(KEY);for(const id of Object.keys(this.reactors))this.reactors[id]=createReactor(id);this.save();}
}
