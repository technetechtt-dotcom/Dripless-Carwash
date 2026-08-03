import React from 'react';
type CardVariant = 'default' | 'interactive' | 'subtle' | 'nav' | 'bordered';
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  hoverable?: boolean;
  as?: 'div' | 'section' | 'article';
}
const base =
'rounded-2xl border bg-white/70 backdrop-blur-xl border-white/40 shadow-sm transition-all duration-300 dark:bg-slate-900/60 dark:border-white/10 dark:shadow-none';
const variants: Record<CardVariant, string> = {
  default: '',
  interactive:
  'hover:shadow-md hover:bg-white/80 dark:hover:bg-slate-800/60 cursor-pointer',
  subtle: 'bg-white/50 dark:bg-slate-900/40 border-white/20 shadow-none',
  nav: 'rounded-none border-t border-x-0 border-b-0 border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg',
  bordered: 'border-l-4 border-l-eco-500'
};
export const Card: React.FC<CardProps> = ({
  variant = 'default',
  hoverable = false,
  as: Tag = 'div',
  className = '',
  children,
  ...props
}) => {
  const classes = [
  base,
  variants[variant],
  hoverable && variant !== 'interactive' ? variants.interactive : '',
  className].

  filter(Boolean).
  join(' ');
  return (
    <Tag className={classes} {...props}>
      {children}
    </Tag>);

};