'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Share2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface BadgeProps {
  id: string;
  name: string;
  description: string;
  points: number;
  icon: string;
  category: string;
  isEarned: boolean;
  progress: number;
  currentValue: number;
  maxValue: number;
}

export function BadgeCard({ badge }: { badge: BadgeProps }) {
  const handleShare = async () => {
    const text = `I just earned the ${badge.name} badge in EcoVerse! 🌍✨`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'EcoVerse Achievement',
          text: text,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    }
  };

  return (
    <Card
      className={`relative overflow-hidden transition-all duration-300 ${badge.isEarned ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-200 shadow-md hover:shadow-lg hover:-translate-y-1' : 'bg-gray-50 border-gray-200 grayscale-[0.5] opacity-90'}`}
    >
      <CardContent className="p-6 flex flex-col items-center text-center h-full">
        {/* Category Label */}
        <div className="absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500 bg-white/50 px-2 py-1 rounded-full">
          {badge.category}
        </div>

        {/* Points Label */}
        <div className="absolute top-2 right-2 text-[10px] font-semibold tracking-wider text-yellow-600 bg-yellow-100/50 px-2 py-1 rounded-full flex items-center gap-1">
          {badge.points} pts
        </div>

        {/* Icon */}
        <div
          className={`text-5xl mt-6 mb-4 transition-transform duration-300 ${badge.isEarned ? 'scale-110 drop-shadow-md' : 'opacity-60'}`}
        >
          {badge.icon}
        </div>

        {/* Info */}
        <h3
          className={`text-lg font-bold mb-2 ${badge.isEarned ? 'text-green-900' : 'text-gray-700'}`}
        >
          {badge.name}
        </h3>
        <p className="text-xs text-gray-600 mb-6 flex-grow">
          {badge.description}
        </p>

        {/* Progress or Share */}
        <div className="w-full mt-auto">
          {badge.isEarned ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full bg-white/80 hover:bg-white text-green-700 border-green-300 flex items-center gap-2"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4" />
              Share Achievement
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500 font-medium">
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Locked
                </span>
                <span>
                  {badge.currentValue} / {badge.maxValue}
                </span>
              </div>
              <Progress value={badge.progress} className="h-1.5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
