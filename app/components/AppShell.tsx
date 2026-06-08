import { ReactNode } from 'react';
import TopNav from './TopNav';
import BottomNav from './BottomNav';

/** App chrome: sticky top nav (all sizes) + mobile bottom tab bar. */
export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <TopNav />
      <main className="pt-16 pb-28 sm:pb-12">{children}</main>
      <BottomNav />
    </div>
  );
}
