'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';
import Image from 'next/image';
import { avatarImages, type AvatarId } from '@/lib/avatar-options';

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

export { Avatar };
export type { AvatarId };
