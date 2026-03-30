export type UserRole = 'administrator' | 'umum' | 'viewer';

export interface Employee {
  id: string;
  name: string;
  nip: string;
  position: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}
