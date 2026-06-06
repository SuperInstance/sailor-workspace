export type QuestRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type QuestStatus = 'available' | 'in-progress' | 'completed';
export type QuestCategory = 'tutorial' | 'daily' | 'weekly' | 'mastery' | 'epic';

export interface QuestObjective {
  id: string;
  label: string;
  completed: boolean;
  locked?: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  category: QuestCategory;
  rarity: QuestRarity;
  icon: string;
  objectives: QuestObjective[];
  xpReward: number;
  tileReward?: string;
  agentXpBonus?: number;
  status: QuestStatus;
  timeRemaining?: string;
  timeTotal?: string;
  difficulty?: string;
  estimatedTime?: string;
}

export interface PlayerStats {
  level: number;
  title: string;
  currentXp: number;
  xpToNextLevel: number;
  streakDays: number;
  totalQuestsCompleted: number;
  achievementPoints: number;
  roomsExplored: number;
  agentsSummoned: number;
  tilesCollected: number;
  codeBlocksWritten: number;
  weekActivity: boolean[];
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar: string;
  level: number;
  questsCompleted: number;
  coherence: number;
  totalXp: number;
  tiles: number;
  isCurrentUser?: boolean;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  type: 'title' | 'cosmetic' | 'agent_skin' | 'room_theme' | 'booster';
  rarity: QuestRarity;
  icon: string;
  equipped?: boolean;
  category?: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  hint?: string;
  category: 'explorer' | 'coder' | 'architect' | 'sage' | 'commander' | 'alchemist';
  rarity: QuestRarity;
  unlocked: boolean;
  unlockedDate?: string;
  progress: number;
  maxProgress: number;
  icon: string;
}

export const RARITY_COLORS: Record<QuestRarity, string> = {
  common: '#9CA3AF',
  uncommon: '#4ADE80',
  rare: '#60A5FA',
  epic: '#A78BFA',
  legendary: '#FFD700',
};

export const CATEGORY_COLORS: Record<QuestCategory, string> = {
  tutorial: '#4ADE80',
  daily: '#F5CB4E',
  weekly: '#60A5FA',
  mastery: '#A78BFA',
  epic: '#FFD700',
};

export const playerStats: PlayerStats = {
  level: 7,
  title: 'Apprentice Architect',
  currentXp: 2450,
  xpToNextLevel: 3000,
  streakDays: 7,
  totalQuestsCompleted: 47,
  achievementPoints: 1250,
  roomsExplored: 38,
  agentsSummoned: 19,
  tilesCollected: 312,
  codeBlocksWritten: 847,
  weekActivity: [true, true, true, true, true, true, false],
};

export const levelNames = [
  'Novice', 'Apprentice', 'Journeyman', 'Wanderer',
  'Explorer', 'Architect', 'Master', 'Grandmaster', 'Legend',
];

export const quests: Quest[] = [
  // Tutorial quests
  {
    id: 't1',
    title: 'Summon Your First Agent',
    description: 'Visit the Agent Guild and summon a Scholar agent to assist you.',
    category: 'tutorial',
    rarity: 'common',
    icon: 'users',
    objectives: [
      { id: 't1o1', label: 'Navigate to the Agent Guild', completed: true },
      { id: 't1o2', label: 'Choose an agent type', completed: true },
      { id: 't1o3', label: 'Complete the summoning ritual', completed: false },
    ],
    xpReward: 100,
    status: 'in-progress',
    difficulty: 'Easy',
    estimatedTime: '5 min',
  },
  {
    id: 't2',
    title: 'Explore 3 Rooms',
    description: 'Navigate to and enter at least 3 different repository rooms.',
    category: 'tutorial',
    rarity: 'common',
    icon: 'door',
    objectives: [
      { id: 't2o1', label: 'Enter your first room', completed: true },
      { id: 't2o2', label: 'Enter a second room', completed: true },
      { id: 't2o3', label: 'Enter a third room', completed: false },
    ],
    xpReward: 150,
    status: 'in-progress',
    difficulty: 'Easy',
    estimatedTime: '10 min',
  },
  {
    id: 't3',
    title: 'Collect 5 Tiles',
    description: 'Find and collect 5 PLATO tiles scattered throughout the rooms.',
    category: 'tutorial',
    rarity: 'common',
    icon: 'layers',
    objectives: [
      { id: 't3o1', label: 'Find your first tile', completed: true },
      { id: 't3o2', label: 'Collect 2 more tiles', completed: true },
      { id: 't3o3', label: 'Reach 5 tiles total', completed: false },
    ],
    xpReward: 200,
    tileReward: 'Scroll Fragment',
    status: 'in-progress',
    difficulty: 'Easy',
    estimatedTime: '15 min',
  },
  {
    id: 't4',
    title: 'Write Your First Code Block',
    description: 'Open Agentic Scratch and create a simple agent behavior program.',
    category: 'tutorial',
    rarity: 'common',
    icon: 'terminal',
    objectives: [
      { id: 't4o1', label: 'Open Agentic Scratch', completed: false, locked: true },
      { id: 't4o2', label: 'Place a start block', completed: false, locked: true },
      { id: 't4o3', label: 'Run the program', completed: false, locked: true },
    ],
    xpReward: 150,
    status: 'available',
    difficulty: 'Easy',
    estimatedTime: '10 min',
  },
  {
    id: 't5',
    title: 'Check Fleet Coherence',
    description: 'View the fleet coherence monitor and understand the conservation law.',
    category: 'tutorial',
    rarity: 'common',
    icon: 'activity',
    objectives: [
      { id: 't5o1', label: 'Open the Dashboard', completed: false, locked: true },
      { id: 't5o2', label: 'Locate the coherence meter', completed: false, locked: true },
    ],
    xpReward: 75,
    status: 'available',
    difficulty: 'Easy',
    estimatedTime: '3 min',
  },
  {
    id: 't6',
    title: 'Speak to an Agent',
    description: 'Use the MUD command parser to send a message to an active agent.',
    category: 'tutorial',
    rarity: 'common',
    icon: 'message',
    objectives: [
      { id: 't6o1', label: 'Click the command parser', completed: false, locked: true },
      { id: 't6o2', label: 'Type a message to your agent', completed: false, locked: true },
      { id: 't6o3', label: 'Receive a response', completed: false, locked: true },
    ],
    xpReward: 100,
    status: 'available',
    difficulty: 'Easy',
    estimatedTime: '5 min',
  },
  {
    id: 't7',
    title: 'Visit the Knowledge Vault',
    description: 'Navigate to the Knowledge Vault and browse the PLATO tile collection.',
    category: 'tutorial',
    rarity: 'uncommon',
    icon: 'book',
    objectives: [
      { id: 't7o1', label: 'Open the Knowledge Vault', completed: false, locked: true },
      { id: 't7o2', label: 'Browse 5 different tiles', completed: false, locked: true },
      { id: 't7o3', label: 'Read a tile\'s knowledge content', completed: false, locked: true },
    ],
    xpReward: 200,
    tileReward: 'Scholar Bookmark',
    status: 'available',
    difficulty: 'Easy',
    estimatedTime: '10 min',
  },

  // Daily quests
  {
    id: 'd1',
    title: 'Check Fleet Coherence',
    description: 'Monitor the fleet coherence status for today.',
    category: 'daily',
    rarity: 'common',
    icon: 'activity',
    objectives: [
      { id: 'd1o1', label: 'View coherence dashboard', completed: true },
      { id: 'd1o2', label: 'Record today\'s value', completed: false },
    ],
    xpReward: 50,
    status: 'in-progress',
    timeRemaining: '14h 23m',
    timeTotal: '24h',
    difficulty: 'Easy',
    estimatedTime: '2 min',
  },
  {
    id: 'd2',
    title: 'Review 3 Code Blocks',
    description: 'Review and validate at least 3 agent-generated code blocks.',
    category: 'daily',
    rarity: 'common',
    icon: 'code',
    objectives: [
      { id: 'd2o1', label: 'Review code block 1', completed: true },
      { id: 'd2o2', label: 'Review code block 2', completed: true },
      { id: 'd2o3', label: 'Review code block 3', completed: false },
    ],
    xpReward: 100,
    status: 'in-progress',
    timeRemaining: '14h 23m',
    timeTotal: '24h',
    difficulty: 'Easy',
    estimatedTime: '15 min',
  },
  {
    id: 'd3',
    title: 'Help Another Player',
    description: 'Assist another fleet member by answering a question or sharing a tile.',
    category: 'daily',
    rarity: 'uncommon',
    icon: 'heart',
    objectives: [
      { id: 'd3o1', label: 'Find a player in need', completed: false },
      { id: 'd3o2', label: 'Provide assistance', completed: false },
    ],
    xpReward: 150,
    status: 'available',
    timeRemaining: '14h 23m',
    timeTotal: '24h',
    difficulty: 'Medium',
    estimatedTime: '10 min',
  },
  {
    id: 'd4',
    title: 'Collect 2 Tiles',
    description: 'Gather 2 PLATO tiles from any rooms you explore today.',
    category: 'daily',
    rarity: 'common',
    icon: 'layers',
    objectives: [
      { id: 'd4o1', label: 'Collect tile 1', completed: false },
      { id: 'd4o2', label: 'Collect tile 2', completed: false },
    ],
    xpReward: 75,
    status: 'available',
    timeRemaining: '14h 23m',
    timeTotal: '24h',
    difficulty: 'Easy',
    estimatedTime: '10 min',
  },
  {
    id: 'd5',
    title: 'Summon a Scout Agent',
    description: 'Call upon a Scout to explore the fleet repositories.',
    category: 'daily',
    rarity: 'uncommon',
    icon: 'eye',
    objectives: [
      { id: 'd5o1', label: 'Go to the Agent Guild', completed: false },
      { id: 'd5o2', label: 'Choose Scout type', completed: false },
      { id: 'd5o3', label: 'Complete summoning', completed: false },
    ],
    xpReward: 125,
    agentXpBonus: 50,
    status: 'available',
    timeRemaining: '14h 23m',
    timeTotal: '24h',
    difficulty: 'Medium',
    estimatedTime: '5 min',
  },
  {
    id: 'd6',
    title: 'Send a MUD Command',
    description: 'Use the terminal to issue at least one MUD command.',
    category: 'daily',
    rarity: 'common',
    icon: 'terminal',
    objectives: [
      { id: 'd6o1', label: 'Open command parser', completed: true },
      { id: 'd6o2', label: 'Type and send a command', completed: true },
    ],
    xpReward: 50,
    status: 'completed',
    timeRemaining: '14h 23m',
    timeTotal: '24h',
    difficulty: 'Easy',
    estimatedTime: '1 min',
  },
  {
    id: 'd7',
    title: 'Visit 2 Rooms',
    description: 'Explore 2 different repository rooms in the fleet.',
    category: 'daily',
    rarity: 'common',
    icon: 'door',
    objectives: [
      { id: 'd7o1', label: 'Visit room 1', completed: true },
      { id: 'd7o2', label: 'Visit room 2', completed: true },
    ],
    xpReward: 75,
    status: 'completed',
    timeRemaining: '14h 23m',
    timeTotal: '24h',
    difficulty: 'Easy',
    estimatedTime: '5 min',
  },

  // Weekly quests
  {
    id: 'w1',
    title: 'Build a Room',
    description: 'Use Room Crafter to design and build a custom room layout.',
    category: 'weekly',
    rarity: 'uncommon',
    icon: 'hammer',
    objectives: [
      { id: 'w1o1', label: 'Open Room Crafter', completed: true },
      { id: 'w1o2', label: 'Place 5 or more objects', completed: true },
      { id: 'w1o3', label: 'Add at least 1 NPC', completed: false },
      { id: 'w1o4', label: 'Save your room design', completed: false },
    ],
    xpReward: 300,
    tileReward: 'Builder Blueprint',
    status: 'in-progress',
    timeRemaining: '3 days',
    timeTotal: '7 days',
    difficulty: 'Medium',
    estimatedTime: '1 hour',
  },
  {
    id: 'w2',
    title: 'Complete a Scratch Program',
    description: 'Build a complete agent behavior program in Agentic Scratch.',
    category: 'weekly',
    rarity: 'uncommon',
    icon: 'puzzle',
    objectives: [
      { id: 'w2o1', label: 'Open Agentic Scratch', completed: true },
      { id: 'w2o2', label: 'Build a program with 10+ blocks', completed: false },
      { id: 'w2o3', label: 'Run and test the program', completed: false },
      { id: 'w2o4', label: 'Save the program', completed: false },
    ],
    xpReward: 400,
    status: 'in-progress',
    timeRemaining: '3 days',
    timeTotal: '7 days',
    difficulty: 'Medium',
    estimatedTime: '2 hours',
  },
  {
    id: 'w3',
    title: 'Reach Level 10',
    description: 'Earn enough XP to reach level 10 in your journey.',
    category: 'weekly',
    rarity: 'rare',
    icon: 'star',
    objectives: [
      { id: 'w3o1', label: 'Reach level 8', completed: true },
      { id: 'w3o2', label: 'Reach level 9', completed: false },
      { id: 'w3o3', label: 'Reach level 10', completed: false },
    ],
    xpReward: 500,
    tileReward: 'Level Badge',
    status: 'in-progress',
    timeRemaining: '3 days',
    timeTotal: '7 days',
    difficulty: 'Hard',
    estimatedTime: 'Varies',
  },
  {
    id: 'w4',
    title: 'Collect 20 Tiles',
    description: 'Gather 20 PLATO tiles throughout the week.',
    category: 'weekly',
    rarity: 'uncommon',
    icon: 'gem',
    objectives: [
      { id: 'w4o1', label: 'Collect 5 tiles', completed: true },
      { id: 'w4o2', label: 'Collect 10 tiles', completed: true },
      { id: 'w4o3', label: 'Collect 15 tiles', completed: false },
      { id: 'w4o4', label: 'Collect 20 tiles', completed: false },
    ],
    xpReward: 350,
    status: 'in-progress',
    timeRemaining: '3 days',
    timeTotal: '7 days',
    difficulty: 'Medium',
    estimatedTime: 'Varies',
  },
  {
    id: 'w5',
    title: 'Complete 10 Daily Quests',
    description: 'Finish at least 10 daily quests throughout the week.',
    category: 'weekly',
    rarity: 'common',
    icon: 'calendar',
    objectives: [
      { id: 'w5o1', label: 'Complete 3 daily quests', completed: true },
      { id: 'w5o2', label: 'Complete 6 daily quests', completed: true },
      { id: 'w5o3', label: 'Complete 10 daily quests', completed: false },
    ],
    xpReward: 250,
    status: 'in-progress',
    timeRemaining: '3 days',
    timeTotal: '7 days',
    difficulty: 'Easy',
    estimatedTime: 'Varies',
  },
  {
    id: 'w6',
    title: 'Summon 5 Different Agent Types',
    description: 'Have at least one of each agent type active simultaneously.',
    category: 'weekly',
    rarity: 'rare',
    icon: 'users',
    objectives: [
      { id: 'w6o1', label: 'Summon a Scholar', completed: true },
      { id: 'w6o2', label: 'Summon a Scout', completed: true },
      { id: 'w6o3', label: 'Summon a Builder', completed: true },
      { id: 'w6o4', label: 'Summon a Commander', completed: false },
      { id: 'w6o5', label: 'Summon an Alchemist', completed: false },
    ],
    xpReward: 450,
    agentXpBonus: 200,
    status: 'in-progress',
    timeRemaining: '3 days',
    timeTotal: '7 days',
    difficulty: 'Hard',
    estimatedTime: '30 min',
  },
  {
    id: 'w7',
    title: 'Review a Pull Request',
    description: 'Use the Critic agent to review and comment on a code change.',
    category: 'weekly',
    rarity: 'uncommon',
    icon: 'git-pull',
    objectives: [
      { id: 'w7o1', label: 'Find an open pull request', completed: false },
      { id: 'w7o2', label: 'Assign Critic agent', completed: false },
      { id: 'w7o3', label: 'Review the feedback', completed: false },
    ],
    xpReward: 300,
    status: 'available',
    timeRemaining: '3 days',
    timeTotal: '7 days',
    difficulty: 'Medium',
    estimatedTime: '20 min',
  },

  // Mastery quests
  {
    id: 'm1',
    title: 'Max Out Scholar Skills',
    description: 'Fully upgrade a Scholar agent\'s abilities and skill tree.',
    category: 'mastery',
    rarity: 'epic',
    icon: 'graduation-cap',
    objectives: [
      { id: 'm1o1', label: 'Unlock all Scholar abilities', completed: false },
      { id: 'm1o2', label: 'Reach max skill level', completed: false },
      { id: 'm1o3', label: 'Complete 50 research tasks', completed: false },
    ],
    xpReward: 1000,
    tileReward: 'Master Scholar Badge',
    status: 'available',
    difficulty: 'Very Hard',
    estimatedTime: '10+ hours',
  },
  {
    id: 'm2',
    title: 'Collect All Blueprint Tiles',
    description: 'Gather every type of Builder blueprint tile in the vault.',
    category: 'mastery',
    rarity: 'epic',
    icon: 'file-code',
    objectives: [
      { id: 'm2o1', label: 'Collect 10 blueprint tiles', completed: true },
      { id: 'm2o2', label: 'Collect 25 blueprint tiles', completed: false },
      { id: 'm2o3', label: 'Collect all blueprint types', completed: false },
    ],
    xpReward: 800,
    status: 'in-progress',
    difficulty: 'Very Hard',
    estimatedTime: '20+ hours',
  },
  {
    id: 'm3',
    title: 'Write 1000 Lines',
    description: 'Write 1000 lines of code using Agentic Scratch or the Forge.',
    category: 'mastery',
    rarity: 'rare',
    icon: 'pen-tool',
    objectives: [
      { id: 'm3o1', label: 'Write 100 lines', completed: true },
      { id: 'm3o2', label: 'Write 250 lines', completed: true },
      { id: 'm3o3', label: 'Write 500 lines', completed: true },
      { id: 'm3o4', label: 'Write 750 lines', completed: false },
      { id: 'm3o5', label: 'Write 1000 lines', completed: false },
    ],
    xpReward: 750,
    status: 'in-progress',
    difficulty: 'Hard',
    estimatedTime: '15+ hours',
  },
  {
    id: 'm4',
    title: 'Master Fleet Command',
    description: 'Demonstrate mastery of all fleet command and orchestration features.',
    category: 'mastery',
    rarity: 'epic',
    icon: 'crown',
    objectives: [
      { id: 'm4o1', label: 'Issue 100 commands', completed: true },
      { id: 'm4o2', label: 'Manage 10+ agents', completed: false },
      { id: 'm4o3', label: 'Achieve 95%+ fleet coherence', completed: false },
      { id: 'm4o4', label: 'Complete Commander training', completed: false },
    ],
    xpReward: 1200,
    tileReward: 'Commander Crest',
    status: 'in-progress',
    difficulty: 'Very Hard',
    estimatedTime: '20+ hours',
  },
  {
    id: 'm5',
    title: 'Alchemist Transmutation',
    description: 'Transform 50 knowledge tiles using Alchemist abilities.',
    category: 'mastery',
    rarity: 'epic',
    icon: 'flask',
    objectives: [
      { id: 'm5o1', label: 'Transmute 10 tiles', completed: true },
      { id: 'm5o2', label: 'Transmute 25 tiles', completed: false },
      { id: 'm5o3', label: 'Transmute 50 tiles', completed: false },
    ],
    xpReward: 900,
    status: 'in-progress',
    difficulty: 'Very Hard',
    estimatedTime: '15+ hours',
  },
  {
    id: 'm6',
    title: 'Room Architecture Master',
    description: 'Design and build 10 unique rooms with Room Crafter.',
    category: 'mastery',
    rarity: 'rare',
    icon: 'layout',
    objectives: [
      { id: 'm6o1', label: 'Build 3 rooms', completed: true },
      { id: 'm6o2', label: 'Build 5 rooms', completed: false },
      { id: 'm6o3', label: 'Build 10 rooms', completed: false },
    ],
    xpReward: 800,
    status: 'in-progress',
    difficulty: 'Hard',
    estimatedTime: '10+ hours',
  },
  {
    id: 'm7',
    title: 'PLATO Sage',
    description: 'Collect at least one of every tile type in the Knowledge Vault.',
    category: 'mastery',
    rarity: 'legendary',
    icon: 'book-open',
    objectives: [
      { id: 'm7o1', label: 'Collect all book tiles', completed: false },
      { id: 'm7o2', label: 'Collect all map tiles', completed: false },
      { id: 'm7o3', label: 'Collect all blueprint tiles', completed: false },
      { id: 'm7o4', label: 'Collect all scroll tiles', completed: false },
      { id: 'm7o5', label: 'Collect all console tiles', completed: false },
      { id: 'm7o6', label: 'Collect all vial tiles', completed: false },
    ],
    xpReward: 2000,
    tileReward: 'Sage Crown',
    status: 'available',
    difficulty: 'Extreme',
    estimatedTime: '30+ hours',
  },

  // Epic quests
  {
    id: 'e1',
    title: 'Connect 10 Rooms',
    description: 'Establish connections between 10 different repository rooms.',
    category: 'epic',
    rarity: 'legendary',
    icon: 'network',
    objectives: [
      { id: 'e1o1', label: 'Connect 2 rooms', completed: true },
      { id: 'e1o2', label: 'Connect 5 rooms', completed: true },
      { id: 'e1o3', label: 'Connect 10 rooms', completed: false },
    ],
    xpReward: 1500,
    tileReward: 'Architect Keystone',
    status: 'in-progress',
    difficulty: 'Extreme',
    estimatedTime: '20+ hours',
  },
  {
    id: 'e2',
    title: 'Achieve Perfect Coherence',
    description: 'Maintain fleet coherence at 1.2+ for a continuous 48-hour period.',
    category: 'epic',
    rarity: 'legendary',
    icon: 'shield',
    objectives: [
      { id: 'e2o1', label: 'Reach coherence 1.2', completed: false },
      { id: 'e2o2', label: 'Maintain for 24 hours', completed: false },
      { id: 'e2o3', label: 'Maintain for 48 hours', completed: false },
    ],
    xpReward: 2000,
    tileReward: 'Harmony Core',
    status: 'available',
    difficulty: 'Extreme',
    estimatedTime: '48 hours',
  },
  {
    id: 'e3',
    title: 'Build a Frontend',
    description: 'Design and deploy a complete frontend application in the Forge.',
    category: 'epic',
    rarity: 'legendary',
    icon: 'globe',
    objectives: [
      { id: 'e3o1', label: 'Design UI layout', completed: true },
      { id: 'e3o2', label: 'Build all components', completed: false },
      { id: 'e3o3', label: 'Connect to backend', completed: false },
      { id: 'e3o4', label: 'Deploy application', completed: false },
    ],
    xpReward: 2500,
    tileReward: 'Forge Master Seal',
    status: 'in-progress',
    difficulty: 'Extreme',
    estimatedTime: '30+ hours',
  },
  {
    id: 'e4',
    title: 'Legendary Agent Roster',
    description: 'Have all 6 agent types at max level simultaneously.',
    category: 'epic',
    rarity: 'legendary',
    icon: 'trophy',
    objectives: [
      { id: 'e4o1', label: 'Max Scholar level', completed: false },
      { id: 'e4o2', label: 'Max Scout level', completed: false },
      { id: 'e4o3', label: 'Max Builder level', completed: false },
      { id: 'e4o4', label: 'Max Critic level', completed: false },
      { id: 'e4o5', label: 'Max Commander level', completed: false },
      { id: 'e4o6', label: 'Max Alchemist level', completed: false },
    ],
    xpReward: 3000,
    tileReward: 'Legendary Crest',
    status: 'available',
    difficulty: 'Extreme',
    estimatedTime: '50+ hours',
  },
  {
    id: 'e5',
    title: 'The Perfect Room',
    description: 'Create a room with 100% completion, all tiles, and max coherence.',
    category: 'epic',
    rarity: 'legendary',
    icon: 'sparkles',
    objectives: [
      { id: 'e5o1', label: 'Reach 100% room completion', completed: false },
      { id: 'e5o2', label: 'Collect all room tiles', completed: false },
      { id: 'e5o3', label: 'Achieve max coherence', completed: false },
      { id: 'e5o4', label: ' decorate with premium items', completed: false },
    ],
    xpReward: 2500,
    tileReward: 'Perfect Room Trophy',
    status: 'available',
    difficulty: 'Extreme',
    estimatedTime: '40+ hours',
  },
  {
    id: 'e6',
    title: 'Fleet Saviour',
    description: 'Single-handedly restore fleet coherence from below 0.5 to above 1.0.',
    category: 'epic',
    rarity: 'legendary',
    icon: 'zap',
    objectives: [
      { id: 'e6o1', label: 'Identify low coherence', completed: false },
      { id: 'e6o2', label: 'Restore to 0.8', completed: false },
      { id: 'e6o3', label: 'Restore to 1.0+', completed: false },
    ],
    xpReward: 2000,
    tileReward: 'Saviour Medallion',
    status: 'available',
    difficulty: 'Extreme',
    estimatedTime: 'Varies',
  },
  {
    id: 'e7',
    title: 'OpenRoom Creator',
    description: 'Contribute a new feature or room to the OpenRoom platform itself.',
    category: 'epic',
    rarity: 'legendary',
    icon: 'rocket',
    objectives: [
      { id: 'e7o1', label: 'Submit a design proposal', completed: false },
      { id: 'e7o2', label: 'Implement the feature', completed: false },
      { id: 'e7o3', label: 'Pass code review', completed: false },
      { id: 'e7o4', label: 'Merge to main', completed: false },
    ],
    xpReward: 5000,
    tileReward: 'Creator Insignia',
    status: 'available',
    difficulty: 'Extreme',
    estimatedTime: '40+ hours',
  },
];

export const leaderboardData: LeaderboardEntry[] = [
  { rank: 1, username: 'CodeWeaver', avatar: '', level: 24, questsCompleted: 189, coherence: 1.18, totalXp: 45200, tiles: 1240 },
  { rank: 2, username: 'AgentSmith', avatar: '', level: 22, questsCompleted: 167, coherence: 1.14, totalXp: 41300, tiles: 1080 },
  { rank: 3, username: 'TileHunter', avatar: '', level: 20, questsCompleted: 156, coherence: 1.22, totalXp: 38900, tiles: 1350 },
  { rank: 4, username: 'RoomMaster', avatar: '', level: 19, questsCompleted: 142, coherence: 1.09, totalXp: 34200, tiles: 920 },
  { rank: 5, username: 'LogicLord', avatar: '', level: 18, questsCompleted: 134, coherence: 1.15, totalXp: 32100, tiles: 880 },
  { rank: 6, username: 'BuildCraft', avatar: '', level: 17, questsCompleted: 128, coherence: 1.11, totalXp: 29800, tiles: 760 },
  { rank: 7, username: 'FleetRunner', avatar: '', level: 15, questsCompleted: 112, coherence: 1.07, totalXp: 25400, tiles: 690 },
  { rank: 8, username: 'PixelSage', avatar: '', level: 14, questsCompleted: 98, coherence: 1.13, totalXp: 23100, tiles: 720 },
  { rank: 9, username: 'DataKnight', avatar: '', level: 12, questsCompleted: 87, coherence: 1.05, totalXp: 19800, tiles: 540 },
  { rank: 10, username: 'You', avatar: '', level: 7, questsCompleted: 47, coherence: 1.08, totalXp: 12500, tiles: 312, isCurrentUser: true },
];

export const rewards: Reward[] = [
  { id: 'r1', name: 'Code Wanderer', description: 'Default title for journeyman coders', type: 'title', rarity: 'common', icon: 'scroll', equipped: true },
  { id: 'r2', name: 'Apprentice Architect', description: 'Title earned at level 7', type: 'title', rarity: 'uncommon', icon: 'scroll', equipped: false },
  { id: 'r3', name: 'Builder\'s Hammer', description: 'Cosmetic hammer for avatar', type: 'cosmetic', rarity: 'uncommon', icon: 'hammer', equipped: false },
  { id: 'r4', name: 'Scholar\'s Robe', description: 'Blue Scholar agent skin', type: 'agent_skin', rarity: 'rare', icon: 'shirt', equipped: false, category: 'scholar' },
  { id: 'r5', name: 'Scout Gear', description: 'Green Scout agent skin', type: 'agent_skin', rarity: 'rare', icon: 'shirt', equipped: false, category: 'scout' },
  { id: 'r6', name: 'Crystal Room', description: 'Crystalline room theme', type: 'room_theme', rarity: 'epic', icon: 'image', equipped: false },
  { id: 'r7', name: 'Forest Glade', description: 'Nature-themed room background', type: 'room_theme', rarity: 'uncommon', icon: 'image', equipped: true },
  { id: 'r8', name: 'XP Booster x2', description: 'Double XP for 1 hour', type: 'booster', rarity: 'rare', icon: 'zap', equipped: false },
  { id: 'r9', name: 'Coherence Shield', description: 'Protect coherence for 24h', type: 'booster', rarity: 'epic', icon: 'shield', equipped: false },
  { id: 'r10', name: 'Tile Magnet', description: 'Auto-collect nearby tiles', type: 'booster', rarity: 'uncommon', icon: 'magnet', equipped: false },
  { id: 'r11', name: 'Commander\'s Cape', description: 'Purple Commander skin', type: 'agent_skin', rarity: 'epic', icon: 'shirt', equipped: false, category: 'commander' },
  { id: 'r12', name: 'Alchemist Vial Belt', description: 'Teal Alchemist accessories', type: 'cosmetic', rarity: 'rare', icon: 'flask', equipped: false },
  { id: 'r13', name: 'Vault Key', description: 'Unlock a special vault room', type: 'cosmetic', rarity: 'legendary', icon: 'key', equipped: false },
  { id: 'r14', name: 'Builder\'s Blueprint', description: 'Rare builder tile skin', type: 'cosmetic', rarity: 'rare', icon: 'file', equipped: false },
  { id: 'r15', name: 'Golden Terminal', description: 'Legendary terminal theme', type: 'cosmetic', rarity: 'legendary', icon: 'monitor', equipped: false },
  { id: 'r16', name: 'Agent Whisperer', description: 'Title: communicate with any agent', type: 'title', rarity: 'rare', icon: 'scroll', equipped: false },
  { id: 'r17', name: 'Deep Dungeon', description: 'Dark atmospheric room theme', type: 'room_theme', rarity: 'rare', icon: 'image', equipped: false },
];

export const achievements: Achievement[] = [
  { id: 'a1', name: 'First Steps', description: 'Complete the tutorial questline', hint: 'Finish all tutorial quests', category: 'explorer', rarity: 'common', unlocked: true, unlockedDate: '2026-01-15', progress: 4, maxProgress: 4, icon: 'footprints' },
  { id: 'a2', name: 'Room Walker', description: 'Enter 10 different rooms', hint: 'Explore 10 repository rooms', category: 'explorer', rarity: 'uncommon', unlocked: true, unlockedDate: '2026-02-01', progress: 10, maxProgress: 10, icon: 'footprints' },
  { id: 'a3', name: 'Deep Explorer', description: 'Enter 50 different rooms', hint: 'Keep exploring...', category: 'explorer', rarity: 'rare', unlocked: false, progress: 38, maxProgress: 50, icon: 'compass' },
  { id: 'a4', name: 'Cartographer', description: 'Fully map 5 rooms', hint: 'Find all tiles in 5 rooms', category: 'explorer', rarity: 'epic', unlocked: false, progress: 2, maxProgress: 5, icon: 'map' },
  { id: 'a5', name: 'World Traveler', description: 'Visit every room type', hint: 'Find all room categories', category: 'explorer', rarity: 'legendary', unlocked: false, progress: 4, maxProgress: 6, icon: 'globe' },
  { id: 'a6', name: 'Night Owl', description: 'Log in at midnight', hint: 'Be active at 00:00', category: 'explorer', rarity: 'common', unlocked: true, unlockedDate: '2026-01-20', progress: 1, maxProgress: 1, icon: 'moon' },
  { id: 'a7', name: 'Speed Coder', description: 'Complete a quest in under 1 hour', hint: 'Finish any quest quickly', category: 'coder', rarity: 'uncommon', unlocked: true, unlockedDate: '2026-01-18', progress: 1, maxProgress: 1, icon: 'zap' },
  { id: 'a8', name: 'Block Builder', description: 'Create 20 Scratch programs', hint: 'Use Agentic Scratch', category: 'coder', rarity: 'uncommon', unlocked: false, progress: 12, maxProgress: 20, icon: 'blocks' },
  { id: 'a9', name: 'Code Architect', description: 'Build a complete app in the Forge', hint: 'Use Frontend Forge', category: 'coder', rarity: 'epic', unlocked: false, progress: 0, maxProgress: 1, icon: 'layout' },
  { id: 'a10', name: '1000 Lines', description: 'Write 1000 lines of code', hint: 'Keep coding...', category: 'coder', rarity: 'rare', unlocked: false, progress: 847, maxProgress: 1000, icon: 'pen-tool' },
  { id: 'a11', name: 'Bug Hunter', description: 'Find and fix 50 bugs', hint: 'Use Critic agent', category: 'coder', rarity: 'rare', unlocked: false, progress: 23, maxProgress: 50, icon: 'bug' },
  { id: 'a12', name: 'Clean Code', description: 'Achieve 100% review score', hint: 'Perfect code reviews', category: 'coder', rarity: 'legendary', unlocked: false, progress: 0, maxProgress: 1, icon: 'check-circle' },
  { id: 'a13', name: 'Agent Commander', description: 'Have 6 agents active simultaneously', hint: 'Summon all agent types', category: 'commander', rarity: 'epic', unlocked: false, progress: 3, maxProgress: 6, icon: 'crown' },
  { id: 'a14', name: 'Fleet Admiral', description: 'Manage 20 agents at once', hint: 'Expand your fleet', category: 'commander', rarity: 'legendary', unlocked: false, progress: 3, maxProgress: 20, icon: 'anchor' },
  { id: 'a15', name: 'Harmonizer', description: 'Maintain coherence above 1.2 for 48h', hint: 'Keep fleet healthy', category: 'commander', rarity: 'epic', unlocked: false, progress: 12, maxProgress: 48, icon: 'scale' },
  { id: 'a16', name: 'First Summon', description: 'Summon your first agent', hint: 'Visit the Agent Guild', category: 'commander', rarity: 'common', unlocked: true, unlockedDate: '2026-01-10', progress: 1, maxProgress: 1, icon: 'user-plus' },
  { id: 'a17', name: 'Agent Bond', description: 'Keep an agent active for 7 days', hint: 'Don\'t dismiss your agent', category: 'commander', rarity: 'uncommon', unlocked: true, unlockedDate: '2026-01-25', progress: 7, maxProgress: 7, icon: 'heart' },
  { id: 'a18', name: 'Tile Hoarder', description: 'Collect 100 tiles', hint: 'Gather PLATO tiles', category: 'sage', rarity: 'uncommon', unlocked: true, unlockedDate: '2026-02-05', progress: 100, maxProgress: 100, icon: 'gem' },
  { id: 'a19', name: 'Librarian', description: 'Collect 50 Scholar tiles', hint: 'Find knowledge tiles', category: 'sage', rarity: 'rare', unlocked: false, progress: 34, maxProgress: 50, icon: 'book' },
  { id: 'a20', name: 'Vault Keeper', description: 'Collect 500 tiles', hint: 'Serious collecting', category: 'sage', rarity: 'epic', unlocked: false, progress: 312, maxProgress: 500, icon: 'archive' },
  { id: 'a21', name: 'Knowledge Seeker', description: 'Read 100 tile entries', hint: 'Absorb knowledge', category: 'sage', rarity: 'uncommon', unlocked: false, progress: 67, maxProgress: 100, icon: 'glasses' },
  { id: 'a22', name: 'Transmuter', description: 'Transform 25 tiles', hint: 'Use Alchemist abilities', category: 'alchemist', rarity: 'rare', unlocked: false, progress: 10, maxProgress: 25, icon: 'flask' },
  { id: 'a23', name: 'Potion Master', description: 'Create 50 boosters', hint: 'Brew enhancements', category: 'alchemist', rarity: 'epic', unlocked: false, progress: 8, maxProgress: 50, icon: 'beaker' },
  { id: 'a24', name: 'Elementalist', description: 'Use all tile types in a ritual', hint: 'Combine tile powers', category: 'alchemist', rarity: 'legendary', unlocked: false, progress: 4, maxProgress: 7, icon: 'atom' },
  { id: 'a25', name: 'First Builder', description: 'Create your first room', hint: 'Use Room Crafter', category: 'architect', rarity: 'common', unlocked: true, unlockedDate: '2026-01-22', progress: 1, maxProgress: 1, icon: 'hammer' },
  { id: 'a26', name: 'Room Designer', description: 'Design 10 unique rooms', hint: 'Keep building', category: 'architect', rarity: 'uncommon', unlocked: false, progress: 3, maxProgress: 10, icon: 'palette' },
  { id: 'a27', name: 'Master Builder', description: 'Build a room with 100% completion', hint: 'Perfect room', category: 'architect', rarity: 'epic', unlocked: false, progress: 0, maxProgress: 1, icon: 'castle' },
  { id: 'a28', name: 'City Planner', description: 'Connect 10 rooms together', hint: 'Create room networks', category: 'architect', rarity: 'legendary', unlocked: false, progress: 2, maxProgress: 10, icon: 'network' },
  { id: 'a29', name: 'Quest Novice', description: 'Complete 10 quests', hint: 'Finish quests', category: 'explorer', rarity: 'common', unlocked: true, unlockedDate: '2026-01-12', progress: 10, maxProgress: 10, icon: 'check' },
  { id: 'a30', name: 'Quest Veteran', description: 'Complete 50 quests', hint: 'Keep questing', category: 'explorer', rarity: 'uncommon', unlocked: true, unlockedDate: '2026-02-10', progress: 50, maxProgress: 50, icon: 'award' },
  { id: 'a31', name: 'Quest Master', description: 'Complete 150 quests', hint: 'Dedicated quester', category: 'explorer', rarity: 'legendary', unlocked: false, progress: 47, maxProgress: 150, icon: 'trophy' },
  { id: 'a32', name: 'Daily Devotee', description: 'Complete 30 daily quests', hint: 'Daily dedication', category: 'explorer', rarity: 'rare', unlocked: false, progress: 18, maxProgress: 30, icon: 'calendar' },
  { id: 'a33', name: 'Streak Keeper', description: 'Maintain a 7-day streak', hint: 'Log in daily', category: 'explorer', rarity: 'uncommon', unlocked: true, unlockedDate: '2026-02-15', progress: 7, maxProgress: 7, icon: 'flame' },
  { id: 'a34', name: 'Socialite', description: 'Help 20 other players', hint: 'Be helpful', category: 'commander', rarity: 'rare', unlocked: false, progress: 8, maxProgress: 20, icon: 'users' },
  { id: 'a35', name: 'Mentor', description: 'Guide 5 new players', hint: 'Help newcomers', category: 'commander', rarity: 'epic', unlocked: false, progress: 1, maxProgress: 5, icon: 'graduation-cap' },
  { id: 'a36', name: 'Legend of OpenRoom', description: 'Complete all epic quests', hint: 'The ultimate challenge', category: 'architect', rarity: 'legendary', unlocked: false, progress: 0, maxProgress: 7, icon: 'star' },
];

export const activeQuests = quests.filter(q => q.status === 'in-progress').slice(0, 4);

export const questBoardTabs: { key: QuestCategory; label: string; subtitle: string; color: string }[] = [
  { key: 'tutorial', label: 'Tutorial', subtitle: 'Learn the ropes', color: '#4ADE80' },
  { key: 'daily', label: 'Daily', subtitle: 'Fresh every day', color: '#F5CB4E' },
  { key: 'weekly', label: 'Weekly', subtitle: 'Bigger challenges', color: '#60A5FA' },
  { key: 'mastery', label: 'Mastery', subtitle: 'Prove your skill', color: '#A78BFA' },
  { key: 'epic', label: 'Epic', subtitle: 'Legendary feats', color: '#FFD700' },
];

export const achievementCategories = [
  { key: 'all', label: 'All' },
  { key: 'explorer', label: 'Explorer' },
  { key: 'coder', label: 'Coder' },
  { key: 'architect', label: 'Architect' },
  { key: 'sage', label: 'Sage' },
  { key: 'commander', label: 'Commander' },
  { key: 'alchemist', label: 'Alchemist' },
];
