import { useState, useMemo } from 'react';

const usePagination = (items, pageSize = 8) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Reset to page 1 when items change (e.g. filters applied)
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginated = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safeCurrentPage, pageSize]);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const nextPage = () => goToPage(safeCurrentPage + 1);
  const prevPage = () => goToPage(safeCurrentPage - 1);

  // Reset when items length changes significantly (filter change)
  const reset = () => setCurrentPage(1);

  return {
    paginated,
    currentPage: safeCurrentPage,
    totalPages,
    totalItems: items.length,
    pageSize,
    hasNext: safeCurrentPage < totalPages,
    hasPrev: safeCurrentPage > 1,
    goToPage,
    nextPage,
    prevPage,
    reset,
  };
};

export default usePagination;
