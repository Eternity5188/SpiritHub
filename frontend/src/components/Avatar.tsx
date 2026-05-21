import React from 'react';

interface AvatarProps {
  avatar?: string | null;
  username: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-16 h-16 text-2xl',
};

export default function Avatar({ avatar, username, size = 'sm', className = '' }: AvatarProps) {
  const sizeClass = sizeMap[size];
  const base = `rounded-full flex-shrink-0 ${sizeClass} ${className}`;

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={username}
        className={`${base} object-cover`}
      />
    );
  }

  return (
    <div className={`${base} bg-primary-100 text-primary-700 flex items-center justify-center font-bold`}>
      {username[0]?.toUpperCase() ?? '?'}
    </div>
  );
}
