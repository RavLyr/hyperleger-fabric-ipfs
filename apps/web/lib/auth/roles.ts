export const ROLES = {
  GUEST: "GUEST",
  ADMIN: "ADMIN",
  ISSUER_ADMIN: "ISSUER_ADMIN",
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export type AdminRole = typeof ROLES.ADMIN | typeof ROLES.ISSUER_ADMIN

export const adminRoles = [ROLES.ADMIN, ROLES.ISSUER_ADMIN] as const

export function isAdminRole(role: unknown): role is AdminRole {
  return typeof role === "string" && adminRoles.includes(role as AdminRole)
}

export const publicRoutes = [
  "/",
  "/verifikasi",
]

export const authRoutes = [
  "/login",
]

export const adminRoutePrefix = "/admin"
