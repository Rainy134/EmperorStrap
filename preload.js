const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  roblox: {
    detect: () => ipcRenderer.invoke('roblox:detect'),
    launch: (v) => ipcRenderer.invoke('roblox:launch', v),
    restart: (v) => ipcRenderer.invoke('roblox:restart', v)
  },
  fastflags: {
    read: (v) => ipcRenderer.invoke('fastflags:read', v),
    write: (v, d) => ipcRenderer.invoke('fastflags:write', v, d),
    exportJson: (d) => ipcRenderer.invoke('fastflags:exportJson', d)
  },
  profiles: {
    list: () => ipcRenderer.invoke('profiles:list'),
    save: (name, d) => ipcRenderer.invoke('profiles:save', name, d),
    load: (name) => ipcRenderer.invoke('profiles:load', name),
    delete: (name) => ipcRenderer.invoke('profiles:delete', name)
  },
  mods: {
    list: () => ipcRenderer.invoke('mods:list'),
    openFolder: () => ipcRenderer.invoke('mods:openFolder')
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (s) => ipcRenderer.invoke('settings:set', s)
  },
  injector: {
    apply: (v, f) => ipcRenderer.invoke('injector:apply', v, f)
  },
  win: {
    minimize: () => ipcRenderer.send('win:minimize'),
    close: () => ipcRenderer.send('win:close')
  },
});