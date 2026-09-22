import React from 'react';
import { Achievement } from '../../types/game';
import { Lock, CheckCircle2, Award } from 'lucide-react';

interface AchievementCardProps {
  achievement: Achievement;
}

export const AchievementCard: React.FC<AchievementCardProps> = ({ achievement }) => {
  const isUnlocked = achievement.unlocked;
  const isRare = achievement.rarityPercentage < 15.0;

  return (
    <div
      className={`p-3 rounded-xl border flex items-start gap-3.5 transition-all ${
        isUnlocked
          ? 'bg-[#181b29] border-indigo-500/30 hover:border-indigo-500/60 shadow-sm'
          : 'bg-[#12131c] border-white/5 opacity-60 hover:opacity-80'
      }`}
    >
      {/* Icon */}
      <div className="relative flex-shrink-0">
        <img
          src={achievement.iconUrl}
          alt={achievement.title}
          className={`w-12 h-12 rounded-lg object-cover ${
            isUnlocked ? 'ring-1 ring-indigo-500/50' : 'grayscale brightness-50'
          }`}
        />
        {!isUnlocked && (
          <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
            <Lock className="w-4 h-4 text-gray-400" />
          </div>
        )}
        {isUnlocked && (
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-black rounded-full p-0.5 shadow-md">
            <CheckCircle2 className="w-3 h-3 text-black fill-emerald-400" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4
            className={`text-xs font-bold truncate ${
              isUnlocked ? 'text-white' : 'text-gray-300'
            }`}
          >
            {achievement.title}
          </h4>

          {achievement.points && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              +{achievement.points} XP
            </span>
          )}
        </div>

        <p className="text-[11px] text-gray-400 line-clamp-2 mt-0.5">
          {achievement.description}
        </p>

        {/* Footer meta */}
        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5 text-[10px]">
          {/* Rarity */}
          <span
            className={`flex items-center gap-1 font-medium ${
              isRare ? 'text-amber-400' : 'text-gray-400'
            }`}
          >
            <Award className="w-3 h-3" />
            <span>{achievement.rarityPercentage}% of players</span>
          </span>

          {/* Unlock Date */}
          {isUnlocked && achievement.unlockedAt && (
            <span className="text-gray-500">
              Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
