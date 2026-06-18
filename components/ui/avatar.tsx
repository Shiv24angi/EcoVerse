'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';
import Image from 'next/image';

export const avatarImages = {
  'avatar-1': '/avatars/av1.jpg',
  'avatar-2': '/avatars/av2.jpg',
  'avatar-3': '/avatars/av3.jpg',
  'avatar-4': '/avatars/av4.jpg',
  'avatar-5': '/avatars/av5.jpg',
  'avatar-6': '/avatars/av6.jpg',
  'avatar-7': '/avatars/av7.jpg',
  'avatar-8': '/avatars/av8.jpg',
};
export type AvatarId = keyof typeof avatarImages;

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  avatarId?: AvatarId;
  className?: string;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ avatarId = 'avatar-1', className, ...props }, ref) => {
    const src = avatarImages[avatarId];

    return (
      <div
        ref={ref}
        className={cn(
          'relative h-10 w-10 rounded-full overflow-hidden border border-border',
          className
        )}
        {...props}
      >
        <Image
          src={src}
          alt="User avatar"
          fill
          sizes="40px"
          className="object-cover rounded-full"
        />
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';

// FIX: Add a dummy AvatarFallback component to satisfy the leaderboard page import
const AvatarFallback = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground',
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = 'AvatarFallback';

export { Avatar, AvatarFallback };
