import { useState } from 'react';

export const useSidebarState = () => {
  const [expandedItems, setExpandedItems] = useState<string[]>(() => {
    if (typeof window === 'undefined') return ['dashboard'];
    const saved = localStorage.getItem('sidebar-expanded');
    return saved ? JSON.parse(saved) : ['dashboard'];
  });

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => {
      const newExpanded = prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId];
      localStorage.setItem('sidebar-expanded', JSON.stringify(newExpanded));
      return newExpanded;
    });
  };

  const expandItem = (itemId: string) => {
    setExpandedItems(prev => {
      if (prev.includes(itemId)) return prev;
      const newExpanded = [...prev, itemId];
      localStorage.setItem('sidebar-expanded', JSON.stringify(newExpanded));
      return newExpanded;
    });
  };

  const collapseItem = (itemId: string) => {
    setExpandedItems(prev => {
      const newExpanded = prev.filter(id => id !== itemId);
      localStorage.setItem('sidebar-expanded', JSON.stringify(newExpanded));
      return newExpanded;
    });
  };

  return { expandedItems, toggleItem, expandItem, collapseItem };
};
