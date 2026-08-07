import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export const Card = ({ children, className = '' }: CardProps) => {
  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-white p-6 text-slate-900 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.35)] transition-all duration-200 hover:border-slate-300 hover:shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:shadow-[0_12px_30px_-24px_rgba(0,0,0,0.8)] dark:hover:border-slate-700 ${className}`}
    >
      {children}
    </section>
  );
};

export default Card;
