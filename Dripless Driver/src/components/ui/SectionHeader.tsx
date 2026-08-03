import React from 'react';
interface SectionHeaderProps {
  title: string;
  action?: React.ReactNode;
  className?: string;
}
export function SectionHeader({
  title,
  action,
  className = ''
}: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <h3 className="text-slate-700 dark:text-slate-200 font-bold text-lg tracking-tight">
        {title}
      </h3>
      {action && <div>{action}</div>}
    </div>);

}