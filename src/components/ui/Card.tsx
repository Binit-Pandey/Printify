import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export const Card = ({ children, className = '' }: CardProps) => {
  return (
    <div
      className={`bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-800 transition-all duration-200 hover:shadow-md ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
