'use client';

import { useQuery } from '@tanstack/react-query';
import { profileApi, jobsApi, applicationsApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.get,
  });

  const { data: jobsResponse } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => jobsApi.list(),
  });

  const { data: applications } = useQuery({
    queryKey: ['applications'],
    queryFn: applicationsApi.list,
  });

  const jobs = jobsResponse?.data || [];
  const topJobs = jobs.slice(0, 5);
  const recentApplications = applications?.slice(0, 5) || [];
  const skillCount = profile?.skills?.length || 0;
  const experienceCount = profile?.experience?.length || 0;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h2 className="text-2xl font-bold">Welcome back, {profile?.name || 'User'}!</h2>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your career management dashboard.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Skills</CardTitle>
            <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{skillCount}</div>
            <p className="text-xs text-muted-foreground">Skills tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Experience</CardTitle>
            <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{experienceCount}</div>
            <p className="text-xs text-muted-foreground">Work experiences</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matched Jobs</CardTitle>
            <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Jobs analyzed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{applications?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Total applications</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Jobs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Top Matched Jobs</CardTitle>
                <CardDescription>Jobs ranked by fit score</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/jobs">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {topJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No scored jobs yet. Add your profile data and start searching!
              </p>
            ) : (
              <div className="space-y-4">
                {topJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium leading-none">{job.title}</p>
                      <p className="text-sm text-muted-foreground">{job.company}</p>
                    </div>
                    <Badge variant={job.score && job.score.overallScore >= 70 ? 'success' : 'secondary'}>
                      {job.score?.overallScore || 0}% match
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Applications */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Applications</CardTitle>
                <CardDescription>Track your job applications</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/applications">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentApplications.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No applications yet. Start applying to jobs!
              </p>
            ) : (
              <div className="space-y-4">
                {recentApplications.map((app) => (
                  <div key={app.id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium leading-none">{app.job.title}</p>
                      <p className="text-sm text-muted-foreground">{app.job.company}</p>
                    </div>
                    <Badge
                      variant={
                        app.status === 'ACCEPTED'
                          ? 'success'
                          : app.status === 'REJECTED'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {app.status.toLowerCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with common tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/chat">
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Chat with AI
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/profile">
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Update Profile
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/documents">
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload Resume
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
