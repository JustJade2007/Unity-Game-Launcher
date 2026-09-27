import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Game } from '../../types/game';
import { useLibrary } from '../../context/LibraryContext';
import { isSoftwareGame } from '../../utils/softwareClassifier';
import {
  X,
  Dices,
  Play,
  RotateCw,
  Sparkles,
  CheckCircle2,
  Clock,
  Filter,
  Flame,
  Coffee,
  Ghost,
  Users,
  Search,
  Volume2,
  VolumeX,
  EyeOff,
  Undo2,
} from 'lucide-react';

interface RandomGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGame?: (game: Game) => void;
}

// Mood presets that map to genres, playtime constraints, or play status
interface MoodPreset {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  keywords: string[];
  maxPlaytimeHours?: number;
  tags?: string[];
}

const MOOD_PRESETS: MoodPreset[] = [
  {
    id: 'cozy',
    name: 'Cozy & Relaxing',
    icon: <Coffee className="w-3.5 h-3.5 text-amber-400" />,
    description: 'Casual, simulation, puzzle, or story games to unwind',
    keywords: ['casual', 'simulation', 'puzzle', 'relaxing', 'cozy', 'sandbox'],
  },
  {
    id: 'action',
    name: 'High Adrenaline',
    icon: <Flame className="w-3.5 h-3.5 text-rose-400" />,
    description: 'Fast-paced action, shooters, racing, and hack-and-slash',
    keywords: ['action', 'shooter', 'fps', 'racing', 'hack and slash', 'fighting'],
  },
  {
    id: 'spooky',
    name: 'Spooky & Horror',
    icon: <Ghost className="w-3.5 h-3.5 text-purple-400" />,
    description: 'Survival horror, psychological thriller, and dark mystery',
    keywords: ['horror', 'survival horror', 'dark', 'zombie', 'psychological'],
  },
  {
    id: 'coop',
    name: 'Play with Friends',
    icon: <Users className="w-3.5 h-3.5 text-emerald-400" />,
    description: 'Party games, friend slop, PvP, and co-op multiplayer',
    keywords: [
      'co-op',
      'coop',
      'multiplayer',
      'multi-player',
      'party',
      'pvp',
      'online',
      'jackbox',
      'jack in the box',
      'party game',
      'friend slop',
      'friendslop',
      'peak',
      'repo',
      'lethal company',
      'content warning',
      'among us',
      'fall guys',
      'gang beasts',
      'human fall flat',
      'duck game',
      'stick fight',
      'tabletop simulator',
      'overcooked',
      'it takes two',
      'a way out',
      'siege',
      'rainbow six',
      'battlefield',
      'counter-strike',
      'cs:go',
      'cs2',
      'destiny',
      'helldivers',
      'deep rock galactic',
      'sea of thieves',
      'phasmophobia',
      'valheim',
      'terraria',
      'minecraft',
      'rust',
      'ark',
      'the forest',
      'sons of the forest',
      'left 4 dead',
      'payday',
      'borderlands',
      'speedrunners',
      'golf with your friends',
      'pummel party',
      'rocket league',
      'brawlhalla',
      'smash',
      'mmo',
      'battle royale',
    ],
  },
  {
    id: 'quick',
    name: 'Quick Coffee Break',
    icon: <Clock className="w-3.5 h-3.5 text-cyan-400" />,
    description: 'Short session or bite-sized games under 10 hours',
    keywords: ['arcade', 'casual', 'indie'],
    maxPlaytimeHours: 10,
  },
];

// Helper to determine if a game has verified multiplayer, co-op, or party capability
export function isMultiplayerGame(game: Game): boolean {
  const title = (game.title || '').toLowerCase();
  const desc = (game.description || '').toLowerCase();
  const tagline = (game.tagline || '').toLowerCase();
  const cats = game.categories.map((c) => c.toLowerCase());
  const tags = (game.tags || []).map((t) => t.toLowerCase());

  // 1. Direct category or custom tag match
  const multiTags = [
    'multiplayer',
    'multi-player',
    'co-op',
    'coop',
    'party',
    'party game',
    'pvp',
    'online pvp',
    'online co-op',
    'local co-op',
    'local multiplayer',
    'massively multiplayer',
    'mmo',
    'battle royale',
    'friend slop',
    'friendslop',
  ];
  if (cats.some((c) => multiTags.includes(c)) || tags.some((t) => multiTags.includes(t))) {
    return true;
  }

  // 2. Specific curated party / friend-slop / multiplayer titles
  const multiplayerTitles = [
    'peak',
    'repo',
    'lethal company',
    'content warning',
    'among us',
    'jackbox',
    'jack in the box',
    'overcooked',
    'gang beasts',
    'fall guys',
    'human: fall flat',
    'human fall flat',
    'duck game',
    'stick fight',
    'tabletop simulator',
    'it takes two',
    'a way out',
    'rainbow six siege',
    'rainbow six',
    'battlefield',
    'counter-strike',
    'cs:go',
    'cs2',
    'destiny 2',
    'helldivers',
    'deep rock galactic',
    'sea of thieves',
    'phasmophobia',
    'valheim',
    'terraria',
    'minecraft',
    'rust',
    'ark: survival',
    'the forest',
    'sons of the forest',
    'left 4 dead',
    'payday',
    'borderlands',
    'speedrunners',
    'golf with your friends',
    'pummel party',
    'rocket league',
    'brawlhalla',
    'super smash bros',
    'warframe',
    'apex legends',
    'fortnite',
    'pubg',
    'overwatch',
    'team fortress',
    'dead by daylight',
    'palworld',
    'chained together',
    'party animals',
    'bread & fred',
    'unrailed',
    'plateup',
    'keep talking and nobody explodes',
    'golf it',
    'ultimate chicken horse',
    'move or die',
    'rounds',
    'lovers in a dangerous spacetime',
    'magicka',
    'castle crashers',
    'battleblock theater',
    'for the king',
    'risk of rain',
    'barotrauma',
    'project zomboid',
    'dont starve together',
    "don't starve together",
    'heckdeck',
  ];

  if (multiplayerTitles.some((t) => title.includes(t))) {
    return true;
  }

  // 3. Whole-word regex matching in title or description
  const multiplayerRegex = /\b(multiplayer|multi-player|co-op|coop|pvp|party game|battle royale|friend slop|friendslop)\b/i;
  if (multiplayerRegex.test(title) || multiplayerRegex.test(tagline) || multiplayerRegex.test(desc)) {
    return true;
  }

  return false;
}

// High-fidelity synthesized audio generator using Web Audio API
class WheelAudioEngine {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    // AudioContext will be initialized on first user interaction to comply with browser autoplay policies
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  private ensureContext() {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // Mechanical click / tick sound as each peg/slice passes
  public playTick(pitchMultiplier = 1.0) {
    if (!this.soundEnabled) return;
    try {
      this.ensureContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      // Crisp click pitch
      osc.frequency.setValueAtTime(800 * pitchMultiplier, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.035);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {
      // Ignore audio synthesis errors gracefully
    }
  }

  // Triumphant victory fanfare chord when winner lands
  public playWinnerFanfare() {
    if (!this.soundEnabled) return;
    try {
      this.ensureContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // Cheerful major chord progression: C5, E5, G5, C6
      const notes = [523.25, 659.25, 783.99, 1046.50];

      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        const startTime = now + idx * 0.1;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.55);
      });
    } catch {
      // Ignore audio synthesis errors gracefully
    }
  }
}

const wheelAudio = new WheelAudioEngine();

export const RandomGameModal: React.FC<RandomGameModalProps> = ({
  isOpen,
  onClose,
  onSelectGame,
}) => {
  const { games, launchGame } = useLibrary();

  // Filter pool configuration
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [onlyInstalled, setOnlyInstalled] = useState<boolean>(true);
  const [onlyUnplayed, setOnlyUnplayed] = useState<boolean>(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [naturalQuery, setNaturalQuery] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Wheel type exclusion list: maps wheel preset or general to an array of game IDs
  const [wheelExclusions, setWheelExclusions] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('unity_wheel_exclusions');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const activeWheelKey = selectedMood || 'general';
  const currentExclusions = useMemo(() => {
    return wheelExclusions[activeWheelKey] || [];
  }, [wheelExclusions, activeWheelKey]);

  const handleExcludeGameFromWheel = (gameId: string) => {
    setWheelExclusions((prev) => {
      const existing = prev[activeWheelKey] || [];
      if (existing.includes(gameId)) return prev;
      const updated = {
        ...prev,
        [activeWheelKey]: [...existing, gameId],
      };
      try {
        localStorage.setItem('unity_wheel_exclusions', JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
    // If the excluded game is currently the selected winner, clear it
    if (winnerGame?.id === gameId) {
      setWinnerGame(null);
      setWinnerRationale('');
    }
  };

  const handleResetExclusionsForWheel = () => {
    setWheelExclusions((prev) => {
      const updated = { ...prev };
      delete updated[activeWheelKey];
      try {
        localStorage.setItem('unity_wheel_exclusions', JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  };

  // Spinning wheel state
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [wheelRotation, setWheelRotation] = useState<number>(0);
  const [winnerGame, setWinnerGame] = useState<Game | null>(null);
  const [winnerRationale, setWinnerRationale] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const soundIntervalRef = useRef<number[]>([]);

  useEffect(() => {
    wheelAudio.setSoundEnabled(soundEnabled);
  }, [soundEnabled]);

  // Clean up sound timers on unmount
  useEffect(() => {
    return () => {
      soundIntervalRef.current.forEach((t) => clearTimeout(t));
      soundIntervalRef.current = [];
    };
  }, []);

  // Filter pool computation
  const eligiblePool = useMemo(() => {
    return games.filter((game) => {
      // Exclude software and utilities
      if (isSoftwareGame(game)) return false;
      // Exclude hidden games
      if (game.hidden) return false;

      // Exclude titles user explicitly hid from this specific wheel type
      if (currentExclusions.includes(game.id)) return false;

      // Installed constraint
      if (onlyInstalled && !game.installed) return false;

      // Unplayed constraint
      if (onlyUnplayed && (game.playtime.totalMinutes || 0) > 0) return false;

      // Tag / category constraint
      if (selectedTag) {
        const gameCategories = game.categories.map((c) => c.toLowerCase());
        const gameTags = (game.tags || []).map((t) => t.toLowerCase());
        const target = selectedTag.toLowerCase();
        if (!gameCategories.includes(target) && !gameTags.includes(target)) return false;
      }

      // Mood preset matching
      if (selectedMood) {
        const mood = MOOD_PRESETS.find((m) => m.id === selectedMood);
        if (mood) {
          // Special strict check for 'coop' / 'Play with Friends':
          // MUST be a verified multiplayer/co-op/party/friend-slop game
          if (mood.id === 'coop') {
            if (!isMultiplayerGame(game)) return false;
          } else {
            const gameTitleLower = (game.title || '').toLowerCase();
            const gameCategoriesLower = game.categories.map((c) => c.toLowerCase()).join(' ');
            const gameTagsLower = (game.tags || []).map((t) => t.toLowerCase()).join(' ');
            const gameTaglineLower = (game.tagline || '').toLowerCase();
            const gameDescLower = (game.description || '').toLowerCase();
            const combinedText = `${gameTitleLower} ${gameCategoriesLower} ${gameTagsLower} ${gameTaglineLower} ${gameDescLower}`;

            const matchesKeyword = mood.keywords.some((kw) => combinedText.includes(kw));
            if (!matchesKeyword) return false;
          }

          if (mood.maxPlaytimeHours !== undefined) {
            const playedHours = (game.playtime.totalMinutes || 0) / 60;
            if (playedHours > mood.maxPlaytimeHours) return false;
          }
        }
      }

      // Natural language parser
      if (naturalQuery.trim()) {
        const q = naturalQuery.toLowerCase();
        const tokens = q.split(/\s+/).filter(Boolean);

        // Parse special keywords
        for (const token of tokens) {
          if (token === 'unplayed' && (game.playtime.totalMinutes || 0) > 0) return false;
          if (token === 'installed' && !game.installed) return false;
          if (token === 'favorite' && !game.favorite) return false;
          if ((token === 'multiplayer' || token === 'coop' || token === 'co-op') && !isMultiplayerGame(game)) {
            return false;
          }
        }

        // Generic search against title, tags, description
        const searchable = `${game.title} ${game.categories.join(' ')} ${(game.tags || []).join(' ')} ${game.description}`.toLowerCase();
        const matchesSome = tokens.some((token) => {
          if (['a', 'an', 'the', 'give', 'me', 'game', 'play', 'i', 'want', 'under'].includes(token)) return true;
          return searchable.includes(token);
        });
        if (!matchesSome) return false;
      }

      return true;
    });
  }, [games, onlyInstalled, onlyUnplayed, selectedTag, selectedMood, naturalQuery, currentExclusions]);


  // Aggregate candidate tags for filter dropdown
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    games.forEach((g) => {
      if (isSoftwareGame(g) || g.hidden) return;
      g.categories.forEach((c) => set.add(c));
      (g.tags || []).forEach((t) => set.add(t));
    });
    return Array.from(set).sort();
  }, [games]);

  // Slices for the wheel (capped at 16 for visual distinction)
  const wheelSlices = useMemo(() => {
    if (eligiblePool.length === 0) return [];
    if (eligiblePool.length <= 16) return eligiblePool;
    // Shuffle deterministic sample
    return eligiblePool.slice(0, 16);
  }, [eligiblePool]);

  // Canvas drawing routine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2 - 10;

    ctx.clearRect(0, 0, width, height);

    if (wheelSlices.length === 0) {
      // Empty state circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#161822';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#312e81';
      ctx.stroke();

      ctx.fillStyle = '#9ca3af';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No eligible games match', centerX, centerY - 10);
      ctx.fillText('Adjust your filters above', centerX, centerY + 10);
      return;
    }

    const numSlices = wheelSlices.length;
    const arc = (2 * Math.PI) / numSlices;

    const sliceColors = [
      '#4338ca', '#6366f1', '#7c3aed', '#8b5cf6',
      '#059669', '#10b981', '#0284c7', '#0ea5e9',
      '#d97706', '#f59e0b', '#dc2626', '#ef4444',
      '#4f46e5', '#3b82f6', '#14b8a6', '#84cc16'
    ];

    wheelSlices.forEach((sliceGame, i) => {
      const angle = i * arc;
      ctx.beginPath();
      ctx.fillStyle = sliceColors[i % sliceColors.length];
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, angle, angle + arc);
      ctx.lineTo(centerX, centerY);
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#0f111a';
      ctx.stroke();

      // Render slice title text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Inter, sans-serif';

      let text = sliceGame.title;
      if (text.length > 14) text = text.slice(0, 13) + '…';
      ctx.fillText(text, radius - 18, 4);
      ctx.restore();
    });

    // Center hub cap
    ctx.beginPath();
    ctx.arc(centerX, centerY, 24, 0, 2 * Math.PI);
    ctx.fillStyle = '#0d0e15';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }, [wheelSlices]);

  // Handle spin execution
  const handleSpin = () => {
    if (isSpinning || wheelSlices.length === 0) return;

    // Clear any previous scheduled audio ticks
    soundIntervalRef.current.forEach((t) => clearTimeout(t));
    soundIntervalRef.current = [];

    setIsSpinning(true);
    setWinnerGame(null);
    setWinnerRationale('');

    // Pick winner uniformly from eligiblePool
    const winnerIdx = Math.floor(Math.random() * wheelSlices.length);
    const chosen = wheelSlices[winnerIdx];

    const sliceArcDegrees = 360 / wheelSlices.length;
    // Pointer is pointing at 270 deg (top)
    const extraSpins = 5 + Math.floor(Math.random() * 3); // 5 to 7 full rotations
    const targetSliceDegrees = 270 - (winnerIdx * sliceArcDegrees + sliceArcDegrees / 2);
    const finalAngle = extraSpins * 360 + targetSliceDegrees;

    setWheelRotation(finalAngle);

    // Dynamic ticking sound effect that slows down along with the 4500ms cubic-bezier spin
    if (soundEnabled) {
      // Schedule tick clicks with exponentially increasing delays simulating deceleration
      let currentTime = 0;
      let delay = 45; // Starts at 45ms between ticks
      const totalDuration = 4400;

      while (currentTime < totalDuration) {
        const scheduledTime = currentTime;
        const pitch = Math.max(0.65, 1.2 - (currentTime / totalDuration) * 0.55);
        const timer = window.setTimeout(() => {
          wheelAudio.playTick(pitch);
        }, scheduledTime);
        soundIntervalRef.current.push(timer);

        currentTime += delay;
        // Non-linear deceleration ramp
        delay = Math.floor(delay * 1.055) + 3;
      }
    }

    setTimeout(() => {
      setIsSpinning(false);
      setWinnerGame(chosen);

      // Play cheerful victory fanfare sound
      if (soundEnabled) {
        wheelAudio.playWinnerFanfare();
      }

      // Generate helpful human rationale
      const reasons: string[] = [];
      if (chosen.installed) reasons.push('installed & ready to play');
      if ((chosen.playtime.totalMinutes || 0) === 0) {
        reasons.push('currently unplayed in your backlog');
      } else {
        const hrs = Math.round(((chosen.playtime.totalMinutes || 0) / 60) * 10) / 10;
        reasons.push(`${hrs} hours previously played`);
      }
      if (chosen.categories.length > 0) {
        reasons.push(`tagged as ${chosen.categories.slice(0, 2).join(' & ')}`);
      }
      if (selectedMood) {
        const moodName = MOOD_PRESETS.find((m) => m.id === selectedMood)?.name;
        reasons.push(`matches your '${moodName}' mood`);
      }

      setWinnerRationale(`Picked because it is ${reasons.join(', ')}.`);
    }, 4500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-[#0d0e15] border border-white/10 rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#12141d]/70 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <Dices className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                Random Game Selector
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Roulette
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Can't decide what to play? Filter your pool, spin the wheel, and discover your next adventure.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute wheel sound effects' : 'Enable wheel sound effects'}
              className={`p-2 rounded-xl border transition-colors ${
                soundEnabled
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                  : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: 2 Columns */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Filter Pool & NLP Input */}
          <div className="lg:col-span-6 space-y-5">
            {/* Natural Language Prompt */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Natural-Language Selection Prompt</span>
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={naturalQuery}
                  onChange={(e) => setNaturalQuery(e.target.value)}
                  placeholder="e.g. relaxing co-op game under 10 hours or unplayed shooter..."
                  className="w-full bg-[#161822] text-xs text-white placeholder-gray-500 rounded-xl pl-9 pr-4 py-2.5 border border-white/5 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/50 transition-all"
                />
              </div>
            </div>

            {/* Mood Presets */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-indigo-400" />
                <span>Filter Pool by Mood</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MOOD_PRESETS.map((m) => {
                  const isSelected = selectedMood === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMood(isSelected ? null : m.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500/60 shadow-sm ring-1 ring-amber-500/30'
                          : 'bg-[#151722] border-white/5 hover:border-white/15 text-gray-300'
                      }`}
                    >
                      <div className="mt-0.5 p-1 rounded-lg bg-black/40">{m.icon}</div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{m.name}</div>
                        <div className="text-[10px] text-gray-400 line-clamp-1">{m.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status & Tag Toggles */}
            <div className="p-4 rounded-xl bg-[#141622] border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">Exclude uninstalled titles</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={onlyInstalled}
                  onClick={() => setOnlyInstalled(!onlyInstalled)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                    onlyInstalled ? 'bg-emerald-600' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${
                      onlyInstalled ? 'translate-x-4.5' : 'translate-x-0.5'
                    }`}
                    style={{
                      transform: onlyInstalled ? 'translateX(18px)' : 'translateX(3px)',
                    }}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">Unplayed backlog titles only</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={onlyUnplayed}
                  onClick={() => setOnlyUnplayed(!onlyUnplayed)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                    onlyUnplayed ? 'bg-amber-600' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${
                      onlyUnplayed ? 'translate-x-4.5' : 'translate-x-0.5'
                    }`}
                    style={{
                      transform: onlyUnplayed ? 'translateX(18px)' : 'translateX(3px)',
                    }}
                  />
                </button>
              </div>

              {/* Tag / Genre Filter Select */}
              <div className="pt-2 border-t border-white/5">
                <label className="block text-[11px] text-gray-400 mb-1">Target Genre or Custom Tag</label>
                <select
                  value={selectedTag || ''}
                  onChange={(e) => setSelectedTag(e.target.value || null)}
                  className="w-full bg-[#1b1e2c] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Any Genre / Tag</option>
                  {availableTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pool Statistics summary & Exclusions reset */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-black/40 border border-white/5 text-xs">
                <span className="text-gray-400">Eligible candidate games:</span>
                <span className="font-bold text-amber-400">
                  {eligiblePool.length} {eligiblePool.length === 1 ? 'game' : 'games'} in pool
                </span>
              </div>

              {currentExclusions.length > 0 && (
                <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300">
                  <span className="flex items-center gap-1.5">
                    <EyeOff className="w-3.5 h-3.5 text-rose-400" />
                    <span>
                      {currentExclusions.length} {currentExclusions.length === 1 ? 'game hidden' : 'games hidden'} from {selectedMood ? 'this category' : 'wheel'}
                    </span>
                  </span>
                  <button
                    onClick={handleResetExclusionsForWheel}
                    className="hover:underline flex items-center gap-1 text-white font-medium hover:text-rose-200 transition-colors"
                  >
                    <Undo2 className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Spinning Wheel & Winner Spotlight */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center">
            {/* Spinning Wheel Stage */}
            <div className="relative flex flex-col items-center justify-center p-4">
              {/* Pointer Marker at 12 o'clock */}
              <div className="absolute top-2 z-20 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-amber-400 drop-shadow-md" />

              {/* Canvas Wheel */}
              <div
                className="relative rounded-full p-2 bg-[#12141e] border-4 border-indigo-950/80 shadow-2xl transition-transform duration-[4500ms] cubic-bezier(0.15, 0.9, 0.25, 1)"
                style={{
                  transform: `rotate(${wheelRotation}deg)`,
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={340}
                  height={340}
                  className="rounded-full select-none"
                />
              </div>

              {/* Spin Trigger Button & Sound indicator */}
              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={handleSpin}
                  disabled={isSpinning || eligiblePool.length === 0}
                  className="flex items-center gap-2.5 px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-white font-extrabold text-sm shadow-xl shadow-amber-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed group"
                >
                  <RotateCw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                  <span>{isSpinning ? 'Selecting...' : 'Spin the Wheel!'}</span>
                </button>
              </div>
            </div>

            {/* Winner Spotlight Card */}
            {winnerGame && !isSpinning && (
              <div className="w-full mt-4 p-4 rounded-xl bg-gradient-to-br from-indigo-950/60 to-purple-950/60 border border-indigo-500/40 shadow-xl animate-in zoom-in-95 duration-300">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Winner Selected!</span>
                </div>

                <div className="flex items-start gap-4">
                  {winnerGame.media.coverUrl ? (
                    <img
                      src={winnerGame.media.coverUrl}
                      alt={winnerGame.title}
                      className="w-16 h-22 object-cover rounded-lg flex-shrink-0 bg-[#0c0e15] border border-white/10"
                    />
                  ) : (
                    <div className="w-16 h-22 rounded-lg bg-indigo-900/40 flex items-center justify-center flex-shrink-0 text-indigo-400">
                      <Dices className="w-7 h-7" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-extrabold text-white truncate">{winnerGame.title}</h3>
                    <p className="text-xs text-gray-300 line-clamp-1 mt-0.5">{winnerGame.tagline || winnerGame.description}</p>
                    <p className="text-[11px] text-amber-300/90 font-medium italic mt-1.5 leading-snug">
                      "{winnerRationale}"
                    </p>

                    <div className="flex items-center flex-wrap gap-2 mt-3">
                      {winnerGame.installed ? (
                        <button
                          onClick={() => {
                            launchGame(winnerGame);
                            onClose();
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all"
                        >
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          <span>Play Now</span>
                        </button>
                      ) : null}

                      {onSelectGame && (
                        <button
                          onClick={() => {
                            onSelectGame(winnerGame);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-all"
                        >
                          View Details
                        </button>
                      )}

                      <button
                        onClick={() => handleExcludeGameFromWheel(winnerGame.id)}
                        title={`Hide ${winnerGame.title} from ${selectedMood ? 'this category wheel' : 'the wheel'}`}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-medium transition-all ml-auto"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hide from this wheel</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
