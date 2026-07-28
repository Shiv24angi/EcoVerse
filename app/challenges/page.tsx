'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard-layout';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, Trophy, Clock, CheckCircle2, Award, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ActiveChallenge {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  maxProgress: number;
  rewardPoints: number;
  icon: string;
  category: string;
  progress: number;
  progressPercentage: number;
  isCompleted: boolean;
  isClaimed: boolean;
  isExpired: boolean;
}

interface CompletedRecord {
  challengeId: string;
  name: string;
  pointsEarned: number;
  completedAt: string;
}

export default function ChallengesPage() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<ActiveChallenge[]>([]);
  const [completedHistory, setCompletedHistory] = useState<CompletedRecord[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const fetchChallenges = useCallback(async () => {
    if (!user?.email) return;

    try {
      setLoading(true);
      const res = await fetch('/api/challenges', {
        headers: {
          'x-user-email': user.email,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to load challenges');
      }

      const data = await res.json();
      setChallenges(data.activeChallenges || []);
      setCompletedHistory(data.completedHistory || []);
    } catch (error) {
      console.error(error);
      toast.error('Could not fetch sustainability challenges');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const claimReward = async (challengeId: string) => {
    if (!user?.email) return;

    try {
      setClaimingId(challengeId);
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user.email,
        },
        body: JSON.stringify({ challengeId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to claim reward');
      }

      toast.success(data.message || 'Reward claimed!');
      if (data.leveledUp) {
        toast.success(`🎉 Level Up! You reached Level ${data.newLevel}!`);
      }

      // Refresh list
      await fetchChallenges();
    } catch (error: any) {
      toast.error(error.message || 'Error claiming challenge reward');
    } finally {
      setClaimingId(null);
    }
  };

  const getTimeRemaining = (endDateStr: string) => {
    const total = Date.parse(endDateStr) - Date.now();
    if (total <= 0) return 'Expired';
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl mx-auto pb-12">
        {/* Header Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-green-700 p-8 text-white shadow-xl">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span>Limited-Time Eco Quests</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Sustainability Challenges
            </h1>
            <p className="text-emerald-100 text-sm sm:text-base leading-relaxed">
              Complete weekly sustainability challenges to maintain green habits, earn reward points, and boost your EcoVerse rank!
            </p>
          </div>
          <div className="absolute right-4 -bottom-6 hidden md:block opacity-25">
            <Target className="h-64 w-64 text-white" />
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Active Challenges ({challenges.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Completed History ({completedHistory.length})
            </TabsTrigger>
          </TabsList>

          {/* Active Challenges Tab */}
          <TabsContent value="active" className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mr-2 text-emerald-600" />
                <span>Loading sustainability challenges...</span>
              </div>
            ) : challenges.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent className="space-y-4">
                  <div className="text-4xl">🌱</div>
                  <h3 className="text-xl font-semibold">No active challenges available right now</h3>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    Check back soon! New weekly sustainability challenges rotate automatically every Monday.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {challenges.map((challenge) => {
                  const remainingText = getTimeRemaining(challenge.endDate);

                  return (
                    <Card
                      key={challenge.id}
                      className={`relative flex flex-col justify-between overflow-hidden transition-all duration-200 hover:shadow-lg border-2 ${
                        challenge.isClaimed
                          ? 'border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10'
                          : challenge.isCompleted
                            ? 'border-emerald-500 shadow-emerald-100 dark:shadow-none'
                            : 'border-border'
                      }`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <span className="text-4xl p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/50">
                            {challenge.icon}
                          </span>
                          <div className="flex flex-col items-end gap-1">
                            <Badge
                              variant="secondary"
                              className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold"
                            >
                              +{challenge.rewardPoints} Points
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {challenge.category}
                            </Badge>
                          </div>
                        </div>

                        <CardTitle className="text-lg font-bold">
                          {challenge.name}
                        </CardTitle>
                        <CardDescription className="text-xs leading-relaxed text-muted-foreground">
                          {challenge.description}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-4 pt-0 flex-1 flex flex-col justify-end">
                        {/* Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="text-emerald-700 dark:text-emerald-400">
                              {challenge.progress} / {challenge.maxProgress}
                            </span>
                          </div>
                          <Progress
                            value={challenge.progressPercentage}
                            className="h-2.5 bg-emerald-100 dark:bg-emerald-950"
                          />
                        </div>

                        {/* Timing indicator */}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                          <Clock className="h-3.5 w-3.5 text-emerald-600" />
                          <span>{remainingText}</span>
                        </div>

                        {/* Action Button */}
                        <div className="pt-2">
                          {challenge.isClaimed ? (
                            <Button
                              disabled
                              className="w-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" />
                              Reward Claimed
                            </Button>
                          ) : challenge.isCompleted ? (
                            <Button
                              onClick={() => claimReward(challenge.id)}
                              disabled={claimingId === challenge.id}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold animate-pulse"
                            >
                              {claimingId === challenge.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Award className="h-4 w-4 mr-2" />
                              )}
                              Claim +{challenge.rewardPoints} Points
                            </Button>
                          ) : (
                            <Button disabled variant="outline" className="w-full text-xs">
                              In Progress
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  Completed Challenge History
                </CardTitle>
                <CardDescription>
                  Your record of completed sustainability challenges and rewards claimed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {completedHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No completed challenges yet. Start scanning products to complete your first challenge!
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {completedHistory.map((item) => (
                      <div key={item.challengeId} className="py-3 flex justify-between items-center text-sm">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                          <div>
                            <p className="font-semibold text-foreground">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Completed on{' '}
                              {mounted
                                ? new Date(item.completedAt).toLocaleDateString()
                                : new Date(item.completedAt).toISOString().split('T')[0]}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                          +{item.pointsEarned} Points
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
