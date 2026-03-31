import React, { useMemo, useState } from 'react'
import { saveUploadFile, openLocalPath, showLocalItem, deleteLocalFile } from '../utils/localStore'

const ALLOWED_TYPES = new Set([
  'text/csv',
  'application/pdf',
  'image/png',
  'image/jpg',
  'image/jpeg',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
])

const ALLOWED_EXT = ['.csv', '.xlsx', '.xls', '.pdf', '.png', '.jpg', '.jpeg']
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024

const formatSize = (bytes) => {
  const value = Number(bytes || 0)
  if (!value) return '0 B'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(2)} MB`
}

const getRecordKey = (upload, companyId) =>
  String(
    upload?.id ||
      `${companyId || ''}|${upload?.localPath || ''}|${upload?.fileName || ''}|${upload?.uploadedAt || ''}|${upload?.daybookDate || ''}`
  )

export default function DaybookUpload({ daybookUploads, setDaybookUploads, currentUser, companyId = 'rs_traders' }) {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [selectedFile, setSelectedFile] = useState(null)
  const [status, setStatus] = useState('')
  const [searchDate, setSearchDate] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [uploading, setUploading] = useState(false)
  const isStaffUser = String(currentUser?.role || '').toLowerCase() === 'staff'
  const isRecordForCompany = (record) => {
    if (!record) return false
    if (record.companyId) return record.companyId === companyId
    return true
  }

  const sortedUploads = useMemo(
    () =>
      [...daybookUploads]
        .filter((u) => isRecordForCompany(u))
        .sort((a, b) => String(b.daybookDate).localeCompare(String(a.daybookDate))),
    [daybookUploads, companyId]
  )

  const filteredUploads = useMemo(
    () =>
      sortedUploads.filter((u) => {
        if (searchDate && u.daybookDate !== searchDate) return false
        if (typeFilter !== 'all' && u.fileType !== typeFilter) return false
        return true
      }),
    [sortedUploads, searchDate, typeFilter]
  )

  const uploadFile = async () => {
    if (!selectedDate) {
      setStatus('Please select a date.')
      return
    }
    if (!selectedFile) {
      setStatus('Please select a file.')
      return
    }

    const ext = `.${selectedFile.name.split('.').pop()?.toLowerCase() || ''}`
    const isTypeAllowed = ALLOWED_TYPES.has(selectedFile.type)
    const isExtAllowed = ALLOWED_EXT.includes(ext)

    if (!isTypeAllowed && !isExtAllowed) {
      setStatus('Only CSV, XLSX, PDF, PNG, JPG, JPEG files are allowed.')
      return
    }
    if (Number(selectedFile.size || 0) > MAX_FILE_SIZE_BYTES) {
      setStatus(`File is too large. Maximum allowed size is ${formatSize(MAX_FILE_SIZE_BYTES)}.`)
      return
    }

    try {
      setUploading(true)
      setStatus('Saving file locally...')

      const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      const buffer = await selectedFile.arrayBuffer()
      const saved = await saveUploadFile({
        companyId,
        kind: 'daybook',
        fileName: selectedFile.name,
        data: buffer
      })

      const record = {
        id: uploadId,
        companyId,
        daybookDate: selectedDate,
        fileName: selectedFile.name,
        fileSize: Number(selectedFile.size || 0),
        fileType: selectedFile.type || ext.replace('.', ''),
        localPath: saved?.filePath || '',
        storageProvider: 'local',
        checked: false,
        uploadedAt: new Date().toISOString(),
        uploadedBy: currentUser?.id || ''
      }

      setDaybookUploads((prev) => [record, ...prev])
      setSelectedFile(null)
      setStatus('Daybook file saved locally.')
    } catch (err) {
      setStatus(`Upload failed: ${err?.message || 'Unknown error'}`)
    } finally {
      setUploading(false)
    }
  }

  const removeUpload = async (id) => {
    if (isStaffUser) {
      setStatus('Staff is not allowed to delete daybook uploads.')
      return
    }
    if (!window.confirm('Delete this upload entry?')) return

    const target = daybookUploads.find((u) => getRecordKey(u, companyId) === id)
    if (target?.localPath) {
      try {
        await deleteLocalFile({ path: target.localPath })
      } catch (err) {
        console.warn('Failed to delete file:', err?.message || err)
      }
    }
    setDaybookUploads((prev) => prev.filter((u) => getRecordKey(u, companyId) !== id))
    setStatus('Upload entry deleted.')
  }

  const toggleChecked = (id) => {
    if (isStaffUser) {
      setStatus('Staff is not allowed to change checked status.')
      return
    }
    setDaybookUploads((prev) =>
      prev.map((u) => (getRecordKey(u, companyId) === id ? { ...u, checked: !u.checked } : u))
    )
  }
  const openFile = async (upload) => {
    if (!upload?.localPath) {
      setStatus('This file is not available to open.')
      return
    }
    try {
      await openLocalPath({ path: upload.localPath })
    } catch (err) {
      setStatus(`Open failed: ${err?.message || 'Unknown error'}`)
    }
  }

  const downloadFile = async (upload) => {
    if (!upload?.localPath) {
      setStatus('This file is not available to locate.')
      return
    }
    try {
      await showLocalItem({ path: upload.localPath })
    } catch (err) {
      setStatus(`Show failed: ${err?.message || 'Unknown error'}`)
    }
  }

  const uniqueTypes = [...new Set(sortedUploads.map((u) => u.fileType).filter(Boolean))]

  return (
    <section className="page daybook-page">
      <div className="daybook-hero">
        <div>
          <h1>Daybook Upload</h1>
          <p>Upload date-wise daybook files in CSV, XLSX, PDF, PNG, JPG or JPEG format.</p>
        </div>
        <div className="daybook-orb" aria-hidden="true" />
      </div>

      <div className="daybook-form-card">
        <div className="daybook-form-grid">
          <div className="form-group">
            <label>Date</label>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>

          <div className="form-group daybook-upload-control">
            <label>Upload File</label>
            <label className="daybook-file-picker">
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,text/csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/png,image/jpg,image/jpeg"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <span className="daybook-file-btn">Choose File</span>
              <span className="daybook-file-name">{selectedFile?.name || 'No file selected'}</span>
            </label>
          </div>

          <div className="daybook-upload-meta">
            <div>
              Selected: <strong>{selectedFile?.name || 'None'}</strong>
            </div>
            <div>
              Size: <strong>{selectedFile ? formatSize(selectedFile.size) : '0 B'}</strong>
            </div>
          </div>
        </div>

        <div className="daybook-actions">
          <button onClick={uploadFile} className="daybook-upload-btn" disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload Daybook'}
          </button>
        </div>

        {status && <div className="daybook-status">{status}</div>}
      </div>

      <div className="daybook-list-card">
        <div className="daybook-filter-row">
          <div className="form-group">
            <label>Filter by date</label>
            <input type="date" value={searchDate} onChange={(e) => setSearchDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Filter by file type</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All Types</option>
              {uniqueTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table className="sheet">
            <thead>
              <tr>
                <th>Date</th>
                <th>File</th>
                <th>Type</th>
                <th>Size</th>
                <th>Checked</th>
                <th>Uploaded At</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUploads.length ? (
                filteredUploads.map((u) => (
                  <tr key={getRecordKey(u, companyId)} className="row-anim">
                    <td>{u.daybookDate}</td>
                    <td>{u.fileName}</td>
                    <td>{u.fileType}</td>
                    <td>{formatSize(u.fileSize)}</td>
                    <td>
                      <label className="daybook-check-toggle">
                        <input
                          type="checkbox"
                          checked={Boolean(u.checked)}
                          onChange={() => toggleChecked(getRecordKey(u, companyId))}
                        />
                        <span>{u.checked ? 'Checked' : 'Not Checked'}</span>
                      </label>
                    </td>
                    <td>{new Date(u.uploadedAt).toLocaleString()}</td>
                    <td className="daybook-row-actions">
                      <button
                        onClick={() => openFile(u)}
                        className="daybook-row-btn daybook-open-btn"
                      >
                        Open
                      </button>
                      <button
                        onClick={() => downloadFile(u)}
                        className="daybook-row-btn daybook-download-btn"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => removeUpload(getRecordKey(u, companyId))}
                        className="daybook-row-btn daybook-delete-btn"
                        title={isStaffUser ? 'Staff is not allowed to delete uploads' : ''}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: '#64748b' }}>
                    No daybook uploads found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
