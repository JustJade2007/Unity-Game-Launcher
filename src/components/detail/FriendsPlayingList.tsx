import React from 'react';
import { FriendActivity } from '../../types/game';
import { Gamepad2, Clock, Users } from 'lucide-react';

interface FriendsPlayingListProps {
  friends: FriendActivity[];
}

export const FriendsPlayingList: React.FC<FriendsPlayingListProps> = ({ friends }) => {
  const playingNow = friends.filter((f) => f.status === 'playing_now');
  const others = friends.filter((f) => f.status !== 'playing_now');

  if (friends.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500 text-xs">
        <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
        No friends have played this game yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Playing Right Now Section */}
      {playingNow.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Currently Playing ({playingNow.length})</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {playingNow.map((friend) => (
              <div
                key={friend.id}
                className="p-3 rounded-xl bg-[#141d1a] border border-emerald-500/30 flex items-center gap-3 shadow-md"
              >
                {/* Avatar with live badge */}
                <div className="relative flex-shrink-0">
                  <img
                    src={friend.avatarUrl}
                    alt={friend.name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/50"
                  />
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[#141d1a]" />
                </div>

                {/* Friend info & Rich presence */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-white truncate">{friend.name}</h5>
                    <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                      <Gamepad2 className="w-3 h-3" /> In-Game
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-300 font-medium truncate mt-0.5">
                    {friend.currentActivity || 'In Game'}
                  </p>
                  <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{friend.playtimeHours} hrs played</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends Who Also Play */}
      {others.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Friends Who Own This Game ({others.length})
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {others.map((friend) => (
              <div
                key={friend.id}
                className="p-2.5 rounded-xl bg-[#141622] border border-white/5 flex items-center gap-3"
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <img
                    src={friend.avatarUrl}
                    alt={friend.name}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[#141622] ${
                      friend.status === 'online'
                        ? 'bg-blue-400'
                        : friend.status === 'away'
                        ? 'bg-amber-400'
                        : 'bg-gray-500'
                    }`}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-semibold text-gray-200 truncate">
                      {friend.name}
                    </h5>
                    <span className="text-[10px] text-gray-500 capitalize">
                      {friend.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-2.5 h-2.5 text-gray-500" />
                    <span>{friend.playtimeHours} hrs lifetime</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
