import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { Employee } from '@/types/employee';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEmployee = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) {
      setEmployee({
        id: data.id,
        name: data.name,
        nip: data.nip,
        position: data.position,
        email: data.email,
        role: data.role as Employee['role'],
        is_active: data.is_active,
        created_at: data.created_at,
      });
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchEmployee(session.user.id), 0);
        } else {
          setEmployee(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchEmployee(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchEmployee]);

  const loginWithNip = async (nip: string, password: string) => {
    const { data: emp, error: lookupError } = await supabase
      .from('employees')
      .select('email')
      .eq('nip', nip)
      .single();

    if (lookupError || !emp) {
      throw new Error('NIP tidak ditemukan');
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: emp.email,
      password,
    });

    if (error) throw new Error('NIP atau password salah');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setEmployee(null);
  };

  return { user, employee, loading, loginWithNip, logout };
}
