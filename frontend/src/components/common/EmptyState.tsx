import React from 'react';
import { InboxIcon, SearchX, Calendar, MessageSquare, BookOpen, Users } from 'lucide-react';
import { Button } from './Button';

type EmptyIcon = 'inbox' | 'search' | 'calendar' | 'message' | 'book' | 'users';

const iconMap: Record<EmptyIcon, React.FC<{ className?: string }>> = {
  inbox: ({ className }) => <InboxIcon className={className} />,
  search: ({ className }) => <SearchX className={className} />,
  calendar: ({ className }) => <Calendar className={className} />,
  message: ({ className }) => <MessageSquare className={className} />,
  book: ({ className }) => <BookOpen className={className} />,
  users: ({ className }) => <Users className={className} />,
};

export interface EmptyStateProps {
  icon?: EmptyIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inbox',
  title,
  description,
  actionLabel,
  onAction,
}) => {
  const IconComponent = iconMap[icon];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-calm-100 flex items-center justify-center">
        <IconComponent className="w-8 h-8 text-calm-400" />
      </div>
      <div className="space-y-1.5 max-w-xs">
        <h3 className="text-sm font-semibold text-calm-700">{title}</h3>
        {description && <p className="text-xs text-calm-500 leading-relaxed">{description}</p>}
      </div>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
