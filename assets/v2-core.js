const CONFIG={businessPhone:'51981214007',openHour:9,closeHour:21,slotMinutes:30,maxDaysAhead:60,promoDelayMs:18000,promoDurationSec:300};
const SERVICES=[
{id:'armonizacion',unit:'Estética',name:'Armonización facial',price:'Según evaluación',sessions:1,intervalDays:0},
{id:'botox',unit:'Estética',name:'Bótox rostro completo',price:'S/ 700',sessions:1,intervalDays:0},
{id:'consulta',unit:'Consulta',name:'Consulta Médica Especializada',price:'S/ 70',sessions:1,intervalDays:0},
{id:'dolor',unit:'Dolor',name:'Dolor e Intervencionismo Ecoguiado',price:'Consulta S/ 100',sessions:1,intervalDays:0},
{id:'labios',unit:'Estética',name:'Relleno de labios',price:'Según evaluación',sessions:1,intervalDays:0},
{id:'laser',unit:'Estética',name:'Láser facial',price:'Según evaluación',sessions:1,intervalDays:0},
{id:'metabolismo',unit:'Metabolismo',name:'Metabolismo y Obesidad',price:'Consulta S/ 70',sessions:1,intervalDays:0},
{id:'novare',unit:'NOVARE',name:'NOVARE — Rejuvenecimiento Facial',price:'Consulta previa',sessions:1,intervalDays:0},
{id:'prp',unit:'Estética',name:'PRP en rostro + Hydrafacial',price:'S/ 200',sessions:1,intervalDays:0},
{id:'rinomodelacion',unit:'Estética',name:'Rinomodelación',price:'Según evaluación',sessions:1,intervalDays:0}
];
const DEMO_REVIEWS=Array.from({length:20},(_,i)=>({name:`Paciente ${String(i+1).padStart(2,'0')}`,text:['Atención clara y muy buena orientación.','La solicitud desde el celular fue sencilla.','Buen acompañamiento durante la consulta.','Proceso rápido y fácil de entender.','Excelente explicación antes de decidir.'][i%5]}));
const state={step:1,service:null,date:null,time:null,name:'',phone:'',month:new Date(new Date().getFullYear(),new Date().getMonth(),1),sort:'az',reservationId:null,waUrl:null,promo:false};
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const normalizeText=s=>(s||'').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const icon=(id)=>`<svg class="icon"><use href="#${id}"/></svg>`;
function starHTML(){return Array.from({length:5},()=>'<svg class="star"><use href="#i-star"/></svg>').join('')}
function setPrimary(el,enabled){el.disabled=!enabled;el.classList.toggle('pulse',enabled)}
function fmtDate(d){return new Intl.DateTimeFormat('es-PE',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d)}
function isoDate(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function fromIso(s){const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)}
function makeId(){return 'DO-'+Date.now().toString(36).slice(-6).toUpperCase()}
function saveDraft(status='draft'){const d={status,step:state.step,serviceId:state.service?.id||'',date:state.date||'',time:state.time||'',name:$('#clientName')?.value||state.name||'',phone:$('#clientPhone')?.value||state.phone||'',reservationId:state.reservationId||'',waUrl:state.waUrl||''};if(d.serviceId||d.date||d.name||d.reservationId){localStorage.setItem('drOlanoDraft',JSON.stringify(d));showDraft(d)}}
function getDraft(){try{return JSON.parse(localStorage.getItem('drOlanoDraft')||'null')}catch{return null}}
function showDraft(d){$('#draftTitle').textContent=d.status==='sent'?'Enviada':'Cita pendiente';$('#draftPill').classList.add('show');document.body.classList.add('has-draft')}
function openBooking(serviceId=''){state.service=serviceId?SERVICES.find(s=>s.id===serviceId)||state.service:state.service;$('#booking').classList.add('open');document.body.classList.add('booking-open');goStep(1);renderServices()}
function closeBooking(){saveDraft(state.reservationId?'sent':'draft');$('#booking').classList.remove('open');document.body.classList.remove('booking-open')}
function goStep(n){state.step=n;$$('.step').forEach(el=>el.classList.toggle('active',+el.dataset.step===n));$('#progressBar').style.width=(n*25)+'%';if(n===2)renderCalendar();if(n===4)renderSummary();if(n===5)saveDraft('sent');$('#booking').scrollTo({top:0,behavior:'instant'})}
function renderServices(){let list=[...SERVICES];const q=normalizeText($('#serviceSearch').value.trim());if(q)list=list.filter(s=>normalizeText(`${s.name} ${s.unit} ${s.price}`).includes(q));list.sort((a,b)=>state.sort==='az'?a.name.localeCompare(b.name,'es'):b.name.localeCompare(a.name,'es'));$('#serviceList').innerHTML=list.map(s=>`<button class="svc ${state.service?.id===s.id?'active':''}" data-svc="${s.id}"><div><b>${s.name}</b><small>${s.unit} · ${s.price}</small></div>${icon('i-arrow')}</button>`).join('');$$('[data-svc]').forEach(el=>el.onclick=()=>{state.service=SERVICES.find(s=>s.id===el.dataset.svc);renderServices();setPrimary($('#toStep2'),true);saveDraft()});setPrimary($('#toStep2'),!!state.service)}