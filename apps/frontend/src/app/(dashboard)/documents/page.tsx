'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi, type Document } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

const documentTypes = ['RESUME', 'COVER_LETTER', 'CERTIFICATE', 'PORTFOLIO', 'OTHER'];

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState('RESUME');
  const [isUploading, setIsUploading] = useState(false);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: documentsApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: documentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await documentsApi.upload(file, selectedType);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    } catch (error: any) {
      console.error('Upload failed:', error);
      alert(error?.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatFileSize = (bytes: number | null): string => {
    if (bytes === null || bytes === undefined) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'RESUME':
        return (
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'CERTIFICATE':
        return (
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        );
      default:
        return (
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Documents</h2>
          <p className="text-muted-foreground">Upload and manage your documents</p>
        </div>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
          <CardDescription>
            Upload resumes, certificates, and other documents for AI analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Document Type</label>
              <select
                className="h-10 px-3 rounded-md border bg-background w-40"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                {documentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full sm:w-auto"
              >
                {isUploading ? (
                  'Uploading...'
                ) : (
                  <>
                    <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Choose File
                  </>
                )}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Supported formats: PDF, DOC, DOCX, TXT. Max size: 10MB
          </p>
        </CardContent>
      </Card>

      {/* Documents List */}
      {documents?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <p className="text-muted-foreground mt-4">No documents uploaded yet.</p>
            <p className="text-sm text-muted-foreground">Upload your resume to enable AI-powered analysis.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {documents?.map((doc) => (
            <Card key={doc.id} className="relative group">
              <button
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                onClick={() => {
                  if (confirm('Delete this document?')) {
                    deleteMutation.mutate(doc.id);
                  }
                }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="text-muted-foreground">{getTypeIcon(doc.documentType || 'OTHER')}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{doc.originalFilename}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{(doc.documentType || 'other').toLowerCase().replace('_', ' ')}</Badge>
                      <span className="text-xs text-muted-foreground">{formatFileSize(doc.fileSize)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Uploaded {formatDate(doc.createdAt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
