// What the access-token JWT carries. Members and staff live in different tables.
export type MemberAuth = { userType: 'member'; userId: string; needCompleteProfile?: boolean };
export type StaffAuth = { userType: 'staff'; staffId: string; role?: string };
export type AuthUser = MemberAuth | StaffAuth;
