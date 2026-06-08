'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getProfileByAuthId } from '@/lib/userProfile';
import LoadingState from '../components/LoadingState';

/** Legacy route — your workouts now live on your rower profile. */
export default function WorkoutsRedirect() {
  const router = useRouter();

  useEffect(() => {
    const go = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session?.user.id) { router.replace('/login'); return; }
      const profile = await getProfileByAuthId(session.user.id);
      router.replace(profile ? `/rowers/${profile.id}` : '/login');
    };
    go();
  }, [router]);

  return (
    <div className="mx-auto max-w-feed px-4 py-10 sm:px-6">
      <LoadingState count={2} />
    </div>
  );
}
