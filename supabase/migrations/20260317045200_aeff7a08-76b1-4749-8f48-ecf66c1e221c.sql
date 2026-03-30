-- Create employees table
CREATE TABLE public.employees (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  nip TEXT NOT NULL UNIQUE,
  position TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('administrator', 'umum', 'viewer')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Employees can read their own data (needed for NIP lookup at login)
CREATE POLICY "Anyone can lookup employee by NIP for login"
  ON public.employees FOR SELECT
  USING (true);

-- Only administrators can insert/update/delete employees
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = _user_id AND role = 'administrator'
  );
$$;

CREATE POLICY "Admins can insert employees"
  ON public.employees FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update employees"
  ON public.employees FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete employees"
  ON public.employees FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Create documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_type TEXT NOT NULL CHECK (document_type IN ('incoming', 'outgoing')),
  letter_number TEXT NOT NULL DEFAULT '',
  letter_date DATE,
  sender TEXT NOT NULL DEFAULT '',
  receiver TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  classification TEXT NOT NULL DEFAULT '',
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL DEFAULT '',
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read documents
CREATE POLICY "Authenticated users can view documents"
  ON public.documents FOR SELECT
  TO authenticated
  USING (true);

-- Umum and admin can insert
CREATE POLICY "Umum and admin can insert documents"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE id = auth.uid() AND role IN ('administrator', 'umum')
    )
  );

-- Users can update own docs, admins can update any
CREATE POLICY "Users can update own or admin all"
  ON public.documents FOR UPDATE
  TO authenticated
  USING (
    uploaded_by = auth.uid() OR public.is_admin(auth.uid())
  );

-- Only admins can delete
CREATE POLICY "Admins can delete documents"
  ON public.documents FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('bapas-documents', 'bapas-documents', true);

-- Storage policies
CREATE POLICY "Authenticated users can view bapas documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'bapas-documents');

CREATE POLICY "Authenticated users can upload bapas documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'bapas-documents');

-- Auto-create employee profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.employees (id, name, nip, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'nip', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();