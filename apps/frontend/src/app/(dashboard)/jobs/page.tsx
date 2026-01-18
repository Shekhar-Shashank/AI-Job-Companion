'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi, applicationsApi, type Job, type CreateJobDto } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const emptyJobForm: CreateJobDto = {
  title: '',
  company: '',
  location: '',
  description: '',
  requirements: '',
  skillsRequired: '',
  sourceUrl: '',
  employmentType: 'full-time',
  isRemote: false,
};

export default function JobsPage() {
  const queryClient = useQueryClient();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [jobForm, setJobForm] = useState<CreateJobDto>(emptyJobForm);

  const { data: jobsResponse, isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => jobsApi.list(),
  });

  const jobs = jobsResponse?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: CreateJobDto) => jobsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateJobDto> }) => jobsApi.update(id, data),
    onSuccess: (updatedJob) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      // Update the selected job if it was the one being edited
      if (selectedJob?.id === editingJobId) {
        setSelectedJob({ ...selectedJob, ...updatedJob } as Job);
      }
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => jobsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setSelectedJob(null);
    },
  });

  const scoreMutation = useMutation({
    mutationFn: (jobId: string) => jobsApi.score([jobId]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (error) => {
      console.error('Score job error:', error);
      alert('Failed to score job. Please try again.');
    },
  });

  const scoreAllMutation = useMutation({
    mutationFn: () => jobsApi.score(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (error) => {
      console.error('Score all jobs error:', error);
      alert('Failed to score jobs. Please try again.');
    },
  });

  const applyMutation = useMutation({
    mutationFn: (jobId: string) => applicationsApi.create({ jobId, status: 'APPLIED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });

  // Sync selectedJob with updated data from jobs list
  useEffect(() => {
    if (selectedJob && jobs.length > 0) {
      const updatedJob = jobs.find((job) => job.id === selectedJob.id);
      if (updatedJob && JSON.stringify(updatedJob) !== JSON.stringify(selectedJob)) {
        setSelectedJob(updatedJob);
      }
    }
  }, [jobs, selectedJob]);

  const filteredJobs = jobs.filter(
    (job) =>
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.company.toLowerCase().includes(search.toLowerCase())
  );

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const scoreA = a.score?.overallScore || 0;
    const scoreB = b.score?.overallScore || 0;
    return scoreB - scoreA;
  });

  const openAddDialog = () => {
    setEditingJobId(null);
    setJobForm(emptyJobForm);
    setIsDialogOpen(true);
  };

  const openEditDialog = (job: Job) => {
    setEditingJobId(job.id);
    setJobForm({
      title: job.title || '',
      company: job.company || '',
      location: job.location || '',
      description: job.description || '',
      requirements: Array.isArray(job.requirements) ? job.requirements.join('\n') : (job.requirements || ''),
      skillsRequired: '',
      sourceUrl: job.sourceUrl || '',
      employmentType: 'full-time',
      isRemote: false,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingJobId(null);
    setJobForm(emptyJobForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobForm.title.trim() || !jobForm.company.trim()) return;

    if (editingJobId) {
      updateMutation.mutate({ id: editingJobId, data: jobForm });
    } else {
      createMutation.mutate(jobForm);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading jobs...</div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Job List */}
      <div className="w-96 flex-shrink-0 border rounded-lg bg-card flex flex-col">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search jobs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="default" size="sm" className="flex-1" onClick={openAddDialog}>
              + Add Job
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => scoreAllMutation.mutate()}
              disabled={scoreAllMutation.isPending || jobs.length === 0}
            >
              {scoreAllMutation.isPending ? 'Scoring...' : 'Score All'}
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {sortedJobs.map((job) => (
              <button
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className={cn(
                  'w-full text-left p-3 rounded-lg transition-colors',
                  selectedJob?.id === job.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{job.title}</h4>
                    <p className={cn('text-sm truncate', selectedJob?.id === job.id ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                      {job.company}
                    </p>
                  </div>
                  {job.score && (
                    <Badge
                      variant={job.score.overallScore >= 70 ? 'success' : job.score.overallScore >= 50 ? 'warning' : 'secondary'}
                      className="flex-shrink-0"
                    >
                      {job.score.overallScore}%
                    </Badge>
                  )}
                </div>
                {job.location && (
                  <p className={cn('text-xs mt-1', selectedJob?.id === job.id ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                    {job.location}
                  </p>
                )}
              </button>
            ))}
            {sortedJobs.length === 0 && (
              <div className="text-center py-8 space-y-3">
                <p className="text-sm text-muted-foreground">
                  No jobs found. Add your first job to get started!
                </p>
                <Button variant="outline" size="sm" onClick={openAddDialog}>
                  + Add Job
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Job Details */}
      <div className="flex-1 border rounded-lg bg-card overflow-hidden">
        {selectedJob ? (
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">{selectedJob.title}</h2>
                  <p className="text-lg text-muted-foreground">{selectedJob.company}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    {selectedJob.location && (
                      <span className="flex items-center gap-1">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {selectedJob.location}
                      </span>
                    )}
                    {selectedJob.salary && (
                      <span className="flex items-center gap-1">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {selectedJob.salary}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  {!selectedJob.score && (
                    <Button
                      variant="outline"
                      onClick={() => scoreMutation.mutate(selectedJob.id)}
                      disabled={scoreMutation.isPending}
                    >
                      {scoreMutation.isPending ? 'Scoring...' : 'Score Job'}
                    </Button>
                  )}
                  <Button onClick={() => applyMutation.mutate(selectedJob.id)} disabled={applyMutation.isPending}>
                    {applyMutation.isPending ? 'Applying...' : 'Apply'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => openEditDialog(selectedJob)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this job?')) {
                        deleteMutation.mutate(selectedJob.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </div>

              {selectedJob.score && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Match Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="text-4xl font-bold">
                        {selectedJob.score.overallScore}%
                      </div>
                      <Badge
                        variant={
                          selectedJob.score.overallScore >= 70
                            ? 'success'
                            : selectedJob.score.overallScore >= 50
                            ? 'warning'
                            : 'secondary'
                        }
                      >
                        {selectedJob.score.overallScore >= 70
                          ? 'Great Match'
                          : selectedJob.score.overallScore >= 50
                          ? 'Good Match'
                          : 'Low Match'}
                      </Badge>
                    </div>
                    <div className="grid gap-2 md:grid-cols-5">
                      <ScoreBar label="Semantic" value={selectedJob.score.semanticScore} />
                      <ScoreBar label="Skills" value={selectedJob.score.skillMatchScore} />
                      <ScoreBar label="Experience" value={selectedJob.score.experienceScore} />
                      <ScoreBar label="Salary" value={selectedJob.score.salaryScore} />
                      <ScoreBar label="Location" value={selectedJob.score.locationScore} />
                    </div>
                  </CardContent>
                </Card>
              )}

              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="whitespace-pre-wrap text-muted-foreground">{selectedJob.description || 'No description provided.'}</p>
              </div>

              {selectedJob.requirements && selectedJob.requirements.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Requirements</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {selectedJob.requirements.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedJob.sourceUrl && (
                <div className="pt-4 border-t">
                  <a
                    href={selectedJob.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    View original posting
                  </a>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
            <p>Select a job to view details</p>
            <p className="text-sm">or</p>
            <Button variant="outline" onClick={openAddDialog}>
              + Add Your First Job
            </Button>
          </div>
        )}
      </div>

      {/* Add/Edit Job Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingJobId ? 'Edit Job' : 'Add New Job'}</DialogTitle>
            <DialogDescription>
              {editingJobId
                ? 'Update the job details below.'
                : 'Manually add a job listing to track and score against your profile.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Senior Software Engineer"
                  value={jobForm.title}
                  onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company *</Label>
                <Input
                  id="company"
                  placeholder="e.g., Google"
                  value={jobForm.company}
                  onChange={(e) => setJobForm({ ...jobForm, company: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g., San Francisco, CA"
                  value={jobForm.location}
                  onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employmentType">Employment Type</Label>
                <Select
                  value={jobForm.employmentType}
                  onValueChange={(value) => setJobForm({ ...jobForm, employmentType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salaryMin">Min Salary</Label>
                <Input
                  id="salaryMin"
                  type="number"
                  placeholder="50000"
                  value={jobForm.salaryMin || ''}
                  onChange={(e) => setJobForm({ ...jobForm, salaryMin: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salaryMax">Max Salary</Label>
                <Input
                  id="salaryMax"
                  type="number"
                  placeholder="100000"
                  value={jobForm.salaryMax || ''}
                  onChange={(e) => setJobForm({ ...jobForm, salaryMax: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salaryCurrency">Currency</Label>
                <Select
                  value={jobForm.salaryCurrency || 'USD'}
                  onValueChange={(value) => setJobForm({ ...jobForm, salaryCurrency: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                    <SelectItem value="AUD">AUD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isRemote"
                checked={jobForm.isRemote}
                onChange={(e) => setJobForm({ ...jobForm, isRemote: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="isRemote">Remote position</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Job Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the role, responsibilities, and what makes it exciting..."
                rows={4}
                value={jobForm.description}
                onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requirements">Requirements</Label>
              <Textarea
                id="requirements"
                placeholder="List the requirements (one per line or comma-separated)..."
                rows={3}
                value={jobForm.requirements}
                onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="skills">Required Skills</Label>
              <Input
                id="skills"
                placeholder="e.g., React, Node.js, TypeScript (comma-separated)"
                value={jobForm.skillsRequired}
                onChange={(e) => setJobForm({ ...jobForm, skillsRequired: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceUrl">Job Posting URL</Label>
              <Input
                id="sourceUrl"
                type="url"
                placeholder="https://..."
                value={jobForm.sourceUrl}
                onChange={(e) => setJobForm({ ...jobForm, sourceUrl: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (editingJobId ? 'Saving...' : 'Adding...') : (editingJobId ? 'Save Changes' : 'Add Job')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-sm text-muted-foreground mb-1">{label}</div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            value >= 70 ? 'bg-green-500' : value >= 50 ? 'bg-yellow-500' : 'bg-gray-400'
          )}
          style={{ width: `${value}%` }}
        />
      </div>
      <div className="text-xs mt-1">{value}%</div>
    </div>
  );
}
