import { ReactNode } from 'react';
import TopNav from './TopNav';
import BottomNav from './BottomNav';
import PageTransition from './PageTransition';

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-bone">
      <TopNav />
      <main className="pt-14 pb-24 sm:pb-8">
        <PageTransition>{children}</PageTransition>
      </main>
      <BottomNav />
    </div>
  );
}
