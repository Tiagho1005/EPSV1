import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  hasNext,
  hasPrev,
  goToPage,
  nextPage,
  prevPage,
}) => {
  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  // Build page numbers to show (max 5 visible)
  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) rangeWithDots.push(1, '...');
    else rangeWithDots.push(1);

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) rangeWithDots.push('...', totalPages);
    else if (totalPages > 1) rangeWithDots.push(totalPages);

    return rangeWithDots;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
      <p className="text-xs text-gray-400">
        Mostrando <span className="font-medium text-gray-600">{start}–{end}</span> de{' '}
        <span className="font-medium text-gray-600">{totalItems}</span> citas
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={prevPage}
          disabled={!hasPrev}
          className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          aria-label="Página anterior"
        >
          <ChevronLeft size={16} />
        </button>

        {getPageNumbers().map((page, idx) =>
          page === '...' ? (
            <span key={`dots-${idx}`} className="px-2 text-gray-400 text-sm select-none">…</span>
          ) : (
            <button
              key={page}
              onClick={() => goToPage(page)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                page === currentPage
                  ? 'gradient-primary text-white shadow-md'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          )
        )}

        <button
          onClick={nextPage}
          disabled={!hasNext}
          className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          aria-label="Página siguiente"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
