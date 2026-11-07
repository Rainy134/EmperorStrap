const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
Menu.setApplicationMenu(null); // kills the default File/Edit/View/Window bar
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 640,
    minWidth: 760,
    minHeight: 520,
    title: 'EmperorStrap',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    frame: false, // custom titlebar — matches bloxstrap/voidstrap chrome-less look
    transparent: false,
    backgroundColor: '#0b0d12',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(createWindow);

// --- custom titlebar controls (frame:false needs these) ---
ipcMain.on('win:minimize', () => mainWindow.minimize());
ipcMain.on('win:close', () => mainWindow.close());
ipcMain.handle('win:isMaximized', () => mainWindow.isMaximized());
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// --- Roblox detection ---
function findRobloxDir() {
  const local = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const candidates = [
    path.join(local, 'Roblox', 'Versions'),
    path.join(local, 'RobloxPlayer', 'Versions')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

ipcMain.handle('roblox:detect', async () => {
  const dir = findRobloxDir();
  if (!dir) return { found: false };
  const list = [];
  for (const v of fs.readdirSync(dir)) {
    const vd = path.join(dir, v);
    let st;
    try { st = fs.statSync(vd); } catch { continue; }
    if (!st.isDirectory()) continue;
    const exe = path.join(vd, 'RobloxPlayerBeta.exe');
    const hasExe = fs.existsSync(exe);
    let mtime = st.mtimeMs;
    if (hasExe) { try { mtime = fs.statSync(exe).mtimeMs; } catch {} }
    list.push({ name: v, full: vd, mtime, hasExe });
  }
  // çalışan Roblox varsa onun klasörünü başa al (flag'ler aktif sürüme gider)
  try {
    const { execFileSync } = require('child_process');
    const out = execFileSync('powershell', ['-NoProfile', '-Command',
      "Get-Process RobloxPlayerBeta -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Path"],
      { encoding: 'utf8', timeout: 4000 }).trim();
    if (out) {
      const runningDir = path.dirname(out);
      const idx = list.findIndex(v => v.full === runningDir);
      if (idx >= 0) { const [r] = list.splice(idx, 1); list.unshift(r); }
    }
  } catch {}
  // en yeni sürüm önce (Roblox güncellemede yeni version-* klasörü açar)
  list.sort((a, b) => (a.full === list[0]?.full ? -1 : 0) - (b.full === list[0]?.full ? -1 : 0) || b.mtime - a.mtime);
  return { found: true, dir, versions: list };
});

ipcMain.handle('roblox:launch', async (event, versionDir) => {
  const { spawn } = require('child_process');
  const exe = path.join(versionDir, 'RobloxPlayerBeta.exe');
  if (!fs.existsSync(exe)) return { ok: false, error: 'RobloxPlayerBeta.exe not found' };
  spawn(exe, [], { detached: true, stdio: 'ignore' }).unref();
  return { ok: true };
});

ipcMain.handle('roblox:restart', async (event, versionDir) => {
  const { spawn, execFile } = require('child_process');
  const exe = path.join(versionDir, 'RobloxPlayerBeta.exe');
  if (!fs.existsSync(exe)) return { ok: false, error: 'RobloxPlayerBeta.exe not found' };
  // 1) Roblox'u zorla kapat
  await new Promise(res => execFile('taskkill', ['/F', '/IM', 'RobloxPlayerBeta.exe'], () => res()));
  // 2) tamamen kapanmasını bekle
  const isRunning = () => new Promise(res =>
    execFile('tasklist', ['/FI', 'IMAGENAME eq RobloxPlayerBeta.exe', '/FO', 'CSV', '/NH'], (err, out) =>
      res(!err && /RobloxPlayerBeta/i.test(out))));
  for (let i = 0; i < 30; i++) { if (!await isRunning()) break; await new Promise(r => setTimeout(r, 300)); }
  // 3) yeniden aç
  spawn(exe, [], { detached: true, stdio: 'ignore' }).unref();
  return { ok: true, restarted: true };
});

// --- FastFlags ---
ipcMain.handle('fastflags:read', async (event, versionDir) => {
  const f = path.join(versionDir, 'ClientSettings', 'ClientAppSettings.json');
  if (!fs.existsSync(f)) return { exists: false, data: {} };
  try { return { exists: true, data: JSON.parse(fs.readFileSync(f, 'utf8')) }; }
  catch (e) { return { exists: true, data: {}, error: e.message }; }
});

ipcMain.handle('fastflags:write', async (event, versionDir, data) => {
  const dir = path.join(versionDir, 'ClientSettings');
  fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, 'ClientAppSettings.json');
  // yedek al (üzerine yazma koruması)
  if (fs.existsSync(f)) { try { fs.copyFileSync(f, f + '.bak'); } catch {} }
  // Roblox string "True"/"0" yazar; biz gerçek bool/sayı yazarız
  const clean = {};
  for (const [k, v] of Object.entries(data || {})) {
    if (v === 'True' || v === 'true') clean[k] = true;
    else if (v === 'False' || v === 'false') clean[k] = false;
    else if (typeof v === 'string' && v !== '' && !isNaN(Number(v))) clean[k] = Number(v);
    else clean[k] = v;
  }
  fs.writeFileSync(f, JSON.stringify(clean, null, 2));
  return { ok: true, filePath: f, count: Object.keys(clean).length };
});

// --- Mods (simple file replacement list) ---
ipcMain.handle('mods:list', async () => {
  const modsDir = path.join(app.getPath('userData'), 'mods');
  fs.mkdirSync(modsDir, { recursive: true });
  return fs.readdirSync(modsDir);
});

ipcMain.handle('mods:openFolder', async () => {
  const modsDir = path.join(app.getPath('userData'), 'mods');
  fs.mkdirSync(modsDir, { recursive: true });
  require('electron').shell.openPath(modsDir);
  return modsDir;
});

// --- FastFlag export / profiles ---
ipcMain.handle('fastflags:exportJson', async (event, data) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'FastFlags dışa aktar',
    defaultPath: 'ClientAppSettings.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled || !filePath) return { ok: false };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return { ok: true, filePath };
});

const profilesDir = () => {
  const d = path.join(app.getPath('userData'), 'profiles');
  fs.mkdirSync(d, { recursive: true });
  return d;
};
ipcMain.handle('profiles:list', async () => {
  return fs.readdirSync(profilesDir()).filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, ''));
});
ipcMain.handle('profiles:save', async (event, name, data) => {
  fs.writeFileSync(path.join(profilesDir(), `${name}.json`), JSON.stringify(data, null, 2));
  return { ok: true };
});
ipcMain.handle('profiles:load', async (event, name) => {
  const f = path.join(profilesDir(), `${name}.json`);
  if (!fs.existsSync(f)) return { ok: false };
  return { ok: true, data: JSON.parse(fs.readFileSync(f, 'utf8')) };
});
ipcMain.handle('profiles:delete', async (event, name) => {
  const f = path.join(profilesDir(), `${name}.json`);
  if (fs.existsSync(f)) fs.unlinkSync(f);
  return { ok: true };
});

// --- Customize (font / cursor / shiftlock) ---
const settingsPath = () => path.join(app.getPath('userData'), 'settings.json');
const fontsDir = () => { const d = path.join(app.getPath('userData'), 'fonts'); fs.mkdirSync(d, { recursive: true }); return d; };
const customDir = () => { const d = path.join(app.getPath('userData'), 'customize'); fs.mkdirSync(d, { recursive: true }); return d; };

function readSettings() {
  const p = settingsPath();
  if (!fs.existsSync(p)) return { font: 'Segoe UI', cursor: '' };
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return { font: 'Segoe UI', cursor: '' }; }
}

ipcMain.handle('settings:get', async () => readSettings());
ipcMain.handle('settings:set', async (event, s) => {
  fs.writeFileSync(settingsPath(), JSON.stringify({ ...readSettings(), ...s }, null, 2));
  return { ok: true };
});

// =================== FLAG MANAGER (injector-style, disk-based) ===================
const flagSetsDir = () => {
  const d = path.join(app.getPath('userData'), 'ffsets');
  fs.mkdirSync(d, { recursive: true });
  return d;
};

function parseTxtFlags(raw) {
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || t.startsWith('//') || t.startsWith(';')) continue;
    const m = t.match(/^([A-Za-z0-9_]+)\s*[=:]\s*(.+)$/);
    if (!m) continue;
    let v = m[2].trim().replace(/^["']|["']$/g, '');
    if (v === 'true') v = true;
    else if (v === 'false') v = false;
    else if (v !== '' && !isNaN(Number(v))) v = Number(v);
    out[m[1]] = v;
  }
  return out;
}

ipcMain.handle('injector:loadFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Flag dosyası yükle',
    filters: [{ name: 'Flag dosyaları', extensions: ['json', 'txt'] }],
    properties: ['openFile']
  });
  if (canceled || !filePaths || !filePaths[0]) return { ok: false, canceled: true };
  const fp = filePaths[0];
  try {
    const raw = fs.readFileSync(fp, 'utf8');
    let flags;
    if (fp.toLowerCase().endsWith('.json')) flags = JSON.parse(raw);
    else flags = parseTxtFlags(raw);
    if (!flags || typeof flags !== 'object' || Array.isArray(flags)) return { ok: false, error: 'Geçersiz format (obje bekleniyor)' };
    return { ok: true, flags, filePath: fp, count: Object.keys(flags).length };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('injector:listSets', async () =>
  fs.readdirSync(flagSetsDir()).filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, '')).sort()
);
ipcMain.handle('injector:saveSet', async (event, name, flags) => {
  const safe = String(name || '').trim().replace(/[\\/:*?"<>|]/g, '_');
  if (!safe) return { ok: false, error: 'isim gerekli' };
  try { fs.writeFileSync(path.join(flagSetsDir(), safe + '.json'), JSON.stringify(flags, null, 2)); return { ok: true, name: safe }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('injector:loadSet', async (event, name) => {
  const f = path.join(flagSetsDir(), String(name) + '.json');
  if (!fs.existsSync(f)) return { ok: false, error: 'set bulunamadı' };
  try { return { ok: true, flags: JSON.parse(fs.readFileSync(f, 'utf8')) }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('injector:deleteSet', async (event, name) => {
  const f = path.join(flagSetsDir(), String(name) + '.json');
  if (fs.existsSync(f)) fs.unlinkSync(f);
  return { ok: true };
});
ipcMain.handle('injector:apply', async (event, versionDir, flags) => {
  if (!versionDir) return { ok: false, error: 'Roblox sürümü seçilmedi' };
  try {
    const dir = path.join(versionDir, 'ClientSettings');
    fs.mkdirSync(dir, { recursive: true });
    const f = path.join(dir, 'ClientAppSettings.json');
    if (fs.existsSync(f)) { try { fs.copyFileSync(f, f + '.bak'); } catch {} }
    const clean = {};
    for (const [k, v] of Object.entries(flags || {})) {
      if (v === 'True' || v === 'true') clean[k] = true;
      else if (v === 'False' || v === 'false') clean[k] = false;
      else if (typeof v === 'string' && v !== '' && !isNaN(Number(v))) clean[k] = Number(v);
      else clean[k] = v;
    }
    fs.writeFileSync(f, JSON.stringify(clean, null, 2));
    return { ok: true, filePath: f, count: Object.keys(clean).length };
  } catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('injector:export', async (event, flags) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Flag setini dışa aktar',
    defaultPath: 'ClientAppSettings.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled || !filePath) return { ok: false };
  try { fs.writeFileSync(filePath, JSON.stringify(flags, null, 2)); return { ok: true, filePath }; }
  catch (e) { return { ok: false, error: e.message }; }
});

