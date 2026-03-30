import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DocumentType } from '@/types/document';

interface DocumentFilters {
  search?: string;
  type?: DocumentType | '';
  year?: string;
  sender?: string;
  receiver?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export function useDocuments(filters: DocumentFilters = {}) {
  const { search, type, year, sender, receiver, dateFrom, dateTo, page = 1, pageSize = 20 } = filters;

  return useQuery({
    queryKey: ['documents', filters],
    queryFn: async () => {
      let query = supabase
        .from('documents')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (search) {
        query = query.or(`letter_number.ilike.%${search}%,sender.ilike.%${search}%,receiver.ilike.%${search}%,subject.ilike.%${search}%`);
      }
      if (type) {
        query = query.eq('document_type', type);
      }
      if (year) {
        query = query.gte('letter_date', `${year}-01-01`).lte('letter_date', `${year}-12-31`);
      }
      if (sender) {
        query = query.ilike('sender', `%${sender}%`);
      }
      if (receiver) {
        query = query.ilike('receiver', `%${receiver}%`);
      }
      if (dateFrom) {
        query = query.gte('letter_date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('letter_date', dateTo);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { documents: data ?? [], total: count ?? 0 };
    },
  });
}

export function useDocumentById(id: string) {
  return useQuery({
    queryKey: ['document', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (doc: {
      document_type: string;
      letter_number: string;
      letter_date: string | null;
      sender: string;
      receiver: string;
      subject: string;
      classification: string;
      file_url: string;
      file_name: string;
      uploaded_by: string | null;
    }) => {
      const { data, error } = await supabase
        .from('documents')
        .insert(doc)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('documents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
