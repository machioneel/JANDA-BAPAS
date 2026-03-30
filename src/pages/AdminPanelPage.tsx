import { useState } from 'react';
import { useEmployees, useUpdateEmployeeRole, useUpdateEmployee } from '@/hooks/useEmployees';
import type { UserRole } from '@/types/employee';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { toast } from 'sonner';
import { UserCog, Shield, Eye, Users, Search, Edit2, UserPlus, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const ROLE_LABELS: Record<UserRole, string> = {
  administrator: 'Administrator',
  umum: 'Umum',
  viewer: 'Viewer',
};

const ROLE_ICONS: Record<UserRole, typeof Shield> = {
  administrator: Shield,
  umum: UserCog,
  viewer: Eye,
};

export default function AdminPanelPage() {
  const { data: employees, isLoading, refetch } = useEmployees();
  const updateRole = useUpdateEmployeeRole();
  const updateEmployee = useUpdateEmployee();
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');

  // Edit employee
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', position: '', nip: '' });

  // Add user
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', nip: '', email: '', password: '123456', role: 'viewer' as UserRole, position: '' });
  const [addingUser, setAddingUser] = useState(false);

  // Change password
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Confirm toggleActive
  const [confirmToggle, setConfirmToggle] = useState<{ id: string; current: boolean; name: string } | null>(null);

  // Confirm role change
  const [pendingRole, setPendingRole] = useState<{ id: string; role: UserRole; name: string } | null>(null);

  const handleRoleChange = async (employeeId: string, newRole: UserRole, empName: string) => {
    setPendingRole({ id: employeeId, role: newRole, name: empName });
  };

  const confirmRoleChange = async () => {
    if (!pendingRole) return;
    setChangingRole(pendingRole.id);
    try {
      await updateRole.mutateAsync({ id: pendingRole.id, role: pendingRole.role });
      toast.success(`Role ${pendingRole.name} berhasil diubah menjadi ${ROLE_LABELS[pendingRole.role]}`);
    } catch {
      toast.error('Gagal mengubah role');
    } finally {
      setChangingRole(null);
      setPendingRole(null);
    }
  };

  const handleToggleActive = async () => {
    if (!confirmToggle) return;
    try {
      await updateEmployee.mutateAsync({ id: confirmToggle.id, is_active: !confirmToggle.current });
      toast.success(confirmToggle.current ? `${confirmToggle.name} berhasil dinonaktifkan` : `${confirmToggle.name} berhasil diaktifkan`);
    } catch {
      toast.error('Gagal mengubah status');
    } finally {
      setConfirmToggle(null);
    }
  };

  const handleEditSave = async () => {
    if (!editingEmployee) return;
    try {
      await updateEmployee.mutateAsync({ id: editingEmployee.id, name: editForm.name, position: editForm.position });
      toast.success('Data pegawai berhasil diperbarui');
      setEditingEmployee(null);
    } catch {
      toast.error('Gagal memperbarui data');
    }
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.nip || !newUser.email) {
      toast.error('Nama, NIP, dan Email wajib diisi');
      return;
    }
    setAddingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { email: newUser.email, password: newUser.password, name: newUser.name, nip: newUser.nip, role: newUser.role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Pengguna ${newUser.name} berhasil ditambahkan`);
      setNewUser({ name: '', nip: '', email: '', password: '123456', role: 'viewer', position: '' });
      setShowAddUser(false);
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menambah pengguna');
    } finally {
      setAddingUser(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordTarget || !newPassword) {
      toast.error('Password baru wajib diisi');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }
    setChangingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { action: 'change_password', user_id: passwordTarget.id, new_password: newPassword },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Password ${passwordTarget.name} berhasil diubah`);
      setShowPasswordDialog(false);
      setNewPassword('');
      setPasswordTarget(null);
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengubah password');
    } finally {
      setChangingPassword(false);
    }
  };

  const filtered = (employees ?? []).filter(emp => {
    const matchSearch = !searchQuery ||
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.nip.includes(searchQuery) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = filterRole === 'all' || emp.role === filterRole;
    return matchSearch && matchRole;
  });

  const roleCounts = (employees ?? []).reduce((acc, emp) => {
    acc[emp.role] = (acc[emp.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Kelola pengguna dan hak akses</p>
          </div>
        </div>
        <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
          <DialogTrigger asChild>
            <Button className="gap-2"><UserPlus className="w-4 h-4" /> Tambah Pengguna</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Pengguna Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label>Nama Lengkap *</Label>
                <Input value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>NIP *</Label>
                  <Input value={newUser.nip} onChange={e => setNewUser(p => ({ ...p, nip: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Jabatan</Label>
                  <Input value={newUser.position} onChange={e => setNewUser(p => ({ ...p, position: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Email *</Label>
                <Input type="email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Password</Label>
                  <Input value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Role</Label>
                  <Select value={newUser.role} onValueChange={(v: UserRole) => setNewUser(p => ({ ...p, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="administrator">Administrator</SelectItem>
                      <SelectItem value="umum">Umum</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full" onClick={handleAddUser} disabled={addingUser}>
                {addingUser ? 'Menambahkan...' : 'Tambah Pengguna'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground">Total Pengguna</p>
            <p className="text-2xl font-bold text-foreground">{employees?.length ?? 0}</p>
          </CardContent>
        </Card>
        {(['administrator', 'umum', 'viewer'] as UserRole[]).map(role => {
          const Icon = ROLE_ICONS[role];
          return (
            <Card key={role} className="border-border bg-card">
              <CardContent className="pt-4 pb-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{ROLE_LABELS[role]}</p>
                  <p className="text-2xl font-bold text-foreground">{roleCounts[role] ?? 0}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari nama, NIP, atau email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Role</SelectItem>
                <SelectItem value="administrator">Administrator</SelectItem>
                <SelectItem value="umum">Umum</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Nama</TableHead>
                  <TableHead className="font-semibold">NIP</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Jabatan</TableHead>
                  <TableHead className="font-semibold">Role</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Memuat data...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Tidak ada pengguna ditemukan</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((emp, i) => {
                    const role = (emp.role as UserRole) || 'viewer';
                    const RoleIcon = ROLE_ICONS[role];
                    return (
                      <TableRow key={emp.id} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                        <TableCell className="font-medium text-sm">{emp.name}</TableCell>
                        <TableCell className="text-sm font-mono">{emp.nip}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{emp.email}</TableCell>
                        <TableCell className="text-sm">{emp.position || '-'}</TableCell>
                        <TableCell>
                          <Select
                            value={emp.role}
                            onValueChange={(v: UserRole) => handleRoleChange(emp.id, v, emp.name)}
                            disabled={changingRole === emp.id}
                          >
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                              <div className="flex items-center gap-1.5">
                                <RoleIcon className="w-3.5 h-3.5" />
                                <SelectValue />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="administrator">Administrator</SelectItem>
                              <SelectItem value="umum">Umum</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={emp.is_active ? 'default' : 'secondary'}
                            className="text-xs cursor-pointer"
                            onClick={() => setConfirmToggle({ id: emp.id, current: emp.is_active, name: emp.name })}
                          >
                            {emp.is_active ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Edit" onClick={() => {
                              setEditingEmployee(emp);
                              setEditForm({ name: emp.name, position: emp.position || '', nip: emp.nip });
                            }}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Ganti Password" onClick={() => {
                              setPasswordTarget(emp);
                              setNewPassword('');
                              setShowPasswordDialog(true);
                            }}>
                              <KeyRound className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingEmployee} onOpenChange={(open) => !open && setEditingEmployee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pegawai</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Nama</Label>
              <Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Jabatan</Label>
              <Input value={editForm.position} onChange={e => setEditForm(p => ({ ...p, position: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={handleEditSave}>Simpan Perubahan</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ganti Password — {passwordTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Password Baru</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimal 6 karakter" />
            </div>
            <Button className="w-full" onClick={handleChangePassword} disabled={changingPassword}>
              {changingPassword ? 'Menyimpan...' : 'Simpan Password'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Toggle Active */}
      <ConfirmDialog
        open={!!confirmToggle}
        onOpenChange={(open) => !open && setConfirmToggle(null)}
        title={confirmToggle?.current ? 'Nonaktifkan Pengguna' : 'Aktifkan Pengguna'}
        description={`Apakah Anda yakin ingin ${confirmToggle?.current ? 'menonaktifkan' : 'mengaktifkan'} ${confirmToggle?.name}?`}
        confirmLabel={confirmToggle?.current ? 'Nonaktifkan' : 'Aktifkan'}
        variant={confirmToggle?.current ? 'destructive' : 'default'}
        onConfirm={handleToggleActive}
      />

      {/* Confirm Role Change */}
      <ConfirmDialog
        open={!!pendingRole}
        onOpenChange={(open) => !open && setPendingRole(null)}
        title="Ubah Role Pengguna"
        description={`Ubah role ${pendingRole?.name} menjadi ${pendingRole ? ROLE_LABELS[pendingRole.role] : ''}?`}
        confirmLabel="Ubah Role"
        onConfirm={confirmRoleChange}
      />
    </div>
  );
}
