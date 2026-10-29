import {SimulationAdapter} from './adapter.js';
import {snapshot,setControl,scenario,doseAlk,log,record,historyRows,csv,forecast} from './engine.js';
import {ProcessDiagram,updateDiagram} from './diagram.js';
import {SimulationControls,EquipmentPanel,SensorPanel,TrendCharts,Chart,DataTable,EventLog,ForecastPanel,ModelAssumptions,forecastRows,CHARTS,SENSORS,fmt,time} from './components.js';
const adapter=new SimulationAdapter();let id='R-101',page='process',panel={kind:'equipment',key:'reactor',tab:'reading'},chartKey='gas',hours=6,expanded=false,chartMode='chart',last=performance.now(),saveTime=0,renderTime=0,confirmAction=null;
const $=s=>document.querySelector(s),r=()=>adapter.read(id);
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),2800);}
function confirm(title,message,action){confirmAction=action;$('#confirm-title').textContent=title;$('#confirm-message').textContent=message;$('#confirm-dialog').showModal();}
function controls(){ $('#controls').innerHTML=SimulationControls(r()); }
function inspector(){ $('#inspector').innerHTML=panel.kind==='sensor'?SensorPanel(panel.key,panel.tab):EquipmentPanel(r(),panel.key);update(); }
function trends(){ $('#trends').innerHTML=TrendCharts(chartKey,hours,expanded,chartMode);updateCharts(); }
function updateCharts(){const rows=historyRows(r(),hours),c=CHARTS[chartKey];if($('#chart-body'))$('#chart-body').innerHTML=chartMode==='table'?DataTable(rows,chartKey):Chart(rows,c.keys,c.unit,{width:Math.max(260,$('#chart-body').clientWidth),height:expanded?280:160});if(expanded&&$('#chart-body .chart'))$('#chart-body .chart').style.height='280px';if($('#sensor-chart'))$('#sensor-chart').innerHTML=Chart(rows,[panel.key],SENSORS[panel.key].unit,{width:260,height:160});}
function renderSecondary(){if(page==='model')$('#secondary-page').innerHTML=ModelAssumptions();if(page==='events')$('#secondary-page').innerHTML=EventLog(r());if(page==='forecast'){$('#secondary-page').innerHTML=ForecastPanel(r());updateForecast();}}
function updateForecast(){if(!$('#forecast-chart'))return;const rows=forecastRows(r());$('#forecast-chart').innerHTML=(rows.length?Chart(rows,['predicted','actual'],'L/h',{width:Math.max(260,$('#forecast-chart').clientWidth),height:280}):'<div class="empty">กดสร้างคำคาดการณ์ 6 ชั่วโมงเพื่อแสดงแนวโน้ม</div>');const completed=rows.filter(p=>Number.isFinite(p.actual));$('#forecast-comparison').innerHTML=completed.length?`<div class="table-scroll"><table><thead><tr><th>เวลา simulation</th><th>คาดการณ์ CH₄ (L/h)</th><th>ค่าจริงจำลอง (L/h)</th><th>ผลต่าง (L/h)</th></tr></thead><tbody>${completed.map(p=>`<tr><td>${time(p.time)}</td><td>${fmt(p.predicted,4)}</td><td>${fmt(p.actual,4)}</td><td>${fmt(p.actual-p.predicted,4)}</td></tr>`).join('')}</tbody></table></div><p class="chart-label">ค่าจริงอ้างอิงจุดบันทึกใกล้ที่สุดภายใน ±30 วินาที · ความตรงกันของสมการเดียวกันไม่ใช่ validation กับถังจริง</p>`:'<div class="empty">รอเวลา simulation เดินถึงจุดคาดการณ์ถัดไป (ทุก 15 นาที)</div>';}
function renderPage(){controls();$('#process-page').hidden=page!=='process';$('#secondary-page').hidden=page==='process';document.querySelectorAll('.nav-item').forEach(e=>e.classList.toggle('active',e.dataset.page===page));const titles={process:'ห้องทดลองกระบวนการ<span> / Process overview</span>',forecast:'AI Preview<span> / ตัวอย่างแนวคิด</span>',events:'บันทึกเหตุการณ์<span> / Event log</span>',model:'สมมติฐานแบบจำลอง<span> / Model assumptions</span>'};$('#page-title').innerHTML=titles[page];if(page==='process'){$('#diagram').innerHTML=ProcessDiagram(id);inspector();trends();}else renderSecondary();update();}
function update(){const reactor=r(),s=snapshot(reactor);s.pendingAlk=reactor.state.pendingAlk*1000;s.alkTank=reactor.state.alkTank;document.querySelectorAll('[data-read]').forEach(e=>{const k=e.dataset.read;e.textContent=fmt(s[k],k==='orp'?0:k==='ch4'||k==='temp'?1:2);});document.querySelectorAll('[data-status]').forEach(e=>{e.textContent=reactor.controls[e.dataset.status]?'เปิด / ON':'ปิด / OFF';e.style.color=reactor.controls[e.dataset.status]?'#b6d99b':'#91a0ab';});if($('#elapsed'))$('#elapsed').textContent=time(reactor.t);if($('#run-dot'))$('#run-dot').classList.toggle('running',reactor.running);if($('#run'))$('#run').disabled=reactor.running;if($('#pause'))$('#pause').disabled=!reactor.running;updateDiagram(reactor,s);$('#storage-status').textContent=adapter.storageError||'ข้อมูลและการตั้งค่าของ 3 ถังเก็บบนเบราว์เซอร์นี้';}
function commit(){record(r());adapter.save();update();updateCharts();if(page==='events')renderSecondary();}
document.addEventListener('click',event=>{const e=event.target.closest('button,[data-equip],[data-sensor]');if(!e)return;
 if(e.dataset.reactor){id=e.dataset.reactor;panel={kind:'equipment',key:'reactor',tab:'reading'};renderPage();return;}
 if(e.dataset.page){page=e.dataset.page;renderPage();return;}
 if(e.dataset.equip){panel={kind:'equipment',key:e.dataset.equip};inspector();if(innerWidth<850)$('#inspector').scrollIntoView({behavior:'smooth',block:'nearest'});return;}
 if(e.dataset.sensor){panel={kind:'sensor',key:e.dataset.sensor,tab:'reading'};inspector();updateCharts();if(innerWidth<850)$('#inspector').scrollIntoView({behavior:'smooth',block:'nearest'});return;}
 if(e.dataset.sensorTab){panel.tab=e.dataset.sensorTab;inspector();updateCharts();return;}
 if(e.dataset.trendTab){chartKey=e.dataset.trendTab==='state'?'vfa':'gas';trends();return;}
 if(e.dataset.hours!==undefined){hours=Number(e.dataset.hours);trends();return;}
 switch(e.id){
 case 'run':r().running=true;last=performance.now();log(r(),'เริ่ม simulation · '+r().speed+'×');commit();break;
 case 'pause':r().running=false;log(r(),'หยุด simulation ชั่วคราว');commit();break;
 case 'reset':{const target=id;confirm('Reset ถัง '+target+'?','ล้างค่าตั้ง ประวัติ ก๊าซสะสม และคำคาดการณ์ของถังนี้ ถังอื่นจะคงเดิม',()=>{adapter.reset(target);renderPage();toast('Reset '+target+' แล้ว');});break;}
 case 'clear-session':confirm('ล้าง session จำลองทั้งหมด?','ลบข้อมูลและค่าตั้งของ R-101, R-102 และ R-103 ในเบราว์เซอร์นี้ กรุณา Export CSV ก่อนหากต้องการเก็บประวัติ',()=>{adapter.clear();renderPage();toast('ล้าง session ทั้ง 3 ถังแล้ว');});break;
 case 'cancel-confirm':$('#confirm-dialog').close();confirmAction=null;break;
 case 'accept-confirm':$('#confirm-dialog').close();confirmAction?.();confirmAction=null;break;
 case 'close-panel':panel={kind:'equipment',key:'reactor'};inspector();break;
 case 'dose':{const inp=$('#dose-amount');if(!inp.reportValidity())break;doseAlk(r(),Number(inp.value));commit();toast('เพิ่มสารด่างเข้าคิวผสมแล้ว · กด Run เพื่อให้เกิดการผสม');break;}
 case 'apply-scenario':scenario(r(),Number($('#scenario').value));controls();inspector();commit();toast('ใช้สถานการณ์สาธิตแล้ว');break;
 case 'expand-trend':expanded=!expanded;trends();break;
 case 'toggle-table':chartMode=chartMode==='chart'?'table':'chart';trends();break;
 case 'forecast':forecast(r());adapter.save();renderSecondary();toast('สร้างคำคาดการณ์ 6 ชั่วโมงแล้ว');break;
 case 'export':{const blob=new Blob(['\uFEFF'+csv(r(),hours)],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`BIOBUSTIX_${id}_${hours?hours+'h':'all'}_${r().t}s_simulated.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Export '+id+' · '+(hours?hours+' ชั่วโมง':'ทั้งหมด'));break;}
 }
});
document.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.matches('g[role=button]')){event.preventDefault();event.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
document.addEventListener('change',event=>{const e=event.target;if(e.dataset.control){if(e.type==='number'&&!e.reportValidity()){e.value=r().controls[e.dataset.control];return;}setControl(r(),e.dataset.control,e.type==='checkbox'?e.checked:Number(e.value));if(e.dataset.control==='mix'&&$('#mix-level'))$('#mix-level').textContent=e.value;commit();}
 if(e.id==='speed'){r().speed=parseInt(e.value);log(r(),'ความเร็ว simulation → '+r().speed+'×');adapter.save();}
 if(e.id==='scenario'){scenario(r(),Number(e.value));inspector();commit();toast('สถานการณ์สาธิต · '+e.selectedOptions[0].textContent);}
 if(e.id==='chart-select'){chartKey=e.value;trends();}
});
document.addEventListener('input',event=>{if(event.target.dataset.control==='mix'&&$('#mix-level'))$('#mix-level').textContent=event.target.value;});
document.addEventListener('visibilitychange',()=>{last=performance.now();if(document.hidden)adapter.save();});
window.addEventListener('pagehide',()=>adapter.save());
renderPage();
window.addEventListener('resize',()=>{updateCharts();if(page==='forecast')updateForecast();});
setInterval(()=>{const now=performance.now(),dt=(now-last)/1000;last=now;if(!document.hidden)adapter.advance(dt);update();if(now-renderTime>1000){if(page==='process')updateCharts();if(page==='forecast')updateForecast();renderTime=now;}if(now-saveTime>5000){adapter.save();saveTime=now;}},200);
