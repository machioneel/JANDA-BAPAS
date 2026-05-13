import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DocumentType, DocumentCategory } from '@/types/document';

interface UseDocumentsParams {
  search?: string;
  type?: string;
  category?: string; 
  year?: string;
  sender?: string;
  receiver?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export function useDocuments(params: UseDocumentsParams = {}) {
  const {
    search, type, category, year, sender, receiver, dateFrom, dateTo, page = 1, pageSize = 15
  } = params;

  return useQuery({
    queryKey: ['documents', params],
    queryFn: async () => {
      let query = supabase
        .from('documents')
        .select('*', { count: 'exact' });

      if (search) {
        query = query.or(`letter_number.ilike.%${search}%,sender.ilike.%${search}%,receiver.ilike.%${search}%,subject.ilike.%${search}%,description.ilike.%${search}%`);
      }
      if (type) query = query.eq('document_type', type);
      if (category) query = query.eq('category', category); 
      if (year) {
        query = query.gte('letter_date', `${year}-01-01`).lte('letter_date', `${year}-12-31`);
      }
      if (sender) query = query.ilike('sender', `%${sender}%`);
      if (receiver) query = query.ilike('receiver', `%${receiver}%`);
      if (dateFrom) query = query.gte('letter_date', dateFrom);
      if (dateTo) query = query.lte('letter_date', dateTo);

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      query = query.order('created_at', { ascending: false }).range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        documents: data,
        total: count || 0,
      };
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

// PERBAIKAN: Menambahkan description di sini
interface CreateDocumentPayload {
  document_type: DocumentType;
  category?: DocumentCategory | '' | null; 
  letter_number: string;
  letter_date: string | null;
  sender: string;
  receiver: string;
  subject: string;
  classification: string;
  description: string; // <-- Tambahan
  file_url: string;
  file_name: string;
  uploaded_by: string;
  uploader_name: string;
  uploader_id: string;
}

export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateDocumentPayload) => {
      const dataToInsert = {
        ...payload,
        category: payload.category === '' ? null : payload.category
      };

      const { data, error } = await supabase
        .from('documents')
        .insert([dataToInsert])
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

interface UpdateDocumentPayload extends Partial<CreateDocumentPayload> {
  id: string; 
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateDocumentPayload) => {
      const { id, ...restData } = payload;
      
      const dataToUpdate = {
        ...restData,
        ...(restData.category !== undefined && { 
          category: restData.category === '' ? null : restData.category 
        })
      };

      const { data, error } = await supabase
        .from('documents')
        .update(dataToUpdate)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', variables.id] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}