import { contextBridge, ipcRenderer } from 'electron'

const invoke = (channel, payload) => ipcRenderer.invoke(channel, payload)

contextBridge.exposeInMainWorld('rsStore', {
  readCompany: (companyId) => invoke('rs-read-company', companyId),
  writeCompany: (payload) => invoke('rs-write-company', payload),
  readUsers: () => invoke('rs-read-users'),
  writeUsers: (payload) => invoke('rs-write-users', payload),
  saveBackup: (payload) => invoke('rs-save-backup', payload),
  saveReport: (payload) => invoke('rs-save-report', payload),
  saveUploadFile: (payload) => invoke('rs-save-upload-file', payload),
  deleteFile: (payload) => invoke('rs-delete-file', payload),
  openPath: (payload) => invoke('rs-open-path', payload),
  showItem: (payload) => invoke('rs-show-item', payload),
  checkUpdate: (payload) => invoke('rs-update-check', payload),
  applyUpdate: () => invoke('rs-update-apply'),
  autoUpdateCheck: () => invoke('rs-auto-update-check'),
  autoUpdateDownload: () => invoke('rs-auto-update-download'),
  autoUpdateInstall: () => invoke('rs-auto-update-install'),
  getAppPathInfo: () => invoke('rs-app-path-info'),
  onUpdateEvent: (handler) => {
    const channels = [
      'rs-update-available',
      'rs-update-not-available',
      'rs-update-downloaded',
      'rs-update-download-progress',
      'rs-update-error'
    ]
    channels.forEach((ch) => {
      ipcRenderer.on(ch, (_event, payload) => handler(ch, payload))
    })
    return () => channels.forEach((ch) => ipcRenderer.removeAllListeners(ch))
  }
})
