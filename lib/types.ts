export interface User {
  id: string;
  name: string;
  teamId: string;
  avatarUrl?: string;
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
  userName?: string;
  teamId?: string;
  date: string;
  type: WorkoutType;
  minutes: number;
  distance?: number;
  strokeRate?: number;
  splitTime?: string;
  notes?: string;
  proofUrl?: string;
  proofUrls?: string[];
  activityName?: string;
  reactions?: WorkoutReaction[];
  comments?: WorkoutComment[];
  weightedScore?: number;
  createdAt: string;
}

export interface WorkoutReaction {
  userId: string;
  createdAt: string;
}

export interface WorkoutComment {
  id: string;
  userId: string;
  userName?: string;
  body: string;
  parentId?: string;
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
    multiplier: 0.001,
    basis: 'distance',
    description: 'Erg/rowing meters without pieces'
  },
  rowing_with_pieces: {
    label: 'Rowing/erging (with pieces)',
    multiplier: 0.0011,
    basis: 'distance',
    description: 'Erg/rowing meters with pieces'
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
    /**
     * Priced so that an hour of running is worth an hour of erging.
     *
     * At the old 0.001 a run paid exactly what an erg metre paid, which sounds
     * fair and isn't: nobody runs a metre as fast as they pull one. An hour at
     * 8:00/mile came to 12.1 points against 15.0 for an ordinary 2:00 split, so
     * the rowers who cannot run fast — generally the biggest ones — were docked
     * about a quarter of their score for training hard on their feet.
     *
     * 0.00125 sets the crossover at 8:00/mile <-> 2:00/500m, two efforts that
     * really are comparable here: 15.1 against 15.0 points an hour. Quick
     * runners still come out ahead, as quick ergers do, but not enough to make
     * running the cheapest points in the app — a 7:00/mile hour pays 17.2,
     * under what a 1:40 erg hour pays.
     */
    label: 'Run',
    multiplier: 0.00125,
    basis: 'distance',
    description: 'Run meters'
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
  emoji: string;
  createdAt: string;
}

export interface LockerComment {
  id: string;
  userId: string;
  userName?: string;
  body: string;
  parentId?: string;
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
  comments: LockerComment[];
  pinned: boolean;
  createdAt: string;
}

/** Emoji presets shown in the reaction picker (first is the default). */
export const REACTION_EMOJIS = ['🔥', '❤️', '👍', '😂', '💪', '👏', '🙌', '😮'];

// ---- Stories (Instagram-style photo/video posts) ----

export type StoryMediaType = 'image' | 'video';

export interface Story {
  id: string;
  userId: string;
  userName: string;
  mediaUrl: string;
  mediaType: StoryMediaType;
  caption?: string;
  createdAt: string;
}

export interface StoryComment {
  id: string;
  userId: string;
  userName?: string;
  body: string;
  createdAt: string;
}
