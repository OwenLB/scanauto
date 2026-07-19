// Cache module-level partagé entre App.jsx (invalidation) et DashboardPage (lecture/écriture).
// Objet mutable pour que les deux imports partagent la même référence.
export const dashboardCache = { analyses: null, groups: null, token: null }

export function invalidateDashboardCache() {
  dashboardCache.analyses = null
  dashboardCache.groups = null
  dashboardCache.token = null
}
