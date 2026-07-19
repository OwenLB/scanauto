// Claude sometimes returns objects instead of strings in arrays.
// This coerces any value to a displayable string safely.
export function toStr(item) {
  if (item == null) return ''
  if (typeof item === 'string') return item
  if (typeof item === 'object') {
    return (
      item.detail ||
      item.description ||
      item.titre ||
      item.champ ||
      item.nom ||
      item.text ||
      item.label ||
      item.reference ||
      Object.values(item).find((v) => typeof v === 'string') ||
      JSON.stringify(item)
    )
  }
  return String(item)
}
