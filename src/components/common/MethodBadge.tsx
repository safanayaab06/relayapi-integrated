import React from 'react';
import { HttpMethod } from '../../types/api';

const METHOD_COLOR_MAP: Record<HttpMethod, string> = {
  GET: 'text-emerald-700 dark:text-emerald-400',
  POST: 'text-indigo-700 dark:text-indigo-400',
  PUT: 'text-amber-700 dark:text-amber-400',
  PATCH: 'text-sky-700 dark:text-sky-400',
  DELETE: 'text-red-700 dark:text-red-400',
};

export const MethodBadge: React.FC<{ method: HttpMethod; className?: string }> = ({
  method,
  className = '',
}) => {
  return (
    <span
      className={`inline-block font-mono text-xs font-semibold tracking-tight whitespace-nowrap shrink-0 ${METHOD_COLOR_MAP[method]} ${className}`}
    >
      {method}
    </span>
  );
};
