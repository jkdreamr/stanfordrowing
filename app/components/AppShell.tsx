import { ReactNode } from 'react';
import TopNav from './TopNav';
import BottomNav from './BottomNav';
import SwipeNav from './SwipeNav';

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh]">
      <TopNav />
      <SwipeNav>
        <main className="pt-16 pb-28 sm:pb-12">{children}</main>
      </SwipeNav>
      <BottomNav />
    </div>
  );
}
