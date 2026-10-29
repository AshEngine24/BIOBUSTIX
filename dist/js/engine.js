// Educational, lumped two-stage model. All time integration uses fixed 1 s steps.
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const SCENARIOS=['Stable baseline','Organic loading increase','Feed interruption','Temperature change','Alkalinity addition'];
export function createReactor(id){
 const r={id,t:0,remainder:0,running:false,speed:360,seed:101+Number(id.slice(-1)),scenario:0,
 controls:{pump:true,valve:true,feed:2,cod:20,heater:true,target:35,mixer:true,mix:70},
 state:{feedVolume:50,volume:10,substrate:.99,vfa:.6,alk:2.5,activity:.9,temp:35,gas:0,methane:0,feedTotal:0,alkTotal:0,pendingAlk:0,effluent:0,salt:0,alkTank:2},noise:Array(7).fill(0),history:[],events:[],forecasts:[]};
 record(r);log(r,'สร้าง session จำลอง · working volume 10 L');return r;
}
export function log(r,message){r.events.unshift({t:r.t,message});r.events=r.events.slice(0,500);}
export function rates(r){
 const s=r.state,c=r.controls,q=c.pump&&c.valve&&s.feedVolume>0?c.feed/24:0;
 const pH=clamp(7.35-.95*s.vfa/Math.max(.2,s.alk),4.5,8.5);
 const tf=Math.exp(-Math.pow((s.temp-35)/16,2));
 const pf=1/(1+Math.pow((pH-7.05)/.85,4));
 const mixing=c.mixer?.65+.35*c.mix/100:.35;
 const acid=.08*s.substrate*tf*mixing;
 const meth=.12*s.activity*s.vfa/(.3+s.vfa)*tf*pf*mixing;
 const methane=meth*s.volume*.33;
 const co2=acid*s.volume*.19+meth*s.volume*.04;
 const gas=methane+co2;
 return {q,pH,tf,pf,mixing,acid,meth,methane,gas,ch4:gas>1e-9?100*methane/gas:0,orp:-310-55*s.activity+14*s.vfa+8*(1-mixing),ec:2.1+.42*s.alk+.12*s.vfa+.3*s.salt};
}
function random(r){r.seed=(1664525*r.seed+1013904223)>>>0;return r.seed/4294967296-.5;}
export function snapshot(r){const s=r.state,f=rates(r),n=r.noise;
 const gas=Math.max(0,f.gas*(1+n[2]*.004)),ch4=clamp(f.ch4+n[3]*.08,0,100);
 return {time:r.t,ph:f.pH+n[0]*.006,temp:s.temp+n[1]*.02,gas,ch4,methane:gas*ch4/100,mass:Math.max(0,s.feedVolume+n[4]*.002),orp:f.orp+n[5]*.4,ec:f.ec+n[6]*.004,feed:f.q*24,feedTotal:s.feedTotal,cod:r.controls.cod,loading:f.q*24*r.controls.cod/s.volume,vfa:s.vfa,alk:s.alk,activity:s.activity,substrate:s.substrate,volume:s.volume,feedVolume:s.feedVolume,gasTotal:s.gas,methaneTotal:s.methane,alkTotal:s.alkTotal,effluent:s.effluent,trueGas:f.gas,trueMethane:f.methane,truePH:f.pH};
}
export function record(r){const row=snapshot(r);if(r.history.at(-1)?.time===r.t)r.history[r.history.length-1]=row;else r.history.push(row);if(r.history.length>10081)r.history.shift();}
export function advance(r,seconds){r.remainder+=Math.max(0,seconds);const ticks=Math.floor(r.remainder+1e-9);r.remainder-=ticks;
 for(let i=0;i<ticks;i++){
  const s=r.state,c=r.controls,f=rates(r),h=1/3600;
  const feed=Math.min(s.feedVolume,f.q*h),dose=Math.min(s.pendingAlk,s.pendingAlk*h/(c.mixer?.15:.6));
  const d=(feed+dose)/s.volume;
  s.feedVolume=Math.max(0,s.feedVolume-feed);s.feedTotal+=feed;s.effluent+=feed+dose;
  s.substrate=Math.max(0,s.substrate+(feed*c.cod/s.volume)-d*s.substrate-f.acid*h);
  s.vfa=Math.max(0,s.vfa+(f.acid-f.meth)*h-d*s.vfa);
  s.alk=Math.max(.05,s.alk+feed*2.5/s.volume+dose*50/s.volume-d*s.alk);
  s.salt=Math.max(0,s.salt+dose*50/s.volume-d*s.salt);s.pendingAlk=Math.max(0,s.pendingAlk-dose);
  s.activity=clamp(s.activity+(.95*f.tf*f.pf-s.activity)*h/12,.02,1);
  s.temp+=((c.heater?c.target:25)-s.temp)*h/(c.heater?2:8)+(25-s.temp)*feed/s.volume;
  s.gas+=f.gas*h;s.methane+=f.methane*h;r.t++;
  if(r.t%10===0)r.noise=r.noise.map(()=>random(r));
  if(r.t%60===0)record(r);
 }
 return r;
}
export function setControl(r,key,value){const limits={feed:[0,20],cod:[0,100],target:[15,55],mix:[0,100]};if(key in limits){if(!Number.isFinite(Number(value)))return;value=clamp(Number(value),...limits[key]);}if(!(key in r.controls))return;r.controls[key]=value;log(r,`${({feed:'อัตราป้อน (L/day)',cod:'COD น้ำเข้า (g/L)',target:'อุณหภูมิเป้าหมาย (°C)',mix:'ระดับการกวน (%)',pump:'ปั๊ม P-101',valve:'วาล์ว V-101',heater:'ระบบให้ความร้อน',mixer:'มอเตอร์กวน'})[key]} → ${typeof value==='boolean'?(value?'เปิด':'ปิด'):value}`);record(r);}
export function doseAlk(r,ml){if(!Number.isFinite(Number(ml)))return;const liters=Math.min(clamp(Number(ml),0,500)/1000,r.state.alkTank);r.state.pendingAlk+=liters;r.state.alkTotal+=liters;r.state.alkTank-=liters;log(r,`เติมสารด่าง ${(liters*1000).toFixed(0)} mL · 50 g CaCO₃-eq/L · รอผสม`);record(r);}
export function scenario(r,n){r.scenario=n;log(r,`Scenario ${String.fromCharCode(65+n)} · ${SCENARIOS[n]}`);
 if(n===0){for(const [k,v] of Object.entries({pump:true,valve:true,feed:2,cod:20,heater:true,target:35,mixer:true,mix:70}))setControl(r,k,v);}
 if(n===1)setControl(r,'cod',50);if(n===2)setControl(r,'pump',false);if(n===3){setControl(r,'heater',true);setControl(r,'target',28);}if(n===4)doseAlk(r,100);
}
export function historyRows(r,hours=0){const rows=r.history.filter(x=>!hours||x.time>=r.t-hours*3600);const now=snapshot(r);if(rows.at(-1)?.time===r.t)rows[rows.length-1]=now;else rows.push(now);return rows;}
export function forecast(r){const clone=structuredClone(r);clone.history=[];clone.events=[];clone.forecasts=[];const points=[{time:r.t,methane:rates(r).methane}];for(let i=0;i<24;i++){advance(clone,900);points.push({time:clone.t,methane:rates(clone).methane});}const f={issued:r.t,points};r.forecasts.push(f);r.forecasts=r.forecasts.slice(-20);return f;}
export const COLUMNS={time:'s',ph:'pH',temp:'degC',gas:'L/h',methane:'L/h',ch4:'vol.% CH4',mass:'kg_net',orp:'mV',ec:'mS/cm',feed:'L/day',feedTotal:'L',cod:'gCOD/L',loading:'gCOD/L/day',vfa:'gCOD-eq/L',alk:'gCaCO3-eq/L',activity:'fraction',substrate:'gCOD/L',volume:'L',feedVolume:'L',gasTotal:'L',methaneTotal:'L',alkTotal:'L',effluent:'L',trueGas:'L/h',trueMethane:'L/h',truePH:'pH'};
export function csv(r,hours){const keys=Object.keys(COLUMNS);return ['reactor_id,data_type,'+keys.map(k=>`${k} [${COLUMNS[k]}]`).join(','),...historyRows(r,hours).map(row=>`${r.id},simulated,`+keys.map(k=>Number(row[k]).toFixed(6)).join(','))].join('\n');}
