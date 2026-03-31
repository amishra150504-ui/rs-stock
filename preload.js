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
  showItem: (payload) => invoke('rs-show-item', payload)
})
