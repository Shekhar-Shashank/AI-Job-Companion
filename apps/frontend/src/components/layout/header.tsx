'use client';

import { usePathname } from 'next/navigation';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/chat': 'AI Assistant',
  '/profile': 'Profile',
  '/jobs': 'Jobs',
  '/applications': 'Applications',
  '/plans': 'Plans',
  '/documents': 'Documents',
};

export function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname || ''] || 'Dashboard';

  return (
    <header className="flex h-16 items-center border-b bg-card px-6">
      <h1 className="text-xl font-semibold">{title}</h1>
    </header>
  );
}
