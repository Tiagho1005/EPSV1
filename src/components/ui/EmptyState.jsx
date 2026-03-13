import React from 'react';
import * as LucideIcons from 'lucide-react';
import Button from './Button';

const EmptyState = ({
  icon = 'FileText',
  title,
  description,
  action,
  className = '',
}) => {
  const IconComponent = LucideIcons[icon] || LucideIcons.FileText;
  const ActionIcon = action?.icon ? LucideIcons[action.icon] : null;

  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      <div className="w-20 h-20 rounded-full gradient-card flex items-center justify-center mb-6">
        <IconComponent size={36} className="text-primary-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm mb-6 max-w-sm">{description}</p>
      {action && (
        <Button
          variant="primary"
          icon={ActionIcon ? <ActionIcon size={18} /> : null}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
