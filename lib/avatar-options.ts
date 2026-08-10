export const avatarImages = {
  'avatar-1': '/avatars/av1.jpg',
  'avatar-2': '/avatars/av2.jpg',
  'avatar-3': '/avatars/av3.jpg',
  'avatar-4': '/avatars/av4.jpg',
  'avatar-5': '/avatars/av5.jpg',
  'avatar-6': '/avatars/av6.jpg',
  'avatar-7': '/avatars/av7.jpg',
  'avatar-8': '/avatars/av8.jpg',
} as const;

export type AvatarId = keyof typeof avatarImages;

export function isAvatarId(value: unknown): value is AvatarId {
  return typeof value === 'string' && value in avatarImages;
}
