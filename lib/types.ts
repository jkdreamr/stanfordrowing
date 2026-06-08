export interface User {
  id: string;
  name: string;
  teamId: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  members: User[];
  scoreMultiplier: number; // 1.2x for 5-member teams, 1.0x for 6-member teams
}

export interface Workout {
  id: string;
  oderId: string;
  date: string;
  type: WorkoutType;
  minutes: number;
  distance?: number;
  strokeRate?: number;
  splitTime?: string;
  notes?: string;
  proofUrl?: string;
  activityName?: string;
  reactions?: WorkoutReaction[];
  weightedScore?: number;
  createdAt: string;
}

export interface WorkoutReaction {
  userId: string;
  createdAt: string;
}

export type WorkoutType = 
  | 'training_session'
  | 'rowing_no_pieces'
  | 'rowing_with_pieces'
  | 'lifting_plan'
  | 'lifting_own'
  | 'cross_bike_stationary'
  | 'cross_bike_outdoor'
  | 'cross_run'
  | 'cross_swim'
  | 'cross_ball_sports'
  | 'cross_ski_downhill'
  | 'cross_ski_cross_country';

export interface WorkoutTypeConfig {
  label: string;
  multiplier: number;
  basis: 'minutes' | 'distance';
  description: string;
}

export const WORKOUT_TYPES: Record<WorkoutType, WorkoutTypeConfig> = {
  training_session: {
    label: 'Training session from plan',
    multiplier: 1,
    basis: 'distance',
    description: 'Plan-based session logged by date'
  },
  rowing_no_pieces: {
    label: 'Rowing/erging (no pieces)',
    multiplier: 1,
    basis: 'distance',
    description: 'Erg/rowing mileage without pieces'
  },
  rowing_with_pieces: {
    label: 'Rowing/erging (with pieces)',
    multiplier: 1.1,
    basis: 'distance',
    description: 'Erg/rowing mileage with pieces'
  },
  lifting_plan: {
    label: 'Lifting (from plan)',
    multiplier: 0.1315,
    basis: 'minutes',
    description: 'Plan-based lifting time'
  },
  lifting_own: {
    label: 'Lifting (own lifting)',
    multiplier: 0.09205,
    basis: 'minutes',
    description: 'Self-directed lifting time'
  },
  cross_bike_stationary: {
    label: 'Bike (stationary)',
    multiplier: 0.2104,
    basis: 'minutes',
    description: 'Stationary bike time'
  },
  cross_bike_outdoor: {
    label: 'Bike (outdoor)',
    multiplier: 0.17095,
    basis: 'minutes',
    description: 'Outdoor bike time'
  },
  cross_run: {
    label: 'Run',
    multiplier: 1,
    basis: 'distance',
    description: 'Run mileage'
  },
  cross_swim: {
    label: 'Swim',
    multiplier: 0.24985,
    basis: 'minutes',
    description: 'Swim time'
  },
  cross_ball_sports: {
    label: 'Competitive ball sports',
    multiplier: 0.09205,
    basis: 'minutes',
    description: 'Ball sports time'
  },
  cross_ski_downhill: {
    label: 'Skiing (downhill)',
    multiplier: 0.0526,
    basis: 'minutes',
    description: 'Downhill skiing time'
  },
  cross_ski_cross_country: {
    label: 'Skiing (cross country)',
    multiplier: 0.2104,
    basis: 'minutes',
    description: 'Cross-country skiing time'
  }
};

export interface DailyStats {
  date: string;
  totalMinutes: number;
  totalWeightedScore: number;
  workoutCount: number;
}

export interface TeamStats {
  teamId: string;
  teamName: string;
  totalMinutes: number;
  totalWeightedScore: number;
  workoutCount: number;
  memberCount: number;
  averagePerMember: number;
  rawWeightedScore?: number;
}

// ---- Locker Room (team motivation wall) ----

export type LockerMediaType = 'image' | 'video' | 'link' | null;

export interface LockerReaction {
  userId: string;
  createdAt: string;
}

export interface LockerPost {
  id: string;
  authorId: string; // roster id
  authorName: string;
  teamId: string;
  body: string;
  mediaUrl?: string; // uploaded image (Supabase storage)
  mediaType: LockerMediaType;
  linkUrl?: string; // external link or video URL (YouTube/Vimeo/etc)
  reactions: LockerReaction[];
  createdAt: string;
}
