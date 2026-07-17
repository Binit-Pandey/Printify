import { useState, useMemo } from 'react';

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce((current: unknown, key: string) => {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function useFilter<T>(items: T[], searchFields: string[]) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    
    const lowerQuery = searchQuery.toLowerCase();
    return items.filter((item) =>
      searchFields.some((field) => {
        const value = getNestedValue(item, field);
        return value != null && String(value).toLowerCase().includes(lowerQuery);
      })
    );
  }, [items, searchQuery, searchFields]);

  return {
    searchQuery,
    setSearchQuery,
    filteredItems,
  };
}
