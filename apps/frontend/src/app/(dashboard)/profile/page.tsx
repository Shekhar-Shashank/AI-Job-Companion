'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi, skillsApi, experienceApi, educationApi, type Skill, type Experience, type Education } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateRange } from '@/lib/utils';

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.get,
  });

  const [formData, setFormData] = useState({
    name: '',
    title: '',
    bio: '',
    location: '',
    phone: '',
    linkedin: '',
    github: '',
    website: '',
  });

  const updateMutation = useMutation({
    mutationFn: profileApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setIsEditing(false);
    },
  });

  const handleEdit = () => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        title: profile.title || '',
        bio: profile.bio || '',
        location: profile.location || '',
        phone: profile.phone || '',
        linkedin: profile.linkedin || '',
        github: profile.github || '',
        website: profile.website || '',
      });
    }
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Your personal and contact details</CardDescription>
            </div>
            {!isEditing && (
              <Button variant="outline" onClick={handleEdit}>
                Edit Profile
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Professional Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Senior Software Engineer"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  rows={3}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="City, Country"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn</Label>
                  <Input
                    id="linkedin"
                    value={formData.linkedin}
                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                    placeholder="linkedin.com/in/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="github">GitHub</Label>
                  <Input
                    id="github"
                    value={formData.github}
                    onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                    placeholder="github.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="yourwebsite.com"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{profile?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Title</p>
                  <p className="font-medium">{profile?.title || '-'}</p>
                </div>
              </div>
              {profile?.bio && (
                <div>
                  <p className="text-sm text-muted-foreground">Bio</p>
                  <p>{profile.bio}</p>
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{profile?.location || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{profile?.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">LinkedIn</p>
                  <p className="font-medium">{profile?.linkedin || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">GitHub</p>
                  <p className="font-medium">{profile?.github || '-'}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skills */}
      <SkillsSection skills={profile?.skills || []} />

      {/* Experience */}
      <ExperienceSection experiences={profile?.experience || []} />

      {/* Education */}
      <EducationSection education={profile?.education || []} />
    </div>
  );
}

function SkillsSection({ skills }: { skills: Skill[] }) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newSkill, setNewSkill] = useState({ name: '', level: 'INTERMEDIATE' });

  const addMutation = useMutation({
    mutationFn: skillsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setIsAdding(false);
      setNewSkill({ name: '', level: 'INTERMEDIATE' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: skillsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  const levelColors: Record<string, 'default' | 'secondary' | 'success' | 'warning'> = {
    BEGINNER: 'secondary',
    INTERMEDIATE: 'default',
    ADVANCED: 'success',
    EXPERT: 'warning',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Skills</CardTitle>
            <CardDescription>Your technical and professional skills</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
            Add Skill
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isAdding && (
          <div className="mb-4 p-4 border rounded-lg space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Skill Name</Label>
                <Input
                  value={newSkill.name}
                  onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                  placeholder="e.g., React, Python, AWS"
                />
              </div>
              <div className="space-y-2">
                <Label>Level</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border bg-background"
                  value={newSkill.level}
                  onChange={(e) => setNewSkill({ ...newSkill, level: e.target.value })}
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="EXPERT">Expert</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => addMutation.mutate(newSkill)} disabled={!newSkill.name}>
                Add
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <Badge
              key={skill.id}
              variant={levelColors[skill.level] || 'default'}
              className="cursor-pointer hover:opacity-80"
              onClick={() => {
                if (confirm('Delete this skill?')) {
                  deleteMutation.mutate(skill.id);
                }
              }}
            >
              {skill.name} ({skill.level.toLowerCase()})
            </Badge>
          ))}
          {skills.length === 0 && !isAdding && (
            <p className="text-sm text-muted-foreground">No skills added yet. Click &quot;Add Skill&quot; to get started.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ExperienceSection({ experiences }: { experiences: Experience[] }) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newExp, setNewExp] = useState({
    company: '',
    title: '',
    location: '',
    startDate: '',
    endDate: '',
    current: false,
    description: '',
  });

  const addMutation = useMutation({
    mutationFn: experienceApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setIsAdding(false);
      setNewExp({ company: '', title: '', location: '', startDate: '', endDate: '', current: false, description: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: experienceApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Work Experience</CardTitle>
            <CardDescription>Your professional work history</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
            Add Experience
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isAdding && (
          <div className="mb-4 p-4 border rounded-lg space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Company</Label>
                <Input
                  value={newExp.company}
                  onChange={(e) => setNewExp({ ...newExp, company: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Job Title</Label>
                <Input
                  value={newExp.title}
                  onChange={(e) => setNewExp({ ...newExp, title: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={newExp.location}
                  onChange={(e) => setNewExp({ ...newExp, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={newExp.startDate}
                  onChange={(e) => setNewExp({ ...newExp, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={newExp.endDate}
                  onChange={(e) => setNewExp({ ...newExp, endDate: e.target.value })}
                  disabled={newExp.current}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="current"
                checked={newExp.current}
                onChange={(e) => setNewExp({ ...newExp, current: e.target.checked })}
              />
              <Label htmlFor="current">I currently work here</Label>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newExp.description}
                onChange={(e) => setNewExp({ ...newExp, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => addMutation.mutate(newExp)} disabled={!newExp.company || !newExp.title}>
                Add
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        <div className="space-y-4">
          {experiences.map((exp) => (
            <div key={exp.id} className="border rounded-lg p-4 relative group">
              <button
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                onClick={() => {
                  if (confirm('Delete this experience?')) {
                    deleteMutation.mutate(exp.id);
                  }
                }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h4 className="font-semibold">{exp.title}</h4>
              <p className="text-muted-foreground">{exp.company}</p>
              <p className="text-sm text-muted-foreground">
                {formatDateRange(exp.startDate, exp.current ? null : exp.endDate)}
                {exp.location && ` • ${exp.location}`}
              </p>
              {exp.description && <p className="mt-2 text-sm">{exp.description}</p>}
            </div>
          ))}
          {experiences.length === 0 && !isAdding && (
            <p className="text-sm text-muted-foreground">No experience added yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EducationSection({ education }: { education: Education[] }) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newEdu, setNewEdu] = useState({
    institution: '',
    degree: '',
    field: '',
    startDate: '',
    endDate: '',
  });

  const addMutation = useMutation({
    mutationFn: educationApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setIsAdding(false);
      setNewEdu({ institution: '', degree: '', field: '', startDate: '', endDate: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: educationApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Education</CardTitle>
            <CardDescription>Your educational background</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
            Add Education
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isAdding && (
          <div className="mb-4 p-4 border rounded-lg space-y-3">
            <div className="space-y-2">
              <Label>Institution</Label>
              <Input
                value={newEdu.institution}
                onChange={(e) => setNewEdu({ ...newEdu, institution: e.target.value })}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Degree</Label>
                <Input
                  value={newEdu.degree}
                  onChange={(e) => setNewEdu({ ...newEdu, degree: e.target.value })}
                  placeholder="e.g., Bachelor of Science"
                />
              </div>
              <div className="space-y-2">
                <Label>Field of Study</Label>
                <Input
                  value={newEdu.field}
                  onChange={(e) => setNewEdu({ ...newEdu, field: e.target.value })}
                  placeholder="e.g., Computer Science"
                />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={newEdu.startDate}
                  onChange={(e) => setNewEdu({ ...newEdu, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={newEdu.endDate}
                  onChange={(e) => setNewEdu({ ...newEdu, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => addMutation.mutate(newEdu)} disabled={!newEdu.institution}>
                Add
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        <div className="space-y-4">
          {education.map((edu) => (
            <div key={edu.id} className="border rounded-lg p-4 relative group">
              <button
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                onClick={() => {
                  if (confirm('Delete this education?')) {
                    deleteMutation.mutate(edu.id);
                  }
                }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h4 className="font-semibold">{edu.degree} in {edu.field}</h4>
              <p className="text-muted-foreground">{edu.institution}</p>
              <p className="text-sm text-muted-foreground">
                {formatDateRange(edu.startDate, edu.endDate)}
              </p>
            </div>
          ))}
          {education.length === 0 && !isAdding && (
            <p className="text-sm text-muted-foreground">No education added yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
