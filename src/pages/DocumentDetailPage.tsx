import { useParams, useNavigate } from 'react-router-dom';
import { useDocumentById, useDeleteDocument } from '@/hooks/useDocuments';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DOCUMENT_TYPE_LABELS } from '@/types/document';
import type { DocumentType } from '@/types/document';
import { ArrowLeft, Download, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { employee } = useAuth();
  const { data: doc, isLoading } = useDocumentById(id || '');
  const deleteDoc = useDeleteDocument();
  const [showDelete, setShowDelete] = useState(false);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Memuat...</div>;
  }

  if (!doc) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Dokumen tidak ditemukan</div>;
  }

  const handleDelete = async () => {
    try {
      await deleteDoc.mutateAsync(doc.id);
      toast.success('Dokumen berhasil dihapus');
      navigate('/archive');
    } catch {
      toast.error('Gagal menghapus dokumen');
    }
  };

  const fields = [
    { label: 'Nomor Surat', value: doc.letter_number },
    { label: 'Tanggal Surat', value: doc.letter_date },
    { label: 'Pengirim', value: doc.sender },
    { label: 'Penerima', value: doc.receiver },
    { label: 'Perihal', value: doc.subject },
    { label: 'Klasifikasi', value: doc.classification },
    { label: 'Jenis', value: DOCUMENT_TYPE_LABELS[doc.document_type as DocumentType] || doc.document_type },
    { label: 'Tanggal Upload', value: new Date(doc.created_at).toLocaleDateString('id-ID') },
  ];

  const isPdf = doc.file_name?.endsWith('.pdf') || doc.file_url?.endsWith('.pdf');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/archive')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Detail Dokumen</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Metadata</CardTitle>
            <div className="flex gap-2">
              <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" /> Unduh</Button>
              </a>
              {employee?.role === 'administrator' && (
                <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>
                  <Trash2 className="w-4 h-4 mr-1" /> Hapus
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {fields.map(({ label, value }) => (
                <div key={label} className="flex flex-col sm:flex-row sm:gap-4 py-2 border-b border-border last:border-0">
                  <dt className="text-sm font-medium text-muted-foreground w-32 shrink-0">{label}</dt>
                  <dd className="text-sm text-foreground">{value || '-'}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Pratinjau Dokumen</CardTitle>
          </CardHeader>
          <CardContent>
            {isPdf ? (
              <iframe src={doc.file_url} className="w-full h-[500px] rounded-lg border border-border" title="Document preview" />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <ExternalLink className="w-8 h-8 mb-2" />
                <p className="text-sm">Pratinjau tidak tersedia untuk format ini</p>
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="mt-2">Buka File</Button>
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Hapus Dokumen"
        description={`Apakah Anda yakin ingin menghapus "${doc.file_name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
