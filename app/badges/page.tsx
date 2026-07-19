'use client';

import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';
import DashboardLayout from '@/components/dashboard-layout';
import { BadgeCard, BadgeProps } from '@/components/badge-card';
import { Medal, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BadgesGallery() {
  const { user } = useAuth();
  const router = useRouter();
  const [badges, setBadges] = useState<BadgeProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const fetchBadges = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/rewards?email=${encodeURIComponent(user?.email || '')}`,
        {
          cache: 'no-store',
        }
      );
      if (response.ok) {
        const data = await response.json();
        setBadges(data.allAchievements || []);
      }
    } catch (error) {
      console.error('Failed to fetch badges:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin');
    } else {
      fetchBadges();
    }
  }, [user, router, fetchBadges]);

  const categories = useMemo(() => {
    const cats = new Set(badges.map((b) => b.category));
    return ['All', ...Array.from(cats)].sort();
  }, [badges]);

  const filteredBadges = useMemo(() => {
    if (activeCategory === 'All') return badges;
    return badges.filter((b) => b.category === activeCategory);
  }, [badges, activeCategory]);

  const earnedCount = badges.filter((b) => b.isEarned).length;

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
              <Medal className="w-8 h-8 md:w-10 md:h-10" />
              Badge Gallery
            </h1>
            <p className="mt-2 text-emerald-50 text-lg max-w-2xl">
              Track your sustainability milestones. Earn badges by scanning
              products, maintaining streaks, and keeping your carbon footprint
              low.
            </p>
            <div className="mt-6 flex items-center gap-4 bg-white/10 w-fit px-4 py-2 rounded-2xl backdrop-blur-sm border border-white/20">
              <span className="text-sm font-medium">Total Unlocked:</span>
              <span className="text-2xl font-bold">
                {loading ? '-' : earnedCount} / {badges.length}
              </span>
            </div>
          </div>
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 opacity-10">
            <Medal className="w-64 h-64" />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2 text-gray-500 font-medium">
            <Filter className="w-4 h-4" />
            <span>Filter by Category:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={activeCategory === category ? 'default' : 'outline'}
                onClick={() => setActiveCategory(category)}
                className={
                  activeCategory === category
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : ''
                }
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-64 bg-gray-100 animate-pulse rounded-xl"
              ></div>
            ))}
          </div>
        ) : filteredBadges.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBadges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-500">
            No badges found in this category.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
