import React from 'react';

const Skeleton = ({ variant = 'text', lines = 3, className = '' }) => {
  const base = 'animate-shimmer rounded';

  if (variant === 'avatar') {
    return <div className={`${base} rounded-full w-12 h-12 ${className}`} />;
  }

  if (variant === 'card') {
    return (
      <div className={`bg-white rounded-2xl border border-gray-100 p-6 ${className}`}>
        <div className={`${base} h-4 w-3/4 mb-4`} />
        <div className={`${base} h-3 w-full mb-2`} />
        <div className={`${base} h-3 w-5/6 mb-2`} />
        <div className={`${base} h-3 w-2/3 mb-4`} />
        <div className="flex gap-2">
          <div className={`${base} h-8 w-24`} />
          <div className={`${base} h-8 w-24`} />
        </div>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className={`${base} h-10 w-full rounded-lg`} />
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className={`${base} h-14 w-full rounded-lg`} />
        ))}
      </div>
    );
  }

  // Default: text lines
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`${base} h-3 ${i === lines - 1 ? 'w-3/5' : 'w-full'}`}
        />
      ))}
    </div>
  );
};

export default Skeleton;
