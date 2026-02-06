export const WORKSPACE_LIMITS = {
  NAME_MAX: 50,
  DESCRIPTION_MAX: 200,
  SLUG_MAX: 255,
  SLUG_MIN: 1,
} satisfies Record<string, number>

export const WORKSPACE_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
} satisfies Record<string, 'owner' | 'admin' | 'member' | 'viewer'>

export const ADMIN_ROLES: string[] = [WORKSPACE_ROLES.OWNER, WORKSPACE_ROLES.ADMIN]

export const WORKSPACE_DEFAULTS = {
  PERSONAL_NAME: 'Personal',
  PERSONAL_SLUG_PREFIX: 'personal-',
  MEMBER_ROLE: WORKSPACE_ROLES.MEMBER,
  STORAGE_KEY: 'kyte:current-workspace-id',
} satisfies Record<string, string | 'owner' | 'admin' | 'member' | 'viewer'>

export const WORKSPACE_PATTERNS = {
  SLUG_VALIDATION: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  SLUG_REPLACEMENT: /[^a-z0-9]+/g,
} satisfies Record<string, RegExp>
