import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://xnlzsgulskqyecfgzhwa.supabase.co';
const SUPABASE_KEY = 'sb_publishable_s9YdJaMe_ll4QehPkADlKQ_KkuvWt32';
const BUSINESS_SLUG = 'dr-olano';
const PUBLIC_CONFIG_URL = SUPABASE_URL + '/functions/v1/dr-olano-site-config';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const $ = (id) => document.getElementById(id);
const WEEKDAYS = [
  { value: 1, short: 'Lun', name: 'Lunes' },
  { value: 2, short: 'Mar', name: 'Martes' },
  { value: 3, short: 'Mié', name: 'Miércoles' },
  { value: 4, short: 'Jue', name: 'Jueves' },
  { value: 5, short: 'Vie', name: 'Viernes' },
  { value: 6, short: 'Sáb', name: 'Sábado' },
  { value: 0, short: 'Dom', name: 'Domingo' }
];
const ICON_PRESETS = {
  sparkles:'<svg viewBox="0 0 24 24" fill="none" stroke="#0b2e4f" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 1.2 3.4L17 8l-3.8 1.4L12 13l-1.2-3.6L7 8l3.8-1.6L12 3Z"/><path d="m18.5 13 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"/><path d="m5.5 13 .7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z"/></svg>',
  face:'<svg viewBox="0 0 24 24" fill="none" stroke="#0b2e4f" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c4.2 0 7 3.4 7 7.7 0 5-3.2 9-7 10.3-3.8-1.3-7-5.3-7-10.3C5 6.4 7.8 3 12 3Z"/><path d="M9 10h.01M15 10h.01M9.5 15c1.5 1 3.5 1 5 0"/></svg>',
  target:'<svg viewBox="0 0 24 24" fill="none" stroke="#0b2e4f" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 2v3M22 12h-3M12 22v-3M2 12h3"/></svg>',
  heart:'<svg viewBox="0 0 24 24" fill="none" stroke="#0b2e4f" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21S4 16.6 4 10.3A4.3 4.3 0 0 1 12 8a4.3 4.3 0 0 1 8 2.3C20 16.6 12 21 12 21Z"/><path d="M7 12h3l1.2-2.4L13 15l1.2-3H18"/></svg>',
  cells:'<svg viewBox="0 0 24 24" fill="none" stroke="#0b2e4f" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><circle cx="12" cy="16" r="3"/><path d="M10.2 10.1 11 13M13.8 10.1 13 13M10.5 7.7h3"/></svg>',
  drop:'<svg viewBox="0 0 24 24" fill="none" stroke="#0b2e4f" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11Z"/><path d="M9 15c.7 1.3 1.7 2 3 2"/></svg>',
  leaf:'<svg viewBox="0 0 24 24" fill="none" stroke="#0b2e4f" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 4C12 4 6 8 6 14c0 3 2 5 5 5 6 0 9-7 9-15Z"/><path d="M5 20c2-6 6-9 11-12"/></svg>',
  stethoscope:'<svg viewBox="0 0 24 24" fill="none" stroke="#0b2e4f" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v5a4 4 0 0 0 8 0V3M6 3h4M14 3h4M12 12v2a5 5 0 0 0 10 0v-1"/><circle cx="20" cy="10" r="2"/></svg>'
};

const state = {
  user: null,
  business: null,
  membership: null,
  canEdit: false,
  config: null,
  resources: [],
  schedules: [],
  categories: [],
  services: [],
  links: [],
  promotions: [],
  branding: null,
  availabilityConfigs: [],
  availabilityBlocks: [],
  contentSlots: [],
  previewLogoUrl: null,
  builderMode: 'edit',
  builderDevice: 'desktop',
  builderSelection: null,
  builderSaveTimer: null,
  builderPreviewDragKey: null,
  traceLog: [],
  editorBaseline: null,
  editorDirty: false,
  undoStack: [],
  redoStack: [],
  undoArm: null,
  undoToastTimer: null,
  builderMultiSelection: [],
  builderContext: null,
  publicConfig: null
};

function esc(value = '') {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
function attr(value = '') { return esc(value); }
function numberOrNull(value) {
  const s = String(value ?? '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function intOr(value, fallback = 0) {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}
function slugify(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}
function money(value) {
  if (value == null || value === '') return 'Precio no publicado';
  return new Intl.NumberFormat('es-PE', { style:'currency', currency:'PEN', maximumFractionDigits:2 }).format(Number(value));
}
function dayName(value) {
  return WEEKDAYS.find((d) => d.value === Number(value))?.name || 'Día';
}
function setStatus(message = '', type = 'info') {
  const el = $('globalStatus');
  el.textContent = message;
  el.className = message ? 'status show ' + type : 'status';
}
function setSync(text, ok = null) {
  const el = $('syncPill');
  el.textContent = text;
  el.className = 'pill ' + (ok === true ? '' : ok === false ? 'off' : 'neutral');
}
function showGate(message, login = false) {
  $('gateCopy').textContent = message;
  $('loginLink').hidden = !login;
  $('authGate').hidden = false;
  $('app').hidden = true;
}
function showApp() {
  $('authGate').hidden = true;
  $('app').hidden = false;
}
function safeSvg(svg) {
  const raw = String(svg || '').trim();
  if (!raw) return { ok:true, value:null };
  if (!/^<svg[\s>]/i.test(raw) || !/<\/svg>$/i.test(raw)) return { ok:false, error:'El icono debe ser un SVG completo.' };
  if (/<\s*(script|foreignObject|iframe|object|embed|link|style)\b/i.test(raw)) return { ok:false, error:'El SVG contiene elementos no permitidos.' };
  if (/\son[a-z]+\s*=/i.test(raw) || /javascript\s*:/i.test(raw)) return { ok:false, error:'El SVG contiene código no permitido.' };
  if (/\sstyle\s*=/i.test(raw) || /url\s*\(/i.test(raw)) return { ok:false, error:'El SVG no puede usar estilos embebidos ni recursos URL.' };
  if (/\s(?:href|xlink:href)\s*=\s*["']\s*(?:https?:|\/\/|data:)/i.test(raw)) return { ok:false, error:'El SVG no puede cargar recursos externos.' };
  return { ok:true, value:raw };
}
function svgDataUri(svg) {
  const checked = safeSvg(svg);
  if (!checked.ok || !checked.value) return null;
  const bytes = new TextEncoder().encode(checked.value);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return 'data:image/svg+xml;base64,' + btoa(binary);
}
function toLimaIso(localValue) {
  const v = String(localValue || '').trim();
  if (!v) return null;
  const normalized = v.length === 16 ? v + ':00' : v;
  const d = new Date(normalized + '-05:00');
  if (Number.isNaN(d.getTime())) throw new Error('Fecha u hora inválida.');
  return d.toISOString();
}
function toLimaInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone:'America/Lima', year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', hour12:false
  }).formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}
function uniqueServiceCode(name) {
  const base = slugify(name).slice(0, 60) || 'servicio';
  const used = new Set(state.services.map((s) => String(s.codigo_externo || '').toLowerCase()));
  if (!used.has(base)) return base;
  let i = 2;
  while (used.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}
function categoryById(id) { return state.categories.find((c) => c.id === id); }
function resourceById(id) { return state.resources.find((r) => r.id === id); }
function serviceById(id) { return state.services.find((s) => s.id === id); }
function assignedResourceFor(serviceId) {
  const link = state.links.find((l) => l.servicio_id === serviceId);
  return link ? resourceById(link.recurso_id) : null;
}
function canWriteOrThrow() {
  if (!state.canEdit) throw new Error('Tu rol actual es de solo lectura.');
}
function setWriteMode() {
  document.querySelectorAll('.write-control').forEach((el) => { el.disabled = !state.canEdit; });
  $('readOnlyBanner').hidden = state.canEdit;
}


function editorSnapshot(){
  return {
    branding: structuredClone(state.branding||{}),
    contentSlots: structuredClone(state.contentSlots||[]),
    previewLogoUrl: state.previewLogoUrl||null
  };
}
function editorComparable(snapshot=editorSnapshot()){
  const branding=snapshot.branding||{};
  const cleanBrand={
    logo_url:branding.logo_url||null,logo_path:branding.logo_path||null,
    color_primary:branding.color_primary||'#0b2e4f',
    color_secondary:branding.color_secondary||'#1aa79d',
    color_accent:branding.color_accent||'#d7ab33',
    color_background:branding.color_background||'#f4f7f8'
  };
  const slots=[...(snapshot.contentSlots||[])].sort((a,b)=>String(a.slot_key).localeCompare(String(b.slot_key))).map(x=>({
    slot_key:x.slot_key,section_label:x.section_label,eyebrow:x.eyebrow,title:x.title,subtitle:x.subtitle,body:x.body,
    cta_label:x.cta_label,cta_url:x.cta_url,image_url:x.image_url,image_path:x.image_path,image_alt:x.image_alt,
    enabled:x.enabled!==false,sort_order:Number(x.sort_order||0),settings:x.settings||{}
  }));
  return JSON.stringify({branding:cleanBrand,slots});
}
function editorChangeCount(){
  if(!state.editorBaseline)return 0;
  const base=state.editorBaseline,current=editorSnapshot();
  let count=editorComparable({branding:base.branding,contentSlots:[]})===editorComparable({branding:current.branding,contentSlots:[]})?0:1;
  const baseMap=new Map((base.contentSlots||[]).map(x=>[x.slot_key,x]));
  for(const slot of current.contentSlots||[]){
    const b=baseMap.get(slot.slot_key);
    if(JSON.stringify({
      section_label:slot.section_label,eyebrow:slot.eyebrow,title:slot.title,subtitle:slot.subtitle,body:slot.body,
      cta_label:slot.cta_label,cta_url:slot.cta_url,image_url:slot.image_url,image_path:slot.image_path,image_alt:slot.image_alt,
      enabled:slot.enabled!==false,sort_order:Number(slot.sort_order||0),settings:slot.settings||{}
    })!==JSON.stringify(b?{
      section_label:b.section_label,eyebrow:b.eyebrow,title:b.title,subtitle:b.subtitle,body:b.body,
      cta_label:b.cta_label,cta_url:b.cta_url,image_url:b.image_url,image_path:b.image_path,image_alt:b.image_alt,
      enabled:b.enabled!==false,sort_order:Number(b.sort_order||0),settings:b.settings||{}
    }:null))count++;
  }
  return count;
}
function updateEditorDirty(){
  state.editorDirty=Boolean(state.editorBaseline&&editorComparable()!==editorComparable(state.editorBaseline));
  const count=editorChangeCount();
  const bar=$('editorPublishBar'),btn=$('publishEditorBtn'),label=$('editorPendingCount');
  const active=document.querySelector('.tab.active')?.dataset.tab==='contenido';
  if(bar)bar.hidden=!active;
  if(btn)btn.disabled=!state.editorDirty;
  if(label)label.textContent=count===1?'1 cambio pendiente':count+' cambios pendientes';
  builderSetState(state.editorDirty?'Borrador sin publicar':'Sin cambios',state.editorDirty?'warn':'neutral');
}
function setEditorBaseline(){
  state.editorBaseline=editorSnapshot();
  state.editorDirty=false;
  state.undoStack=[];state.redoStack=[];state.undoArm=null;
  updateEditorDirty();
}
function markEditorDirty(event='DRAFT_CHANGE',detail={}){
  updateEditorDirty();
  editorTrace(event,'OK',detail);
}
function pushUndoSnapshot(label,snapshot=editorSnapshot()){
  const key=editorComparable(snapshot);
  const last=state.undoStack[state.undoStack.length-1];
  if(last?.key===key)return;
  state.undoStack.push({label:String(label||'Cambio'),snapshot:structuredClone(snapshot),key});
  if(state.undoStack.length>60)state.undoStack.shift();
  state.redoStack=[];
}
function armUndo(control){
  if(!control)return;
  state.undoArm={
    control,
    snapshot:editorSnapshot(),
    label:control.closest('label')?.querySelector('span')?.textContent?.trim()||control.id||'Edición',
    used:false
  };
}
function consumeUndoArm(control){
  const arm=state.undoArm;
  if(!arm||arm.used||arm.control!==control)return;
  arm.used=true;pushUndoSnapshot(arm.label,arm.snapshot);
}
function showUndoToast(label,isRedo=false){
  const box=$('undoToast');if(!box)return;
  $('undoToastTitle').textContent=isRedo?'Cambio rehecho':'Cambio deshecho';
  $('undoToastCopy').textContent=String(label||'Se restauró el estado anterior.');
  $('redoUndoBtn').hidden=isRedo||!state.redoStack.length;
  box.hidden=false;
  clearTimeout(state.undoToastTimer);
  state.undoToastTimer=setTimeout(()=>{box.hidden=true;},5000);
}
function syncDraftToPreview(){
  const frame=visualFrame();if(!frame?.contentWindow)return;
  try{
    const live=frame.contentWindow.OLANO_BUSINESS_CONFIG,api=frame.contentWindow.OLANO_BUILDER_API;
    if(!live||!api)return;
    live.content=structuredClone(state.contentSlots||[]);
    live.branding={
      ...(live.branding||{}),
      logo_url:state.previewLogoUrl||state.branding?.logo_url||null,
      primary:state.branding?.color_primary||'#0b2e4f',
      secondary:state.branding?.color_secondary||'#1aa79d',
      accent:state.branding?.color_accent||'#d7ab33',
      background:state.branding?.color_background||'#f4f7f8'
    };
    api.reapply?api.reapply(live):(api.registerVisualElements(live),api.applyVisualElementStyles(live));
    applyBrandPreviewToIframe();
    setupVisualPreview();
  }catch(err){editorTrace('DRAFT_PREVIEW_SYNC','ERROR',{message:err?.message||String(err)});}
}
function restoreEditorSnapshot(snapshot,{reload=false}={}){
  state.branding=structuredClone(snapshot.branding||{});
  state.contentSlots=structuredClone(snapshot.contentSlots||[]);
  state.previewLogoUrl=snapshot.previewLogoUrl||null;
  renderBranding();renderContentEditor();
  updateEditorDirty();
  if(reload)reloadVisualSitePreview();else syncDraftToPreview();
}
function undoEditorChange(){
  if(!state.undoStack.length){showUndoToast('No hay cambios anteriores para deshacer.');return;}
  const item=state.undoStack.pop();
  state.redoStack.push({label:item.label,snapshot:editorSnapshot(),key:editorComparable()});
  restoreEditorSnapshot(item.snapshot);
  editorTrace('UNDO','OK',{label:item.label});
  showUndoToast(item.label,false);
}
function redoEditorChange(){
  if(!state.redoStack.length)return;
  const item=state.redoStack.pop();
  state.undoStack.push({label:item.label,snapshot:editorSnapshot(),key:editorComparable()});
  restoreEditorSnapshot(item.snapshot);
  editorTrace('REDO','OK',{label:item.label});
  showUndoToast(item.label,true);
}
async function discardEditorDraft(){
  if(!state.editorBaseline)return;
  if(state.editorDirty&&!confirm('¿Descartar todos los cambios no publicados del editor?'))return;
  restoreEditorSnapshot(state.editorBaseline,{reload:true});
  state.undoStack=[];state.redoStack=[];
  editorTrace('DRAFT_DISCARD','OK',{});
}
function slotsForPublish(){
  return (state.contentSlots||[]).map(x=>({
    slot_key:x.slot_key,section_label:x.section_label||x.slot_key,eyebrow:x.eyebrow??null,title:x.title??null,subtitle:x.subtitle??null,
    body:x.body??null,cta_label:x.cta_label??null,cta_url:x.cta_url??null,image_url:x.image_url??null,image_path:x.image_path??null,
    image_alt:x.image_alt??null,enabled:x.enabled!==false,sort_order:Number(x.sort_order||0),settings:x.settings||{}
  }));
}
async function publishEditorDraft(){
  canWriteOrThrow();
  if(!state.editorDirty){setStatus('No hay cambios pendientes.','info');return;}
  const btn=$('publishEditorBtn');if(btn)btn.disabled=true;
  builderSetState('Publicando…','neutral');
  editorTrace('PUBLISH_START','OK',{changes:editorChangeCount()});
  const branding={
    logo_url:state.branding?.logo_url||null,logo_path:state.branding?.logo_path||null,
    color_primary:state.branding?.color_primary||'#0b2e4f',
    color_secondary:state.branding?.color_secondary||'#1aa79d',
    color_accent:state.branding?.color_accent||'#d7ab33',
    color_background:state.branding?.color_background||'#f4f7f8'
  };
  const {data,error}=await sb.rpc('publish_visual_editor',{
    p_negocio_id:state.business.id,p_branding:branding,p_slots:slotsForPublish()
  });
  if(error)throw error;
  state.previewLogoUrl=null;
  setEditorBaseline();
  setStatus('Cambios publicados en la web.','ok');
  editorTrace('PUBLISH_SUCCESS','OK',{result:data||null});
  reloadVisualSitePreview();
}

async function loadAll({ publicCheck = false } = {}) {
  if (!state.business) return;
  setSync('Sincronizando…', null);
  const bid = state.business.id;
  const [configQ, resourcesQ, schedulesQ, categoriesQ, servicesQ, linksQ, promotionsQ, brandingQ, availabilityConfigsQ, availabilityBlocksQ, contentQ] = await Promise.all([
    sb.from('configuracion_agenda').select('*').eq('negocio_id', bid).maybeSingle(),
    sb.from('recursos_agenda').select('*').eq('negocio_id', bid).order('created_at'),
    sb.from('horarios_agenda').select('*').eq('negocio_id', bid).order('dia_semana').order('hora_inicio'),
    sb.from('servicio_categorias').select('*').eq('negocio_id', bid).order('orden').order('nombre'),
    sb.from('servicios').select('id,negocio_id,nombre,descripcion,descripcion_web,duracion_min,precio_pen,precio_usd,activo,codigo_web,codigo_externo,dias_semana_disponibles,requiere_consulta_previa,modalidades_consulta,precio_consulta_pen,calendar_color_hex,categoria_id,visible_web,orden_web,precio_desde,created_at,updated_at').eq('negocio_id', bid).order('orden_web').order('nombre'),
    sb.from('servicios_recursos').select('*').eq('negocio_id', bid),
    sb.from('web_promociones').select('*').eq('negocio_id', bid).order('created_at', { ascending:false }),
    sb.from('web_branding').select('*').eq('negocio_id', bid).maybeSingle(),
    sb.from('agenda_disponibilidad_config').select('*').eq('negocio_id', bid).order('created_at'),
    sb.from('agenda_disponibilidad_bloques').select('*').eq('negocio_id', bid).order('created_at'),
    sb.from('web_content_slots').select('*').eq('negocio_id', bid).order('sort_order').order('slot_key')
  ]);
  for (const q of [configQ, resourcesQ, schedulesQ, categoriesQ, servicesQ, linksQ, promotionsQ, brandingQ, availabilityConfigsQ, availabilityBlocksQ, contentQ]) {
    if (q.error) throw q.error;
  }
  state.config = configQ.data || null;
  state.resources = resourcesQ.data || [];
  state.schedules = schedulesQ.data || [];
  state.categories = categoriesQ.data || [];
  state.services = servicesQ.data || [];
  state.links = linksQ.data || [];
  state.promotions = promotionsQ.data || [];
  const preserveEditorDraft=state.editorDirty&&state.editorBaseline;
  const draftBranding=preserveEditorDraft?structuredClone(state.branding):null;
  const draftSlots=preserveEditorDraft?structuredClone(state.contentSlots):null;
  state.branding = preserveEditorDraft ? draftBranding : (brandingQ.data || null);
  state.availabilityConfigs = availabilityConfigsQ.data || [];
  state.availabilityBlocks = availabilityBlocksQ.data || [];
  state.contentSlots = preserveEditorDraft ? draftSlots : (contentQ.data || []);
  renderAll();
  if(!preserveEditorDraft)setEditorBaseline();
  setSync('Datos sincronizados', true);
  if (publicCheck) await loadPublicConfig();
}

function renderAll() {
  renderAgenda();
  renderResources();
  renderSchedules();
  renderCategories();
  fillCategorySelects();
  fillResourceSelects();
  renderServices();
  renderPromotions();
  renderBranding();
  renderAvailability();
  renderContentEditor();
  setWriteMode();
}

function renderAgenda() {
  const c = state.config;
  $('agendaActiva').checked = c?.activa === true;
  $('intervaloInicio').value = c?.intervalo_inicio_min ?? 20;
  $('anticipacionMin').value = c?.anticipacion_min ?? 0;
  $('horizonteDias').value = c?.horizonte_dias ?? 60;
  $('capacidadHora').value = c?.capacidad_por_hora ?? 1;
  $('agendaStateBadge').textContent = c?.activa ? 'Agenda activa' : 'Agenda pausada';
  $('agendaStateBadge').className = 'pill ' + (c?.activa ? '' : 'off');
}

function renderResources() {
  const box = $('resourceList');
  if (!state.resources.length) {
    box.innerHTML = '<div class="empty-state">Aún no hay personas o recursos configurados.</div>';
    return;
  }
  box.innerHTML = state.resources.map((r) => {
    const hours = state.schedules.filter((h) => h.recurso_id === r.id && h.activo).length;
    return `<div class="list-row">
      <div><strong>${esc(r.nombre)}</strong><small>${esc(r.tipo)} · ${hours} bloque(s) de horario</small></div>
      <div class="row-actions"><span class="pill ${r.activo ? '' : 'off'}">${r.activo ? 'Activo' : 'Inactivo'}</span>
      <button class="button mini write-control" data-resource-edit="${attr(r.id)}" type="button">Editar</button></div>
    </div>`;
  }).join('');
  box.querySelectorAll('[data-resource-edit]').forEach((b) => b.addEventListener('click', () => openResource(b.dataset.resourceEdit)));
}

function renderSchedules() {
  const board = $('scheduleBoard');
  board.innerHTML = WEEKDAYS.map((day) => {
    const rows = state.schedules.filter((h) => Number(h.dia_semana) === day.value)
      .sort((a,b) => String(a.hora_inicio).localeCompare(String(b.hora_inicio)));
    return `<div class="day-col"><h4>${day.name}</h4>${rows.length ? rows.map((h) => {
      const r = resourceById(h.recurso_id);
      return `<button class="slot-chip write-control" type="button" data-schedule-edit="${attr(h.id)}">
        <b>${esc(String(h.hora_inicio).slice(0,5))}–${esc(String(h.hora_fin).slice(0,5))}</b>
        <span>${esc(r?.nombre || 'Recurso')} · ${h.activo ? 'Activo' : 'Inactivo'}</span>
      </button>`;
    }).join('') : '<span class="muted">Sin horario</span>'}</div>`;
  }).join('');
  board.querySelectorAll('[data-schedule-edit]').forEach((b) => b.addEventListener('click', () => openSchedule(b.dataset.scheduleEdit)));
}


function availabilityConfigById(id) { return state.availabilityConfigs.find((x) => x.id === id); }
function availabilityBlocksFor(configId) { return state.availabilityBlocks.filter((x) => x.config_id === configId); }
function availabilityTargetLabel(cfg) {
  if (!cfg) return 'Regla';
  if (cfg.alcance === 'service') return serviceById(cfg.servicio_id)?.nombre || 'Servicio';
  return categoryById(cfg.categoria_id)?.nombre || 'Categoría';
}
function fillAvailabilityTargets() {
  if (!$('availabilityCategory') || !$('availabilityService')) return;
  $('availabilityCategory').innerHTML = '<option value="">Elige una categoría</option>' +
    state.categories.filter((x)=>x.activo).map((x)=>'<option value="'+attr(x.id)+'">'+esc(x.nombre)+'</option>').join('');
  $('availabilityService').innerHTML = '<option value="">Elige un servicio</option>' +
    state.services.filter((x)=>x.activo).map((x)=>'<option value="'+attr(x.id)+'">'+esc(x.nombre)+'</option>').join('');
}
function renderAvailabilityWeekdays(selected = []) {
  const set = new Set((selected || []).map(Number));
  $('availabilityWeekdays').innerHTML = WEEKDAYS.map((d)=>
    '<label class="weekday-check"><input type="checkbox" value="'+d.value+'" '+(set.has(d.value)?'checked':'')+'><span>'+d.short+'</span></label>'
  ).join('');
}
function formatShortDate(value) {
  if (!value) return '';
  const d = new Date(String(value) + 'T12:00:00-05:00');
  return new Intl.DateTimeFormat('es-PE',{day:'2-digit',month:'short',year:'numeric'}).format(d).replace('.','');
}
function availabilityReadable(cfg) {
  const rows=availabilityBlocksFor(cfg.id).filter((x)=>x.activo);
  const weekly=rows.filter((x)=>x.tipo==='weekly');
  const dated=rows.filter((x)=>x.tipo==='date');
  if (dated.length) {
    const dates=dated.map(x=>x.fecha).filter(Boolean).sort();
    const period=dates.length ? (formatShortDate(dates[0])+(dates.length>1?' – '+formatShortDate(dates[dates.length-1]):'')) : '';
    const outside=dated.filter(x=>(cfg.vigente_desde&&x.fecha<cfg.vigente_desde)||(cfg.vigente_hasta&&x.fecha>cfg.vigente_hasta));
    return {
      main: dated.length+' fecha'+(dated.length===1?'':'s')+(period?' · '+period:''),
      detail:'Horarios puntuales',
      count: dated.length,
      warning: outside.length ? outside.length+' fecha'+(outside.length===1?' está':'s están')+' fuera del periodo configurado' : ''
    };
  }
  if (weekly.length) {
    const days=[...new Set(weekly.map(x=>Number(x.dia_semana)))].sort((a,b)=>a-b);
    const dayText=days.map(dayName).join(', ');
    const byTime=[...new Set(weekly.map(x=>String(x.hora_inicio).slice(0,5)+'–'+String(x.hora_fin).slice(0,5)))];
    return {
      main: dayText || 'Horario semanal',
      detail: byTime.join(' / '),
      count: weekly.length
    };
  }
  return {main:'Aún sin horarios',detail:'Agrega los días y horas después de guardar',count:0};
}
function renderAvailability() {
  fillAvailabilityTargets();
  const box = $('availabilityConfigList');
  if (!box) return;
  if (!state.availabilityConfigs.length) {
    box.innerHTML = '<div class="empty-state"><b>No hay horarios especiales.</b><br>La web usa el horario general. Crea uno solo cuando una categoría o servicio necesite días, horas o intervalos distintos.</div>';
  } else {
    box.innerHTML = state.availabilityConfigs.map((cfg)=>{
      const info=availabilityReadable(cfg);
      const target=availabilityTargetLabel(cfg);
      const interval=cfg.intervalo_min?('Cada '+Number(cfg.intervalo_min)+' min'):'Usa intervalo general';
      return '<article class="item-card availability-card">'+
        '<div class="item-top"><div><h3>'+esc(target)+'</h3><p>'+esc(info.main)+'</p></div>'+
        '<span class="pill '+(cfg.activo?'':'off')+'">'+(cfg.activo?'En uso':'Pausado')+'</span></div>'+
        '<div class="availability-readable">'+esc(info.detail)+'</div>'+
        (info.warning?'<div class="notice warning availability-warning">⚠ '+esc(info.warning)+'. Abre la regla para corregirla.</div>':'')+
        '<div class="meta-row"><span class="meta">'+esc(interval)+'</span>'+
        '<span class="meta">'+(cfg.alcance==='service'?'Solo este servicio':'Toda la categoría')+'</span>'+
        (cfg.vigente_desde||cfg.vigente_hasta?'<span class="meta">Periodo limitado</span>':'<span class="meta">Sin fecha límite</span>')+
        '</div>'+
        '<div class="row-actions"><button class="button mini write-control" type="button" data-availability-edit="'+attr(cfg.id)+'">Abrir y editar</button>'+
        '<button class="button mini danger write-control" type="button" data-availability-delete="'+attr(cfg.id)+'">Eliminar</button></div></article>';
    }).join('');
    box.querySelectorAll('[data-availability-edit]').forEach((b)=>b.addEventListener('click',()=>openAvailabilityConfig(b.dataset.availabilityEdit)));
    box.querySelectorAll('[data-availability-delete]').forEach((b)=>b.addEventListener('click',()=>guard(()=>deleteAvailabilityConfig(b.dataset.availabilityDelete))));
  }
  const currentId = $('availabilityConfigId')?.value || '';
  if (currentId && availabilityConfigById(currentId)) {
    renderAvailabilityBlocks(currentId);
  } else if ($('availabilityBlocksCard')) {
    $('availabilityBlocksCard').hidden = true;
  }
}
function updateAvailabilityPeriodMode() {
  const mode=$('availabilityPeriodMode')?.value||'always';
  if($('availabilityDateRange')) $('availabilityDateRange').hidden=mode!=='range';
  if(mode==='always'){
    $('availabilityFrom').value='';
    $('availabilityTo').value='';
  }
}
function resetAvailabilityConfigForm() {
  $('availabilityConfigForm').reset();
  $('availabilityConfigId').value='';
  $('availabilityScope').value='category';
  $('availabilityPeriodMode').value='always';
  $('availabilityReplace').checked=true;
  $('availabilityActive').checked=true;
  $('availabilityConfigForm').hidden=true;
  $('availabilityFormEmpty').hidden=false;
  $('availabilityBlocksCard').hidden=true;
  updateAvailabilityScope();
  updateAvailabilityPeriodMode();
}
function updateAvailabilityScope() {
  const service = $('availabilityScope').value === 'service';
  $('availabilityCategoryWrap').hidden = service;
  $('availabilityServiceWrap').hidden = !service;
}
function openAvailabilityConfig(id='') {
  const cfg = id ? availabilityConfigById(id) : null;
  $('availabilityConfigId').value = cfg?.id || '';
  $('availabilityScope').value = cfg?.alcance || 'category';
  $('availabilityCategory').value = cfg?.categoria_id || '';
  $('availabilityService').value = cfg?.servicio_id || '';
  $('availabilityInterval').value = cfg?.intervalo_min ?? '';
  $('availabilityPeriodMode').value = (cfg?.vigente_desde || cfg?.vigente_hasta) ? 'range' : 'always';
  $('availabilityFrom').value = cfg?.vigente_desde || '';
  $('availabilityTo').value = cfg?.vigente_hasta || '';
  $('availabilityReplace').checked = cfg ? cfg.reemplaza_general === true : true;
  $('availabilityActive').checked = cfg ? cfg.activo === true : true;
  $('availabilityConfigForm').hidden=false;
  $('availabilityFormEmpty').hidden=true;
  updateAvailabilityScope();
  updateAvailabilityPeriodMode();
  if (cfg) {
    $('availabilityBlocksCard').hidden=false;
    $('availabilityBlocksTitle').textContent='Horarios · '+availabilityTargetLabel(cfg);
    renderAvailabilityBlocks(cfg.id);
  } else {
    $('availabilityBlocksCard').hidden=true;
  }
}
function renderAvailabilityBlocks(configId) {
  const cfg = availabilityConfigById(configId);
  if (!cfg) { $('availabilityBlocksCard').hidden=true; return; }
  $('availabilityBlocksCard').hidden=false;
  $('availabilityBlocksTitle').textContent='Días y horas · '+availabilityTargetLabel(cfg);
  const rows = availabilityBlocksFor(configId).sort((a,b)=>{
    const ak=a.tipo==='date' ? '0'+String(a.fecha||'') : '1'+String(a.dia_semana).padStart(2,'0')+String(a.hora_inicio);
    const bk=b.tipo==='date' ? '0'+String(b.fecha||'') : '1'+String(b.dia_semana).padStart(2,'0')+String(b.hora_inicio);
    return ak.localeCompare(bk);
  });
  const box=$('availabilityBlockList');
  if (!rows.length) {
    box.innerHTML='<div class="empty-state"><b>Falta definir los días y horas.</b><br>Ejemplo: lunes, miércoles y viernes · 09:00–12:00 y 14:30–19:30.</div>';
    return;
  }
  box.innerHTML=rows.map((b)=>{
    const when=b.tipo==='date' ? formatShortDate(b.fecha) : dayName(b.dia_semana);
    return '<div class="list-row availability-time-row"><div><strong>'+esc(when)+'</strong>'+
      '<small>'+esc(String(b.hora_inicio).slice(0,5))+' – '+esc(String(b.hora_fin).slice(0,5))+(b.tipo==='date'?' · solo ese día':' · se repite cada semana')+'</small></div>'+
      '<div class="row-actions"><button class="button mini write-control" data-availability-block-edit="'+attr(b.id)+'" type="button">Editar</button>'+
      '<button class="button mini danger write-control" data-availability-block-delete="'+attr(b.id)+'" type="button">Eliminar</button></div></div>';
  }).join('');
  box.querySelectorAll('[data-availability-block-edit]').forEach((b)=>b.addEventListener('click',()=>openAvailabilityBlock(b.dataset.availabilityBlockEdit)));
  box.querySelectorAll('[data-availability-block-delete]').forEach((b)=>b.addEventListener('click',()=>guard(()=>deleteAvailabilityBlock(b.dataset.availabilityBlockDelete))));
}
function resetAvailabilityBlockForm() {
  $('availabilityBlockForm').reset();
  $('availabilityBlockId').value='';
  $('availabilityBlockType').value='weekly';
  renderAvailabilityWeekdays([]);
  $('availabilityBlockForm').hidden=true;
  updateAvailabilityBlockType();
}
function updateAvailabilityBlockType() {
  const isDate=$('availabilityBlockType').value==='date';
  $('availabilityDateWrap').hidden=!isDate;
  $('availabilityWeekdaysWrap').hidden=isDate;
}
function openAvailabilityBlock(id='') {
  const row = id ? state.availabilityBlocks.find((x)=>x.id===id) : null;
  $('availabilityBlockId').value=row?.id||'';
  $('availabilityBlockType').value=row?.tipo||'weekly';
  $('availabilityDate').value=row?.fecha||'';
  $('availabilityStart').value=row ? String(row.hora_inicio).slice(0,5) : '';
  $('availabilityEnd').value=row ? String(row.hora_fin).slice(0,5) : '';
  renderAvailabilityWeekdays(row?.tipo==='weekly' ? [row.dia_semana] : []);
  $('availabilityBlockForm').hidden=false;
  updateAvailabilityBlockType();
}
async function saveAvailabilityConfig(e) {
  e.preventDefault();
  canWriteOrThrow();
  const id=$('availabilityConfigId').value;
  const alcance=$('availabilityScope').value;
  const categoria_id=alcance==='category' ? $('availabilityCategory').value : null;
  const servicio_id=alcance==='service' ? $('availabilityService').value : null;
  if(alcance==='category'&&!categoria_id) throw new Error('Selecciona una categoría.');
  if(alcance==='service'&&!servicio_id) throw new Error('Selecciona un servicio.');
  const periodMode=$('availabilityPeriodMode').value;
  const desde=periodMode==='range' ? ($('availabilityFrom').value||null) : null;
  const hasta=periodMode==='range' ? ($('availabilityTo').value||null) : null;
  if(periodMode==='range' && (!desde || !hasta)) throw new Error('Elige la fecha de inicio y la fecha final.');
  if(desde&&hasta&&hasta<desde) throw new Error('La fecha final debe ser posterior o igual a la inicial.');
  const payload={
    negocio_id:state.business.id,alcance,categoria_id,servicio_id,
    intervalo_min:numberOrNull($('availabilityInterval').value),
    reemplaza_general:$('availabilityReplace').checked,
    vigente_desde:desde,vigente_hasta:hasta,activo:$('availabilityActive').checked,
    updated_at:new Date().toISOString()
  };
  let configId=id;
  if(id){
    const {error}=await sb.from('agenda_disponibilidad_config').update(payload).eq('id',id).eq('negocio_id',state.business.id);
    if(error) throw error;
  } else {
    const {data,error}=await sb.from('agenda_disponibilidad_config').insert(payload).select('id').single();
    if(error) throw error;
    configId=data.id;
  }
  setStatus('Regla de disponibilidad guardada.','ok');
  await loadAll();
  openAvailabilityConfig(configId);
}
async function deleteAvailabilityConfig(id) {
  canWriteOrThrow();
  if(!confirm('¿Eliminar esta regla y todos sus bloques de horario?')) return;
  const {error}=await sb.from('agenda_disponibilidad_config').delete().eq('id',id).eq('negocio_id',state.business.id);
  if(error) throw error;
  resetAvailabilityConfigForm();
  setStatus('Regla eliminada.','ok');
  await loadAll();
}
async function saveAvailabilityBlock(e) {
  e.preventDefault();
  canWriteOrThrow();
  const configId=$('availabilityConfigId').value;
  const cfg=availabilityConfigById(configId);
  if(!cfg) throw new Error('Guarda o selecciona primero una regla.');
  const id=$('availabilityBlockId').value;
  const tipo=$('availabilityBlockType').value;
  const start=$('availabilityStart').value, end=$('availabilityEnd').value;
  if(!start||!end||end<=start) throw new Error('La hora final debe ser posterior a la inicial.');
  if(tipo==='date'){
    const fecha=$('availabilityDate').value;
    if(!fecha) throw new Error('Selecciona la fecha.');
    if(cfg.vigente_desde && fecha<cfg.vigente_desde) throw new Error('Esa fecha está antes del periodo de esta regla.');
    if(cfg.vigente_hasta && fecha>cfg.vigente_hasta) throw new Error('Esa fecha está después del periodo de esta regla.');
    const payload={negocio_id:state.business.id,config_id:configId,tipo:'date',dia_semana:null,fecha,hora_inicio:start,hora_fin:end,activo:true,updated_at:new Date().toISOString()};
    const q=id ? sb.from('agenda_disponibilidad_bloques').update(payload).eq('id',id).eq('negocio_id',state.business.id) : sb.from('agenda_disponibilidad_bloques').insert(payload);
    const {error}=await q; if(error) throw error;
  } else {
    const days=[...$('availabilityWeekdays').querySelectorAll('input:checked')].map((x)=>Number(x.value));
    if(!days.length) throw new Error('Elige al menos un día.');
    const base={negocio_id:state.business.id,config_id:configId,tipo:'weekly',fecha:null,hora_inicio:start,hora_fin:end,activo:true,updated_at:new Date().toISOString()};
    if(id){
      const first=days.shift();
      const {error}=await sb.from('agenda_disponibilidad_bloques').update({...base,dia_semana:first}).eq('id',id).eq('negocio_id',state.business.id);
      if(error) throw error;
    }
    if(days.length || !id){
      const toInsert=(id?days:[...$('availabilityWeekdays').querySelectorAll('input:checked')].map((x)=>Number(x.value))).map((d)=>({...base,dia_semana:d}));
      if(toInsert.length){
        const {error}=await sb.from('agenda_disponibilidad_bloques').insert(toInsert);
        if(error) throw error;
      }
    }
  }
  setStatus('Bloque de horario guardado.','ok');
  await loadAll();
  openAvailabilityConfig(configId);
  resetAvailabilityBlockForm();
}
async function deleteAvailabilityBlock(id) {
  canWriteOrThrow();
  if(!confirm('¿Eliminar este bloque de horario?')) return;
  const row=state.availabilityBlocks.find((x)=>x.id===id);
  const configId=row?.config_id||$('availabilityConfigId').value;
  const {error}=await sb.from('agenda_disponibilidad_bloques').delete().eq('id',id).eq('negocio_id',state.business.id);
  if(error) throw error;
  setStatus('Bloque eliminado.','ok');
  await loadAll();
  if(configId) openAvailabilityConfig(configId);
}

function categoryIconHtml(c) {
  const checked = safeSvg(c.icon_svg);
  return checked.ok && checked.value ? checked.value : '<span>SVG</span>';
}
function renderCategories() {
  const box = $('categoryList');
  if (!state.categories.length) {
    box.innerHTML = '<div class="empty-state">No hay categorías todavía.</div>';
    return;
  }
  box.innerHTML = state.categories.map((c) => {
    const count = state.services.filter((s) => s.categoria_id === c.id).length;
    return `<article class="item-card category-card">
      <div class="cat-icon">${categoryIconHtml(c)}</div>
      <div><h3>${esc(c.nombre)}</h3><p>${esc(c.descripcion || 'Sin descripción pública')}</p>
        <div class="meta-row"><span class="meta">Orden ${Number(c.orden || 0)}</span><span class="meta">${count} servicio(s)</span>
        ${c.destacada_web ? '<span class="meta">Destacada</span>' : ''}</div>
      </div>
      <div class="row-actions"><span class="pill ${c.activo ? '' : 'off'}">${c.activo ? 'Activa' : 'Inactiva'}</span>
      <button class="button mini write-control" type="button" data-category-edit="${attr(c.id)}">Editar</button></div>
    </article>`;
  }).join('');
  box.querySelectorAll('[data-category-edit]').forEach((b) => b.addEventListener('click', () => openCategory(b.dataset.categoryEdit)));
}

function fillCategorySelects() {
  const active = state.categories.filter((c) => c.activo);
  const opts = active.map((c) => `<option value="${attr(c.id)}">${esc(c.nombre)}</option>`).join('');
  $('serviceCategory').innerHTML = '<option value="">Elige una categoría</option>' + opts;
  $('promotionCategory').innerHTML = '<option value="">Elige una categoría</option>' + opts;
  $('serviceCategoryFilter').innerHTML = '<option value="">Todas las categorías</option>' + state.categories.map((c) => `<option value="${attr(c.id)}">${esc(c.nombre)}</option>`).join('');
}
function fillResourceSelects() {
  const opts = state.resources.map((r) => `<option value="${attr(r.id)}" ${r.activo ? '' : 'disabled'}>${esc(r.nombre)}${r.activo ? '' : ' · inactivo'}</option>`).join('');
  $('scheduleResource').innerHTML = '<option value="">Elige quién/recurso</option>' + opts;
  $('serviceResource').innerHTML = '<option value="">Elige quién/recurso</option>' + opts;
}

function renderServices() {
  const query = $('serviceSearch').value.trim().toLowerCase();
  const filter = $('serviceCategoryFilter').value;
  const rows = state.services.filter((s) => {
    const hay = !query || [s.nombre, s.descripcion_web, s.codigo_externo].some((v) => String(v || '').toLowerCase().includes(query));
    return hay && (!filter || s.categoria_id === filter);
  });
  $('serviceCount').textContent = `${rows.length} servicio(s)`;
  const box = $('serviceList');
  if (!rows.length) {
    box.innerHTML = '<div class="empty-state">No hay servicios que coincidan con el filtro.</div>';
  } else {
    box.innerHTML = rows.map((s) => {
      const c = categoryById(s.categoria_id);
      const r = assignedResourceFor(s.id);
      const days = Array.isArray(s.dias_semana_disponibles) && s.dias_semana_disponibles.length
        ? s.dias_semana_disponibles.map(dayName).join(', ') : 'Todos los días del horario';
      return `<article class="item-card service-card ${s.visible_web ? '' : 'hidden-card'}">
        <div class="item-top"><div><h3>${esc(s.nombre)}</h3><p>${esc(c?.nombre || s.descripcion || 'Sin categoría')}</p></div>
        <span class="pill ${s.activo && s.visible_web ? '' : 'off'}">${!s.activo ? 'Inactivo' : (s.visible_web ? 'Publicado' : 'Borrador')}</span></div>
        <div class="meta-row">
          <span class="meta price">${s.precio_desde && s.precio_pen != null ? 'Desde ' : ''}${esc(money(s.precio_pen))}</span>
          <span class="meta">${s.duracion_min ? Number(s.duracion_min) + ' min' : 'Duración por definir'}</span>
          <span class="meta">${esc(r?.nombre ? 'Agenda: '+r.nombre : 'Agenda pendiente')}</span>
        </div>
        <p>${esc(s.descripcion_web || days)}</p>
        <div class="row-actions"><button class="button mini write-control" type="button" data-service-edit="${attr(s.id)}">Editar</button></div>
      </article>`;
    }).join('');
  }
  box.querySelectorAll('[data-service-edit]').forEach((b) => b.addEventListener('click', () => openService(b.dataset.serviceEdit)));
  $('promotionService').innerHTML = '<option value="">Elige un servicio</option>' + state.services.filter((s) => s.activo).map((s) => `<option value="${attr(s.id)}">${esc(s.nombre)}</option>`).join('');
}

function promoApplicableText(p) {
  if (p.alcance === 'category') return categoryById(p.categoria_id)?.nombre || 'Categoría';
  if (p.alcance === 'service') return serviceById(p.servicio_id)?.nombre || 'Servicio';
  return 'Todos los servicios';
}
function renderPromotions() {
  const box = $('promotionList');
  if (!state.promotions.length) {
    box.innerHTML = '<div class="empty-state">No hay promociones configuradas.</div>';
    return;
  }
  box.innerHTML = state.promotions.map((p) => `<article class="item-card">
    <div class="item-top"><div><h3>${esc(p.nombre_interno)}</h3><p>${esc(p.titulo)} · ${esc(promoApplicableText(p))}</p></div>
    <span class="pill ${p.activo ? '' : 'off'}">${p.activo ? 'Activa' : 'Inactiva'}</span></div>
    <div class="meta-row"><span class="meta">${Number(p.descuento_pct || 0)}% desc.</span><span class="meta">${Number(p.duracion_contador_seg || 0)} s</span>
    ${p.inicia_at ? '<span class="meta">Con inicio</span>' : ''}${p.termina_at ? '<span class="meta">Con fin</span>' : ''}</div>
    <div class="row-actions"><button class="button mini write-control" type="button" data-promotion-edit="${attr(p.id)}">Editar</button></div>
  </article>`).join('');
  box.querySelectorAll('[data-promotion-edit]').forEach((b) => b.addEventListener('click', () => openPromotion(b.dataset.promotionEdit)));
}


async function uploadBusinessContentImage(file, prefix='image') {
  if (!file) return null;
  if (file.size > 5242880) throw new Error('La imagen supera el máximo de 5 MB.');
  if (!['image/png','image/jpeg','image/webp'].includes(file.type)) throw new Error('Usa una imagen PNG, JPG o WebP.');
  const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
  const safePrefix=slugify(prefix).slice(0,50)||'image';
  const path='dr-olano/'+safePrefix+'-'+Date.now()+'.'+ext;
  const {error}=await sb.storage.from('business-content').upload(path,file,{cacheControl:'3600',upsert:false});
  if(error) throw error;
  const {data}=sb.storage.from('business-content').getPublicUrl(path);
  if(!data?.publicUrl) throw new Error('No se pudo obtener la URL de la imagen.');
  return {path,url:data.publicUrl};
}

function contentSlotLabel(slot) {
  const labels={
    'site.header':'Encabezado',
    'home.hero':'Portada principal',
    'home.start':'Cómo empezar',
    'home.featured':'Categorías destacadas',
    'home.trust':'Confianza médica',
    'home.faq':'Preguntas frecuentes',
    'home.profile':'Conoce al Dr. Olano',
    'home.areas':'Áreas de atención',
    'home.location':'Dónde te atendemos',
    'site.footer':'Pie de página'
  };
  return labels[slot.slot_key]||slot.section_label||slot.slot_key;
}
function slotSettings(slot){ return slot?.settings && typeof slot.settings==='object' ? structuredClone(slot.settings) : {}; }
function builderSetState(text='Sin cambios',kind='neutral'){
  const el=$('builderSaveState'); if(!el)return;
  el.textContent=text; el.className='pill '+kind;
}
function editorTrace(event,status='OK',detail={}){
  const sel=state.builderSelection||{};
  const row={
    time:new Date().toISOString(),
    event:String(event),
    status:String(status),
    device:state.builderDevice,
    mode:state.builderMode,
    slot:detail.slot||sel.slotKey||null,
    element:detail.element||sel.elementKey||null,
    detail:{...detail}
  };
  delete row.detail.slot;delete row.detail.element;
  state.traceLog.push(row);
  if(state.traceLog.length>80)state.traceLog.splice(0,state.traceLog.length-80);
  renderEditorTrace();
  return row;
}
function renderEditorTrace(){
  const out=$('editorTraceOutput'),health=$('traceHealth');
  if(!out||!health)return;
  if(!state.traceLog.length){
    out.textContent='Aún no hay eventos.';
    health.textContent='Sin eventos';health.className='pill neutral';return;
  }
  out.textContent=state.traceLog.map(x=>JSON.stringify(x)).join('\n');
  const lastError=[...state.traceLog].reverse().find(x=>x.status==='ERROR');
  const last=state.traceLog[state.traceLog.length-1];
  if(last?.status==='ERROR'){health.textContent='Error';health.className='pill off';}
  else if(lastError){health.textContent='Con trazas';health.className='pill neutral';}
  else{health.textContent='OK';health.className='pill';}
  out.scrollTop=out.scrollHeight;
}
async function copyEditorTrace(){
  const text=state.traceLog.map(x=>JSON.stringify(x)).join('\n')||'Sin trazas.';
  try{await navigator.clipboard.writeText(text);setStatus('Trazas copiadas.','ok');}
  catch{window.prompt('Copia estas trazas:',text);}
}
function clearEditorTrace(){
  state.traceLog=[];renderEditorTrace();editorTrace('TRACE_RESET','OK',{message:'Registro reiniciado'});
}
function builderField(label,name,value='',type='input',max=500){
  const safe=esc(value||'');
  if(type==='textarea')return '<label><span>'+esc(label)+'</span><textarea data-content-field="'+attr(name)+'" maxlength="'+max+'" rows="3">'+safe+'</textarea></label>';
  return '<label><span>'+esc(label)+'</span><input data-content-field="'+attr(name)+'" maxlength="'+max+'" value="'+attr(value||'')+'"></label>';
}
function builderSetting(label,name,value='',type='input',max=500){
  const safe=esc(value||'');
  if(type==='textarea')return '<label><span>'+esc(label)+'</span><textarea data-setting-field="'+attr(name)+'" maxlength="'+max+'" rows="3">'+safe+'</textarea></label>';
  return '<label><span>'+esc(label)+'</span><input data-setting-field="'+attr(name)+'" maxlength="'+max+'" value="'+attr(value||'')+'"></label>';
}
function contentSlotFields(slot){
  const key=slot.slot_key, st=slotSettings(slot);
  if(key==='site.header'){
    return builderSetting('Nombre visible de la marca','brand_name',st.brand_name||slot.title||'Dr. Olano')+
      builderSetting('Botón “Agendar”','menu_book',st.menu_book||'Agendar cita')+
      builderSetting('Botón “Servicios”','menu_services',st.menu_services||'Ver servicios')+
      builderSetting('Botón “Preguntas”','menu_faq',st.menu_faq||'Preguntas frecuentes');
  }
  if(key==='home.hero'){
    const img=slot.image_url?'<img src="'+attr(slot.image_url)+'" alt="">':'<span>Sin imagen</span>';
    return builderField('Texto pequeño superior','eyebrow',slot.eyebrow||'')+
      builderField('Título principal','title',slot.title||'')+
      builderField('Texto destacado','subtitle',slot.subtitle||'','textarea',320)+
      builderField('Texto de apoyo','body',slot.body||'','textarea',1500)+
      builderField('Texto del botón','cta_label',slot.cta_label||'')+
      '<label><span>Imagen principal</span><input data-content-image type="file" accept="image/png,image/jpeg,image/webp"><small class="help">PNG, JPG o WebP · máximo 5 MB.</small></label>'+
      '<div class="content-image-preview" data-content-image-preview>'+img+'</div>'+
      builderField('Descripción de la imagen','image_alt',slot.image_alt||'');
  }
  if(key==='home.start'){
    return builderField('Título de la sección','title',slot.title||'')+
      '<div class="builder-subgroup"><b>Opción 1</b>'+
      builderSetting('Título','option_1_title',st.option_1_title||'')+
      builderSetting('Texto','option_1_body',st.option_1_body||'','textarea',320)+'</div>'+
      '<div class="builder-subgroup"><b>Opción 2</b>'+
      builderSetting('Título','option_2_title',st.option_2_title||'')+
      builderSetting('Texto','option_2_body',st.option_2_body||'','textarea',320)+'</div>';
  }
  if(key==='home.featured'){
    return builderField('Título','title',slot.title||'')+
      builderField('Texto de apoyo','body',slot.body||'','textarea',600)+
      '<div class="builder-linked-note">Las tarjetas, sus imágenes e iconos se administran desde <b>Categorías</b>.<button type="button" class="button mini" data-open-tab="categorias">Abrir Categorías</button></div>';
  }
  if(key==='home.trust'){
    return builderField('Título','title',slot.title||'')+
      builderSetting('Línea destacada','lead',st.lead||'')+
      builderField('Texto','body',slot.body||'','textarea',700)+
      '<div class="builder-linked-note">Los horarios que aparecen en esta sección vienen de la agenda real y no se escriben manualmente aquí.</div>';
  }
  if(key==='home.faq'){
    const items=Array.isArray(st.items)?st.items:[];
    return builderField('Título de la sección','title',slot.title||'Preguntas frecuentes')+
      '<div class="builder-faq-list">'+items.map((item,i)=>
        '<div class="builder-subgroup"><b>Pregunta '+(i+1)+'</b>'+
        '<label><span>Pregunta</span><input data-faq-q data-faq-index="'+i+'" maxlength="220" value="'+attr(item?.q||'')+'"></label>'+
        '<label><span>Respuesta</span><textarea data-faq-a data-faq-index="'+i+'" maxlength="900" rows="3">'+esc(item?.a||'')+'</textarea></label></div>'
      ).join('')+'</div>';
  }
  if(key==='home.profile'){
    return builderField('Título','title',slot.title||'')+
      builderField('Texto','body',slot.body||'','textarea',700)+
      '<div class="builder-linked-note">El enlace al perfil profesional se mantiene fijo para no romper navegación ni credenciales.</div>';
  }
  if(key==='home.areas'){
    return builderField('Título','title',slot.title||'')+
      builderField('Texto','body',slot.body||'','textarea',700)+
      '<div class="builder-linked-note">Las áreas enlazadas se alimentan de la estructura pública vigente.</div>';
  }
  if(key==='home.location'){
    return builderField('Título','title',slot.title||'¿Dónde te atendemos?')+
      builderSetting('Dirección','address',st.address||'')+
      builderField('Texto de apoyo','body',slot.body||'','textarea',800)+
      builderSetting('Texto botón de ruta','route_label',st.route_label||'Cómo llegar desde mi ubicación')+
      builderSetting('Enlace botón de ruta','route_url',st.route_url||'')+
      builderSetting('Texto botón Google Maps','map_label',st.map_label||'Ver en Google Maps')+
      builderSetting('Enlace Google Maps','map_url',st.map_url||'');
  }
  if(key==='site.footer'){
    return builderField('Nombre visible en el pie','title',slot.title||'Dr. Olano')+
      builderSetting('Texto del botón WhatsApp','whatsapp_label',st.whatsapp_label||'WhatsApp')+
      builderSetting('Texto del botón de reserva','booking_label',st.booking_label||'Agendar cita')+
      builderSetting('Nota inferior','note',st.note||'','textarea',700)+
      '<div class="builder-linked-note">Dirección, horarios y teléfono se mantienen conectados a datos reales para evitar contradicciones.</div>';
  }
  return builderField('Título','title',slot.title||'')+builderField('Texto','body',slot.body||'','textarea',1200);
}
function builderSlotCanMove(slot){ return slot.locked_position!==true && String(slot.slot_key||'').startsWith('home.'); }
function builderSlotCanHide(slot){ return !String(slot.slot_key||'').startsWith('site.'); }
function renderContentEditor() {
  const box=$('contentEditorList');
  if(!box)return;
  const slots=[...state.contentSlots].sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0));
  if(!slots.length){
    box.innerHTML='<div class="empty-state">No hay zonas de contenido configuradas.</div>';
    return;
  }
  box.innerHTML=slots.map((slot)=>{
    const movable=builderSlotCanMove(slot), canHide=builderSlotCanHide(slot);
    const status=slot.enabled===false?'Oculta':'Visible';
    return '<details class="panel builder-section-card" data-content-form="'+attr(slot.id)+'" data-builder-slot="'+attr(slot.slot_key)+'" '+(movable?'draggable="true"':'')+'>'+
      '<summary class="builder-section-summary">'+
        '<span class="builder-drag '+(movable?'':'locked')+'" title="'+(movable?'Arrastrar para mover':'Posición fija')+'">'+(movable?'⋮⋮':'🔒')+'</span>'+
        '<span class="builder-section-name"><b>'+esc(contentSlotLabel(slot))+'</b><small>'+esc(slot.slot_key)+'</small></span>'+
        '<span class="pill '+(slot.enabled===false?'off':'')+'">'+status+'</span>'+
      '</summary>'+
      '<form class="builder-section-form">'+
        (canHide?'<label class="toggle-line"><input data-content-enabled type="checkbox" '+(slot.enabled===false?'':'checked')+'><span>Mostrar esta sección en la web</span></label>':'<div class="notice neutral">Este bloque permanece fijo en su posición para conservar la navegación.</div>')+
        contentSlotFields(slot)+
        '<div class="form-actions"><button class="button primary write-control" type="submit">Aplicar al borrador</button><button class="button ghost" type="button" data-focus-preview="'+attr(slot.slot_key)+'">Ver en la página</button></div>'+
      '</form>'+
    '</details>';
  }).join('');
  wireContentEditor();
  setWriteMode();
}
function stageCardDraft(card){
  const id=card?.dataset?.contentForm;
  const slot=state.contentSlots.find(x=>x.id===id);if(!slot)return null;
  const field=(name)=>{
    const el=card.querySelector('[data-content-field="'+name+'"]');
    return el?el.value.trim():slot[name];
  };
  ['eyebrow','title','subtitle','body','cta_label','image_alt'].forEach(name=>{
    const el=card.querySelector('[data-content-field="'+name+'"]');
    if(el)slot[name]=el.value.trim()||null;
  });
  const enabled=card.querySelector('[data-content-enabled]');
  if(enabled)slot.enabled=enabled.checked;
  slot.settings=collectSlotSettings(card,slot);
  markEditorDirty('DRAFT_CONTENT_CHANGE',{slot:slot.slot_key});
  return slot;
}
async function stageContentImageFile(card,file){
  if(!file)return;
  const slot=state.contentSlots.find(x=>x.id===card.dataset.contentForm);if(!slot)return;
  pushUndoSnapshot('Cambiar imagen · '+contentSlotLabel(slot));
  const uploaded=await uploadBusinessContentImage(file,slot.slot_key);
  slot.image_url=uploaded.url;slot.image_path=uploaded.path;
  const p=card.querySelector('[data-content-image-preview]');
  if(p)p.innerHTML='<img src="'+attr(uploaded.url)+'" alt="Vista previa">';
  applyPreviewImage(slot.slot_key,uploaded.url);
  markEditorDirty('DRAFT_IMAGE_CHANGE',{slot:slot.slot_key,url:uploaded.url});
}
function wireContentEditor(){
  const box=$('contentEditorList'); if(!box)return;
  box.querySelectorAll('.builder-section-card').forEach((card)=>{
    const form=card.querySelector('form');
    form?.addEventListener('submit',(e)=>guard(()=>saveContentSlot(e,card)));
    card.querySelectorAll('input,textarea').forEach((input)=>input.addEventListener('input',()=>{
      consumeUndoArm(input);
      stageCardDraft(card);
      applyEditorCardDraftToPreview(card);
    }));
    card.querySelector('[data-content-enabled]')?.addEventListener('change',(e)=>{
      consumeUndoArm(e.currentTarget);
      stageCardDraft(card);applyEditorCardDraftToPreview(card);
    });
    const file=card.querySelector('[data-content-image]');
    if(file)file.addEventListener('change',()=>{
      const selected=file.files?.[0];if(selected)guard(()=>stageContentImageFile(card,selected));
    });
    card.querySelector('[data-focus-preview]')?.addEventListener('click',()=>focusPreviewSlot(card.dataset.builderSlot));
    card.querySelectorAll('[data-open-tab]').forEach(btn=>btn.addEventListener('click',()=>openAdminTab(btn.dataset.openTab)));
    if(builderSlotCanMove(state.contentSlots.find(x=>x.id===card.dataset.contentForm))){
      card.addEventListener('dragstart',builderDragStart);
      card.addEventListener('dragover',builderDragOver);
      card.addEventListener('drop',builderDrop);
      card.addEventListener('dragend',()=>card.classList.remove('dragging'));
    }
  });
}
let builderDraggedId=null;
function builderDragStart(e){
  builderDraggedId=e.currentTarget.dataset.contentForm;
  pushUndoSnapshot('Mover sección');
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed='move';
  e.dataTransfer.setData('text/plain',builderDraggedId);
  const slot=state.contentSlots.find(x=>x.id===builderDraggedId);
  editorTrace('SECTION_DRAG_START','OK',{slot:slot?.slot_key||null,source:'sidebar'});
}
function syncPreviewOrderFromSidebar(){
  const doc=visualDoc(),main=doc?.querySelector('main'),box=$('contentEditorList');
  if(!main||!box)return;
  [...box.querySelectorAll('.builder-section-card')].forEach(card=>{
    const slot=state.contentSlots.find(x=>x.id===card.dataset.contentForm);
    if(!builderSlotCanMove(slot))return;
    const el=visualSlot(doc,slot.slot_key);
    if(el)main.appendChild(el);
  });
}
function builderDragOver(e){
  if(!builderDraggedId)return;
  e.preventDefault(); e.dataTransfer.dropEffect='move';
  const target=e.currentTarget;
  const dragged=$('contentEditorList').querySelector('[data-content-form="'+builderDraggedId+'"]');
  if(!dragged||dragged===target)return;
  const rect=target.getBoundingClientRect();
  const after=e.clientY>rect.top+rect.height/2;
  const wanted=after?target.nextSibling:target;
  if(wanted!==dragged)target.parentNode.insertBefore(dragged,wanted);
  syncPreviewOrderFromSidebar();
}
async function builderDrop(e){
  e.preventDefault();
  const slot=state.contentSlots.find(x=>x.id===builderDraggedId);
  builderDraggedId=null;
  await persistBuilderOrderFromSidebar();
  editorTrace('SECTION_DRAG_END','OK',{slot:slot?.slot_key||null,source:'sidebar',order:'persisted'});
}
async function persistBuilderOrderFromSidebar(){
  canWriteOrThrow();
  const cards=[...$('contentEditorList').querySelectorAll('.builder-section-card')];
  const movable=cards.filter(card=>{
    const slot=state.contentSlots.find(x=>x.id===card.dataset.contentForm);
    return builderSlotCanMove(slot);
  });
  movable.forEach((card,i)=>{
    const slot=state.contentSlots.find(x=>x.id===card.dataset.contentForm);
    if(slot)slot.sort_order=(i+1)*10;
  });
  applyPreviewOrderFromState();
  markEditorDirty('DRAFT_SECTION_ORDER',{order:movable.map(card=>state.contentSlots.find(x=>x.id===card.dataset.contentForm)?.slot_key).filter(Boolean)});
}
function collectSlotSettings(card,slot){
  const st=slotSettings(slot);
  card.querySelectorAll('[data-setting-field]').forEach(el=>{st[el.dataset.settingField]=el.value.trim();});
  const faqQs=[...card.querySelectorAll('[data-faq-q]')];
  if(faqQs.length){
    st.items=faqQs.map(q=>{
      const i=q.dataset.faqIndex;
      const a=card.querySelector('[data-faq-a][data-faq-index="'+i+'"]');
      return {q:q.value.trim(),a:a?.value.trim()||''};
    }).filter(x=>x.q||x.a);
  }
  return st;
}
async function saveContentSlot(e,card) {
  e.preventDefault();canWriteOrThrow();
  const slot=stageCardDraft(card);
  if(!slot)throw new Error('No se encontró esta sección.');
  const file=card.querySelector('[data-content-image]')?.files?.[0]||null;
  if(file)await stageContentImageFile(card,file);
  builderSetState('Borrador actualizado','warn');
  editorTrace('DRAFT_SECTION_APPLY','OK',{slot:slot.slot_key});
  updateEditorDirty();
}
function openAdminTab(name){
  const tab=document.querySelector('.tab[data-tab="'+name+'"]');
  if(tab)tab.click();
}

function setVisualPreviewDevice(device){
  if(!['desktop','tablet','mobile'].includes(device))device='desktop';
  state.builderDevice=device;
  editorTrace('DEVICE_CHANGE','OK',{device});
  const shell=$('visualSitePreviewShell'); if(!shell)return;
  shell.className='site-preview-shell visual-editor-preview '+device;
  document.querySelectorAll('[data-visual-device]').forEach(b=>b.classList.toggle('active',b.dataset.visualDevice===device));
  const frame=visualFrame();
  try{
    if(frame?.contentWindow){
      frame.contentWindow.__OLANO_PREVIEW_DEVICE=device;
      const api=frame.contentWindow.OLANO_BUILDER_API;
      const cfg=frame.contentWindow.OLANO_BUSINESS_CONFIG;
      if(api&&cfg)api.applyVisualElementStyles(cfg);
    }
  }catch{}
  setTimeout(()=>{setupVisualPreview();restoreBuilderSelection();},180);
}
function setBuilderMode(mode){
  state.builderMode=mode==='navigate'?'navigate':'edit';
  editorTrace('MODE_CHANGE','OK',{mode:state.builderMode});
  $('builderEditMode')?.classList.toggle('active',state.builderMode==='edit');
  $('builderNavigateMode')?.classList.toggle('active',state.builderMode==='navigate');
  const help=$('builderModeHelp');
  if(help)help.innerHTML=state.builderMode==='edit'
    ? '<b>Modo Editar:</b> los botones y enlaces no navegan. Selecciona, mueve, redimensiona o edita contenido.'
    : '<b>Modo Probar navegación:</b> la vista se comporta como la web real. Vuelve a Editar para modificar elementos.';
  if(state.builderMode==='navigate'){
    hideElementOverlay();
    $('elementInspector').hidden=true;
  } else {
    try{
      const frame=visualFrame();
      if(frame?.contentWindow?.location?.pathname!=='/'){
        frame.src='/?admin-preview=visual&t='+Date.now();
        return;
      }
    }catch{}
  }
  setupVisualPreview();
}
function visualFrame(){return $('visualSitePreview');}
function visualDoc(){try{return visualFrame()?.contentDocument||null}catch{return null}}
function visualSlot(doc,key){return doc?.querySelector('[data-cms-slot="'+CSS.escape(key)+'"]')||null}
function focusPreviewSlot(key){
  const doc=visualDoc(),el=visualSlot(doc,key); if(!el)return;
  el.scrollIntoView({behavior:'smooth',block:'center'});
  el.classList.add('admin-builder-flash');
  setTimeout(()=>el.classList.remove('admin-builder-flash'),1200);
}
function applyPreviewImage(key,url){
  const doc=visualDoc(),slot=visualSlot(doc,key); if(!slot)return;
  const img=slot.querySelector('[data-cms-field="image_url"],.hero-media img');
  if(img){img.removeAttribute('data-optimized');img.src=url;}
}
function cardFieldValue(card,name){
  return card.querySelector('[data-content-field="'+name+'"]')?.value?.trim()||'';
}
function applyEditorCardDraftToPreview(card){
  const doc=visualDoc(); if(!doc)return;
  const key=card.dataset.builderSlot,slotEl=visualSlot(doc,key); if(!slotEl)return;
  card.querySelectorAll('[data-content-field]').forEach(input=>{
    const field=input.dataset.contentField;
    if(field==='image_alt'||field==='image_url')return;
    const target=slotEl.querySelector('[data-cms-field="'+field+'"]');
    if(target)target.textContent=input.value;
  });
  card.querySelectorAll('[data-setting-field]').forEach(input=>{
    const target=slotEl.querySelector('[data-cms-setting="'+input.dataset.settingField+'"]');
    if(target)target.textContent=input.value;
  });
  card.querySelectorAll('[data-faq-q]').forEach(input=>{
    const target=slotEl.querySelector('[data-cms-setting="faq.'+input.dataset.faqIndex+'.q"]');
    if(target)target.textContent=input.value;
  });
  card.querySelectorAll('[data-faq-a]').forEach(input=>{
    const target=slotEl.querySelector('[data-cms-setting="faq.'+input.dataset.faqIndex+'.a"]');
    if(target)target.textContent=input.value;
  });
  const enabled=card.querySelector('[data-content-enabled]');
  if(enabled)slotEl.style.display=enabled.checked?'':'none';
}
function syncPreviewTextToEditor(key,kind,name,value){
  const card=$('contentEditorList')?.querySelector('[data-builder-slot="'+CSS.escape(key)+'"]'); if(!card)return;
  let input=null;
  if(kind==='field')input=card.querySelector('[data-content-field="'+CSS.escape(name)+'"]');
  if(kind==='setting')input=card.querySelector('[data-setting-field="'+CSS.escape(name)+'"]');
  if(kind==='faq'){
    const [i,part]=name.split('.');
    input=card.querySelector(part==='q'?'[data-faq-q][data-faq-index="'+i+'"]':'[data-faq-a][data-faq-index="'+i+'"]');
  }
  if(input){
    input.value=value;
    const card=input.closest('.builder-section-card');
    if(card)stageCardDraft(card);
    builderSetState('Borrador sin publicar','warn');
  }
}
function builderSlotByKey(slotKey){return state.contentSlots.find(x=>x.slot_key===slotKey)||null}
function builderElementConfig(slotKey,elementKey,create=true){
  const slot=builderSlotByKey(slotKey); if(!slot)return null;
  slot.settings=slot.settings&&typeof slot.settings==='object'?slot.settings:{};
  if(!create)return slot.settings?.builder?.[state.builderDevice]?.[elementKey]||{};
  slot.settings.builder=slot.settings.builder&&typeof slot.settings.builder==='object'?slot.settings.builder:{};
  slot.settings.builder[state.builderDevice]=slot.settings.builder[state.builderDevice]&&typeof slot.settings.builder[state.builderDevice]==='object'?slot.settings.builder[state.builderDevice]:{};
  slot.settings.builder[state.builderDevice][elementKey]=slot.settings.builder[state.builderDevice][elementKey]&&typeof slot.settings.builder[state.builderDevice][elementKey]==='object'?slot.settings.builder[state.builderDevice][elementKey]:{};
  return slot.settings.builder[state.builderDevice][elementKey];
}
function builderElementContentConfig(slotKey,elementKey,create=true){
  const slot=builderSlotByKey(slotKey);if(!slot)return null;
  slot.settings=slot.settings&&typeof slot.settings==='object'?slot.settings:{};
  if(!create)return slot.settings?.builderContent?.[elementKey]||{};
  slot.settings.builderContent=slot.settings.builderContent&&typeof slot.settings.builderContent==='object'?slot.settings.builderContent:{};
  slot.settings.builderContent[elementKey]=slot.settings.builderContent[elementKey]&&typeof slot.settings.builderContent[elementKey]==='object'?slot.settings.builderContent[elementKey]:{};
  return slot.settings.builderContent[elementKey];
}
function visualElement(slotKey,elementKey){
  const doc=visualDoc(),slot=visualSlot(doc,slotKey);
  if(!slot)return null;
  if(slot.dataset.cmsElement===elementKey)return slot;
  return slot.querySelector('[data-cms-element="'+CSS.escape(elementKey)+'"]')||null;
}
function fillPaletteSelect(select,includeNone=false){
  if(!select)return;
  const current=select.value;
  const opts=[
    ['inherit','Mantener actual'],
    ...(includeNone?[['none','Sin borde']]:[]),
    ['primary','Principal'],['secondary','Secundario'],['accent','Acento'],['background','Fondo'],['white','Blanco']
  ];
  select.innerHTML=opts.map(([v,l])=>'<option value="'+v+'">'+l+'</option>').join('');
  if(opts.some(x=>x[0]===current))select.value=current;
}
function setupInspectorPalette(){
  fillPaletteSelect($('inspectBgFrom'));fillPaletteSelect($('inspectBgTo'));fillPaletteSelect($('inspectColor'));fillPaletteSelect($('inspectBorder'),true);
}
function inspectorNumber(id,value,placeholder=null){
  const el=$(id); if(!el)return;
  el.value=value==null||value===''?'':String(Math.round(Number(value)*100)/100);
  el.placeholder=placeholder==null?'':String(Math.round(Number(placeholder)*100)/100);
}
function isSafeTextElement(el){
  if(!el)return false;
  if(/^(H1|H2|H3|H4|P|SPAN|B|STRONG|SMALL|SUMMARY|LABEL)$/.test(el.tagName))return true;
  if(el.matches('button,a'))return Boolean(el.querySelector('.cms-button-label,.builder-action-label,.v240-cta'));
  return false;
}
function selectedTextTarget(el){
  if(!el)return null;
  if(/^(H1|H2|H3|H4|P|SPAN|B|STRONG|SMALL|SUMMARY|LABEL)$/.test(el.tagName))return el;
  if(el.matches('button,a'))return el.querySelector('.cms-button-label,.builder-action-label,.v240-cta');
  return null;
}
function typographyTargetSlot(scope){
  if(scope==='global')return builderSlotByKey('site.header');
  const sel=state.builderSelection;
  return sel?builderSlotByKey(sel.slotKey):null;
}
function typographyConfig(scope,create=true){
  const slot=typographyTargetSlot(scope);if(!slot)return null;
  slot.settings=slot.settings&&typeof slot.settings==='object'?slot.settings:{};
  const key=scope==='global'?'globalTypography':'sectionTypography';
  if(scope==='element')return builderElementConfig(state.builderSelection?.slotKey,state.builderSelection?.elementKey,create);
  if(!create)return slot.settings?.[key]?.[state.builderDevice]||{};
  slot.settings[key]=slot.settings[key]&&typeof slot.settings[key]==='object'?slot.settings[key]:{};
  slot.settings[key][state.builderDevice]=slot.settings[key][state.builderDevice]&&typeof slot.settings[key][state.builderDevice]==='object'?slot.settings[key][state.builderDevice]:{};
  return slot.settings[key][state.builderDevice];
}
function populateTypographyControls(){
  const scope=$('inspectTypographyScope')?.value||'element';
  const cfg=typographyConfig(scope,false)||{};
  $('inspectFontFamily').value=cfg.fontFamily||'inherit';
  $('inspectFontWeight').value=cfg.fontWeight||'inherit';
  inspectorNumber('inspectFontScale',cfg.fontScale,null);
  $('inspectFontScaleWrap').hidden=scope==='element';
  if($('inspectFontSizeWrap'))$('inspectFontSizeWrap').hidden=scope!=='element';
  $('inspectColor').value=cfg.colorToken||'inherit';
}
function applyTypographyFromInspector(){
  const scope=$('inspectTypographyScope')?.value||'element';
  if(scope==='element'){
    applySelectedInspectorConfig();
    return;
  }
  const cfg=typographyConfig(scope,true);if(!cfg)return;
  const font=$('inspectFontFamily').value,weight=$('inspectFontWeight').value,color=$('inspectColor').value;
  const scale=numberOrNull($('inspectFontScale').value);
  if(font==='inherit')delete cfg.fontFamily;else cfg.fontFamily=font;
  if(weight==='inherit')delete cfg.fontWeight;else cfg.fontWeight=weight;
  if(color==='inherit')delete cfg.colorToken;else cfg.colorToken=color;
  if(scale==null)delete cfg.fontScale;else cfg.fontScale=scale;
  const frame=visualFrame(),api=frame?.contentWindow?.OLANO_BUILDER_API,live=frame?.contentWindow?.OLANO_BUSINESS_CONFIG;
  if(api&&live){
    const slot=typographyTargetSlot(scope);
    if(slot){
      const liveSlot=(live.content||[]).find(x=>x.slot_key===slot.slot_key);
      if(liveSlot)liveSlot.settings=structuredClone(slot.settings);
    }
    api.applyVisualElementStyles(live);
  }
  const slot=typographyTargetSlot(scope);
  if(slot)scheduleBuilderStyleSave(slot.slot_key);
  builderSetState('Cambios tipográficos','warn');
  editorTrace('TYPOGRAPHY_CHANGE','OK',{scope,font:font,weight,color,scale,slot:slot?.slot_key||null});
}
function selectedElementSupportsImage(el){return el?.tagName==='IMG';}
function scrollLeftEditorToSelection(slotKey){
  const sidebar=document.querySelector('.visual-builder-sidebar');if(!sidebar)return;
  const inspector=$('elementInspector'),card=$('contentEditorList')?.querySelector('[data-builder-slot="'+CSS.escape(slotKey)+'"]');
  const target=inspector&&!inspector.hidden?inspector:card;if(!target)return;
  const top=Math.max(0,target.offsetTop-12);
  sidebar.scrollTo({top,behavior:'smooth'});
  target.classList.remove('admin-left-flash');void target.offsetWidth;target.classList.add('admin-left-flash');
  setTimeout(()=>target.classList.remove('admin-left-flash'),1400);
}
function selectVisualElement(el){
  if(state.builderMode!=='edit'||!el)return;
  const frame=visualFrame(),api=frame?.contentWindow?.OLANO_BUILDER_API;
  const slotKey=api?.builderSlotOfElement?.(el)||el.closest('[data-cms-slot]')?.dataset.cmsSlot||el.dataset.cmsSlotOwner;
  const elementKey=el.dataset.cmsElement;
  if(!slotKey||!elementKey)return;
  state.builderSelection={slotKey,elementKey};
  selectEditorCard(slotKey);
  const cfg=builderElementConfig(slotKey,elementKey,false)||{};
  const contentCfg=builderElementContentConfig(slotKey,elementKey,false)||{};
  const rect=el.getBoundingClientRect();
  const cs=el.ownerDocument.defaultView.getComputedStyle(el);
  $('elementInspector').hidden=false;
  $('inspectorTitle').textContent=el.dataset.cmsElementLabel||elementKey;
  $('inspectorMeta').textContent=contentSlotLabel(builderSlotByKey(slotKey)||{slot_key:slotKey})+' · '+state.builderDevice.toUpperCase();
  inspectorNumber('inspectWidth',cfg.w,rect.width);
  inspectorNumber('inspectHeight',cfg.h,rect.height);
  inspectorNumber('inspectFontSize',cfg.fontSize,parseFloat(cs.fontSize)||null);
  inspectorNumber('inspectRadius',cfg.radius,parseFloat(cs.borderRadius)||0);
  $('inspectBgMode').value=cfg.bgMode||'inherit';
  $('inspectBgFrom').value=cfg.bgFrom||'inherit';
  $('inspectBgTo').value=cfg.bgTo||'inherit';
  inspectorNumber('inspectGradientAngle',cfg.gradientAngle,135);
  $('inspectColor').value=cfg.colorToken||'inherit';
  $('inspectBorder').value=cfg.borderToken||'inherit';
  inspectorNumber('inspectOpacity',cfg.opacity,100);
  inspectorNumber('inspectPadding',cfg.padding,parseFloat(cs.paddingTop)||0);
  $('inspectTypographyScope').value='element';
  populateTypographyControls();
  const textTarget=selectedTextTarget(el);
  $('inspectTextWrap').hidden=!textTarget;
  if(textTarget)$('inspectText').value=contentCfg.textOverride??String(textTarget.textContent||'').trim();
  const imageSupported=selectedElementSupportsImage(el);
  $('inspectImageWrap').hidden=!imageSupported;
  if($('inspectImageFile'))$('inspectImageFile').value='';
  const protectedLink=el.dataset.builderProtectedLink==='1';
  $('inspectLinkHref').disabled=protectedLink;
  $('inspectLinkTarget').disabled=protectedLink;
  $('inspectLinkHelp').textContent=protectedLink?'Este enlace está protegido por la lógica del sistema y no se reemplaza desde el editor.':'Déjalo vacío para no agregar un enlace.';
  $('inspectLinkHref').value=protectedLink?'':(contentCfg.linkHref||(el.tagName==='A'?el.getAttribute('href')||'':''));
  $('inspectLinkTarget').value=contentCfg.linkTarget||(el.tagName==='A'&&el.target?el.target:'_self');
  updateInspectorVisibility();
  showElementOverlay(el);
  scrollLeftEditorToSelection(slotKey);
  editorTrace('ELEMENT_SELECT','OK',{slot:slotKey,element:elementKey,label:el.dataset.cmsElementLabel||elementKey,tag:el.tagName});
}
function restoreBuilderSelection(){
  const sel=state.builderSelection;if(!sel||state.builderMode!=='edit')return;
  const el=visualElement(sel.slotKey,sel.elementKey);if(el)selectVisualElement(el);
}
function updateInspectorVisibility(){
  const mode=$('inspectBgMode')?.value||'inherit';
  const gradient=mode==='gradient';
  if($('inspectBgToWrap'))$('inspectBgToWrap').hidden=!gradient;
  if($('inspectAngleWrap'))$('inspectAngleWrap').hidden=!gradient;
}
function readInspectorConfig(){
  const n=(id)=>{const el=$(id);if(!el||String(el.value).trim()==='')return null;const x=Number(el.value);return Number.isFinite(x)?x:null};
  const bgMode=$('inspectBgMode')?.value||'inherit';
  const bgFrom=$('inspectBgFrom')?.value||'inherit';
  const bgTo=$('inspectBgTo')?.value||'inherit';
  const scope=$('inspectTypographyScope')?.value||'element';
  const colorToken=$('inspectColor')?.value||'inherit';
  const borderToken=$('inspectBorder')?.value||'inherit';
  const font=$('inspectFontFamily')?.value||'inherit';
  const weight=$('inspectFontWeight')?.value||'inherit';
  const out={
    w:n('inspectWidth'),h:n('inspectHeight'),fontSize:n('inspectFontSize'),radius:n('inspectRadius'),
    bgMode:bgMode==='inherit'?null:bgMode,
    bgFrom:bgMode==='inherit'||bgFrom==='inherit'?null:bgFrom,
    bgTo:bgMode!=='gradient'||bgTo==='inherit'?null:bgTo,
    gradientAngle:bgMode==='gradient'?n('inspectGradientAngle'):null,
    colorToken:scope==='element'&&colorToken!=='inherit'?colorToken:null,
    borderToken:borderToken==='inherit'?null:borderToken,
    opacity:n('inspectOpacity'),padding:n('inspectPadding'),
    fontFamily:scope==='element'&&font!=='inherit'?font:null,
    fontWeight:scope==='element'&&weight!=='inherit'?weight:null
  };
  return out;
}
function mergeInspectorConfig(){
  const sel=state.builderSelection;if(!sel)return null;
  const cfg=builderElementConfig(sel.slotKey,sel.elementKey,true);
  const next=readInspectorConfig();
  Object.entries(next).forEach(([k,v])=>{if(v==null)delete cfg[k];else cfg[k]=v});
  return cfg;
}
function combinedBuilderElementConfig(slotKey,elementKey,styleCfg=null){
  const style=styleCfg||builderElementConfig(slotKey,elementKey,false)||{};
  const content=builderElementContentConfig(slotKey,elementKey,false)||{};
  return {...content,...style};
}
function applySelectedInspectorConfig(scheduleSave=true){
  const sel=state.builderSelection;if(!sel)return;
  const el=visualElement(sel.slotKey,sel.elementKey);if(!el)return;
  const cfg=mergeInspectorConfig();
  const frame=visualFrame(),api=frame?.contentWindow?.OLANO_BUILDER_API,live=frame?.contentWindow?.OLANO_BUSINESS_CONFIG;
  if(!api||!live){editorTrace('BUILDER_API_MISSING','ERROR',{slot:sel.slotKey,element:sel.elementKey,action:'style'});return;}
  const liveSlot=(live.content||[]).find(x=>x.slot_key===sel.slotKey);
  const slot=builderSlotByKey(sel.slotKey);
  if(liveSlot&&slot)liveSlot.settings=structuredClone(slot.settings);
  api.applyVisualElementStyles(live);
  updateElementOverlay();
  builderSetState('Cambios de diseño','warn');
  editorTrace('ELEMENT_STYLE_CHANGE','OK',{slot:sel.slotKey,element:sel.elementKey,config:cfg});
  if(scheduleSave)scheduleBuilderStyleSave(sel.slotKey);
}
function scheduleBuilderStyleSave(slotKey){
  clearTimeout(state.builderSaveTimer);
  state.builderSaveTimer=setTimeout(()=>guard(()=>saveBuilderSlotSettings(slotKey)),550);
}
async function saveBuilderSlotSettings(slotKey){
  canWriteOrThrow();
  const slot=builderSlotByKey(slotKey);if(!slot)return;
  try{
    const frame=visualFrame(),live=frame?.contentWindow?.OLANO_BUSINESS_CONFIG;
    const liveSlot=(live?.content||[]).find(x=>x.slot_key===slotKey);
    if(liveSlot)liveSlot.settings=structuredClone(slot.settings);
  }catch{}
  markEditorDirty('DRAFT_STYLE_STAGE',{slot:slotKey});
}
function resetSelectedElementStyle(){
  const sel=state.builderSelection;if(!sel)return;
  const slot=builderSlotByKey(sel.slotKey);if(!slot)return;
  const map=slot.settings?.builder?.[state.builderDevice];
  if(map)delete map[sel.elementKey];
  if(slot.settings?.builderContent)delete slot.settings.builderContent[sel.elementKey];
  editorTrace('ELEMENT_RESET','OK',{slot:sel.slotKey,element:sel.elementKey});
  scheduleBuilderStyleSave(sel.slotKey);
  setTimeout(()=>reloadVisualSitePreview(),650);
}
function setSelectedElementLinkOverride(){
  const sel=state.builderSelection;if(!sel)return;
  const el=visualElement(sel.slotKey,sel.elementKey);if(!el)return;
  if(el.dataset.builderProtectedLink==='1'){
    editorTrace('LINK_CHANGE_BLOCKED','ERROR',{slot:sel.slotKey,element:sel.elementKey,message:'Enlace protegido por sistema'});
    return;
  }
  const cfg=builderElementContentConfig(sel.slotKey,sel.elementKey,true);
  const href=$('inspectLinkHref').value.trim();
  if(href)cfg.linkHref=href;else delete cfg.linkHref;
  cfg.linkTarget=$('inspectLinkTarget').value||'_self';
  const styleCfg=builderElementConfig(sel.slotKey,sel.elementKey,false)||{};
  const api=visualFrame()?.contentWindow?.OLANO_BUILDER_API;
  if(api)api.applyBuilderElementStyle(el,{...cfg,...styleCfg},currentEditorPalette());
  markEditorDirty('DRAFT_LINK_CHANGE',{slot:sel.slotKey,element:sel.elementKey,href:href||null});
}
function setSelectedElementTextOverride(value){
  const sel=state.builderSelection;if(!sel)return;
  const el=visualElement(sel.slotKey,sel.elementKey);if(!el||!isSafeTextElement(el))return;
  const cfg=builderElementContentConfig(sel.slotKey,sel.elementKey,true);
  cfg.textOverride=String(value);
  const styleCfg=builderElementConfig(sel.slotKey,sel.elementKey,false)||{};
  const api=visualFrame()?.contentWindow?.OLANO_BUILDER_API;
  if(!api){editorTrace('BUILDER_API_MISSING','ERROR',{slot:sel.slotKey,element:sel.elementKey,action:'text'});return;}
  api.applyBuilderElementStyle(el,{...cfg,...styleCfg},currentEditorPalette());
  builderSetState('Contenido del elemento','warn');
  editorTrace('ELEMENT_TEXT_CHANGE','OK',{slot:sel.slotKey,element:sel.elementKey,text:String(value).slice(0,180)});
  scheduleBuilderStyleSave(sel.slotKey);
}
async function setSelectedElementImage(file){
  const sel=state.builderSelection;if(!sel||!file)return;
  const el=visualElement(sel.slotKey,sel.elementKey);
  if(!selectedElementSupportsImage(el))throw new Error('El elemento seleccionado no es una imagen.');
  const uploaded=await uploadBusinessContentImage(file,'builder-'+sel.slotKey+'-'+sel.elementKey);
  const cfg=builderElementContentConfig(sel.slotKey,sel.elementKey,true);
  const styleCfg=builderElementConfig(sel.slotKey,sel.elementKey,false)||{};
  const oldPath=cfg.srcPath||null;
  cfg.srcOverride=uploaded.url;cfg.srcPath=uploaded.path;
  const api=visualFrame()?.contentWindow?.OLANO_BUILDER_API;
  if(!api){editorTrace('BUILDER_API_MISSING','ERROR',{slot:sel.slotKey,element:sel.elementKey,action:'image'});throw new Error('La vista previa aún no terminó de cargar.');}
  api.applyBuilderElementStyle(el,{...cfg,...styleCfg},currentEditorPalette());
  updateElementOverlay(el);
  await saveBuilderSlotSettings(sel.slotKey);
  editorTrace('IMAGE_REPLACE','OK',{slot:sel.slotKey,element:sel.elementKey,url:uploaded.url});
}
function ensureElementOverlay(){
  const doc=visualDoc();if(!doc?.body)return null;
  let overlay=doc.getElementById('adminElementOverlay');
  if(overlay)return overlay;
  overlay=doc.createElement('div');overlay.id='adminElementOverlay';overlay.dataset.adminBuilderControl='1';
  overlay.innerHTML='<button type="button" class="admin-element-move" data-admin-builder-control="1">↔ Mover</button><button type="button" class="admin-element-resize" data-admin-builder-control="1" aria-label="Redimensionar">↘</button>';
  doc.body.appendChild(overlay);
  overlay.querySelector('.admin-element-move').addEventListener('pointerdown',beginElementMove);
  overlay.querySelector('.admin-element-resize').addEventListener('pointerdown',beginElementResize);
  return overlay;
}
function hideElementOverlay(){
  const o=visualDoc()?.getElementById('adminElementOverlay');if(o)o.style.display='none';
}
function showElementOverlay(el){
  if(state.builderMode!=='edit')return hideElementOverlay();
  const overlay=ensureElementOverlay();if(!overlay)return;
  overlay.style.display='block';
  const isSection=state.builderSelection?.elementKey==='section';
  overlay.querySelector('.admin-element-move').hidden=isSection;
  overlay.querySelector('.admin-element-resize').hidden=isSection;
  updateElementOverlay(el);
}
function updateElementOverlay(explicitEl=null){
  const sel=state.builderSelection,doc=visualDoc();if(!sel||!doc)return;
  const el=explicitEl||visualElement(sel.slotKey,sel.elementKey),overlay=doc.getElementById('adminElementOverlay');if(!el||!overlay)return;
  const r=el.getBoundingClientRect();
  overlay.style.left=(r.left+doc.defaultView.scrollX)+'px';
  overlay.style.top=(r.top+doc.defaultView.scrollY)+'px';
  overlay.style.width=Math.max(20,r.width)+'px';
  overlay.style.height=Math.max(20,r.height)+'px';
}
function beginElementMove(e){
  if(state.builderMode!=='edit')return;
  e.preventDefault();e.stopPropagation();
  const sel=state.builderSelection,el=sel&&visualElement(sel.slotKey,sel.elementKey);if(!sel||!el)return;
  if(sel.elementKey==='section'){editorTrace('ELEMENT_MOVE_BLOCKED','ERROR',{slot:sel.slotKey,element:sel.elementKey,message:'Las secciones completas se reordenan con Mover sección'});return;}
  const doc=visualDoc(),section=el.closest('[data-cms-slot]');if(!doc||!section)return;
  pushUndoSnapshot('Mover '+(el.dataset.cmsElementLabel||sel.elementKey));
  const api=visualFrame()?.contentWindow?.OLANO_BUILDER_API;
  if(!api){editorTrace('BUILDER_API_MISSING','ERROR',{slot:sel.slotKey,element:sel.elementKey,action:'move'});return;}
  const keys=groupMembers(sel.slotKey,sel.elementKey);
  const members=keys.map(key=>{
    const node=visualElement(sel.slotKey,key);if(!node)return null;
    const cfg=builderElementConfig(sel.slotKey,key,true);
    return {key,node,cfg,startX:Number(cfg.x)||0,startY:Number(cfg.y)||0};
  }).filter(Boolean);
  const startX=e.clientX,startY=e.clientY;
  const er=el.getBoundingClientRect(),sr=section.getBoundingClientRect();
  editorTrace('ELEMENT_MOVE_START','OK',{slot:sel.slotKey,element:sel.elementKey,groupSize:members.length});
  const move=(ev)=>{
    let dx=ev.clientX-startX,dy=ev.clientY-startY;
    dx=Math.max(sr.left-er.left,Math.min(sr.right-er.right,dx));
    dy=Math.max(sr.top-er.top,Math.min(sr.bottom-er.bottom,dy));
    for(const m of members){
      m.cfg.x=Math.round(m.startX+dx);m.cfg.y=Math.round(m.startY+dy);
      api.applyBuilderElementStyle(m.node,combinedBuilderElementConfig(sel.slotKey,m.key,m.cfg),currentEditorPalette());
    }
    updateElementOverlay(el);builderSetState('Moviendo…','warn');
  };
  const up=()=>{
    doc.removeEventListener('pointermove',move);doc.removeEventListener('pointerup',up);
    scheduleBuilderStyleSave(sel.slotKey);
    editorTrace('ELEMENT_MOVE_END','OK',{slot:sel.slotKey,element:sel.elementKey,groupSize:members.length,x:builderElementConfig(sel.slotKey,sel.elementKey,false)?.x||0,y:builderElementConfig(sel.slotKey,sel.elementKey,false)?.y||0});
    selectVisualElement(el);
  };
  doc.addEventListener('pointermove',move);doc.addEventListener('pointerup',up,{once:true});
}
function beginElementResize(e){
  if(state.builderMode!=='edit')return;
  e.preventDefault();e.stopPropagation();
  const sel=state.builderSelection,el=sel&&visualElement(sel.slotKey,sel.elementKey);if(!sel||!el)return;
  if(sel.elementKey==='section'){editorTrace('ELEMENT_RESIZE_BLOCKED','ERROR',{slot:sel.slotKey,element:sel.elementKey,message:'No se redimensiona la sección completa con el tirador'});return;}
  const doc=visualDoc(),section=el.closest('[data-cms-slot]');if(!doc||!section)return;
  pushUndoSnapshot('Redimensionar '+(el.dataset.cmsElementLabel||sel.elementKey));
  editorTrace('ELEMENT_RESIZE_START','OK',{slot:sel.slotKey,element:sel.elementKey});
  const api=visualFrame()?.contentWindow?.OLANO_BUILDER_API;
  if(!api){editorTrace('BUILDER_API_MISSING','ERROR',{slot:sel.slotKey,element:sel.elementKey,action:'resize'});return;}
  const cfg=builderElementConfig(sel.slotKey,sel.elementKey,true);
  const er=el.getBoundingClientRect(),sr=section.getBoundingClientRect();
  const startX=e.clientX,startY=e.clientY,startW=er.width,startH=er.height;
  const move=(ev)=>{
    const maxW=Math.max(20,sr.right-er.left),maxH=Math.max(20,sr.bottom-er.top);
    cfg.w=Math.round(Math.max(20,Math.min(maxW,startW+(ev.clientX-startX))));
    cfg.h=Math.round(Math.max(20,Math.min(maxH,startH+(ev.clientY-startY))));
    api.applyBuilderElementStyle(el,combinedBuilderElementConfig(sel.slotKey,sel.elementKey,cfg),currentEditorPalette());
    updateElementOverlay(el);builderSetState('Redimensionando…','warn');
  };
  const up=()=>{
    doc.removeEventListener('pointermove',move);doc.removeEventListener('pointerup',up);
    scheduleBuilderStyleSave(sel.slotKey);
    editorTrace('ELEMENT_RESIZE_END','OK',{slot:sel.slotKey,element:sel.elementKey,width:cfg.w||Math.round(el.getBoundingClientRect().width),height:cfg.h||Math.round(el.getBoundingClientRect().height)});
    selectVisualElement(el);
  };
  doc.addEventListener('pointermove',move);doc.addEventListener('pointerup',up,{once:true});
}

function slotCustomElements(slot){
  slot.settings=slot.settings&&typeof slot.settings==='object'?slot.settings:{};
  slot.settings.customElements=Array.isArray(slot.settings.customElements)?slot.settings.customElements:[];
  return slot.settings.customElements;
}
function newCustomId(){
  try{return crypto.randomUUID().replace(/-/g,'').slice(0,16);}catch{return 'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
}
function customDefaultSize(type){
  if(type==='line')return {w:140,h:2};
  if(type==='icon')return {w:40,h:40};
  if(type==='image')return {w:160,h:110};
  if(type==='text'||type==='link')return {w:150,h:42};
  return {w:150,h:96};
}
function addCustomElement(type,extra={}){
  const ctx=state.builderContext;if(!ctx?.slotKey)return null;
  const slot=builderSlotByKey(ctx.slotKey);if(!slot)return null;
  pushUndoSnapshot('Agregar '+type);
  const id=newCustomId(),elementKey='custom.'+id;
  const item={
    id,type,label:extra.label||({
      box:'Cajón',line:'Línea',text:'Texto',link:'Enlace',icon:'Icono',image:'Imagen'
    }[type]||'Elemento'),
    parentKey:ctx.parentKey||null,
    text:extra.text||null,href:extra.href||null,target:extra.target||'_self',
    iconKey:extra.iconKey||null,src:extra.src||null,srcPath:extra.srcPath||null,alt:extra.alt||null,zIndex:20
  };
  slotCustomElements(slot).push(item);
  const size=customDefaultSize(type);
  const cfg=builderElementConfig(ctx.slotKey,elementKey,true);
  cfg.x=Math.round(ctx.x||12);cfg.y=Math.round(ctx.y||12);cfg.w=size.w;cfg.h=size.h;
  if(type==='box'){cfg.bgMode='solid';cfg.bgFrom='white';cfg.borderToken='primary';cfg.radius=14;cfg.opacity=100;}
  if(type==='line'){cfg.bgMode='solid';cfg.bgFrom='primary';cfg.borderToken='none';}
  if(type==='icon'){cfg.colorToken='primary';}
  markEditorDirty('CUSTOM_ADD',{slot:ctx.slotKey,element:elementKey,type,parent:ctx.parentKey||'section'});
  syncDraftToPreview();
  setTimeout(()=>{
    const el=visualElement(ctx.slotKey,elementKey);
    if(el){selectVisualElement(el);flashPreviewTarget(el,'custom-add');}
  },120);
  return item;
}
async function addCustomImageFromPicker(){
  const input=document.createElement('input');input.type='file';input.accept='image/png,image/jpeg,image/webp';
  input.onchange=()=>guard(async()=>{
    const file=input.files?.[0];if(!file)return;
    pushUndoSnapshot('Agregar imagen');
    const up=await uploadBusinessContentImage(file,'builder-custom-image');
    addCustomElement('image',{src:up.url,srcPath:up.path,alt:file.name,label:'Imagen personalizada'});
  });
  input.click();
}
function iconBankData(){
  try{return visualFrame()?.contentWindow?.OLANO_BUILDER_API?.icons||{};}catch{return{}}
}
function openBuilderIconBank(){
  const modal=$('builderIconBankModal'),grid=$('builderIconBankGrid');if(!modal||!grid)return;
  const icons=iconBankData();
  grid.innerHTML=Object.entries(icons).map(([key,svg])=>'<button type="button" data-builder-icon="'+attr(key)+'">'+svg+'<small>'+esc(key)+'</small></button>').join('');
  grid.querySelectorAll('[data-builder-icon]').forEach(btn=>btn.addEventListener('click',()=>{
    addCustomElement('icon',{iconKey:btn.dataset.builderIcon,label:'Icono '+btn.dataset.builderIcon});
    modal.hidden=true;
  }));
  modal.hidden=false;
}
function closeBuilderIconBank(){if($('builderIconBankModal'))$('builderIconBankModal').hidden=true;}
function selectedMultiKeys(slotKey=null){
  return state.builderMultiSelection.filter(x=>!slotKey||x.slotKey===slotKey);
}
function clearMultiSelection(){
  visualDoc()?.querySelectorAll('.admin-multi-selected').forEach(el=>el.classList.remove('admin-multi-selected'));
  state.builderMultiSelection=[];
}
function toggleMultiSelection(el){
  const frame=visualFrame(),api=frame?.contentWindow?.OLANO_BUILDER_API;
  const slotKey=api?.builderSlotOfElement?.(el)||el.closest('[data-cms-slot]')?.dataset.cmsSlot;
  const elementKey=el.dataset.cmsElement;if(!slotKey||!elementKey)return;
  if(state.builderMultiSelection.length&&state.builderMultiSelection.some(x=>x.slotKey!==slotKey))clearMultiSelection();
  const idx=state.builderMultiSelection.findIndex(x=>x.slotKey===slotKey&&x.elementKey===elementKey);
  if(idx>=0){state.builderMultiSelection.splice(idx,1);el.classList.remove('admin-multi-selected');}
  else{state.builderMultiSelection.push({slotKey,elementKey});el.classList.add('admin-multi-selected');}
  editorTrace('MULTI_SELECT','OK',{slot:slotKey,count:state.builderMultiSelection.length});
}
function groupMap(slot,create=true){
  slot.settings=slot.settings&&typeof slot.settings==='object'?slot.settings:{};
  if(!create)return slot.settings.builderGroups||{};
  slot.settings.builderGroups=slot.settings.builderGroups&&typeof slot.settings.builderGroups==='object'?slot.settings.builderGroups:{};
  return slot.settings.builderGroups;
}
function groupSelectedElements(){
  const sel=state.builderMultiSelection;if(sel.length<2)return;
  const slotKey=sel[0].slotKey;if(sel.some(x=>x.slotKey!==slotKey))return;
  const slot=builderSlotByKey(slotKey);if(!slot)return;
  pushUndoSnapshot('Agrupar elementos');
  const id='g'+Date.now().toString(36),map=groupMap(slot,true);
  sel.forEach(x=>map[x.elementKey]=id);
  markEditorDirty('GROUP_CREATE',{slot:slotKey,group:id,elements:sel.map(x=>x.elementKey)});
  editorTrace('GROUP_CREATE','OK',{slot:slotKey,group:id,count:sel.length});
}
function ungroupSelectedElements(){
  const sel=state.builderMultiSelection;if(!sel.length)return;
  const bySlot=new Map();
  sel.forEach(x=>{if(!bySlot.has(x.slotKey))bySlot.set(x.slotKey,[]);bySlot.get(x.slotKey).push(x.elementKey);});
  pushUndoSnapshot('Desagrupar elementos');
  for(const [slotKey,keys] of bySlot){
    const slot=builderSlotByKey(slotKey),map=slot&&groupMap(slot,false);if(!map)continue;
    const ids=new Set(keys.map(k=>map[k]).filter(Boolean));
    Object.keys(map).forEach(k=>{if(ids.has(map[k]))delete map[k];});
    markEditorDirty('GROUP_REMOVE',{slot:slotKey,groups:[...ids]});
  }
  clearMultiSelection();
}
function groupMembers(slotKey,elementKey){
  const slot=builderSlotByKey(slotKey),map=slot&&groupMap(slot,false),gid=map?.[elementKey];
  if(!gid)return [elementKey];
  return Object.keys(map).filter(k=>map[k]===gid);
}
function deleteSelectedCustomElement(){
  const sel=state.builderSelection;if(!sel||!sel.elementKey.startsWith('custom.'))return;
  const slot=builderSlotByKey(sel.slotKey);if(!slot)return;
  pushUndoSnapshot('Eliminar elemento');
  const id=sel.elementKey.slice(7),items=slotCustomElements(slot);
  slot.settings.customElements=items.filter(x=>x.id!==id);
  const deviceMap=slot.settings?.builder?.[state.builderDevice];if(deviceMap)delete deviceMap[sel.elementKey];
  if(slot.settings?.builderContent)delete slot.settings.builderContent[sel.elementKey];
  const groups=groupMap(slot,false);if(groups)delete groups[sel.elementKey];
  state.builderSelection=null;
  markEditorDirty('CUSTOM_DELETE',{slot:sel.slotKey,element:sel.elementKey});
  syncDraftToPreview();
}
function builderContextContainer(target){
  let el=target?.closest?.('[data-cms-element]');
  while(el){
    if(/^(SECTION|DIV|ARTICLE|BUTTON|A|DETAILS|HEADER|FOOTER)$/.test(el.tagName))return el;
    const parent=el.parentElement?.closest?.('[data-cms-element]');
    if(!parent||parent===el)break;el=parent;
  }
  return target?.closest?.('[data-cms-slot]')||null;
}
function closeBuilderContextMenu(){
  visualDoc()?.getElementById('adminBuilderContextMenu')?.remove();
}
function openBuilderContextMenu(e){
  if(state.builderMode!=='edit')return;
  e.preventDefault();e.stopPropagation();closeBuilderContextMenu();
  const doc=visualDoc(),api=visualFrame()?.contentWindow?.OLANO_BUILDER_API;if(!doc||!api)return;
  const slotEl=e.target.closest('[data-cms-slot]');if(!slotEl)return;
  const slotKey=slotEl.dataset.cmsSlot;
  const container=builderContextContainer(e.target);
  const parentKey=container?.dataset.cmsElement&&container.dataset.cmsElement!=='section'?container.dataset.cmsElement:null;
  const parentActual=container?.dataset.cmsElement==='section'?(container.querySelector('.wrap')||container):container||slotEl;
  const pr=parentActual.getBoundingClientRect();
  state.builderContext={
    slotKey,parentKey,
    x:Math.max(0,e.clientX-pr.left),
    y:Math.max(0,e.clientY-pr.top)
  };
  const hit=e.target.closest('[data-cms-element]');
  if(hit)selectVisualElement(hit);
  const menu=doc.createElement('div');menu.id='adminBuilderContextMenu';menu.dataset.adminBuilderControl='1';
  const selectedCustom=state.builderSelection?.elementKey?.startsWith('custom.');
  const groupCount=selectedMultiKeys(slotKey).length;
  menu.innerHTML=
    '<button data-act="box">＋ Cajón / subcontenedor</button>'+
    '<button data-act="line">─ Línea</button>'+
    '<button data-act="text">T Texto</button>'+
    '<button data-act="link">↗ Enlace</button>'+
    '<button data-act="icon">✦ Icono SVG</button>'+
    '<button data-act="image">▧ Imagen</button>'+
    '<hr>'+
    '<button data-act="group" '+(groupCount<2?'disabled':'')+'>Agrupar seleccionados</button>'+
    '<button data-act="ungroup" '+(!groupCount?'disabled':'')+'>Desagrupar grupo</button>'+
    (selectedCustom?'<button data-act="delete" class="danger">Eliminar elemento</button>':'');
  menu.style.left=Math.min(e.clientX,doc.defaultView.innerWidth-230)+'px';
  menu.style.top=Math.min(e.clientY,doc.defaultView.innerHeight-330)+doc.defaultView.scrollY+'px';
  doc.body.appendChild(menu);
  menu.addEventListener('click',ev=>{
    const btn=ev.target.closest('[data-act]');if(!btn||btn.disabled)return;
    ev.preventDefault();ev.stopPropagation();
    const act=btn.dataset.act;closeBuilderContextMenu();
    if(act==='box')addCustomElement('box',{label:'Cajón'});
    if(act==='line')addCustomElement('line',{label:'Línea'});
    if(act==='text')addCustomElement('text',{text:'Nuevo texto',label:'Texto'});
    if(act==='link')addCustomElement('link',{text:'Nuevo enlace',href:'#',label:'Enlace'});
    if(act==='icon')openBuilderIconBank();
    if(act==='image')addCustomImageFromPicker();
    if(act==='group')groupSelectedElements();
    if(act==='ungroup')ungroupSelectedElements();
    if(act==='delete')deleteSelectedCustomElement();
  });
}
function installContextMenu(doc){
  if(doc.__olanoContextMenuBound)return;
  doc.__olanoContextMenuBound=true;
  doc.addEventListener('contextmenu',openBuilderContextMenu,true);
  doc.addEventListener('click',e=>{if(!e.target.closest('#adminBuilderContextMenu'))closeBuilderContextMenu();},true);
}
function installPreviewInteractionGuard(doc){
  if(doc.__olanoInteractionGuardBound)return;
  doc.__olanoInteractionGuardBound=true;
  doc.addEventListener('click',(e)=>{
    if(state.builderMode!=='edit')return;
    if(e.target.closest('[data-admin-builder-control]'))return;
    const element=e.target.closest('[data-cms-element]');
    if(element&&(e.ctrlKey||e.metaKey||e.shiftKey)){toggleMultiSelection(element);e.preventDefault();e.stopImmediatePropagation();return;}
    if(element){clearMultiSelection();selectVisualElement(element);}
    const editable=e.target.closest('[data-cms-editable="true"]');
    if(editable){e.stopPropagation();return;}
    e.preventDefault();
    e.stopImmediatePropagation();
  },true);
  doc.addEventListener('submit',(e)=>{if(state.builderMode==='edit'){e.preventDefault();e.stopImmediatePropagation();}},true);
}
function flashPreviewTarget(el,source='input'){
  if(!el)return false;
  try{el.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});}catch{}
  el.classList.remove('admin-input-focus');
  void el.offsetWidth;
  el.classList.add('admin-input-focus');
  setTimeout(()=>el.classList.remove('admin-input-focus'),1500);
  setTimeout(()=>updateElementOverlay(),350);
  editorTrace('FOCUS_SYNC','OK',{source,target:el.dataset.cmsElement||el.dataset.cmsField||el.dataset.cmsSetting||el.dataset.cmsSlot||el.tagName});
  return true;
}
function previewTargetForControl(control){
  const doc=visualDoc();if(!doc||!control)return null;
  if(control.closest('#elementInspector')){
    const sel=state.builderSelection;
    return sel?visualElement(sel.slotKey,sel.elementKey):null;
  }
  if(control.closest('#brandingForm')){
    if(control.id==='brandLogoFile')return visualElement('site.header','logo')||visualSlot(doc,'site.header');
    return doc.body;
  }
  const card=control.closest('.builder-section-card');
  if(!card)return null;
  const slotKey=card.dataset.builderSlot,slot=visualSlot(doc,slotKey);
  if(!slot)return null;
  if(control.matches('[data-content-field]')){
    const name=control.dataset.contentField;
    return slot.querySelector('[data-cms-field="'+CSS.escape(name)+'"]')||slot;
  }
  if(control.matches('[data-setting-field]')){
    const name=control.dataset.settingField;
    return slot.querySelector('[data-cms-setting="'+CSS.escape(name)+'"]')||slot;
  }
  if(control.matches('[data-faq-q]')){
    return slot.querySelector('[data-cms-setting="faq.'+control.dataset.faqIndex+'.q"]')||slot;
  }
  if(control.matches('[data-faq-a]')){
    return slot.querySelector('[data-cms-setting="faq.'+control.dataset.faqIndex+'.a"]')||slot;
  }
  if(control.matches('[data-content-image]'))return slot.querySelector('img[data-cms-field="image_url"],.hero-media img')||slot;
  return slot;
}
function syncFocusFromEditorControl(control){
  if(state.builderMode!=='edit')return;
  const target=previewTargetForControl(control);
  if(target)flashPreviewTarget(target,control.id||control.dataset.contentField||control.dataset.settingField||control.tagName);
  else editorTrace('FOCUS_SYNC','ERROR',{control:control.id||control.name||control.tagName,message:'No se encontró destino visual'});
}
function setupVisualPreview(){
  const frame=visualFrame(),doc=visualDoc(); if(!doc?.body)return;
  try{
    if(frame?.contentWindow){
      frame.contentWindow.__OLANO_PREVIEW_DEVICE=state.builderDevice;
      const api=frame.contentWindow.OLANO_BUILDER_API,cfg=frame.contentWindow.OLANO_BUSINESS_CONFIG;
      if(api&&cfg){api.registerVisualElements(cfg);api.applyVisualElementStyles(cfg);}
    }
  }catch{}
  applyBrandPreviewToIframe();
  let style=doc.getElementById('admin-visual-builder-style');
  if(!style){
    style=doc.createElement('style'); style.id='admin-visual-builder-style';
    style.textContent=
      '#introLoader{display:none!important}body.intro-active{overflow:auto!important}'+
      'body.admin-builder-edit #promoOverlay,body.admin-builder-edit #guideOverlay,body.admin-builder-edit .helper-card,body.admin-builder-edit .helper-backdrop,body.admin-builder-edit #dock,body.admin-builder-edit .promo-count{display:none!important}'+
      'body.admin-builder-edit{padding-bottom:0!important}'+
      'body.admin-builder-edit [data-cms-slot]{position:relative!important;outline:2px dashed transparent;outline-offset:-2px;transition:outline .15s,box-shadow .15s}'+
      'body.admin-builder-edit [data-cms-slot].admin-builder-flash{outline:4px solid #d7ab33!important;box-shadow:0 0 0 7px rgba(215,171,51,.18)!important}'+
      '.admin-builder-handle{position:absolute!important;z-index:9998!important;top:8px!important;right:8px!important;border:0!important;border-radius:999px!important;background:#111827!important;color:#fff!important;padding:7px 10px!important;font:700 11px system-ui!important;cursor:grab!important;box-shadow:0 5px 18px #0003!important}'+
      'body.admin-builder-edit [data-cms-editable="true"]{outline:1px dashed rgba(26,167,157,.5)!important;outline-offset:2px!important;cursor:text!important}'+
      'body.admin-builder-edit [data-cms-editable="true"]:focus{outline:3px solid #1aa79d!important;background:rgba(255,255,255,.85)!important}'+
      '.admin-input-focus{outline:4px solid #ffd21f!important;outline-offset:4px!important;box-shadow:0 0 0 8px rgba(255,210,31,.28)!important;background-color:rgba(255,244,170,.28)!important}'+
      '[data-cms-element]{transition:outline .12s ease}'+
      'body.admin-builder-edit [data-cms-element]:hover{outline:2px solid rgba(215,171,51,.7)!important;outline-offset:2px!important}'+
      '#adminElementOverlay{position:absolute;z-index:10050;border:2px solid #d7ab33;pointer-events:none;box-sizing:border-box}'+
      '#adminElementOverlay .admin-element-move{position:absolute;left:0;top:-31px;pointer-events:auto;border:0;border-radius:8px 8px 0 0;background:#111827;color:#fff;padding:6px 9px;font:700 10px system-ui;cursor:move}'+
      '#adminElementOverlay .admin-element-resize{position:absolute;right:-9px;bottom:-9px;width:20px;height:20px;pointer-events:auto;border:2px solid #fff;border-radius:50%;background:#d7ab33;color:#111827;padding:0;font:900 11px system-ui;cursor:nwse-resize}'+
      '.admin-multi-selected{outline:3px solid #7c3aed!important;outline-offset:3px!important}'+
      '#adminBuilderContextMenu{position:absolute;z-index:11000;width:220px;padding:7px;background:#111827;border:1px solid #344054;border-radius:12px;box-shadow:0 18px 45px #0007;display:grid;gap:3px}'+
      '#adminBuilderContextMenu button{border:0;background:transparent;color:#fff;text-align:left;padding:8px 10px;border-radius:8px;font:700 11px system-ui}'+
      '#adminBuilderContextMenu button:hover:not(:disabled){background:#344054}#adminBuilderContextMenu button:disabled{opacity:.35}#adminBuilderContextMenu .danger{color:#fda29b}#adminBuilderContextMenu hr{width:100%;border:0;border-top:1px solid #344054;margin:4px 0}'+
      'body.admin-builder-edit #unidades [data-cms-element^="card."]{position:relative!important}'+
      'body.admin-builder-edit #unidades [data-cms-element^="card."]::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:9997;border-radius:inherit;background-image:linear-gradient(rgba(11,46,79,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(11,46,79,.12) 1px,transparent 1px);background-size:16px 16px}';
    doc.head.appendChild(style);
  }
  doc.body.classList.toggle('admin-builder-edit',state.builderMode==='edit');
  doc.body.classList.toggle('admin-builder-navigate',state.builderMode==='navigate');
  installPreviewInteractionGuard(doc);
  installContextMenu(doc);
  if(!doc.defaultView.__olanoOverlaySyncBound){
    doc.defaultView.__olanoOverlaySyncBound=true;
    doc.defaultView.addEventListener('scroll',()=>updateElementOverlay(),{passive:true});
    doc.defaultView.addEventListener('resize',()=>updateElementOverlay(),{passive:true});
  }
  doc.querySelectorAll('[data-cms-slot]').forEach(section=>{
    const key=section.dataset.cmsSlot;
    const slot=state.contentSlots.find(x=>x.slot_key===key);
    section.querySelector('.admin-builder-handle')?.remove();
    if(state.builderMode==='edit'&&builderSlotCanMove(slot)){
      const handle=doc.createElement('button');
      handle.type='button';handle.className='admin-builder-handle';handle.textContent='⋮⋮ Mover sección';handle.draggable=true;handle.dataset.adminBuilderControl='1';
      handle.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();selectEditorCard(key);});
      handle.addEventListener('dragstart',e=>{
        e.stopPropagation();state.builderPreviewDragKey=key;
        pushUndoSnapshot('Mover sección '+contentSlotLabel(builderSlotByKey(key)||{slot_key:key}));
        e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/x-olano-slot',key);
        editorTrace('SECTION_DRAG_START','OK',{slot:key,source:'preview'});
      });
      handle.addEventListener('dragend',()=>{if(state.builderPreviewDragKey)guard(()=>persistPreviewSectionOrder());});
      section.appendChild(handle);
    }
    if(!section.__olanoSectionDropBound){
      section.__olanoSectionDropBound=true;
      section.addEventListener('dragover',e=>{
        if(state.builderMode!=='edit'||!e.dataTransfer.types.includes('text/x-olano-slot'))return;
        e.preventDefault();e.dataTransfer.dropEffect='move';reorderPreviewSectionLive(e,section.dataset.cmsSlot);
      });
      section.addEventListener('drop',e=>{
        if(state.builderMode!=='edit'||!e.dataTransfer.types.includes('text/x-olano-slot'))return;
        e.preventDefault();e.stopPropagation();guard(()=>dropPreviewSection(e,section.dataset.cmsSlot));
      });
    }
  });
  doc.querySelectorAll('[data-cms-field],[data-cms-setting]').forEach(el=>{
    if(el.matches('button,a,input,select,textarea')||el.closest('button,a'))return;
    el.contentEditable=state.builderMode==='edit'?'true':'false';
    el.dataset.cmsEditable=state.builderMode==='edit'?'true':'false';el.spellcheck=true;
    if(el.__olanoInlineBound)return;el.__olanoInlineBound=true;
    el.addEventListener('focus',()=>{if(state.builderMode==='edit'){el.__olanoUndoSnapshot=editorSnapshot();el.__olanoUndoUsed=false;}});
    el.addEventListener('click',e=>{if(state.builderMode==='edit'){const section=el.closest('[data-cms-slot]');if(section)selectEditorCard(section.dataset.cmsSlot);e.stopPropagation();}});
    el.addEventListener('input',()=>{
      if(state.builderMode!=='edit')return;
      if(!el.__olanoUndoUsed&&el.__olanoUndoSnapshot){pushUndoSnapshot('Editar texto en vista previa',el.__olanoUndoSnapshot);el.__olanoUndoUsed=true;}
      const section=el.closest('[data-cms-slot]'); if(!section)return;
      const key=section.dataset.cmsSlot;
      if(el.dataset.cmsField)syncPreviewTextToEditor(key,'field',el.dataset.cmsField,el.textContent||'');
      if(el.dataset.cmsSetting){
        const m=el.dataset.cmsSetting.match(/^faq\.(\d+)\.(q|a)$/);
        if(m)syncPreviewTextToEditor(key,'faq',m[1]+'.'+m[2],el.textContent||'');
        else syncPreviewTextToEditor(key,'setting',el.dataset.cmsSetting,el.textContent||'');
      }
    });
  });
  if(state.builderMode==='edit')restoreBuilderSelection();else hideElementOverlay();
  applyPreviewOrderFromState();
  editorTrace('PREVIEW_READY','OK',{url:visualFrame()?.contentWindow?.location?.pathname||'/',device:state.builderDevice,mode:state.builderMode});
}
function selectEditorCard(key){
  const card=$('contentEditorList')?.querySelector('[data-builder-slot="'+CSS.escape(key)+'"]'); if(!card)return;
  card.open=true;
  document.querySelectorAll('.builder-section-card.selected').forEach(x=>x.classList.remove('selected'));
  card.classList.add('selected');
}
function syncSidebarOrderFromPreview(){
  const doc=visualDoc(),box=$('contentEditorList');if(!doc||!box)return;
  const footerCard=box.querySelector('[data-builder-slot="site.footer"]');
  [...doc.querySelectorAll('main [data-cms-slot^="home."]')].forEach(el=>{
    const card=box.querySelector('[data-builder-slot="'+CSS.escape(el.dataset.cmsSlot)+'"]');
    if(card)box.insertBefore(card,footerCard||null);
  });
}
function reorderPreviewSectionLive(e,targetKey){
  const sourceKey=state.builderPreviewDragKey;if(!sourceKey||sourceKey===targetKey)return;
  const doc=visualDoc(),source=visualSlot(doc,sourceKey),target=visualSlot(doc,targetKey);if(!source||!target)return;
  const rect=target.getBoundingClientRect(),after=e.clientY>rect.top+rect.height/2;
  const wanted=after?target.nextSibling:target;
  if(wanted!==source)target.parentNode.insertBefore(source,wanted);
  syncSidebarOrderFromPreview();
}
async function persistPreviewSectionOrder(){
  syncSidebarOrderFromPreview();
  await persistBuilderOrderFromSidebar();
  editorTrace('SECTION_DRAG_END','OK',{slot:state.builderPreviewDragKey,source:'preview',order:'persisted'});
  state.builderPreviewDragKey=null;
}
async function dropPreviewSection(e,targetKey){
  e.preventDefault();
  reorderPreviewSectionLive(e,targetKey);
  await persistPreviewSectionOrder();
}
function applyPreviewOrderFromState(){
  const doc=visualDoc(); if(!doc)return;
  const main=doc.querySelector('main'); if(!main)return;
  [...state.contentSlots].filter(builderSlotCanMove).sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0)).forEach(slot=>{
    const el=visualSlot(doc,slot.slot_key); if(el)main.appendChild(el);
    if(el)el.style.display=slot.enabled===false?'none':'';
  });
}
function reloadVisualSitePreview(){
  const frame=visualFrame(); if(frame)frame.src='/?admin-preview=visual&t='+Date.now();
}
function renderBranding() {
  const b = state.branding || {};
  $('brandPrimary').value = b.color_primary || '#0b2e4f';
  $('brandSecondary').value = b.color_secondary || '#1aa79d';
  $('brandAccent').value = b.color_accent || '#d7ab33';
  $('brandBackground').value = b.color_background || '#f4f7f8';
  const preview = $('brandLogoPreview');
  const live = $('brandPreviewLogo');
  if (b.logo_url) {
    preview.innerHTML = '<img src="' + attr(b.logo_url) + '" alt="Logo actual">';
    live.innerHTML = '<img src="' + attr(b.logo_url) + '" alt="">';
  } else {
    preview.textContent = 'Sin logo personalizado';
    live.textContent = 'DO';
  }
  updateBrandPreview();
}

function updateBrandPreview() {
  const box = $('brandPreview');
  const primary = $('brandPrimary')?.value || '#0b2e4f';
  const secondary = $('brandSecondary')?.value || '#1aa79d';
  const accent = $('brandAccent')?.value || '#d7ab33';
  const background = $('brandBackground')?.value || '#f4f7f8';
  if(box){
    box.style.setProperty('--preview-primary', primary);
    box.style.setProperty('--preview-secondary', secondary);
    box.style.setProperty('--preview-accent', accent);
    box.style.setProperty('--preview-bg', background);
  }
  applyBrandPreviewToIframe();
}
function currentEditorPalette(){
  return {
    primary:$('brandPrimary')?.value||state.branding?.color_primary||'#0b2e4f',
    secondary:$('brandSecondary')?.value||state.branding?.color_secondary||'#1aa79d',
    accent:$('brandAccent')?.value||state.branding?.color_accent||'#d7ab33',
    background:$('brandBackground')?.value||state.branding?.color_background||'#f4f7f8',
    white:'#ffffff',
    transparent:'transparent'
  };
}
function applyBrandPreviewToIframe() {
  const frames=[$('visualSitePreview'),$('brandSitePreview')].filter(Boolean);
  const palette=currentEditorPalette();
  for(const frame of frames){
    let doc; try{doc=frame.contentDocument;}catch{continue}
    if(!doc?.documentElement)continue;
    const root=doc.documentElement;
    root.style.setProperty('--navy',palette.primary);
    root.style.setProperty('--navy2',palette.primary);
    root.style.setProperty('--teal',palette.secondary);
    root.style.setProperty('--teal2',palette.secondary);
    root.style.setProperty('--gold',palette.accent);
    root.style.setProperty('--bg',palette.background);
    const theme=doc.querySelector('meta[name="theme-color"]'); if(theme)theme.setAttribute('content',palette.primary);
    let previewStyle=doc.getElementById('admin-live-preview-style');
    if(!previewStyle){
      previewStyle=doc.createElement('style'); previewStyle.id='admin-live-preview-style';
      previewStyle.textContent='#introLoader{display:none!important}body.intro-active{overflow:auto!important}.intro-loader{display:none!important}';
      doc.head?.appendChild(previewStyle);
    }
    const logo=state.previewLogoUrl||state.branding?.logo_url||null;
    if(logo){
      doc.querySelectorAll('img.brand-logo,.footer-brand img,#introFallback img,img[src*="logo-isotipo"]').forEach(img=>{
        img.removeAttribute('data-optimized'); img.src=logo;
      });
    }
    const api=frame.contentWindow?.OLANO_BUILDER_API;
    if(api&&window.OLANO_BUSINESS_CONFIG){} // no-op: config lives in the iframe
    try{
      const cfg=frame.contentWindow?.OLANO_BUSINESS_CONFIG;
      if(api&&cfg){cfg.branding={...(cfg.branding||{}),primary:palette.primary,secondary:palette.secondary,accent:palette.accent,background:palette.background,logo_url:logo||cfg.branding?.logo_url};api.applyVisualElementStyles(cfg);}
    }catch{}
  }
}
function reloadBrandSitePreview() { reloadVisualSitePreview(); }
function setPreviewDevice(device) { setVisualPreviewDevice(device); }
function stageBrandingControls(){
  state.branding=state.branding&&typeof state.branding==='object'?state.branding:{negocio_id:state.business?.id};
  state.branding.color_primary=$('brandPrimary').value;
  state.branding.color_secondary=$('brandSecondary').value;
  state.branding.color_accent=$('brandAccent').value;
  state.branding.color_background=$('brandBackground').value;
  updateBrandPreview();
  markEditorDirty('DRAFT_BRAND_CHANGE',{colors:currentEditorPalette()});
}
async function stageBrandLogo(file){
  if(!file)return;
  canWriteOrThrow();
  if(file.size>3145728)throw new Error('El logo supera el máximo de 3 MB.');
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Usa un logo PNG, JPG o WebP.');
  pushUndoSnapshot('Cambiar logo');
  const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
  const path='dr-olano/logo-draft-'+Date.now()+'.'+ext;
  const {error:uploadErr}=await sb.storage.from('business-branding').upload(path,file,{cacheControl:'3600',upsert:false});
  if(uploadErr)throw uploadErr;
  const {data:publicData}=sb.storage.from('business-branding').getPublicUrl(path);
  if(!publicData?.publicUrl)throw new Error('No se pudo obtener la URL pública del logo.');
  state.branding=state.branding&&typeof state.branding==='object'?state.branding:{negocio_id:state.business?.id};
  state.branding.logo_url=publicData.publicUrl;
  state.branding.logo_path=path;
  state.previewLogoUrl=publicData.publicUrl;
  $('brandLogoPreview').innerHTML='<img src="'+attr(publicData.publicUrl)+'" alt="Vista previa del logo">';
  $('brandPreviewLogo').innerHTML='<img src="'+attr(publicData.publicUrl)+'" alt="">';
  applyBrandPreviewToIframe();
  markEditorDirty('DRAFT_LOGO_CHANGE',{url:publicData.publicUrl});
}
async function saveBranding(e) {
  e.preventDefault();
  canWriteOrThrow();
  stageBrandingControls();
  const file=$('brandLogoFile').files?.[0]||null;
  if(file&&state.branding?.logo_url!==state.previewLogoUrl)await stageBrandLogo(file);
  $('brandLogoFile').value='';
  builderSetState('Marca aplicada al borrador','warn');
  editorTrace('DRAFT_BRAND_APPLY','OK',{colors:currentEditorPalette(),logo:Boolean(state.branding?.logo_url)});
}
function resetResourceForm() {
  $('resourceForm').reset(); $('resourceId').value = ''; $('resourceActive').checked = true; $('resourceForm').hidden = true;
}
function openResource(id = '') {
  const r = id ? state.resources.find((x) => x.id === id) : null;
  $('resourceId').value = r?.id || ''; $('resourceName').value = r?.nombre || ''; $('resourceType').value = r?.tipo || 'persona'; $('resourceActive').checked = r ? r.activo === true : true;
  $('resourceForm').hidden = false; $('resourceName').focus();
}
function resetScheduleForm() {
  $('scheduleForm').reset(); $('scheduleId').value=''; $('scheduleActive').checked=true; $('scheduleForm').hidden=true;
}
function openSchedule(id = '') {
  const h = id ? state.schedules.find((x) => x.id === id) : null;
  $('scheduleId').value=h?.id||''; $('scheduleResource').value=h?.recurso_id||''; $('scheduleDay').value=String(h?.dia_semana ?? 1);
  $('scheduleStart').value=h ? String(h.hora_inicio).slice(0,5) : ''; $('scheduleEnd').value=h ? String(h.hora_fin).slice(0,5) : ''; $('scheduleActive').checked=h ? h.activo===true : true;
  $('scheduleForm').hidden=false;
}
let categorySlugTouched = false;
function resetCategoryForm() {
  $('categoryForm').reset(); $('categoryId').value=''; $('categoryActive').checked=true; $('categoryOrder').value=0; categorySlugTouched=false;
  if($('categoryIconPreset')) $('categoryIconPreset').value='';
  if($('categoryImagePreview')) $('categoryImagePreview').innerHTML='Sin imagen personalizada';
  $('categoryForm').hidden=true; $('categoryFormEmpty').hidden=false; updateCategoryPreview();
}
function openCategory(id = '') {
  const c = id ? state.categories.find((x) => x.id === id) : null;
  $('categoryId').value=c?.id||''; $('categoryName').value=c?.nombre||''; $('categorySlug').value=c?.slug||''; $('categoryDescription').value=c?.descripcion||'';
  $('categorySvg').value=c?.icon_svg||''; $('categoryOrder').value=c?.orden??0; $('categoryFeatured').checked=c?.destacada_web===true; $('categoryActive').checked=c ? c.activo===true : true;
  if($('categoryImageFile')) $('categoryImageFile').value='';
  if($('categoryImagePreview')) $('categoryImagePreview').innerHTML=c?.image_url ? '<img src="'+attr(c.image_url)+'" alt="Imagen actual">' : 'Sin imagen personalizada';
  if($('categoryIconPreset')){
    const match=Object.entries(ICON_PRESETS).find(([,svg])=>svg===$('categorySvg').value);
    $('categoryIconPreset').value=match?.[0]||'';
  }
  categorySlugTouched=Boolean(c); $('categoryForm').hidden=false; $('categoryFormEmpty').hidden=true; updateCategoryPreview(); $('categoryName').focus();
}
function updateCategoryPreview() {
  const box=$('categoryIconPreview'), checked=safeSvg($('categorySvg').value);
  const markup=checked.ok ? checked.value : null;
  box.innerHTML = markup || 'SVG';
  box.className = 'icon-preview' + (markup ? '' : ' empty');
}
function renderWeekdayChecks(selected) {
  const set = new Set(Array.isArray(selected) ? selected.map(Number) : WEEKDAYS.map((d)=>d.value));
  $('serviceWeekdays').innerHTML = WEEKDAYS.map((d)=>`<label class="weekday-check"><input type="checkbox" value="${d.value}" ${set.has(d.value)?'checked':''}><span>${d.short}</span></label>`).join('');
}
function resetServiceForm() {
  $('serviceForm').reset(); $('serviceId').value=''; $('serviceVisible').checked=true; $('serviceActive').checked=true; $('serviceOrder').value=0; renderWeekdayChecks(null);
  $('serviceForm').hidden=true; $('serviceFormEmpty').hidden=false;
}
function openService(id = '') {
  const s = id ? state.services.find((x) => x.id === id) : null;
  $('serviceId').value=s?.id||''; $('serviceName').value=s?.nombre||''; $('serviceCategory').value=s?.categoria_id||''; $('serviceDescription').value=s?.descripcion_web||'';
  $('servicePricePen').value=s?.precio_pen??''; $('servicePriceFrom').checked=s?.precio_desde===true; $('serviceDuration').value=s?.duracion_min??''; $('serviceOrder').value=s?.orden_web??0;
  $('serviceVisible').checked=s ? s.visible_web!==false : true; $('serviceActive').checked=s ? s.activo===true : true;
  $('serviceResource').value=s ? (assignedResourceFor(s.id)?.id || '') : '';
  renderWeekdayChecks(s?.dias_semana_disponibles);
  $('serviceForm').hidden=false; $('serviceFormEmpty').hidden=true; $('serviceName').focus();
}
function resetPromotionForm() {
  $('promotionForm').reset(); $('promotionId').value=''; $('promotionInternalName').value='Promoción web'; $('promotionTitle').value='Oferta especial'; $('promotionCta').value='Quiero aprovecharlo';
  $('promotionDiscount').value='10'; $('promotionCountdown').value='300'; $('promotionScope').value='all_services'; $('promotionReferential').checked=true; $('promotionActive').checked=false;
  $('promotionForm').hidden=true; $('promotionFormEmpty').hidden=false; updatePromotionScope(); updatePromotionPreview();
}
function openPromotion(id = '') {
  const p = id ? state.promotions.find((x) => x.id === id) : null;
  $('promotionId').value=p?.id||''; $('promotionInternalName').value=p?.nombre_interno||'Promoción web'; $('promotionTitle').value=p?.titulo||'Oferta especial';
  $('promotionMessage').value=p?.mensaje||''; $('promotionCta').value=p?.cta_text||'Quiero aprovecharlo'; $('promotionDiscount').value=p?.descuento_pct??10;
  $('promotionCountdown').value=p?.duracion_contador_seg??300; $('promotionScope').value=p?.alcance||'all_services'; $('promotionCategory').value=p?.categoria_id||'';
  $('promotionService').value=p?.servicio_id||''; $('promotionStart').value=toLimaInput(p?.inicia_at); $('promotionEnd').value=toLimaInput(p?.termina_at);
  $('promotionImage').value=p?.imagen_url||''; $('promotionLegal').value=p?.nota_legal||''; $('promotionReferential').checked=p ? p.precio_referencial===true : true; $('promotionActive').checked=p?.activo===true;
  $('promotionForm').hidden=false; $('promotionFormEmpty').hidden=true; updatePromotionScope(); updatePromotionPreview(); $('promotionInternalName').focus();
}
function updatePromotionScope() {
  const scope=$('promotionScope').value;
  $('promotionCategoryWrap').hidden=scope!=='category'; $('promotionServiceWrap').hidden=scope!=='service';
}
function updatePromotionPreview() {
  const discount=numberOrNull($('promotionDiscount').value), seconds=numberOrNull($('promotionCountdown').value);
  $('previewPromoTitle').textContent=$('promotionTitle').value.trim()||'Sin promoción seleccionada';
  $('previewPromoMessage').textContent=$('promotionMessage').value.trim()||'El texto que verá el visitante aparecerá aquí.';
  $('previewPromoDiscount').textContent=discount==null?'—':discount+'%';
  $('previewPromoCountdown').textContent=seconds==null?'—':(Math.floor(seconds/60)+' min '+(seconds%60)+' s');
  $('previewPromoCta').textContent=$('promotionCta').value.trim()||'Botón';
}

async function saveAgenda(e) {
  e.preventDefault(); canWriteOrThrow();
  const payload = {
    negocio_id:state.business.id,
    activa:$('agendaActiva').checked,
    intervalo_inicio_min:intOr($('intervaloInicio').value,20),
    anticipacion_min:intOr($('anticipacionMin').value,0),
    horizonte_dias:intOr($('horizonteDias').value,60),
    capacidad_por_hora:intOr($('capacidadHora').value,1)
  };
  if (payload.intervalo_inicio_min < 5 || payload.horizonte_dias < 1 || payload.capacidad_por_hora < 1) throw new Error('Revisa las reglas de agenda.');
  const {error}=await sb.from('configuracion_agenda').upsert(payload,{onConflict:'negocio_id'}); if(error) throw error;
  await afterWrite('Reglas de agenda guardadas.');
}
async function saveResource(e) {
  e.preventDefault(); canWriteOrThrow();
  const id=$('resourceId').value, payload={negocio_id:state.business.id,nombre:$('resourceName').value.trim(),tipo:$('resourceType').value,activo:$('resourceActive').checked};
  if(payload.nombre.length<2) throw new Error('Escribe un nombre para el recurso.');
  const q=id?sb.from('recursos_agenda').update(payload).eq('id',id).eq('negocio_id',state.business.id):sb.from('recursos_agenda').insert(payload);
  const {error}=await q; if(error) throw error; resetResourceForm(); await afterWrite('Recurso guardado.');
}
async function saveSchedule(e) {
  e.preventDefault(); canWriteOrThrow();
  const id=$('scheduleId').value, recurso_id=$('scheduleResource').value, dia_semana=Number($('scheduleDay').value), hora_inicio=$('scheduleStart').value, hora_fin=$('scheduleEnd').value;
  if(!recurso_id||!hora_inicio||!hora_fin||hora_fin<=hora_inicio) throw new Error('El horario de fin debe ser posterior al de inicio.');
  const overlaps=state.schedules.some((h)=>h.id!==id&&h.recurso_id===recurso_id&&Number(h.dia_semana)===dia_semana&&h.activo&&$('scheduleActive').checked&&hora_inicio<String(h.hora_fin).slice(0,5)&&hora_fin>String(h.hora_inicio).slice(0,5));
  if(overlaps) throw new Error('Ese bloque se superpone con otro horario activo del mismo recurso.');
  const payload={negocio_id:state.business.id,recurso_id,dia_semana,hora_inicio,hora_fin,activo:$('scheduleActive').checked};
  const q=id?sb.from('horarios_agenda').update(payload).eq('id',id).eq('negocio_id',state.business.id):sb.from('horarios_agenda').insert(payload);
  const {error}=await q; if(error) throw error; resetScheduleForm(); await afterWrite('Horario guardado.');
}
async function saveCategory(e) {
  e.preventDefault(); canWriteOrThrow();
  const id=$('categoryId').value, checked=safeSvg($('categorySvg').value); if(!checked.ok) throw new Error(checked.error);
  const current=id?state.categories.find(x=>x.id===id):null;
  let image_url=current?.image_url||null, image_path=current?.image_path||null, uploaded=null;
  const imageFile=$('categoryImageFile')?.files?.[0]||null;
  if(imageFile){
    uploaded=await uploadBusinessContentImage(imageFile,'categoria-'+($('categorySlug').value||$('categoryName').value));
    image_url=uploaded.url; image_path=uploaded.path;
  }
  const payload={
    negocio_id:state.business.id,nombre:$('categoryName').value.trim(),slug:slugify($('categorySlug').value),
    descripcion:$('categoryDescription').value.trim()||null,icon_svg:checked.value,
    image_url,image_path,image_alt:$('categoryName').value.trim()||null,
    orden:intOr($('categoryOrder').value,0),destacada_web:$('categoryFeatured').checked,activo:$('categoryActive').checked
  };
  if(!payload.nombre||!payload.slug) throw new Error('Nombre y slug son obligatorios.');
  const q=id?sb.from('servicio_categorias').update(payload).eq('id',id).eq('negocio_id',state.business.id):sb.from('servicio_categorias').insert(payload);
  const {error}=await q; if(error) throw error;
  if(uploaded&&current?.image_path&&current.image_path!==uploaded.path){
    sb.storage.from('business-content').remove([current.image_path]).catch(()=>{});
  }
  resetCategoryForm(); await afterWrite('Categoría guardada.'); reloadBrandSitePreview();
}
async function saveService(e) {
  e.preventDefault(); canWriteOrThrow();
  const id=$('serviceId').value, nombre=$('serviceName').value.trim(), categoria_id=$('serviceCategory').value, recurso_id=$('serviceResource').value;
  const visible=$('serviceVisible').checked;
  const weekdays=[...$('serviceWeekdays').querySelectorAll('input:checked')].map((x)=>Number(x.value));
  if(!nombre||!categoria_id) throw new Error('Nombre y categoría son obligatorios.');
  if(visible && !recurso_id) throw new Error('Para publicarlo y permitir reservas, selecciona una agenda. Si todavía no la conoces, desactiva “Publicar en web y reservas” y guárdalo como borrador.');
  if(visible && weekdays.length===0) throw new Error('Para publicarlo, elige al menos un día disponible.');
  if(recurso_id){
    const resource=resourceById(recurso_id);
    if(!resource?.activo) throw new Error('La agenda seleccionada debe estar activa.');
  }
  const payload={
    negocio_id:state.business.id,nombre,categoria_id,descripcion_web:$('serviceDescription').value.trim()||null,
    precio_pen:numberOrNull($('servicePricePen').value),precio_desde:$('servicePriceFrom').checked,duracion_min:numberOrNull($('serviceDuration').value),
    visible_web:visible,activo:$('serviceActive').checked,orden_web:intOr($('serviceOrder').value,0),
    dias_semana_disponibles:weekdays.length ? weekdays : null
  };
  let serviceId=id;
  if(id){
    const {error}=await sb.from('servicios').update(payload).eq('id',id).eq('negocio_id',state.business.id); if(error) throw error;
  }else{
    const code=uniqueServiceCode(nombre);
    const {data,error}=await sb.from('servicios').insert({...payload,codigo_web:code,codigo_externo:code,requiere_consulta_previa:false}).select('id').single();
    if(error) throw error; serviceId=data.id;
  }
  if(recurso_id){
    const {error:linkErr}=await sb.from('servicios_recursos').upsert(
      {negocio_id:state.business.id,servicio_id:serviceId,recurso_id},
      {onConflict:'negocio_id,servicio_id,recurso_id'}
    ); if(linkErr) throw linkErr;
    const {error:delErr}=await sb.from('servicios_recursos').delete()
      .eq('negocio_id',state.business.id).eq('servicio_id',serviceId).neq('recurso_id',recurso_id);
    if(delErr) throw delErr;
  } else {
    const {error:delErr}=await sb.from('servicios_recursos').delete()
      .eq('negocio_id',state.business.id).eq('servicio_id',serviceId);
    if(delErr) throw delErr;
  }
  resetServiceForm(); await afterWrite(visible ? 'Servicio publicado y guardado.' : 'Servicio guardado como borrador. Puedes completar su agenda después.');
}
async function savePromotion(e) {
  e.preventDefault(); canWriteOrThrow();
  const id=$('promotionId').value, scope=$('promotionScope').value, active=$('promotionActive').checked;
  const starts=toLimaIso($('promotionStart').value), ends=toLimaIso($('promotionEnd').value);
  if(starts&&ends&&new Date(ends)<=new Date(starts)) throw new Error('La fecha final debe ser posterior al inicio.');
  const payload={
    negocio_id:state.business.id,nombre_interno:$('promotionInternalName').value.trim(),activo:active,titulo:$('promotionTitle').value.trim(),
    mensaje:$('promotionMessage').value.trim(),cta_text:$('promotionCta').value.trim(),descuento_pct:numberOrNull($('promotionDiscount').value)??0,
    duracion_contador_seg:intOr($('promotionCountdown').value,300),alcance:scope,
    categoria_id:scope==='category'?$('promotionCategory').value:null,servicio_id:scope==='service'?$('promotionService').value:null,
    inicia_at:starts,termina_at:ends,imagen_url:$('promotionImage').value.trim()||null,nota_legal:$('promotionLegal').value.trim()||null,
    precio_referencial:$('promotionReferential').checked
  };
  if(!payload.nombre_interno||!payload.titulo||!payload.mensaje||!payload.cta_text) throw new Error('Completa nombre, título, mensaje y botón.');
  if(payload.descuento_pct<0||payload.descuento_pct>100||payload.duracion_contador_seg<30) throw new Error('Revisa descuento y duración del contador.');
  if(scope==='category'&&!payload.categoria_id) throw new Error('Selecciona la categoría de la promoción.');
  if(scope==='service'&&!payload.servicio_id) throw new Error('Selecciona el servicio de la promoción.');
  if(active){
    let q=sb.from('web_promociones').update({activo:false}).eq('negocio_id',state.business.id).eq('activo',true);
    if(id) q=q.neq('id',id);
    const {error}=await q; if(error) throw error;
  }
  const q=id?sb.from('web_promociones').update(payload).eq('id',id).eq('negocio_id',state.business.id):sb.from('web_promociones').insert(payload);
  const {error}=await q; if(error) throw error; resetPromotionForm(); await afterWrite('Promoción guardada.');
}
async function afterWrite(message) {
  setStatus(message,'ok'); await loadAll({publicCheck:true});
}

async function loadPublicConfig() {
  $('publicConfigStatus').className='notice neutral'; $('publicConfigStatus').textContent='Consultando la configuración pública…';
  try{
    const res=await fetch(PUBLIC_CONFIG_URL,{headers:{apikey:SUPABASE_KEY},cache:'no-store'});
    const data=await res.json(); if(!res.ok||data?.ok!==true) throw new Error(data?.code||'No se pudo leer la configuración pública.');
    state.publicConfig=data; $('publicConfigRaw').textContent=JSON.stringify(data,null,2);
    const activeHours=(data.booking?.resources||[]).reduce((n,r)=>n+(r.hours?.length||0),0);
    $('publicSummary').innerHTML=`
      <div class="summary-card"><b>${data.categories?.length||0}</b><span>Categorías públicas activas</span></div>
      <div class="summary-card"><b>${data.services?.length||0}</b><span>Servicios públicos visibles</span></div>
      <div class="summary-card"><b>${activeHours}</b><span>Bloques de horario activos</span></div>
      <div class="summary-card"><b>${data.promotion ? Number(data.promotion.discount_pct||0)+'%' : 'OFF'}</b><span>Promoción pública activa</span></div>`;
    $('publicConfigStatus').className='notice neutral'; $('publicConfigStatus').textContent='✓ Endpoint público sincronizado · '+new Date(data.generated_at).toLocaleString('es-PE');
  }catch(err){
    $('publicConfigStatus').className='notice warning'; $('publicConfigStatus').textContent='No se pudo verificar la lectura pública: '+(err?.message||err);
  }
}

function bindEvents() {
  document.querySelectorAll('.tab').forEach((tab)=>tab.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach((x)=>x.classList.toggle('active',x===tab));
    document.querySelectorAll('.tab-panel').forEach((p)=>p.classList.toggle('active',p.dataset.panel===tab.dataset.tab));
    if(tab.dataset.tab==='vista-publica') loadPublicConfig();
    if(tab.dataset.tab==='contenido') setTimeout(()=>{setupVisualPreview();updateEditorDirty();},250);
    else updateEditorDirty();
  }));
  $('refreshAll').addEventListener('click',()=>guard(async()=>{
    if(state.editorDirty&&!confirm('Hay cambios del editor sin publicar. Actualizar conservará el borrador actual. ¿Continuar?'))return;
    await loadAll({publicCheck:true});
    updateEditorDirty();setStatus('Datos actualizados.','ok');
  }));
  $('refreshPublicBtn').addEventListener('click',()=>loadPublicConfig());
  $('logoutBtn').addEventListener('click',async()=>{await sb.auth.signOut();location.replace('/agenda-admin/');});
  $('agendaForm').addEventListener('submit',(e)=>guard(()=>saveAgenda(e)));
  $('newResourceBtn').addEventListener('click',()=>openResource()); $('cancelResourceBtn').addEventListener('click',resetResourceForm);
  $('resourceForm').addEventListener('submit',(e)=>guard(()=>saveResource(e)));
  $('newScheduleBtn').addEventListener('click',()=>openSchedule()); $('cancelScheduleBtn').addEventListener('click',resetScheduleForm);
  $('scheduleForm').addEventListener('submit',(e)=>guard(()=>saveSchedule(e)));
  $('newAvailabilityBtn').addEventListener('click',()=>openAvailabilityConfig());
  $('cancelAvailabilityBtn').addEventListener('click',resetAvailabilityConfigForm);
  $('availabilityConfigForm').addEventListener('submit',(e)=>guard(()=>saveAvailabilityConfig(e)));
  $('availabilityScope').addEventListener('change',updateAvailabilityScope);
  $('availabilityPeriodMode').addEventListener('change',updateAvailabilityPeriodMode);
  $('newAvailabilityBlockBtn').addEventListener('click',()=>{
    if(!$('availabilityConfigId').value){setStatus('Guarda primero la regla de disponibilidad.','info');return;}
    openAvailabilityBlock();
  });
  $('cancelAvailabilityBlockBtn').addEventListener('click',resetAvailabilityBlockForm);
  $('availabilityBlockForm').addEventListener('submit',(e)=>guard(()=>saveAvailabilityBlock(e)));
  $('availabilityBlockType').addEventListener('change',updateAvailabilityBlockType);
  $('newCategoryBtn').addEventListener('click',()=>openCategory()); $('cancelCategoryBtn').addEventListener('click',resetCategoryForm);
  $('categoryForm').addEventListener('submit',(e)=>guard(()=>saveCategory(e)));
  $('categoryName').addEventListener('input',()=>{if(!$('categoryId').value&&!categorySlugTouched)$('categorySlug').value=slugify($('categoryName').value);});
  $('categorySlug').addEventListener('input',()=>{categorySlugTouched=true;});
  $('categorySvg').addEventListener('input',()=>{ if($('categoryIconPreset')) $('categoryIconPreset').value=''; updateCategoryPreview(); });
  $('categoryIconPreset').addEventListener('change',()=>{
    const key=$('categoryIconPreset').value;
    if(key&&ICON_PRESETS[key]) $('categorySvg').value=ICON_PRESETS[key];
    updateCategoryPreview();
  });
  $('categoryImageFile').addEventListener('change',()=>{
    const file=$('categoryImageFile').files?.[0];
    if(!file)return;
    const url=URL.createObjectURL(file);
    $('categoryImagePreview').innerHTML='<img src="'+attr(url)+'" alt="Vista previa">';
  });
  $('newServiceBtn').addEventListener('click',()=>openService()); $('cancelServiceBtn').addEventListener('click',resetServiceForm);
  $('serviceForm').addEventListener('submit',(e)=>guard(()=>saveService(e)));
  $('serviceSearch').addEventListener('input',renderServices); $('serviceCategoryFilter').addEventListener('change',renderServices);
  $('newPromotionBtn').addEventListener('click',()=>openPromotion()); $('cancelPromotionBtn').addEventListener('click',resetPromotionForm);
  $('promotionForm').addEventListener('submit',(e)=>guard(()=>savePromotion(e)));
  $('brandingForm').addEventListener('submit',(e)=>guard(()=>saveBranding(e)));
  ['brandPrimary','brandSecondary','brandAccent','brandBackground'].forEach((id)=>$(id).addEventListener('input',(e)=>{
    consumeUndoArm(e.currentTarget);
    stageBrandingControls();
  }));
  $('brandLogoFile').addEventListener('change',()=>{
    const file=$('brandLogoFile').files?.[0];
    if(file)guard(()=>stageBrandLogo(file));
  });
  if($('brandSitePreview')) $('brandSitePreview').addEventListener('load',()=>{setTimeout(applyBrandPreviewToIframe,350);setTimeout(applyBrandPreviewToIframe,1300);});
  document.querySelectorAll('[data-preview-device]').forEach((btn)=>btn.addEventListener('click',()=>setPreviewDevice(btn.dataset.previewDevice)));
  $('visualSitePreview').addEventListener('load',()=>{
    editorTrace('PREVIEW_LOAD','OK',{url:$('visualSitePreview').src});
    setupVisualPreview();
    try{$('visualSitePreview').contentDocument?.addEventListener('olano:business-config',setupVisualPreview,{once:true});}catch{}
    setTimeout(setupVisualPreview,450);setTimeout(setupVisualPreview,1500);
  });
  document.querySelectorAll('[data-visual-device]').forEach((btn)=>btn.addEventListener('click',()=>setVisualPreviewDevice(btn.dataset.visualDevice)));
  $('builderEditMode').addEventListener('click',()=>setBuilderMode('edit'));
  $('builderNavigateMode').addEventListener('click',()=>setBuilderMode('navigate'));
  setupInspectorPalette();
  $('inspectBgMode').addEventListener('change',(e)=>{consumeUndoArm(e.currentTarget);updateInspectorVisibility();applySelectedInspectorConfig();});
  ['inspectWidth','inspectHeight','inspectFontSize','inspectRadius','inspectBgFrom','inspectBgTo','inspectGradientAngle','inspectBorder','inspectOpacity','inspectPadding']
    .forEach(id=>$(id).addEventListener('input',(e)=>{consumeUndoArm(e.currentTarget);applySelectedInspectorConfig();}));
  $('inspectTypographyScope').addEventListener('change',(e)=>{consumeUndoArm(e.currentTarget);populateTypographyControls();editorTrace('TYPOGRAPHY_SCOPE','OK',{scope:$('inspectTypographyScope').value});});
  ['inspectFontFamily','inspectFontWeight','inspectFontScale','inspectColor'].forEach(id=>$(id).addEventListener('input',(e)=>{consumeUndoArm(e.currentTarget);applyTypographyFromInspector();}));
  $('inspectText').addEventListener('input',(e)=>{consumeUndoArm(e.currentTarget);setSelectedElementTextOverride($('inspectText').value);});
  $('inspectLinkHref').addEventListener('input',(e)=>{consumeUndoArm(e.currentTarget);setSelectedElementLinkOverride();});
  $('inspectLinkTarget').addEventListener('change',(e)=>{consumeUndoArm(e.currentTarget);setSelectedElementLinkOverride();});
  $('inspectImageFile').addEventListener('change',(e)=>{
    const file=$('inspectImageFile').files?.[0];
    if(file){consumeUndoArm(e.currentTarget);guard(()=>setSelectedElementImage(file));}
  });
  $('inspectorResetBtn').addEventListener('click',()=>resetSelectedElementStyle());
  document.querySelector('.visual-builder-sidebar')?.addEventListener('focusin',(e)=>{
    const control=e.target.closest('input,textarea,select');
    if(control){armUndo(control);syncFocusFromEditorControl(control);}
  });
  document.querySelector('.visual-builder-sidebar')?.addEventListener('focusout',(e)=>{
    if(state.undoArm?.control===e.target)setTimeout(()=>{if(state.undoArm?.control===e.target)state.undoArm=null;},0);
  });
  $('copyTraceBtn').addEventListener('click',()=>copyEditorTrace());
  $('clearTraceBtn').addEventListener('click',()=>clearEditorTrace());
  $('brandDefaultsBtn').addEventListener('click',()=>{
    pushUndoSnapshot('Restablecer paleta');
    $('brandPrimary').value='#0b2e4f';$('brandSecondary').value='#1aa79d';
    $('brandAccent').value='#d7ab33';$('brandBackground').value='#f4f7f8';
    stageBrandingControls();
  });
  $('publishEditorBtn').addEventListener('click',()=>guard(()=>publishEditorDraft()));
  $('discardDraftBtn').addEventListener('click',()=>guard(()=>discardEditorDraft()));
  $('redoUndoBtn').addEventListener('click',()=>redoEditorChange());
  document.addEventListener('keydown',(e)=>{
    const mod=e.ctrlKey||e.metaKey;
    if(!mod)return;
    if(String(e.key).toLowerCase()==='z'){
      e.preventDefault();
      if(e.shiftKey)redoEditorChange();else undoEditorChange();
    }else if(String(e.key).toLowerCase()==='y'){
      e.preventDefault();redoEditorChange();
    }
  });
  window.addEventListener('beforeunload',(e)=>{
    if(!state.editorDirty)return;
    e.preventDefault();e.returnValue='';
  });
  $('promotionScope').addEventListener('change',()=>{updatePromotionScope();updatePromotionPreview();});
  ['promotionTitle','promotionMessage','promotionCta','promotionDiscount','promotionCountdown'].forEach((id)=>$(id).addEventListener('input',updatePromotionPreview));
}
async function guard(fn) {
  try{setStatus('Guardando…','info');await fn();}
  catch(err){
    console.error(err);
    const message=err?.message||String(err);
    editorTrace('ERROR','ERROR',{message,stack:String(err?.stack||'').slice(0,1200)});
    setStatus(message,'error');
  }
}

async function bootstrap() {
  bindEvents();
  showGate('Validando tu sesión y tus permisos para Dr. Olano…', false);
  try{
    const {data:{session},error:sessionErr}=await sb.auth.getSession();
    if(sessionErr) throw sessionErr;
    if(!session?.user){showGate('Necesitas iniciar sesión con una cuenta autorizada para administrar Dr. Olano.',true);return;}
    state.user=session.user;
    const {data:business,error:businessErr}=await sb.from('negocios').select('id,nombre,slug,zona_horaria,activo').eq('slug',BUSINESS_SLUG).maybeSingle();
    if(businessErr) throw businessErr;
    if(!business) throw new Error('Tu sesión no tiene acceso al negocio Dr. Olano.');
    state.business=business;
    const {data:membership,error:memberErr}=await sb.from('usuarios_negocio').select('rol').eq('negocio_id',business.id).eq('user_id',session.user.id).maybeSingle();
    if(memberErr) throw memberErr;
    if(!membership) throw new Error('Tu cuenta no figura como miembro de Dr. Olano.');
    state.membership=membership; state.canEdit=['propietario','admin'].includes(String(membership.rol||'').toLowerCase());
    $('rolePill').textContent='Rol: '+membership.rol; showApp(); setWriteMode();
    await loadAll({publicCheck:true});
  }catch(err){
    console.error(err);showGate(err?.message||'No se pudo abrir el panel.',false);
  }
}
bootstrap();