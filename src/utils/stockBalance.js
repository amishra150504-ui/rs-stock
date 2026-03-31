const normalizeName = (value) =>
  String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')

const normalizeType = (value) => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim()

const ROD_CONVERSIONS = {
  '5.5': 2.24,
  '6': 2.67,
  '8': 4.74,
  '10': 7.4,
  '12': 10.65,
  '16': 18.96,
  '20': 29.6
}

const getConversionForItem = (item, rawName = '') => {
  const conv = Number(item?.conversion || 0)
  if (conv > 0) return conv
  const name = String(item?.name || rawName || '').toLowerCase()
  const match = name.match(/(\d+(?:\.\d+)?)\s*mm/)
  if (!match) return 0
  return Number(ROD_CONVERSIONS[match[1]] || 0)
}

const entryKey = (e) => {
  if (!e) return ''
  const idPart = e.id !== undefined && e.id !== null ? `id:${e.id}` : 'id:na'
  return [
    idPart,
    normalizeName(e.item),
    normalizeType(e.type),
    Number(e.kg || 0),
    Number(e.pcs || 0),
    e.date || '',
    e.remarks || ''
  ].join('|')
}

const mergeEntries = (entries, dailyEntries) => {
  const base = Array.isArray(entries) ? entries : []
  const daily = Array.isArray(dailyEntries) ? dailyEntries : []
  const seen = new Set(base.map(entryKey))
  const merged = [...base]
  daily.forEach((d) => {
    const key = entryKey(d)
    if (!seen.has(key)) {
      seen.add(key)
      merged.push(d)
    }
  })
  return merged
}

const buildStockMap = (entryList, items = []) => {
  const map = {}
  const displayNameByKey = new Map()
  const itemByName = new Map(items.map((it) => [normalizeName(it.name), it]))

  entryList.forEach((e) => {
    const rawName = e?.item || ''
    const key = normalizeName(rawName)
    if (!key) return
    if (!map[key]) map[key] = { inKg: 0, outKg: 0, inPcs: 0, outPcs: 0 }
    if (!displayNameByKey.has(key)) {
      const item = itemByName.get(key)
      displayNameByKey.set(key, item?.name || rawName)
    }
    const itemMeta = itemByName.get(key)
    const conv = getConversionForItem(itemMeta, rawName)
    const type = normalizeType(e?.type)
    const kgValue = Number(e.kg || 0)
    let pcsValue = Number(e.pcs || 0)
    if (!pcsValue && kgValue && conv > 0) {
      pcsValue = Math.round(kgValue / conv)
    }
    if (type === 'stock in') {
      map[key].inKg += kgValue
      map[key].inPcs += pcsValue
    } else {
      map[key].outKg += kgValue
      map[key].outPcs += pcsValue
    }
  })

  return { map, displayNameByKey }
}

export { normalizeName, normalizeType, mergeEntries, buildStockMap }
