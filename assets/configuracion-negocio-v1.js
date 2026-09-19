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

async function loadAll({ publicCheck = false } = {}) {
  if (!state.business) return;
  setSync('Sincronizando…', null);
  const bid = state.business.id;
  const [configQ, resourcesQ, schedulesQ, categoriesQ, servicesQ, linksQ, promotionsQ, brandingQ, availabilityConfigsQ, availabilityBlocksQ] = await Promise.all([
    sb.from('configuracion_agenda').select('*').eq('negocio_id', bid).maybeSingle(),
    sb.from('recursos_agenda').select('*').eq('negocio_id', bid).order('created_at'),
    sb.from('horarios_agenda').select('*').eq('negocio_id', bid).order('dia_semana').order('hora_inicio'),
    sb.from('servicio_categorias').select('*').eq('negocio_id', bid).order('orden').order('nombre'),
    sb.from('servicios').select('id,negocio_id,nombre,descripcion,descripcion_web,duracion_min,precio_pen,precio_usd,activo,codigo_web,codigo_externo,dias_semana_disponibles,requiere_consulta_previa,modalidades_consulta,precio_consulta_pen,calendar_color_hex,categoria_id,visible_web,orden_web,precio_desde,created_at,updated_at').eq('negocio_id', bid).order('orden_web').order('nombre'),
    sb.from('servicios_recursos').select('*').eq('negocio_id', bid),
    sb.from('web_promociones').select('*').eq('negocio_id', bid).order('created_at', { ascending:false }),
    sb.from('web_branding').select('*').eq('negocio_id', bid).maybeSingle(),
    sb.from('agenda_disponibilidad_config').select('*').eq('negocio_id', bid).order('created_at'),
    sb.from('agenda_disponibilidad_bloques').select('*').eq('negocio_id', bid).order('created_at')
  ]);
  for (const q of [configQ, resourcesQ, schedulesQ, categoriesQ, servicesQ, linksQ, promotionsQ, brandingQ, availabilityConfigsQ, availabilityBlocksQ]) {
    if (q.error) throw q.error;
  }
  state.config = configQ.data || null;
  state.resources = resourcesQ.data || [];
  state.schedules = schedulesQ.data || [];
  state.categories = categoriesQ.data || [];
  state.services = servicesQ.data || [];
  state.links = linksQ.data || [];
  state.promotions = promotionsQ.data || [];
  state.branding = brandingQ.data || null;
  state.availabilityConfigs = availabilityConfigsQ.data || [];
  state.availabilityBlocks = availabilityBlocksQ.data || [];
  renderAll();
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
function renderAvailability() {
  fillAvailabilityTargets();
  const box = $('availabilityConfigList');
  if (!box) return;
  if (!state.availabilityConfigs.length) {
    box.innerHTML = '<div class="empty-state">Aún no hay horarios específicos. La agenda general sigue aplicándose.</div>';
  } else {
    box.innerHTML = state.availabilityConfigs.map((cfg)=>{
      const blocks = availabilityBlocksFor(cfg.id).filter((x)=>x.activo).length;
      const period = cfg.vigente_desde || cfg.vigente_hasta
        ? (cfg.vigente_desde || '…') + ' → ' + (cfg.vigente_hasta || '…')
        : 'Sin fecha límite';
      return '<article class="item-card availability-card">'+
        '<div class="item-top"><div><h3>'+esc(availabilityTargetLabel(cfg))+'</h3><p>'+
        (cfg.alcance==='service'?'Servicio':'Categoría')+' · '+esc(period)+'</p></div>'+
        '<span class="pill '+(cfg.activo?'':'off')+'">'+(cfg.activo?'Activa':'Inactiva')+'</span></div>'+
        '<div class="meta-row"><span class="meta">'+(cfg.intervalo_min?Number(cfg.intervalo_min)+' min':'Intervalo general')+'</span>'+
        '<span class="meta">'+blocks+' bloque(s)</span>'+
        '<span class="meta">'+(cfg.reemplaza_general?'Reemplaza general':'Complementa general')+'</span></div>'+
        '<div class="row-actions"><button class="button mini write-control" type="button" data-availability-edit="'+attr(cfg.id)+'">Editar</button>'+
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
function resetAvailabilityConfigForm() {
  $('availabilityConfigForm').reset();
  $('availabilityConfigId').value='';
  $('availabilityScope').value='category';
  $('availabilityReplace').checked=true;
  $('availabilityActive').checked=true;
  $('availabilityConfigForm').hidden=true;
  $('availabilityFormEmpty').hidden=false;
  $('availabilityBlocksCard').hidden=true;
  updateAvailabilityScope();
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
  $('availabilityFrom').value = cfg?.vigente_desde || '';
  $('availabilityTo').value = cfg?.vigente_hasta || '';
  $('availabilityReplace').checked = cfg ? cfg.reemplaza_general === true : true;
  $('availabilityActive').checked = cfg ? cfg.activo === true : true;
  $('availabilityConfigForm').hidden=false;
  $('availabilityFormEmpty').hidden=true;
  updateAvailabilityScope();
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
  $('availabilityBlocksTitle').textContent='Horarios · '+availabilityTargetLabel(cfg);
  const rows = availabilityBlocksFor(configId).sort((a,b)=>{
    const ak=a.tipo==='date' ? '0'+String(a.fecha||'') : '1'+String(a.dia_semana).padStart(2,'0')+String(a.hora_inicio);
    const bk=b.tipo==='date' ? '0'+String(b.fecha||'') : '1'+String(b.dia_semana).padStart(2,'0')+String(b.hora_inicio);
    return ak.localeCompare(bk);
  });
  const box=$('availabilityBlockList');
  if (!rows.length) {
    box.innerHTML='<div class="empty-state">Agrega al menos un bloque. Ejemplo: Lun/Mié/Vie 09:00–12:00.</div>';
    return;
  }
  box.innerHTML=rows.map((b)=>{
    const when=b.tipo==='date' ? esc(b.fecha) : esc(dayName(b.dia_semana));
    return '<div class="list-row"><div><strong>'+when+' · '+esc(String(b.hora_inicio).slice(0,5))+'–'+esc(String(b.hora_fin).slice(0,5))+'</strong>'+
      '<small>'+(b.tipo==='date'?'Fecha específica':'Semanal')+' · '+(b.activo?'Activo':'Inactivo')+'</small></div>'+
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
  const desde=$('availabilityFrom').value||null, hasta=$('availabilityTo').value||null;
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
  const uri = svgDataUri(c.icon_svg);
  return uri ? `<img src="${attr(uri)}" alt="">` : '<span>SVG</span>';
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
        <span class="pill ${s.activo && s.visible_web ? '' : 'off'}">${s.activo ? (s.visible_web ? 'Visible' : 'Oculto') : 'Inactivo'}</span></div>
        <div class="meta-row">
          <span class="meta price">${s.precio_desde && s.precio_pen != null ? 'Desde ' : ''}${esc(money(s.precio_pen))}</span>
          <span class="meta">${s.duracion_min ? Number(s.duracion_min) + ' min' : 'Duración no publicada'}</span>
          <span class="meta">${esc(r?.nombre || 'Sin recurso asignado')}</span>
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
  if (!box) return;
  const primary = $('brandPrimary').value || '#0b2e4f';
  const secondary = $('brandSecondary').value || '#1aa79d';
  const accent = $('brandAccent').value || '#d7ab33';
  const background = $('brandBackground').value || '#f4f7f8';
  box.style.setProperty('--preview-primary', primary);
  box.style.setProperty('--preview-secondary', secondary);
  box.style.setProperty('--preview-accent', accent);
  box.style.setProperty('--preview-bg', background);
}
async function saveBranding(e) {
  e.preventDefault();
  canWriteOrThrow();
  let logoUrl = state.branding?.logo_url || null;
  let logoPath = state.branding?.logo_path || null;
  const file = $('brandLogoFile').files?.[0] || null;
  if (file) {
    if (file.size > 3145728) throw new Error('El logo supera el máximo de 3 MB.');
    if (!['image/png','image/jpeg','image/webp'].includes(file.type)) throw new Error('Usa un logo PNG, JPG o WebP.');
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const newPath = 'dr-olano/logo-' + Date.now() + '.' + ext;
    const { error: uploadErr } = await sb.storage.from('business-branding').upload(newPath, file, { cacheControl:'3600', upsert:false });
    if (uploadErr) throw uploadErr;
    const { data: publicData } = sb.storage.from('business-branding').getPublicUrl(newPath);
    logoUrl = publicData?.publicUrl || null;
    if (!logoUrl) throw new Error('No se pudo obtener la URL pública del logo.');
    const oldPath = logoPath;
    logoPath = newPath;
    if (oldPath && oldPath !== newPath) {
      sb.storage.from('business-branding').remove([oldPath]).catch(() => {});
    }
  }
  const payload = {
    negocio_id: state.business.id,
    logo_url: logoUrl,
    logo_path: logoPath,
    color_primary: $('brandPrimary').value,
    color_secondary: $('brandSecondary').value,
    color_accent: $('brandAccent').value,
    color_background: $('brandBackground').value,
    updated_at: new Date().toISOString()
  };
  const { error } = await sb.from('web_branding').upsert(payload, { onConflict:'negocio_id' });
  if (error) throw error;
  $('brandLogoFile').value = '';
  await afterWrite('Marca guardada. La web pública ya puede leer el nuevo logo y colores.');
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
  $('categoryForm').hidden=true; $('categoryFormEmpty').hidden=false; updateCategoryPreview();
}
function openCategory(id = '') {
  const c = id ? state.categories.find((x) => x.id === id) : null;
  $('categoryId').value=c?.id||''; $('categoryName').value=c?.nombre||''; $('categorySlug').value=c?.slug||''; $('categoryDescription').value=c?.descripcion||'';
  $('categorySvg').value=c?.icon_svg||''; $('categoryOrder').value=c?.orden??0; $('categoryFeatured').checked=c?.destacada_web===true; $('categoryActive').checked=c ? c.activo===true : true;
  if($('categoryIconPreset')){
    const match=Object.entries(ICON_PRESETS).find(([,svg])=>svg===$('categorySvg').value);
    $('categoryIconPreset').value=match?.[0]||'';
  }
  categorySlugTouched=Boolean(c); $('categoryForm').hidden=false; $('categoryFormEmpty').hidden=true; updateCategoryPreview(); $('categoryName').focus();
}
function updateCategoryPreview() {
  const box=$('categoryIconPreview'), uri=svgDataUri($('categorySvg').value);
  box.innerHTML = uri ? `<img src="${attr(uri)}" alt="Vista previa del icono">` : 'SVG';
  box.className = 'icon-preview' + (uri ? '' : ' empty');
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
  const payload={negocio_id:state.business.id,nombre:$('categoryName').value.trim(),slug:slugify($('categorySlug').value),descripcion:$('categoryDescription').value.trim()||null,icon_svg:checked.value,orden:intOr($('categoryOrder').value,0),destacada_web:$('categoryFeatured').checked,activo:$('categoryActive').checked};
  if(!payload.nombre||!payload.slug) throw new Error('Nombre y slug son obligatorios.');
  const q=id?sb.from('servicio_categorias').update(payload).eq('id',id).eq('negocio_id',state.business.id):sb.from('servicio_categorias').insert(payload);
  const {error}=await q; if(error) throw error; resetCategoryForm(); await afterWrite('Categoría guardada.');
}
async function saveService(e) {
  e.preventDefault(); canWriteOrThrow();
  const id=$('serviceId').value, nombre=$('serviceName').value.trim(), categoria_id=$('serviceCategory').value, recurso_id=$('serviceResource').value;
  const weekdays=[...$('serviceWeekdays').querySelectorAll('input:checked')].map((x)=>Number(x.value));
  if(!nombre||!categoria_id) throw new Error('Nombre y categoría son obligatorios.');
  if(!recurso_id) throw new Error('Asigna un recurso de agenda para este servicio.');
  if($('serviceVisible').checked && weekdays.length===0) throw new Error('Elige al menos un día disponible para un servicio visible.');
  const resource=resourceById(recurso_id); if(!resource?.activo) throw new Error('El recurso seleccionado debe estar activo.');
  const payload={
    negocio_id:state.business.id,nombre,categoria_id,descripcion_web:$('serviceDescription').value.trim()||null,
    precio_pen:numberOrNull($('servicePricePen').value),precio_desde:$('servicePriceFrom').checked,duracion_min:numberOrNull($('serviceDuration').value),
    visible_web:$('serviceVisible').checked,activo:$('serviceActive').checked,orden_web:intOr($('serviceOrder').value,0),
    dias_semana_disponibles:weekdays
  };
  let serviceId=id;
  if(id){
    const {error}=await sb.from('servicios').update(payload).eq('id',id).eq('negocio_id',state.business.id); if(error) throw error;
  }else{
    const code=uniqueServiceCode(nombre);
    const {data,error}=await sb.from('servicios').insert({...payload,codigo_web:code,codigo_externo:code,requiere_consulta_previa:false}).select('id').single();
    if(error) throw error; serviceId=data.id;
  }
  const {error:linkErr}=await sb.from('servicios_recursos').upsert(
    {negocio_id:state.business.id,servicio_id:serviceId,recurso_id},
    {onConflict:'negocio_id,servicio_id,recurso_id'}
  ); if(linkErr) throw linkErr;
  const {error:delErr}=await sb.from('servicios_recursos').delete()
    .eq('negocio_id',state.business.id).eq('servicio_id',serviceId).neq('recurso_id',recurso_id);
  if(delErr) throw delErr;
  resetServiceForm(); await afterWrite('Servicio y asignación guardados.');
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
  }));
  $('refreshAll').addEventListener('click',()=>guard(async()=>{await loadAll({publicCheck:true});setStatus('Datos actualizados.','ok');}));
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
  $('newServiceBtn').addEventListener('click',()=>openService()); $('cancelServiceBtn').addEventListener('click',resetServiceForm);
  $('serviceForm').addEventListener('submit',(e)=>guard(()=>saveService(e)));
  $('serviceSearch').addEventListener('input',renderServices); $('serviceCategoryFilter').addEventListener('change',renderServices);
  $('newPromotionBtn').addEventListener('click',()=>openPromotion()); $('cancelPromotionBtn').addEventListener('click',resetPromotionForm);
  $('promotionForm').addEventListener('submit',(e)=>guard(()=>savePromotion(e)));
  $('brandingForm').addEventListener('submit',(e)=>guard(()=>saveBranding(e)));
  ['brandPrimary','brandSecondary','brandAccent','brandBackground'].forEach((id)=>$(id).addEventListener('input',updateBrandPreview));
  $('brandLogoFile').addEventListener('change',()=>{
    const file=$('brandLogoFile').files?.[0];
    if(!file)return renderBranding();
    const url=URL.createObjectURL(file);
    $('brandLogoPreview').innerHTML='<img src="'+attr(url)+'" alt="Vista previa">';
    $('brandPreviewLogo').innerHTML='<img src="'+attr(url)+'" alt="">';
  });
  $('brandDefaultsBtn').addEventListener('click',()=>{
    $('brandPrimary').value='#0b2e4f'; $('brandSecondary').value='#1aa79d';
    $('brandAccent').value='#d7ab33'; $('brandBackground').value='#f4f7f8';
    updateBrandPreview();
  });
  $('promotionScope').addEventListener('change',()=>{updatePromotionScope();updatePromotionPreview();});
  ['promotionTitle','promotionMessage','promotionCta','promotionDiscount','promotionCountdown'].forEach((id)=>$(id).addEventListener('input',updatePromotionPreview));
}
async function guard(fn) {
  try{setStatus('Guardando…','info');await fn();}catch(err){console.error(err);setStatus(err?.message||String(err),'error');}
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