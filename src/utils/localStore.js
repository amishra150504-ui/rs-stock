const hasBridge = () => typeof window !== 'undefined' && window.rsStore

const safeParse = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

const localKey = (key) => `rs_local_${key}`

export const readCompanyState = async (companyId) => {
  if (hasBridge()) {
    const res = await window.rsStore.readCompany(companyId)
    if (res && res.error) throw new Error(res.error)
    return res
  }
  return safeParse(localStorage.getItem(localKey(`company_${companyId}`)), null)
}

export const writeCompanyState = async (companyId, data) => {
  if (hasBridge()) {
    const res = await window.rsStore.writeCompany({ companyId, data })
    if (res && res.error) throw new Error(res.error)
    return res
  }
  localStorage.setItem(localKey(`company_${companyId}`), JSON.stringify(data))
  return { ok: true }
}

export const readUsersState = async () => {
  if (hasBridge()) {
    const res = await window.rsStore.readUsers()
    if (res && res.error) throw new Error(res.error)
    return res
  }
  return safeParse(localStorage.getItem(localKey('users')), null)
}

export const writeUsersState = async (data) => {
  if (hasBridge()) {
    const res = await window.rsStore.writeUsers(data)
    if (res && res.error) throw new Error(res.error)
    return res
  }
  localStorage.setItem(localKey('users'), JSON.stringify(data))
  return { ok: true }
}

export const saveBackupFile = async (payload) => {
  if (hasBridge()) {
    const res = await window.rsStore.saveBackup(payload)
    if (res && res.error) throw new Error(res.error)
    return res
  }
  throw new Error('Desktop bridge not available.')
}

export const saveReportFile = async (payload) => {
  if (hasBridge()) {
    const res = await window.rsStore.saveReport(payload)
    if (res && res.error) throw new Error(res.error)
    return res
  }
  throw new Error('Desktop bridge not available.')
}

export const saveUploadFile = async (payload) => {
  if (hasBridge()) {
    const res = await window.rsStore.saveUploadFile(payload)
    if (res && res.error) throw new Error(res.error)
    return res
  }
  throw new Error('Desktop bridge not available.')
}

export const deleteLocalFile = async (payload) => {
  if (hasBridge()) {
    const res = await window.rsStore.deleteFile(payload)
    if (res && res.error) throw new Error(res.error)
    return res
  }
  throw new Error('Desktop bridge not available.')
}

export const openLocalPath = async (payload) => {
  if (hasBridge()) {
    const res = await window.rsStore.openPath(payload)
    if (res && res.error) throw new Error(res.error)
    return res
  }
  throw new Error('Desktop bridge not available.')
}

export const showLocalItem = async (payload) => {
  if (hasBridge()) {
    const res = await window.rsStore.showItem(payload)
    if (res && res.error) throw new Error(res.error)
    return res
  }
  throw new Error('Desktop bridge not available.')
}
