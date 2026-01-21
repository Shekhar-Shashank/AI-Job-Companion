'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { scrapersApi, ScraperStatus, ScrapeResult, ScraperRunResult } from '@/lib/api';

interface ScraperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SOURCE_INFO: Record<string, { name: string; description: string }> = {
  indeed: { name: 'Indeed', description: 'Global job search engine with RSS feeds' },
  naukri: { name: 'Naukri', description: 'Popular job portal in India' },
  linkedin: { name: 'LinkedIn', description: 'Professional networking job listings' },
  wellfound: { name: 'Wellfound', description: 'Startup and tech job listings' },
  foundit: { name: 'Foundit', description: 'Monster India rebranded portal' },
  hirist: { name: 'Hirist', description: 'Tech-focused job portal' },
  cutshort: { name: 'Cutshort', description: 'Startup and remote job platform' },
};

export function ScraperDialog({ open, onOpenChange }: ScraperDialogProps) {
  const queryClient = useQueryClient();

  // State
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [useProfileKeywords, setUseProfileKeywords] = useState(true);
  const [customKeywords, setCustomKeywords] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<ScrapeResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Fetch scraper status
  const { data: scraperStatus } = useQuery({
    queryKey: ['scraperStatus'],
    queryFn: () => scrapersApi.status(),
    enabled: open,
  });

  // Fetch available sources
  const { data: sourcesData } = useQuery({
    queryKey: ['scraperSources'],
    queryFn: () => scrapersApi.sources(),
    enabled: open,
  });

  const sources = sourcesData?.sources || [];

  // Run scrapers mutation
  const scrapeMutation = useMutation({
    mutationFn: async () => {
      const request: any = {
        scoreAfterScrape: true,
      };

      if (selectedSources.length > 0) {
        request.sources = selectedSources;
      }

      if (!useProfileKeywords && customKeywords.trim()) {
        request.keywords = customKeywords.split(',').map((k) => k.trim()).filter(Boolean);
      }

      if (customLocation.trim()) {
        request.location = customLocation.trim();
      }

      if (remoteOnly) {
        request.remoteOnly = true;
      }

      return scrapersApi.run(request);
    },
    onSuccess: (result) => {
      setScrapeResult(result);
      // Invalidate jobs query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const handleScrape = async () => {
    setIsRunning(true);
    setScrapeResult(null);
    try {
      await scrapeMutation.mutateAsync();
    } finally {
      setIsRunning(false);
    }
  };

  const handleSourceToggle = (source: string) => {
    setSelectedSources((prev) =>
      prev.includes(source)
        ? prev.filter((s) => s !== source)
        : [...prev, source]
    );
  };

  const handleSelectAll = () => {
    const enabledSources = sources.filter((s) => {
      const status = scraperStatus?.find((st) => st.source === s);
      return status?.enabled && !status?.isBlocked;
    });
    setSelectedSources(enabledSources);
  };

  const handleSelectNone = () => {
    setSelectedSources([]);
  };

  const handleClose = () => {
    setScrapeResult(null);
    onOpenChange(false);
  };

  const getStatusBadge = (status: ScraperStatus | undefined) => {
    if (!status) return null;

    if (status.isBlocked) {
      return <Badge variant="destructive" className="text-xs">Blocked</Badge>;
    }
    if (!status.enabled) {
      return <Badge variant="secondary" className="text-xs">Disabled</Badge>;
    }
    return <Badge variant="default" className="text-xs bg-green-500">Active</Badge>;
  };

  const getResultBadge = (result: ScraperRunResult) => {
    if (result.blocked) {
      return <Badge variant="destructive">Blocked</Badge>;
    }
    if (!result.success) {
      return <Badge variant="destructive">Failed</Badge>;
    }
    return <Badge variant="default" className="bg-green-500">Success</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fetch Jobs from Job Portals</DialogTitle>
          <DialogDescription>
            Select job portals to scrape and configure search options.
          </DialogDescription>
        </DialogHeader>

        {!scrapeResult ? (
          <>
            {/* Source Selection */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Job Portals</Label>
                  <div className="space-x-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAll}
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectNone}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sources.map((source) => {
                    const info = SOURCE_INFO[source] || { name: source, description: '' };
                    const status = scraperStatus?.find((s) => s.source === source);
                    const isDisabled = status?.isBlocked || !status?.enabled;

                    return (
                      <div
                        key={source}
                        className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedSources.includes(source)
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted/50'
                        } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => !isDisabled && handleSourceToggle(source)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSources.includes(source)}
                          onChange={() => {}}
                          disabled={isDisabled}
                          className="mt-1 h-4 w-4 rounded border-gray-300"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{info.name}</span>
                            {getStatusBadge(status)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {info.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Search Options */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="useProfile"
                    checked={useProfileKeywords}
                    onChange={(e) => setUseProfileKeywords(e.target.checked)}
                  />
                  <Label htmlFor="useProfile" className="cursor-pointer">
                    Use keywords from my profile (target roles & skills)
                  </Label>
                </div>

                {!useProfileKeywords && (
                  <div>
                    <Label htmlFor="keywords">Custom Keywords</Label>
                    <Input
                      id="keywords"
                      placeholder="e.g., React Developer, Node.js, Python"
                      value={customKeywords}
                      onChange={(e) => setCustomKeywords(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Separate multiple keywords with commas
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="location">Location (optional)</Label>
                  <Input
                    id="location"
                    placeholder="e.g., Bangalore, Mumbai, Remote"
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remoteOnly"
                    checked={remoteOnly}
                    onChange={(e) => setRemoteOnly(e.target.checked)}
                  />
                  <Label htmlFor="remoteOnly" className="cursor-pointer">
                    Remote jobs only
                  </Label>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleScrape}
                disabled={isRunning || selectedSources.length === 0}
              >
                {isRunning ? (
                  <>
                    <span className="animate-spin mr-2">&#9696;</span>
                    Fetching Jobs...
                  </>
                ) : (
                  `Fetch from ${selectedSources.length || 'All'} Source${selectedSources.length !== 1 ? 's' : ''}`
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Results View */}
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-muted text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {scrapeResult.totalJobsNew}
                  </div>
                  <div className="text-xs text-muted-foreground">New Jobs</div>
                </div>
                <div className="p-4 rounded-lg bg-muted text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {scrapeResult.totalJobsUpdated}
                  </div>
                  <div className="text-xs text-muted-foreground">Updated</div>
                </div>
                <div className="p-4 rounded-lg bg-muted text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {scrapeResult.sourcesSucceeded}
                  </div>
                  <div className="text-xs text-muted-foreground">Succeeded</div>
                </div>
                <div className="p-4 rounded-lg bg-muted text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {scrapeResult.sourcesFailed}
                  </div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
              </div>

              {/* Per-source results */}
              <div>
                <Label className="mb-2 block">Results by Source</Label>
                <div className="space-y-2">
                  {scrapeResult.results.map((result) => {
                    const info = SOURCE_INFO[result.source] || { name: result.source };
                    return (
                      <div
                        key={result.source}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{info.name}</span>
                          {getResultBadge(result)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {result.success ? (
                            <>
                              {result.jobsFound} found, {result.jobsNew} new
                              {result.duration && (
                                <span className="ml-2">
                                  ({(result.duration / 1000).toFixed(1)}s)
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-red-500">{result.error}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setScrapeResult(null)}>
                Scrape Again
              </Button>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
