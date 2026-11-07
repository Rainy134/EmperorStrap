// --- flag catalog: key, tags[], type (bool/num), default value shown when added from preset ---
const FLAG_DEFS = [
  { key: 'DFIntConnectionMTUSize', tags: ['network'], type: 'num', def: 1400 },
  { key: 'DFIntRakNetResendTimeoutMS', tags: ['network'], type: 'num', def: 200 },
  { key: 'DFIntRakNetResendBufferArrayLength', tags: ['network'], type: 'num', def: 64 },
  { key: 'DFIntNetworkPrediction', tags: ['network'], type: 'num', def: 0 },
  { key: 'DFIntNetworkLatencyTolerance', tags: ['network'], type: 'num', def: 0 },

  { key: 'FFlagDisablePostFx', tags: ['graphics'], type: 'bool', def: true },
  { key: 'FFlagDisableBloom', tags: ['graphics'], type: 'bool', def: true },
  { key: 'FFlagDisableShadows', tags: ['graphics'], type: 'bool', def: true },
  { key: 'FFlagDisableDepthOfField', tags: ['graphics'], type: 'bool', def: true },
  { key: 'FFlagDisableGlobalShadows', tags: ['graphics'], type: 'bool', def: true },
  { key: 'FFlagEnableReducedLatency', tags: ['performance'], type: 'bool', def: true },
  { key: 'FFlagFastGPULightCulling3', tags: ['graphics', 'performance'], type: 'bool', def: true },
  { key: 'FFlagRenderFixFog', tags: ['graphics', 'fix'], type: 'bool', def: true },
  { key: 'FFlagRenderOptimizedShadows', tags: ['graphics', 'performance'], type: 'bool', def: true },
  { key: 'DFIntCSGLevelOfDetailSwitchingDistance', tags: ['graphics', 'lod'], type: 'num', def: 0 },
  { key: 'DFIntCSGLevelOfDetailSwitchingDistanceL12', tags: ['graphics', 'lod'], type: 'num', def: 0 },
  { key: 'DFIntCSGLevelOfDetailSwitchingDistanceL23', tags: ['graphics', 'lod'], type: 'num', def: 0 },
  { key: 'DFIntCSGLevelOfDetailSwitchingDistanceL34', tags: ['graphics', 'lod'], type: 'num', def: 0 },
  { key: 'FIntDebugForceMSAASamples', tags: ['graphics'], type: 'num', def: 0 },
  { key: 'DFIntTargetTimeDelayFacctorTenths', tags: ['performance'], type: 'num', def: 10 },
  { key: 'FIntFRMMaxGrassDistance', tags: ['graphics', 'performance'], type: 'num', def: 0 },
  { key: 'FIntFRMMinGrassDistance', tags: ['graphics', 'performance'], type: 'num', def: 0 },

  { key: 'DFIntPhysicsStepsPerFrame', tags: ['performance'], type: 'num', def: 1 },
  { key: 'DFIntGCJobFrequencyMs', tags: ['performance'], type: 'num', def: 250 },
  { key: 'FFlagLuaAppEnableLowMemoryMode', tags: ['performance'], type: 'bool', def: true },
  { key: 'DFIntDebugFRMQualityLevelOverride', tags: ['performance', 'fix'], type: 'num', def: 0 },

  { key: 'FFlagHandleAltEnterFullscreenManually', tags: ['misc'], type: 'bool', def: true },
  { key: 'DFFlagDisableDPIScale', tags: ['misc', 'fix'], type: 'bool', def: true },
  { key: 'DFFlagDebugPauseVoxelizer', tags: ['fix'], type: 'bool', def: false },
];

const TAG_LABEL = { graphics: 'Graphics', performance: 'İllegal', network: 'Network', fix: 'Fix', lod: 'LOD', misc: 'Misc', unknown: 'Unknown' };

function flagDef(key) { return FLAG_DEFS.find(f => f.key === key) || null; }

let state = {
  page: 'dashboard',
  versionDir: null,
  versions: [],
  flags: {},          // key -> value, written to ClientAppSettings.json when enabled
  disabled: new Set(), // keys present but unchecked (kept, not written)
  rowOrder: [],        // display order of keys currently in the table
  selected: new Set(), // keys selected for bulk delete
  showPreset: false,
  search: '',
  mods: [],
};

// --- nav ---
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => switchPage(btn.dataset.page));
});

function switchPage(page) {
  state.page = page;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === `page-${page}`));
  if (page === 'mods') loadMods();
  if (page === 'optimizer') optRender();
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// =================== I18N (TR / EN / ES) ===================
const I18N = {
  en: {
    'Dashboard': 'Dashboard', 'FastFlags': 'FastFlags', 'Optimizer': 'Optimizer', 'Mods': 'Mods', 'Customize': 'Customize',
    'Made by Emperor (Yildiray)': 'Made by Emperor (Yildiray)',
    'Roblox durumu ve hızlı başlatma': 'Roblox status and quick launch',
    'Roblox aranıyor...': 'Searching for Roblox...', 'Roblox bulunamadı': 'Roblox not found',
    'Yüklü bir Roblox kurulumu tespit edilemedi.': 'No Roblox installation detected.',
    'Roblox hazır': 'Roblox ready', 'Oynamaya hazır': 'Ready to play', 'kontrol ediliyor...': 'checking...',
    'Versiyon': 'Version', 'Aktif FastFlag': 'Active FastFlags', 'Oynat': 'Play', 'Yeniden başlatılıyor...': 'Restarting...',
    'Yeni ekle': '+ New', 'Seçileni sil': 'Delete selected', 'Tümünü sil': 'Delete all', 'Profiller': 'Profiles',
    'Hazır flagleri göster': 'Show preset flags', 'Hazır flagleri gizle': 'Hide preset flags',
    'Eklenen flag:': 'Flags added:', 'Bloat:': 'Bloat:',
    'JSON dışa aktar': 'Export JSON', 'Flagleri kopyala': 'Copy flags',
    'Görsel optimizasyon ve Low MS presetleri — tek tıkla flag olarak uygulanır': 'Visual optimization and Low MS presets — applied as flags in one click',
    'Görsel Optimizasyon': 'Visual Optimization', 'Low MS Optimizer': 'Low MS Optimizer',
    'Seçilileri Uygula': 'Apply selected', 'Sıfırla': 'Reset', 'Uygula ve Yeniden Başlat': 'Apply & Restart',
    'Modlar': 'Mods', 'Mod klasörünü yönet': 'Manage the mods folder',
    'Mod dosyalarını aşağıdaki klasöre at, EmperorStrap başlatırken otomatik okuyacak.': 'Put mod files in the folder below; EmperorStrap reads them automatically at start.',
    'Klasörü Aç': 'Open folder',
    'Font, imleç ve ShiftLock — uygulama arayüzüne uygulanır': 'Font, cursor and ShiftLock — applied to the app UI',
    'Font Değiştirme': 'Font Change', 'kendi fontunu ekleyebilirsin': 'add your own font',
    'Font': 'Font', 'Uygulama arayüzünün yazı tipi': 'App UI font',
    'Font İçe Aktar (.ttf/.otf)': 'Import Font (.ttf/.otf)',
    "Roblox'a Uygula": 'Apply to Roblox', 'Roblox Fontunu Geri Al': 'Restore Roblox Font',
    'İmleç Değiştirme (Mouse)': 'Cursor Change (Mouse)', 'Roblox İkonları': 'Roblox Icons',
    '2008 karton · 2013 ok · modern': '2008 carton · 2013 arrow · modern',
    'İmleç İçe Aktar': 'Import Cursor', 'İmleci burada dene →': 'Try the cursor here →',
    'ShiftLock Flag Preset': 'ShiftLock Flag Preset',
    'Destekleyen oyunlarda kamera kilidi için flag başlatır': 'Sends the camera-lock flag for supporting games',
    'ShiftLock, oyunda kamera kilidi özelliği gibidir; desteklemeyen oyunlarda hiçbir şey olmaz.': 'ShiftLock is in-game camera lock; unsupported games ignore it.',
    'Test modu': 'Test mode', 'Kapat': 'Close', 'Kaydet': 'Save', 'Kaydet ve Başlat': 'Save & Launch',
    'Ayarlar': 'Settings', 'Uygulama tercihleri': 'App preferences',
    'Arama': 'Search', 'Ara...': 'Search...', 'Profiller': 'Profiles',
    'Simge durumuna küçült': 'Minimize',
  },
  es: {
    'Dashboard': 'Panel', 'FastFlags': 'FastFlags', 'Optimizer': 'Optimizador', 'Mods': 'Mods', 'Customize': 'Personalizar',
    'Made by Emperor (Yildiray)': 'Hecho por Emperor (Yildiray)',
    'Roblox durumu ve hızlı başlatma': 'Estado de Roblox e inicio rápido',
    'Roblox aranıyor...': 'Buscando Roblox...', 'Roblox bulunamadı': 'Roblox no encontrado',
    'Yüklü bir Roblox kurulumu tespit edilemedi.': 'No se detectó instalación de Roblox.',
    'Roblox hazır': 'Roblox listo', 'Oynamaya hazır': 'Listo para jugar', 'kontrol ediliyor...': 'comprobando...',
    'Versiyon': 'Versión', 'Aktif FastFlag': 'FastFlags activos', 'Oynat': 'Jugar', 'Yeniden başlatılıyor...': 'Reiniciando...',
    'Yeni ekle': '+ Nuevo', 'Seçileni sil': 'Eliminar seleccionados', 'Tümünü sil': 'Eliminar todo', 'Profiller': 'Perfiles',
    'Hazır flagleri göster': 'Mostrar flags predefinidos', 'Hazır flagleri gizle': 'Ocultar flags predefinidos',
    'Eklenen flag:': 'Flags añadidos:', 'Bloat:': 'Bloat:',
    'JSON dışa aktar': 'Exportar JSON', 'Flagleri kopyala': 'Copiar flags',
    'Görsel optimizasyon ve Low MS presetleri — tek tıkla flag olarak uygulanır': 'Optimización visual y presets de Low MS — se aplican como flags en un clic',
    'Görsel Optimizasyon': 'Optimización visual', 'Seçilileri Uygula': 'Aplicar seleccionados', 'Sıfırla': 'Restablecer', 'Uygula ve Yeniden Başlat': 'Aplicar y reiniciar',
    'Modlar': 'Mods', 'Mod klasörünü yönet': 'Gestionar carpeta de mods',
    'Mod dosyalarını aşağıdaki klasöre at, EmperorStrap başlatırken otomatik okuyacak.': 'Pon los archivos de mod en la carpeta de abajo; EmperorStrap los lee automáticamente al iniciar.',
    'Klasörü Aç': 'Abrir carpeta',
    'Font, imleç ve ShiftLock — uygulama arayüzüne uygulanır': 'Fuente, cursor y ShiftLock — aplicados a la interfaz',
    'Font Değiştirme': 'Cambiar fuente', 'kendi fontunu ekleyebilirsin': 'añade tu propia fuente',
    'Font': 'Fuente', 'Uygulama arayüzünün yazı tipi': 'Fuente de la interfaz',
    'Font İçe Aktar (.ttf/.otf)': 'Importar fuente (.ttf/.otf)',
    "Roblox'a Uygula": 'Aplicar a Roblox', 'Roblox Fontunu Geri Al': 'Restaurar fuente de Roblox',
    'İmleç Değiştirme (Mouse)': 'Cambiar cursor (ratón)', 'Roblox İkonları': 'Iconos de Roblox',
    '2008 karton · 2013 ok · modern': 'cartón 2008 · flecha 2013 · moderno',
    'İmleç İçe Aktar': 'Importar cursor', 'İmleci burada dene →': 'Prueba el cursor aquí →',
    'ShiftLock Flag Preset': 'Preset de flag ShiftLock',
    'Destekleyen oyunlarda kamera kilidi için flag başlatır': 'Envía el flag de bloqueo de cámara para juegos compatibles',
    'ShiftLock, oyunda kamera kilidi özelliği gibidir; desteklemeyen oyunlarda hiçbir şey olmaz.': 'ShiftLock es bloqueo de cámara en el juego; los juegos sin soporte lo ignoran.',
    'Test modu': 'Modo de prueba', 'Kapat': 'Cerrar', 'Kaydet': 'Guardar', 'Kaydet ve Başlat': 'Guardar y lanzar',
    'Ayarlar': 'Ajustes', 'Uygulama tercihleri': 'Preferencias de la app',
    'Ara...': 'Buscar...',
  }
};

const origMap = new WeakMap();
function applyLang(lang) {
  localStorage.setItem('emperorstrap.lang', lang);
  const map = I18N[lang] || I18N.en;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) {
    if (!origMap.has(n)) origMap.set(n, n.textContent);
    const tr = origMap.get(n);
    const key = tr.trim();
    n.textContent = (lang === 'tr') ? tr : (map[key] !== undefined ? n.textContent.replace(key, map[key]) : tr);
  }
  document.querySelectorAll('input[placeholder]').forEach(el => {
    if (!el.dataset.trPh) el.dataset.trPh = el.placeholder;
    const k = el.dataset.trPh.trim();
    if (lang !== 'tr' && map[k]) el.placeholder = map[k];
    else if (lang === 'tr') el.placeholder = el.dataset.trPh;
  });
}

document.getElementById('langSelect').addEventListener('change', (e) => {
  applyLang(e.target.value);
  toast(e.target.value === 'tr' ? 'Dil: Türkçe' : e.target.value === 'en' ? 'Language: English' : 'Idioma: Español');
});

// --- dashboard / roblox detect ---
async function initDashboard() {
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  const title = document.getElementById('dashTitle');
  const sub = document.getElementById('dashSub');
  const playBtn = document.getElementById('playBtn');

  const res = await window.api.roblox.detect();
  if (!res.found || !res.versions || res.versions.length === 0) {
    dot.className = 'status-dot bad';
    text.textContent = 'Roblox bulunamadı';
    title.textContent = 'Roblox bulunamadı';
    sub.textContent = 'Yüklü bir Roblox kurulumu tespit edilemedi.';
    return;
  }

  // en yeni sürümü seç (exe mtime'a göre sıralı gelir)
  const newest = res.versions.find(v => v.hasExe) || res.versions[0];
  state.versionDir = newest.full;
  state.versions = res.versions;

  dot.className = 'status-dot ok';
  text.textContent = 'Roblox hazır';
  title.textContent = 'Oynamaya hazır';
  sub.textContent = newest.name;
  document.getElementById('statVersion').textContent = newest.name;

  playBtn.disabled = false;

  await loadFlagsFromDisk();
}

document.getElementById('playBtn').addEventListener('click', async () => {
  if (!state.versionDir) return;
  const playBtn = document.getElementById('playBtn');
  playBtn.disabled = true;
  playBtn.textContent = 'Yeniden başlatılıyor...';
  const r = await window.api.roblox.restart(state.versionDir);
  playBtn.disabled = false;
  playBtn.textContent = 'Oynat';
  toast(r.ok ? 'Roblox kapatılıp yeniden başlatıldı' : `Hata: ${r.error}`);
});

// =================== FASTFLAGS TABLE ===================

function activeFlagsOutput() {
  const out = {};
  for (const k of state.rowOrder) {
    if (!state.disabled.has(k)) out[k] = state.flags[k];
  }
  return out;
}

function coerceValue(raw) {
  if (raw === 'true' || raw === 'True') return true;
  if (raw === 'false' || raw === 'False') return false;
  if (raw !== '' && !isNaN(Number(raw))) return Number(raw);
  return raw;
}

function displayValue(v) {
  if (v === 'True') return 'true';
  if (v === 'False') return 'false';
  if (typeof v === 'string' && v !== '' && !isNaN(Number(v))) return v.trim();
  return typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
}

function tagsForRow(key) {
  const def = flagDef(key);
  if (!def) return ['unknown'];
  return def.tags;
}

function renderFlagTable() {
  const tbody = document.getElementById('ffTbody');
  tbody.innerHTML = '';

  const q = state.search.trim().toLowerCase();
  let rows = state.rowOrder.filter(k => !q || k.toLowerCase().includes(q));

  // preset suggestions: catalog entries not yet in rowOrder, shown dimmed when toggled on
  let presetRows = [];
  if (state.showPreset) {
    presetRows = FLAG_DEFS
      .filter(f => !state.rowOrder.includes(f.key))
      .filter(f => !q || f.key.toLowerCase().includes(q));
  }

  rows.forEach(key => tbody.appendChild(buildRow(key, false)));
  presetRows.forEach(f => tbody.appendChild(buildRow(f.key, true)));

  if (rows.length === 0 && presetRows.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="5" style="text-align:center;color:var(--text-dim);padding:22px">flag yok — "Yeni ekle" veya "Hazır flagleri göster"</td>`;
    tbody.appendChild(tr);
  }

  updateStats();
}

function buildRow(key, isPreset) {
  const tr = document.createElement('tr');
  if (isPreset) tr.classList.add('dimmed');
  if (state.selected.has(key)) tr.classList.add('selected');

  // enabled checkbox
  const tdCheck = document.createElement('td');
  const check = document.createElement('input');
  check.type = 'checkbox';
  check.checked = isPreset ? false : !state.disabled.has(key);
  check.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isPreset) {
      addFlagFromPreset(key);
    } else {
      if (check.checked) state.disabled.delete(key); else state.disabled.add(key);
      updateStats();
    }
  });
  tdCheck.appendChild(check);
  tr.appendChild(tdCheck);

  // tags
  const tdTags = document.createElement('td');
  tagsForRow(key).forEach(t => {
    const span = document.createElement('span');
    span.className = `ff-tag tag-${t}`;
    span.textContent = TAG_LABEL[t] || t;
    tdTags.appendChild(span);
  });
  tr.appendChild(tdTags);

  // name
  const tdName = document.createElement('td');
  tdName.className = 'ff-name';
  tdName.textContent = key;
  tr.appendChild(tdName);

  // value
  const tdVal = document.createElement('td');
  const valInput = document.createElement('input');
  valInput.className = 'ff-value-input';
  const def = flagDef(key);
  const currentVal = isPreset ? def.def : state.flags[key];
  valInput.value = displayValue(currentVal);
  valInput.title = 'true / false / sayı / metin';
  valInput.disabled = isPreset;
  valInput.addEventListener('click', (e) => e.stopPropagation());
  valInput.addEventListener('change', () => {
    state.flags[key] = coerceValue(valInput.value);
  });
  tdVal.appendChild(valInput);
  tr.appendChild(tdVal);

  // delete
  const tdDel = document.createElement('td');
  if (!isPreset) {
    const del = document.createElement('button');
    del.className = 'ff-row-del';
    del.textContent = '✕';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFlag(key);
    });
    tdDel.appendChild(del);
  }
  tr.appendChild(tdDel);

  // row select (click row body, not inputs) for bulk delete
  if (!isPreset) {
    tr.addEventListener('click', () => {
      if (state.selected.has(key)) state.selected.delete(key); else state.selected.add(key);
      tr.classList.toggle('selected');
    });
  }

  return tr;
}

function addFlagFromPreset(key) {
  const def = flagDef(key);
  if (!def) return;
  state.flags[key] = def.def;
  state.disabled.delete(key);
  if (!state.rowOrder.includes(key)) state.rowOrder.push(key);
  renderFlagTable();
}

function removeFlag(key) {
  delete state.flags[key];
  state.disabled.delete(key);
  state.selected.delete(key);
  state.rowOrder = state.rowOrder.filter(k => k !== key);
  renderFlagTable();
}

function updateStats() {
  const enabled = state.rowOrder.filter(k => !state.disabled.has(k)).length;
  document.getElementById('statAdded').textContent = enabled;
  // "bloat" — ağırlık metriği yok, katalogdaki toplam bilinen flag sayısına oranla kaba bir yoğunluk göstergesi
  const bloat = FLAG_DEFS.length ? Math.round((enabled / FLAG_DEFS.length) * 100) : 0;
  document.getElementById('statBloat').textContent = `${bloat}%`;
}

function updateFlagStat() {
  const el = document.getElementById('statFlags');
  if (el) el.textContent = String(Object.keys(state.flags || {}).length);
}

async function loadFlagsFromDisk() {
  if (!state.versionDir) return;
  const res = await window.api.fastflags.read(state.versionDir);
  state.flags = res.data || {};
  state.disabled = new Set();
  state.rowOrder = Object.keys(state.flags);
  state.selected = new Set();
  renderFlagTable();
  updateFlagStat();
}

document.getElementById('ffSearch').addEventListener('input', (e) => {
  state.search = e.target.value;
  renderFlagTable();
});

document.getElementById('btnShowPreset').addEventListener('click', () => {
  state.showPreset = !state.showPreset;
  document.getElementById('btnShowPreset').textContent = state.showPreset ? 'Hazır flagleri gizle' : 'Hazır flagleri göster';
  renderFlagTable();
});

document.getElementById('btnAddNew').addEventListener('click', () => {
  const key = prompt('Flag adı:');
  if (!key) return;
  const valRaw = prompt('Değer (true / false / sayı / metin):', 'true');
  state.flags[key] = coerceValue(valRaw ?? 'true');
  if (!state.rowOrder.includes(key)) state.rowOrder.push(key);
  renderFlagTable();
});

document.getElementById('btnDeleteSelected').addEventListener('click', () => {
  if (state.selected.size === 0) { toast('Önce satır seç'); return; }
  state.selected.forEach(k => { delete state.flags[k]; state.disabled.delete(k); });
  state.rowOrder = state.rowOrder.filter(k => !state.selected.has(k));
  state.selected.clear();
  renderFlagTable();
});

document.getElementById('btnDeleteAll').addEventListener('click', () => {
  if (state.rowOrder.length === 0) return;
  if (!confirm(`${state.rowOrder.length} flag silinecek, emin misin?`)) return;
  state.flags = {};
  state.disabled = new Set();
  state.rowOrder = [];
  state.selected.clear();
  renderFlagTable();
});

document.getElementById('btnExportJson').addEventListener('click', async () => {
  const r = await window.api.fastflags.exportJson(activeFlagsOutput());
  toast(r.ok ? `Dışa aktarıldı: ${r.filePath}` : 'İptal edildi');
});

document.getElementById('btnCopyFlags').addEventListener('click', async () => {
  await navigator.clipboard.writeText(JSON.stringify(activeFlagsOutput(), null, 2));
  toast('Panoya kopyalandı');
});

async function ensureVersion() {
  if (state.versionDir) return true;
  toast('Roblox aranıyor...');
  await initDashboard();
  return !!state.versionDir;
}

async function saveFlags() {
  const testMode = document.getElementById('testModeToggle');
  if (testMode && testMode.checked) { toast('Test modu açık — kaydetme engellendi'); return false; }
  if (!await ensureVersion()) { toast('Roblox bulunamadı'); return false; }
  const r = await window.api.fastflags.write(state.versionDir, activeFlagsOutput());
  if (r.ok) { state.flags = activeFlagsOutput(); updateFlagStat(); }
  toast(r.ok ? `FastFlags kaydedildi (${r.count} flag)` : `Yazma hatası: ${r.error || ''}`);
  return r.ok;
}

// =================== bottom action bar ===================
document.getElementById('btnSaveOnly').addEventListener('click', saveFlags);

document.getElementById('btnSaveLaunch').addEventListener('click', async () => {
  const ok = await saveFlags();
  if (!ok || !state.versionDir) return;
  const btn = document.getElementById('btnSaveLaunch');
  btn.disabled = true;
  btn.textContent = 'Roblox yeniden başlatılıyor...';
  const r = await window.api.roblox.restart(state.versionDir);
  btn.disabled = false;
  btn.textContent = 'Kaydet ve Başlat';
  toast(r.ok ? 'Kaydedildi — Roblox kapatılıp yeniden açıldı' : `Hata: ${r.error}`);
});

document.getElementById('btnCloseApp').addEventListener('click', () => window.api.win.close());

document.getElementById('testModeToggle').addEventListener('change', (e) => {
  // test modu: kaydetmeden önizleme — flagleri diske yazmadan sadece göster
  toast(e.target.checked ? 'Test modu açık — kayıt diske yazılmıyor' : 'Test modu kapalı');
});

// =================== profiles modal ===================
const profileModal = document.getElementById('profileModal');

document.getElementById('btnProfiles').addEventListener('click', async () => {
  profileModal.classList.add('show');
  await renderProfileList();
});
document.getElementById('profileCloseBtn').addEventListener('click', () => profileModal.classList.remove('show'));
profileModal.addEventListener('click', (e) => { if (e.target === profileModal) profileModal.classList.remove('show'); });

async function renderProfileList() {
  const names = await window.api.profiles.list();
  const wrap = document.getElementById('profileList');
  wrap.innerHTML = '';
  if (names.length === 0) {
    wrap.innerHTML = '<div class="profile-empty">kayıtlı profil yok</div>';
    return;
  }
  names.forEach(name => {
    const row = document.createElement('div');
    row.className = 'profile-item';
    row.innerHTML = `<span>${name}</span>`;
    const btns = document.createElement('div');
    btns.className = 'profile-item-btns';

    const loadBtn = document.createElement('button');
    loadBtn.textContent = 'YÜKLE';
    loadBtn.addEventListener('click', async () => {
      const res = await window.api.profiles.load(name);
      if (!res.ok) { toast('Profil okunamadı'); return; }
      state.flags = res.data || {};
      state.disabled = new Set();
      state.rowOrder = Object.keys(state.flags);
      state.selected = new Set();
      renderFlagTable();
      profileModal.classList.remove('show');
      toast(`"${name}" yüklendi`);
    });

    const delBtn = document.createElement('button');
    delBtn.textContent = 'SİL';
    delBtn.addEventListener('click', async () => {
      await window.api.profiles.delete(name);
      renderProfileList();
    });

    btns.appendChild(loadBtn);
    btns.appendChild(delBtn);
    row.appendChild(btns);
    wrap.appendChild(row);
  });
}

document.getElementById('profileSaveBtn').addEventListener('click', async () => {
  const name = document.getElementById('profileNameInput').value.trim();
  if (!name) return;
  await window.api.profiles.save(name, activeFlagsOutput());
  document.getElementById('profileNameInput').value = '';
  toast(`"${name}" kaydedildi`);
  renderProfileList();
});

// --- mods ---
async function loadMods() {
  const list = await window.api.mods.list();
  const wrap = document.getElementById('modsList');
  wrap.innerHTML = '';
  if (list.length === 0) {
    wrap.innerHTML = '<div class="mods-empty">klasör boş</div>';
    return;
  }
  list.forEach(m => {
    const el = document.createElement('div');
    el.className = 'mod-item';
    el.textContent = m;
    wrap.appendChild(el);
  });
}

document.getElementById('openModsBtn').addEventListener('click', () => {
  window.api.mods.openFolder();
});

// --- ShiftLock flag preset ---
document.getElementById('shiftApply').addEventListener('click', async () => {
  if (!await ensureVersion()) { toast('Roblox bulunamadı'); return; }
  const on = document.getElementById('shiftToggle').checked;
  const res = await window.api.fastflags.read(state.versionDir);
  const flags = { ...(res.data || {}) };
  if (on) {
    flags.FFlagEnableShiftLock = true;
    flags.FIntShiftLockBind = 17;
  } else {
    delete flags.FFlagEnableShiftLock;
    delete flags.FIntShiftLockBind;
  }
  const r = await window.api.injector.apply(state.versionDir, flags);
  if (!r.ok) { toast('Hata: ' + r.error); return; }
  await loadFlagsFromDisk();
  toast('ShiftLock flagi yazıldı — Roblox yeniden başlatılıyor...');
  const rr = await window.api.roblox.restart(state.versionDir);
  toast(rr.ok ? 'Roblox yenilendi (destekleyen oyunlarda ShiftLock)' : 'Restart hatası: ' + rr.error);
});

// =================== OPTIMIZER ===================
const OPT_DEFS = [
  // --- görsel ---
  { id: 'graySky', group: 'graphics', name: 'Gray Sky', desc: 'FFlagDebugSkyGray — gri gökyüzü', flags: { FFlagDebugSkyGray: true } },
  { id: 'noShadows', group: 'graphics', name: 'Gölgeleri Kapat', desc: 'FFlagDisableShadows', flags: { FFlagDisableShadows: true, FFlagDisableGlobalShadows: true } },
  { id: 'noBloom', group: 'graphics', name: 'Bloom Kapat', desc: 'FFlagDisableBloom', flags: { FFlagDisableBloom: true } },
  { id: 'noPostFx', group: 'graphics', name: 'PostFX Kapat', desc: 'FFlagDisablePostFx', flags: { FFlagDisablePostFx: true } },
  { id: 'noDof', group: 'graphics', name: 'Depth of Field Kapat', desc: 'FFlagDisableDepthOfField', flags: { FFlagDisableDepthOfField: true } },
  { id: 'noFog', group: 'graphics', name: 'Sisi Kaldır', desc: 'FFlagRenderFixFog', flags: { FFlagRenderFixFog: true } },
  { id: 'noGrass', group: 'graphics', name: 'Çimleri Kapat', desc: 'FIntFRMMaxGrassDistance = 0', flags: { FIntFRMMaxGrassDistance: 0, FIntFRMMinGrassDistance: 0 } },
  { id: 'flatLod', group: 'graphics', name: 'LOD Pop-in Kapat', desc: 'CSG LOD mesafeleri = 0', flags: { DFIntCSGLevelOfDetailSwitchingDistance: 0, DFIntCSGLevelOfDetailSwitchingDistanceL12: 0, DFIntCSGLevelOfDetailSwitchingDistanceL23: 0, DFIntCSGLevelOfDetailSwitchingDistanceL34: 0 } },

  // --- low ms ---
  { id: 'lowLatency', group: 'lowms', name: 'Low Latency Mode', desc: 'FFlagEnableReducedLatency', flags: { FFlagEnableReducedLatency: true } },
  { id: 'noNetPred', group: 'lowms', name: 'Network Prediction Kapat', desc: 'DFIntNetworkPrediction = 0', flags: { DFIntNetworkPrediction: 0 } },
  { id: 'latencyTol', group: 'lowms', name: 'Latency Tolerance = 0', desc: 'DFIntNetworkLatencyTolerance = 0', flags: { DFIntNetworkLatencyTolerance: 0 } },
  { id: 'smallMtu', group: 'lowms', name: 'Küçük MTU (1400)', desc: 'DFIntConnectionMTUSize = 1400', flags: { DFIntConnectionMTUSize: 1400 } },
  { id: 'fastCulling', group: 'lowms', name: 'Fast GPU Light Culling', desc: 'FFlagFastGPULightCulling3', flags: { FFlagFastGPULightCulling3: true } },
  { id: 'fpsCounter', group: 'lowms', name: 'FPS Sayacı', desc: 'FFlagDebugDisplayFPS', flags: { FFlagDebugDisplayFPS: true } },
  { id: 'fpsCap', group: 'lowms', name: 'FPS Cap Aç (240)', desc: 'DFIntTaskSchedulerTargetFps = 240', flags: { DFIntTaskSchedulerTargetFps: 240 } },
  { id: 'altEnter', group: 'lowms', name: 'Alt+Enter Fullscreen', desc: 'FFlagHandleAltEnterFullscreenManually', flags: { FFlagHandleAltEnterFullscreenManually: true } },
  { id: 'delayFactor', group: 'lowms', name: 'Delay Factor', desc: 'DFIntTargetTimeDelayFacctorTenths (0-20)', flags: { DFIntTargetTimeDelayFacctorTenths: 10 } },
];

const OPT_KEY = 'emperorstrap.optimizer.enabled';
let optEnabled = new Set();
let delayFactorVal = 10;

function optLoad() {
  try { optEnabled = new Set(JSON.parse(localStorage.getItem(OPT_KEY) || '[]')); }
  catch { optEnabled = new Set(); }
  const dfv = Number(localStorage.getItem('emperorstrap.delayFactor'));
  if (!isNaN(dfv) && dfv >= 0 && dfv <= 20) delayFactorVal = dfv;
}
function optSave() { localStorage.setItem(OPT_KEY, JSON.stringify([...optEnabled])); }

function optBuildCard(def) {
  const card = document.createElement('div');
  card.className = 'opt-card' + (optEnabled.has(def.id) ? ' on' : '');

  const left = document.createElement('div');
  const name = document.createElement('div');
  name.className = 'opt-name';
  name.textContent = def.name;
  const desc = document.createElement('div');
  desc.className = 'opt-desc';
  desc.textContent = def.desc;
  left.appendChild(name);
  left.appendChild(desc);

  const sw = document.createElement('label');
  sw.className = 'switch';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = optEnabled.has(def.id);
  cb.addEventListener('change', () => {
    if (cb.checked) optEnabled.add(def.id); else optEnabled.delete(def.id);
    card.classList.toggle('on', cb.checked);
    optSave();
  });
  const slider = document.createElement('span');
  slider.className = 'slider';
  sw.appendChild(cb);
  sw.appendChild(slider);

  card.appendChild(left);
  card.appendChild(sw);

  if (def.id === 'delayFactor') {
    const wrap = document.createElement('div');
    wrap.style.marginTop = '8px';
    const range = document.createElement('input');
    range.type = 'range';
    range.min = '0';
    range.max = '20';
    range.value = String(delayFactorVal);
    range.style.width = '100%';
    const lab = document.createElement('div');
    lab.className = 'opt-desc';
    lab.textContent = `Değer: ${delayFactorVal}`;
    range.addEventListener('input', () => {
      delayFactorVal = Number(range.value);
      lab.textContent = `Değer: ${delayFactorVal}`;
      localStorage.setItem('emperorstrap.delayFactor', String(delayFactorVal));
    });
    wrap.appendChild(range);
    wrap.appendChild(lab);
    card.appendChild(wrap);
  }
  return card;
}

function optRender() {
  const g = document.getElementById('optGraphics');
  const l = document.getElementById('optLowMs');
  if (!g || !l) return;
  g.innerHTML = '';
  l.innerHTML = '';
  OPT_DEFS.filter(d => d.group === 'graphics').forEach(d => g.appendChild(optBuildCard(d)));
  OPT_DEFS.filter(d => d.group === 'lowms').forEach(d => l.appendChild(optBuildCard(d)));
  optUpdateStatus();
}

function optUpdateStatus() {
  const el = document.getElementById('optStatus');
  if (el) el.textContent = `${optEnabled.size} preset seçili`;
}

async function optApplyFlow(restart) {
  if (!await ensureVersion()) { toast('Roblox bulunamadı'); return; }
  if (optEnabled.size === 0) { toast('Hiç preset seçilmedi'); return; }

  // mevcut flagleri koru, seçili presetleri ekle/çıkar
  const res = await window.api.fastflags.read(state.versionDir);
  const merged = { ...(res.data || {}) };

  for (const def of OPT_DEFS) {
    const on = optEnabled.has(def.id);
    const flags = def.id === 'delayFactor' ? { DFIntTargetTimeDelayFacctorTenths: delayFactorVal } : def.flags;
    for (const [k, v] of Object.entries(flags)) {
      if (on) merged[k] = v; else delete merged[k];
    }
  }

  const r = await window.api.injector.apply(state.versionDir, merged);
  if (!r.ok) { toast('Hata: ' + r.error); return; }
  await loadFlagsFromDisk();
  optUpdateStatus();

  if (restart) {
    const rr = await window.api.roblox.restart(state.versionDir);
    toast(rr.ok ? 'Optimize edildi — Roblox yenilendi' : 'Restart hatası: ' + rr.error);
  } else {
    toast(`Optimize edildi (${optEnabled.size} preset) — Roblox'u kapatıp yeniden aç`);
  }
}

document.getElementById('optApply').addEventListener('click', () => optApplyFlow(false));
document.getElementById('optApplyRestart').addEventListener('click', () => optApplyFlow(true));

document.getElementById('optReset').addEventListener('click', () => {
  optEnabled = new Set();
  optSave();
  optRender();
  toast('Optimizer sıfırlandı');
});

// --- boot ---
const savedLang = localStorage.getItem('emperorstrap.lang') || 'tr';
document.getElementById('langSelect').value = savedLang;
applyLang(savedLang);
renderFlagTable();
initDashboard();
optLoad();
optRender();
