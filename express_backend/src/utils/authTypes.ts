export type PermissionKey = string;

export interface AuthContext {
  userId: string;
  orgId: string;
  permissions: PermissionKey[];
  isSuperAdmin: boolean;
}
