import React from 'react';

interface AvatarProps {
  name: string;
  avatarUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, avatarUrl, size = 'md', className = '' }) => {
  const getInitials = (fullName: string): string => {
    const nameParts = fullName.trim().split(' ');
    if (nameParts.length === 1) {
      return nameParts[0].substring(0, 2).toUpperCase();
    }
    return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
  };

  const getColorFromName = (fullName: string): string => {
    // Generate a consistent color based on the name
    let hash = 0;
    for (let i = 0; i < fullName.length; i++) {
      hash = fullName.charCodeAt(i) + ((hash << 5) - hash);
    }

    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-orange-500',
      'bg-teal-500',
      'bg-cyan-500',
      'bg-lime-500',
    ];

    return colors[Math.abs(hash) % colors.length];
  };

  const sizeClasses = {
    xs: 'w-4 h-4 text-[8px]',
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-12 h-12 text-base',
  };

  const initials = getInitials(name);
  const bgColor = getColorFromName(name);

  // If user has uploaded a custom avatar, show it
  if (avatarUrl && avatarUrl.trim() !== '' && !avatarUrl.includes('picsum.photos')) {
    return (
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden flex-shrink-0 ${className}`}>
        <img
          src={avatarUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            // If image fails to load, show initials instead
            e.currentTarget.style.display = 'none';
            if (e.currentTarget.nextElementSibling) {
              (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
            }
          }}
        />
        <div
          className={`w-full h-full ${bgColor} text-white font-semibold flex items-center justify-center`}
          style={{ display: 'none' }}
        >
          {initials}
        </div>
      </div>
    );
  }

  // Default: show initials with background color
  return (
    <div
      className={`${sizeClasses[size]} ${bgColor} text-white font-semibold rounded-full flex items-center justify-center flex-shrink-0 ${className}`}
      title={name}
    >
      {initials}
    </div>
  );
};
