import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, title, icon, className = '', action }) => {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      {(title || icon) && (
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon && <span className="text-indigo-600 flex-shrink-0">{icon}</span>}
            {typeof title === 'string' ? (
              <h3 className="text-lg font-bold text-gray-800">{title}</h3>
            ) : (
              title
            )}
          </div>
          {action && <div className="flex items-center">{action}</div>}
        </div>
      )}
      <div className="p-5">
        {children}
      </div>
    </div>
  );
};