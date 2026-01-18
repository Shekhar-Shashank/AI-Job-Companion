'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationsApi, type Application } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

const statusOptions = ['SAVED', 'APPLIED', 'SCREENING', 'INTERVIEWING', 'OFFER', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'];

export default function ApplicationsPage() {
  const queryClient = useQueryClient();

  const { data: applications, isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: applicationsApi.list,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => applicationsApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });

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
                  {groupedApplications[status].map((app) => (
                    <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{app.job.title}</h4>
                        <p className="text-sm text-muted-foreground">{app.job.company}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Applied {formatDate(app.appliedAt)}
                        </p>
                      </div>
                      <select
                        className="h-9 px-3 rounded-md border bg-background text-sm"
                        value={app.status}
                        onChange={(e) => updateMutation.mutate({ id: app.id, status: e.target.value })}
                      >
                        {statusOptions.map((s) => (
                          <option key={s} value={s}>
                            {s.charAt(0) + s.slice(1).toLowerCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
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
