'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import DashboardLayout from '@/components/dashboard-layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, type AvatarId } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  Loader2,
  Users,
  Target,
  BarChart3,
  Star,
  Zap,
  ChevronDown,
} from 'lucide-react';

interface LeaderboardUser {
  id: string;
  name: string;
  avatarId?: AvatarId;
  monthlyCarbon: number;
  totalScanned: number;
  change: 'up' | 'down' | 'same';
  joinedAt: string;
  streakCount: number;
  totalPointsEarned: number;
  level: number;
  achievementCount: number;
  levelTier: string;
  pointsSummary: {
    confirmed: number;
    unconfirmed: number;
    total: number;
  };
}

interface LeaderboardStats {
  totalUsers: number;
  averagePoints: number;
  averageLevel: string;
  totalPointsInSystem: number;
}

interface LeaderboardResponse {
  leaderboard: LeaderboardUser[];
  nextCursor: string | null;
  hasMore: boolean;
  currentUserRank: number | null;
  stats: LeaderboardStats;
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [stats, setStats] = useState<LeaderboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);

  const fetchLeaderboardData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (cursor) params.set('cursor', cursor);
      if (user?._id) params.set('userId', user._id);
      const response = await fetch(`/api/leaderboard?${params.toString()}`);
      if (response.ok) {
        const data: LeaderboardResponse = await response.json();
        if (!cursor) {
          setLeaderboardData(data.leaderboard);
        } else {
          setLeaderboardData((prev) => [...prev, ...data.leaderboard]);
        }
        setStats(data.stats);
        setCursor(data.nextCursor);
        setHasMore(data.hasMore);
        if (data.currentUserRank !== null) {
          setCurrentUserRank(data.currentUserRank);
        }
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [cursor, user?._id]);

  const handleLoadMore = () => {
    setLoadingMore(true);
  };

  useEffect(() => {
    fetchLeaderboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when cursor changes due to loadMore
  useEffect(() => {
    if (loadingMore) {
      fetchLeaderboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMore]);

  const getRankIcon = (index: number) => {
    const rank = index + 1;
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-gray-500">#{rank}</span>;
    }
  };

  const getChangeIndicator = (change: string) => {
    switch (change) {
      case 'up':
        return <span className="text-green-600 text-sm">↗ Up</span>;
      case 'down':
        return <span className="text-red-600 text-sm">↘ Down</span>;
      default:
        return <span className="text-gray-400 text-sm">→ Same</span>;
    }
  };

  const getLevelTierBadge = (tier: string) => {
    const tierConfig: Record<string, { color: string; icon: string }> = {
      Legendary: {
        color:
          'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-400',
        icon: '👑',
      },
      Master: {
        color:
          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400',
        icon: '🏆',
      },
      Expert: {
        color:
          'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400',
        icon: '⭐',
      },
      Advanced: {
        color:
          'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400',
        icon: '🎯',
      },
      Intermediate: {
        color:
          'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-400',
        icon: '📈',
      },
      Beginner: {
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        icon: '🌱',
      },
    };
    const config = tierConfig[tier] || tierConfig.Beginner;
    return config;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-green-700">
            Points Leaderboard
          </h1>
          <p className="text-gray-600 mt-2">
            See how you rank against other eco-warriors by points and level.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
            <span className="ml-2 text-green-500">Loading leaderboard...</span>
          </div>
        ) : (
          <>
            {/* Current User Stats Card */}
            {currentUserRank && (
              <Card className="border-none shadow-md bg-gradient-to-r from-purple-500/20 to-blue-700/20">
                <CardHeader>
                  <CardTitle className="text-green-900 flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Your Position
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500/20">
                      <Trophy className="h-6 w-6 text-yellow-500" />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-green-900">
                        Rank #{currentUserRank}
                      </div>
                      <div className="text-sm text-gray-600">
                        Out of {stats?.totalUsers || 0} users
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top 3 Podium */}
            {leaderboardData.length >= 3 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {leaderboardData
                  .slice(0, 3)
                  .map((userEntry: LeaderboardUser, i: number) => (
                    <Card
                      key={userEntry.id}
                      className={`bg-green-100 border-none shadow-md ${i === 0 ? 'ring-2 ring-yellow-400/50' : ''}`}
                    >
                      <CardHeader className="text-center pb-2">
                        <div className="flex justify-center mb-2">
                          {getRankIcon(i)}
                        </div>
                        <CardTitle className="text-lg text-green-900">
                          {user && userEntry.id === user._id
                            ? 'You'
                            : userEntry.name}
                        </CardTitle>
                        <CardDescription className="text-green-900">
                          {userEntry.totalPointsEarned.toLocaleString()} points
                        </CardDescription>
                        <CardDescription className="text-gray-600 text-xs">
                          Level {userEntry.level} • {userEntry.achievementCount}{' '}
                          achievements • {userEntry.streakCount} day streak
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="text-center">
                        <Badge
                          className={
                            getLevelTierBadge(userEntry.levelTier).color
                          }
                        >
                          {getLevelTierBadge(userEntry.levelTier).icon}{' '}
                          {userEntry.levelTier}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}

            {/* Full Leaderboard */}
            <Card className="bg-green-100 border-none shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <TrendingUp className="h-5 w-5" />
                  Points Rankings
                </CardTitle>
                <CardDescription className="text-green-700">
                  Rankings based on total points earned and level achieved
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leaderboardData.map(
                    (userEntry: LeaderboardUser, i: number) => {
                      const isCurrentUser = user && userEntry.id === user._id;
                      const tierBadge = getLevelTierBadge(userEntry.levelTier);
                      return (
                        <div
                          key={userEntry.id}
                          className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-200 ${
                            isCurrentUser
                              ? 'bg-blue-900/30 border-blue-700 ring-1 ring-blue-500/50'
                              : 'bg-green-400/30 border-green-700 hover:bg-green-500/50'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-10">
                              {getRankIcon(i)}
                            </div>
                            <Avatar
                              avatarId={userEntry.avatarId ?? 'avatar-1'}
                              className="h-10 w-10"
                            />
                            <div>
                              <div className="font-medium text-white flex items-center gap-2">
                                {isCurrentUser ? 'You' : userEntry.name}
                                {isCurrentUser && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-green-900/50 text-green-400 border-green-700 text-xs"
                                  >
                                    You
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-green-800">
                                <Zap className="inline h-3 w-3 mr-1" />
                                {userEntry.totalPointsEarned.toLocaleString()}{' '}
                                points • Level {userEntry.level} •{' '}
                                {userEntry.achievementCount} achievements
                              </div>
                              <div className="text-xs text-green-800">
                                {userEntry.totalScanned} scans •{' '}
                                {userEntry.streakCount} day streak • Joined{' '}
                                {new Date(
                                  userEntry.joinedAt
                                ).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge className={tierBadge.color}>
                              {tierBadge.icon} {userEntry.levelTier}
                            </Badge>
                            <div className="text-right">
                              {getChangeIndicator(userEntry.change)}
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>

                {hasMore && (
                  <div className="flex justify-center mt-6">
                    <Button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      {loadingMore ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      {loadingMore ? 'Loading...' : 'Load More'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-emerald-100 border-none shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-emerald-700 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Your Rank
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-900">
                    {currentUserRank ? `#${currentUserRank}` : 'N/A'}
                  </div>
                  <p className="text-xs text-emerald-700">
                    Out of {stats?.totalUsers || 0} users
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-emerald-100 border-none shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-emerald-700 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Total Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-900">
                    {stats?.totalUsers || 0}
                  </div>
                  <p className="text-xs text-emerald-700">
                    Active eco-warriors
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-emerald-100 border-none shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-emerald-700 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Average Points
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-900">
                    {stats?.averagePoints?.toLocaleString() || '0'}
                  </div>
                  <p className="text-xs text-emerald-700">Community average</p>
                </CardContent>
              </Card>

              <Card className="bg-emerald-100 border-none shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-emerald-700 flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Average Level
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-900">
                    {stats?.averageLevel || '1.0'}
                  </div>
                  <p className="text-xs text-emerald-700">Community level</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
