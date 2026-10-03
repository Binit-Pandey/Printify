import { contextBridge, ipcRenderer } from 'electron';

// Minimal, controlled surface exposed to the renderer. No Node.js APIs,
// filesystem or process access is granted.
contextBridge.exposeInMainWorld('printpressDesktop', {
  isDesktop: true,
  platform: process.platform,
  versions: {
    electron: process.versions.electron ?? '',
    chrome: process.versions.chrome ?? '',
    node: process.versions.node ?? '',
  },
  printService: {
    listPrinters: () => ipcRenderer.invoke('print:list-printers'),
    directPrint: (deviceName?: string, copies?: number) => ipcRenderer.invoke('print:direct', deviceName, copies),
    printWithDialog: () => ipcRenderer.invoke('print:dialog'),
    saveAsPdf: (suggestedName?: string) => ipcRenderer.invoke('print:to-pdf', suggestedName),
  },
});