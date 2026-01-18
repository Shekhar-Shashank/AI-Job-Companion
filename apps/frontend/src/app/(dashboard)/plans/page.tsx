'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { plansApi, type Plan } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const planTypes = ['career', 'daily', 'weekly', 'monthly', 'study', 'workout'];

export default function PlansPage() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newPlan, setNewPlan] = useState({
    title: '',
    description: '',
    planType: 'career',
    startDate: '',
    endDate: '',
  });

  const { data: plans, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: plansApi.list,
  });

  const createMutation = useMutation({
    mutationFn: (plan: typeof newPlan) => {
      // Convert empty date strings to undefined before API call
      return plansApi.create({
        ...plan,
        startDate: plan.startDate || undefined,
        endDate: plan.endDate || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setIsCreating(false);
      setNewPlan({ title: '', description: '', planType: 'career', startDate: '', endDate: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: plansApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
  });

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'success' | 'warning' => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'IN_PROGRESS':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading plans...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Plans</h2>
          <p className="text-muted-foreground">Manage your career and life plans</p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Plan
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={newPlan.title}
                onChange={(e) => setNewPlan({ ...newPlan, title: e.target.value })}
                placeholder="e.g., Q1 Learning Goals"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newPlan.description}
                onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                placeholder="Describe your plan..."
                rows={3}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border bg-background"
                  value={newPlan.planType}
                  onChange={(e) => setNewPlan({ ...newPlan, planType: e.target.value })}
                >
                  {planTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={newPlan.startDate}
                  onChange={(e) => setNewPlan({ ...newPlan, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={newPlan.endDate}
                  onChange={(e) => setNewPlan({ ...newPlan, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => createMutation.mutate(newPlan)} disabled={!newPlan.title}>
                Create Plan
              </Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {plans?.length === 0 && !isCreating ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No plans yet. Create your first plan to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {plans?.map((plan) => (
            <PlanCard key={plan.id} plan={plan} onDelete={() => deleteMutation.mutate(plan.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function PlanCard({ plan, onDelete }: { plan: Plan; onDelete: () => void }) {
  const completedItems = plan.items?.filter((item) => item.status === 'COMPLETED').length || 0;
  const totalItems = plan.items?.length || 0;
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'success' | 'warning' => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'IN_PROGRESS':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  return (
    <Card className="relative group">
      <button
        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
        onClick={() => {
          if (confirm('Delete this plan?')) {
            onDelete();
          }
        }}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{plan.title}</CardTitle>
            <CardDescription>{plan.description}</CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline">{(plan.type || 'other')}</Badge>
          <Badge variant={getStatusVariant(plan.status)}>{(plan.status || 'pending').toLowerCase().replace('_', ' ')}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {totalItems > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span>{completedItems}/{totalItems} items</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        {plan.startDate && (
          <p className="text-xs text-muted-foreground mt-3">
            {plan.startDate && new Date(plan.startDate).toLocaleDateString()}
            {plan.endDate && ` - ${new Date(plan.endDate).toLocaleDateString()}`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
