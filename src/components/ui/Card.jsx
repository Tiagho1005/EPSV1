import React from 'react';

const Card = ({
  children,
  className = '',
  hover = false,
  gradient = false,
  padding = 'p-6',
  onClick,
  ...props
}) => {
  const hoverClasses = hover
    ? 'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary-500/10 cursor-pointer'
    : '';
  const gradientClasses = gradient ? 'gradient-card' : 'bg-white';

  return (
    <div
      className={`rounded-2xl border border-gray-100 shadow-sm transition-all duration-300 ${gradientClasses} ${padding} ${hoverClasses} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
