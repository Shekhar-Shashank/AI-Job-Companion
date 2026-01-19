'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationsApi, type Application } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { formatDate } from '@/lib/utils';

const statusOptions = ['SAVED', 'APPLIED', 'SCREENING', 'INTERVIEWING', 'OFFER', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'];

export default function ApplicationsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: applications, isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: applicationsApi.list,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => applicationsApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      addToast({
        title: 'Status Updated',
        description: 'Application status has been updated successfully.',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      addToast({
        title: 'Update Failed',
        description: error.message || 'Failed to update application status.',
        variant: 'error',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => applicationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      addToast({
        title: 'Application Removed',
        description: 'The application has been removed from your list.',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      addToast({
        title: 'Delete Failed',
        description: error.message || 'Failed to remove application.',
        variant: 'error',
      });
    },
  });

  const handleDelete = (id: string, jobTitle: string) => {
    if (confirm(`Are you sure you want to remove the application for "${jobTitle}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'success' | 'destructive' | 'warning' => {
    switch (status) {
      case 'ACCEPTED':
      case 'OFFER':
        return 'success';
      case 'REJECTED':
      case 'WITHDRAWN':
        return 'destructive';
      case 'INTERVIEWING':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading applications...</div>
      </div>
    );
  }

  const groupedApplications = statusOptions.reduce((acc, status) => {
    acc[status] = applications?.filter((app) => app.status === status) || [];
    return acc;
  }, {} as Record<string, Application[]>);

  const activeStatuses = statusOptions.filter((status) => groupedApplications[status].length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Applications</h2>
        <p className="text-muted-foreground">Track your job applications</p>
      </div>

      {applications?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No applications yet. Apply to jobs to track them here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {activeStatuses.map((status) => (
            <Card key={status}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="capitalize">{status.toLowerCase()}</CardTitle>
                  <Badge variant={getStatusVariant(status)}>{groupedApplications[status].length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {groupedApplications[status].map((app) => {
                    const jobTitle = app.job?.title || app.jobTitle || 'Unknown Position';
                    const companyName = app.job?.company || app.companyName || 'Unknown Company';

                    return (
                      <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{jobTitle}</h4>
                          <p className="text-sm text-muted-foreground truncate">{companyName}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Applied {formatDate(app.appliedDate || app.createdAt)}
                          </p>
                          {app.externalJobUrl && !app.job && (
                            <a
                              href={app.externalJobUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline"
                            >
                              View job posting
                            </a>
                          )}
                          {app.notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic truncate">
                              Note: {app.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <select
                            className="h-9 px-3 rounded-md border bg-background text-sm"
                            value={app.status}
                            onChange={(e) => updateMutation.mutate({ id: app.id, status: e.target.value })}
                            disabled={updateMutation.isPending}
                          >
                            {statusOptions.map((s) => (
                              <option key={s} value={s}>
                                {s.charAt(0) + s.slice(1).toLowerCase()}
                              </option>
                            ))}
                          </select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(app.id, jobTitle)}
                            disabled={deleteMutation.isPending}
                            className="text-muted-foreground hover:text-destructive"
                            title="Remove application"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 6h18" />
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>Application statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{applications?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {applications?.filter((a) => a.status === 'INTERVIEWING').length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Interviewing</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {applications?.filter((a) => ['OFFER', 'ACCEPTED'].includes(a.status)).length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Offers</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {applications?.filter((a) => a.status === 'REJECTED').length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Rejected</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
