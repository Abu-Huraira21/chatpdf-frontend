import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, FileText, AlertCircle, FileIcon, AlignJustify } from 'lucide-react';
import { Document as PDFDocument, Page as PDFPage } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import '../config/pdfConfig'; // Initialize PDF.js worker
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Skeleton } from './ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import type { Document } from '../App';
import { useDocumentsStore } from '../stores';

type ViewMode = 'single' | 'continuous';

interface DocumentPreviewProps {
  document: Document;
  currentPage: number;
  highlightedPages: number[];
  onPageChange: (page: number) => void;
}

export function DocumentPreview({
  document,
  currentPage,
  highlightedPages,
  onPageChange,
}: DocumentPreviewProps) {
  const [zoom, setZoom] = useState(1.0); // Changed to 100% default
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [pageInput, setPageInput] = useState(currentPage.toString());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isManualNavigation = useRef(false);
  const currentPageRef = useRef(currentPage);
  const manualNavigationTargetRef = useRef<number | null>(null);

  const { documents: storeDocuments } = useDocumentsStore();

  // Keep ref in sync with currentPage
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // Get file_url from document (passed from App.tsx) or fallback to store
  const pdfUrl = (document as any)?.file_url || storeDocuments.find(doc => doc.id === document.id)?.file_url;

  // Debug logging
  console.log('🔍 DocumentPreview Debug:', {
    documentId: document.id,
    documentName: document.name,
    documentHasUrl: !!(document as any)?.file_url,
    pdfUrl,
    viewMode,
    zoom: `${Math.round(zoom * 100)}%`,
    storeDocumentsCount: storeDocuments.length
  });

  // Sync pageInput with currentPage
  useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

  // Scrollbars should always be visible in continuous mode, or when zoomed in single mode
  const showScrollbars = viewMode === 'continuous' || zoom > 1.0;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.2, 2.5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.2, 0.5));
  
  const handleResetZoom = () => setZoom(1.0);

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = () => {
    const pageNum = parseInt(pageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= document.pages) {
      console.log('⌨️ Page input submitted:', pageNum, 'currentPage before:', currentPage);
      // Set flag and target BEFORE calling onPageChange to prevent any race conditions
      isManualNavigation.current = true;
      manualNavigationTargetRef.current = pageNum;
      console.log('🔒 Manual navigation flag set to true for page:', pageNum);
      // Call onPageChange synchronously - the flag is already set
      onPageChange(pageNum);
      console.log('✅ onPageChange called with:', pageNum);
    } else {
      // Reset to current page if invalid
      console.log('❌ Invalid page input:', pageInput);
      setPageInput(currentPage.toString());
    }
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handlePageInputSubmit();
      (e.target as HTMLInputElement).blur();
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      const targetPage = currentPage - 1;
      console.log('⬅️ Previous page clicked, current:', currentPage, 'target:', targetPage);
      isManualNavigation.current = true;
      manualNavigationTargetRef.current = targetPage;
      onPageChange(targetPage);
    }
  };

  const handleNextPage = () => {
    if (currentPage < document.pages) {
      const targetPage = currentPage + 1;
      console.log('➡️ Next page clicked, current:', currentPage, 'target:', targetPage);
      isManualNavigation.current = true;
      manualNavigationTargetRef.current = targetPage;
      onPageChange(targetPage);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log('📄 PDF loaded successfully, pages:', numPages);
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('❌ PDF load error:', error);
    console.error('❌ PDF URL that failed:', pdfUrl);
    setError(`Failed to load PDF: ${error.message}`);
    setLoading(false);
  };

  const handleViewModeChange = (mode: string) => {
    if (mode) {
      setViewMode(mode as ViewMode);
      console.log('📖 View mode changed to:', mode);
    }
  };

  // Auto-scroll to current page in continuous mode (only when manually navigated)
  useEffect(() => {
    if (viewMode === 'continuous' && scrollContainerRef.current && isManualNavigation.current) {
      // Use the target page from the ref if available, otherwise use currentPage
      const targetPageNum = manualNavigationTargetRef.current ?? currentPage;
      
      console.log('🔍 Auto-scroll effect:', {
        currentPage,
        targetPageFromRef: manualNavigationTargetRef.current,
        targetPageNum,
        isManualNavigation: isManualNavigation.current
      });
      
      // Find the target page element by data-page-number attribute instead of array index
      // This is more reliable than using array index
      const targetPage = scrollContainerRef.current.querySelector(
        `[data-page-number="${targetPageNum}"]`
      ) as HTMLElement;
      
      if (targetPage) {
        const pageNumberAttr = targetPage.getAttribute('data-page-number');
        console.log('📍 Found target page element:', {
          requestedPage: targetPageNum,
          elementPageNumber: pageNumberAttr,
          match: pageNumberAttr === targetPageNum.toString()
        });
        
        if (pageNumberAttr !== targetPageNum.toString()) {
          console.error('❌ Page number mismatch! Element has', pageNumberAttr, 'but expected', targetPageNum);
          // Try to find the correct element
          const allPages = scrollContainerRef.current.querySelectorAll('[data-page-number]');
          console.log('📋 All available pages:', Array.from(allPages).map(el => el.getAttribute('data-page-number')));
          return;
        }
        
        console.log('📍 Manual navigation - scrolling to page:', targetPageNum);
        // Scroll to the page
        targetPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Reset flag after scrolling completes (longer timeout to ensure scroll completes)
        setTimeout(() => {
          // Only reset if we're actually on the target page
          if (manualNavigationTargetRef.current === currentPage || manualNavigationTargetRef.current === null) {
            isManualNavigation.current = false;
            manualNavigationTargetRef.current = null;
            console.log('🔓 Manual navigation complete, observer re-enabled for page:', currentPage);
          } else {
            console.log('⚠️ Manual navigation: page mismatch. Target:', manualNavigationTargetRef.current, 'Current:', currentPage);
            // Reset anyway after a delay to avoid getting stuck
            setTimeout(() => {
              isManualNavigation.current = false;
              manualNavigationTargetRef.current = null;
            }, 500);
          }
        }, 2500);
      } else {
        console.error('❌ Target page element not found for page:', targetPageNum);
        // Log all available pages for debugging
        const allPages = scrollContainerRef.current.querySelectorAll('[data-page-number]');
        console.log('📋 Available pages:', Array.from(allPages).map(el => el.getAttribute('data-page-number')));
        // Reset flag even if element not found to avoid getting stuck
        setTimeout(() => {
          isManualNavigation.current = false;
          manualNavigationTargetRef.current = null;
        }, 1000);
      }
    }
  }, [currentPage, viewMode]);

  // Track which page is in view in continuous mode (for updating the page selector)
  useEffect(() => {
    if (viewMode !== 'continuous' || !scrollContainerRef.current) return;

    const scrollContainer = scrollContainerRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        // Double-check the flag - this is critical to prevent interference during manual navigation
        if (isManualNavigation.current) {
          // If we have a target page, don't update unless we're on that target
          if (manualNavigationTargetRef.current !== null) {
            const detectedPage = entries.find(e => e.intersectionRatio > 0.4) 
              ? parseInt(entries.find(e => e.intersectionRatio > 0.4)!.target.getAttribute('data-page-number') || '1', 10)
              : null;
            if (detectedPage !== manualNavigationTargetRef.current) {
              return; // Still navigating to target, ignore this update
            }
          } else {
            return; // Silent return to avoid console spam
          }
        }

        // Find the page with highest intersection ratio
        let maxRatio = 0;
        let topPage = 1;
        
        entries.forEach((entry) => {
          if (entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            topPage = parseInt(entry.target.getAttribute('data-page-number') || '1', 10);
          }
        });

        // Only update if we have a clear winner (>40% visible) and it's different
        // Use ref to get latest currentPage value
        // Also verify the flag again before updating
        if (maxRatio > 0.4 && topPage !== currentPageRef.current && !isManualNavigation.current) {
          console.log('📄 Scroll detected - page in view changed to:', topPage, '(was:', currentPageRef.current, ')');
          onPageChange(topPage);
        }
      },
      {
        root: scrollContainer,
        threshold: [0, 0.2, 0.4, 0.6, 0.8, 1.0], // More thresholds for better tracking
        rootMargin: '0px',
      }
    );

    // Wait a bit for pages to render, then observe them
    const observeTimeout = setTimeout(() => {
      const pageElements = scrollContainer.querySelectorAll('[data-page-number]');
      pageElements.forEach((el) => observer.observe(el));
      console.log('👁️ IntersectionObserver observing', pageElements.length, 'pages');
    }, 100);

    return () => {
      clearTimeout(observeTimeout);
      observer.disconnect();
    };
  }, [viewMode, numPages, onPageChange]);

  const isHighlighted = (pageNum: number) => highlightedPages.includes(pageNum);

  // Render single page view
  const renderSinglePageView = () => (
    <div className="flex justify-center items-center p-8 min-h-full">
      <div
        className={`bg-white shadow-lg transition-all duration-300 ${
          isHighlighted(currentPage) ? 'ring-4 ring-blue-500 ring-opacity-50' : ''
        }`}
      >
        <PDFDocument
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="flex items-center justify-center p-12">
              <Skeleton className="w-[600px] h-[800px]" />
            </div>
          }
        >
          <PDFPage
            pageNumber={currentPage}
            scale={zoom}
            loading={
              <div className="flex items-center justify-center p-12">
                <Skeleton className="w-[600px] h-[800px]" />
              </div>
            }
            renderTextLayer={true}
            renderAnnotationLayer={false}
          />
        </PDFDocument>

        {isHighlighted(currentPage) && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 m-4">
            <p className="text-sm text-blue-900">
              📍 Referenced in chat conversation
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // Render continuous scroll view
  const renderContinuousView = () => (
    <div className="flex flex-col items-center gap-4 p-8">
      <PDFDocument
        file={pdfUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        loading={
          <div className="flex items-center justify-center p-12">
            <Skeleton className="w-[600px] h-[800px]" />
          </div>
        }
      >
        {Array.from({ length: numPages || 0 }, (_, index) => {
          const pageNum = index + 1;
          return (
            <div
              key={pageNum}
              data-page-number={pageNum}
              className={`bg-white shadow-lg mb-4 transition-all duration-300 ${
                isHighlighted(pageNum) ? 'ring-4 ring-blue-500 ring-opacity-50' : ''
              }`}
            >
              <PDFPage
                pageNumber={pageNum}
                scale={zoom}
                loading={
                  <div className="flex items-center justify-center p-12">
                    <Skeleton className="w-[600px] h-[800px]" />
                  </div>
                }
                renderTextLayer={true}
                renderAnnotationLayer={false}
              />
              
              {isHighlighted(pageNum) && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 m-4">
                  <p className="text-sm text-blue-900">
                    📍 Page {pageNum} - Referenced in chat conversation
                  </p>
                </div>
              )}
              
              {/* Page number indicator */}
              <div className="text-center text-sm text-gray-500 py-2 bg-gray-50">
                Page {pageNum} of {numPages}
              </div>
            </div>
          );
        })}
      </PDFDocument>
    </div>
  );

  return (
    <div className="flex flex-col w-1/2 bg-gray-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 gap-4">
        {/* Left: Page Navigation (works in both modes) */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            title="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1">
            <Input
              type="text"
              value={pageInput}
              onChange={handlePageInputChange}
              onBlur={handlePageInputSubmit}
              onKeyDown={handlePageInputKeyDown}
              className="w-16 h-9 text-center"
            />
            <span className="text-sm text-gray-600">of {document.pages}</span>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={handleNextPage}
            disabled={currentPage === document.pages}
            title="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Center: View Mode Toggle */}
        <TooltipProvider>
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'single' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => handleViewModeChange('single')}
                  className="h-8 w-8"
                  aria-label="Single page view"
                >
                  <FileIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Single page view</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'continuous' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => handleViewModeChange('continuous')}
                  className="h-8 w-8"
                  aria-label="Continuous scroll view"
                >
                  <AlignJustify className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Continuous scroll view</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        {/* Right: Zoom Controls */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetZoom}
            className="min-w-[70px]"
            title="Reset zoom to 100%"
          >
            {Math.round(zoom * 100)}%
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleZoomIn}
            disabled={zoom >= 2.5}
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Content Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 relative"
        style={{
          overflow: showScrollbars ? 'auto' : 'hidden',
        }}
      >
        {error ? (
          // Error state
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg shadow-lg max-w-md">
              <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load PDF</h3>
              <p className="text-gray-600 text-center mb-4">{error}</p>
              <p className="text-sm text-gray-500" title={document.name}>
                Document: <span className="inline-block max-w-[220px] truncate align-bottom">{document.name}</span>
              </p>
            </div>
          </div>
        ) : !pdfUrl ? (
          // No URL available
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg shadow-lg max-w-md">
              <FileText className="h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">PDF Not Available</h3>
              <p className="text-gray-600 text-center">Unable to load PDF file</p>
            </div>
          </div>
        ) : (
          // PDF viewer - render based on view mode
          viewMode === 'single' ? renderSinglePageView() : renderContinuousView()
        )}
      </div>

      {/* Zoom indicator overlay (only show when zoomed in single page mode) */}
      {viewMode === 'single' && zoom > 1.0 && (
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded-full text-xs pointer-events-none">
          Scroll to navigate • {Math.round(zoom * 100)}%
        </div>
      )}
    </div>
  );
}
