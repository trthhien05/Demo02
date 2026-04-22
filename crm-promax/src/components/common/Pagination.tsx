import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
}

export default function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  totalItems,
  pageSize 
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  // Logic to show a subset of pages if there are too many
  const getVisiblePages = () => {
    if (totalPages <= 7) return pages;
    
    if (currentPage <= 4) return [...pages.slice(0, 5), '...', totalPages];
    if (currentPage >= totalPages - 3) return [1, '...', ...pages.slice(totalPages - 5)];
    
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
      <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
        {totalItems && pageSize ? (
          <>
            Đang hiển thị <span className="text-foreground">{(currentPage - 1) * pageSize + 1}</span> - <span className="text-foreground">{Math.min(currentPage * pageSize, totalItems)}</span> của <span className="text-foreground">{totalItems}</span> bản ghi
          </>
        ) : (
          `Trang ${currentPage} / ${totalPages}`
        )}
      </div>

      <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-2xl p-1 backdrop-blur-xl">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-xl text-muted-foreground hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
        >
          <ChevronLeft size={18} />
        </button>

        {getVisiblePages().map((page, idx) => (
          <React.Fragment key={idx}>
            {page === '...' ? (
              <span className="px-3 py-2 text-muted-foreground text-sm font-bold">...</span>
            ) : (
              <button
                onClick={() => onPageChange(Number(page))}
                className={cn(
                  "min-w-[40px] h-10 rounded-xl text-sm font-black transition-all",
                  currentPage === page 
                    ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" 
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                )}
              >
                {page}
              </button>
            )}
          </React.Fragment>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-xl text-muted-foreground hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
