import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import HTMLFlipBook from 'react-pageflip';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { IconChevronLeft, IconChevronRight, IconMaximize, IconMinimize } from '@tabler/icons-react';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface MagazineViewerProps {
    src: string;
}

const PageContent = React.forwardRef<HTMLDivElement, { pageNumber: number; width: number }>(({ pageNumber, width }, ref) => {
    return (
        <div ref={ref} className="page bg-white shadow-md rounded-sm overflow-hidden flex items-center justify-center">
            <Page pageNumber={pageNumber} width={width} renderTextLayer={false} renderAnnotationLayer={false} />
        </div>
    );
});

export default function MagazineViewer({ src }: MagazineViewerProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const bookRef = useRef<any>(null);
    const [dimensions, setDimensions] = useState({ width: 400, height: 600 });
    const [page, setPage] = useState(0);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setLoading(false);
    };

    useEffect(() => {
        const handleResize = () => {
            if (!containerRef.current) return;
            const { clientWidth, clientHeight } = containerRef.current;

            // Calculate aspect ratio for A4 portrait
            const targetRatio = 1 / 1.414;

            let w = clientWidth / 2 - 20; // Two pages side by side
            let h = w / targetRatio;

            if (h > clientHeight - 40) {
                h = clientHeight - 40;
                w = h * targetRatio;
            }

            setDimensions({ width: w, height: h });
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isFullscreen]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const nextButtonClick = () => {
        bookRef.current?.pageFlip()?.flipNext();
    };

    const prevButtonClick = () => {
        bookRef.current?.pageFlip()?.flipPrev();
    };

    return (
        <div
            ref={containerRef}
            className={`relative w-full bg-slate-100 flex flex-col items-center justify-center overflow-hidden transition-all duration-300 ${isFullscreen ? 'h-screen fixed inset-0 z-50 rounded-none' : 'h-[80vh] min-h-[600px] rounded-xl shadow-inner border border-slate-200'}`}
        >
            {/* Controls */}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
                <button
                    onClick={toggleFullscreen}
                    className="bg-white/90 backdrop-blur text-slate-700 p-2.5 rounded-full shadow-lg hover:bg-brand-600 hover:text-white transition-all border border-slate-200 hover:scale-105"
                    title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                >
                    {isFullscreen ? <IconMinimize className="w-5 h-5" /> : <IconMaximize className="w-5 h-5" />}
                </button>
            </div>

            {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100/80 backdrop-blur-sm z-20">
                    <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-600 font-medium">Cargando revista digital...</p>
                </div>
            )}

            <div className="relative w-full h-full flex items-center justify-center p-8">
                <Document
                    file={src}
                    onLoadSuccess={onDocumentLoadSuccess}
                    className="flex justify-center"
                    loading={null}
                >
                    {!loading && numPages > 0 && dimensions.width > 100 && (
                        <div className="rotate-0 shadow-2xl relative w-full h-full flex items-center justify-center">
                            {/* @ts-ignore - react-pageflip types are slightly incompatible with React 18 but it works */}
                            {/* @ts-ignore - react-pageflip */}
<HTMLFlipBook
                                width={dimensions.width}
                                height={dimensions.height}
                                size="stretch"
                                minWidth={315}
                                maxWidth={1000}
                                minHeight={400}
                                maxHeight={1533}
                                maxShadowOpacity={0.5}
                                showCover={true}
                                mobileScrollSupport={true}
                                className="flipbook-demo mx-auto"
                                ref={bookRef}
                                onFlip={(e: any) => setPage(e.data)}
                                useMouseEvents={true}
                                swipeDistance={30}
                            >
                                {Array.from(new Array(numPages), (el, index) => (
                                    <PageContent key={`page_${index + 1}`} pageNumber={index + 1} width={dimensions.width} />
                                ))}
                            </HTMLFlipBook>
                        </div>
                    )}
                </Document>

                {/* Navigation Arrows */}
                {!loading && numPages > 0 && (
                    <>
                        <button
                            onClick={prevButtonClick}
                            disabled={page === 0}
                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur p-3 rounded-full shadow-lg text-brand-800 hover:bg-brand-50 hover:scale-110 transition-all disabled:opacity-30 disabled:hover:scale-100 z-10"
                        >
                            <IconChevronLeft className="w-6 h-6" />
                        </button>
                        <button
                            onClick={nextButtonClick}
                            disabled={page >= numPages - 1}
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur p-3 rounded-full shadow-lg text-brand-800 hover:bg-brand-50 hover:scale-110 transition-all disabled:opacity-30 disabled:hover:scale-100 z-10"
                        >
                            <IconChevronRight className="w-6 h-6" />
                        </button>
                    </>
                )}
            </div>

            {!loading && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur px-6 py-2 rounded-full text-white/90 text-sm font-medium tracking-wide shadow-lg">
                    {page === 0 ? 'Portada' : (page === numPages - 1 && numPages % 2 === 0 ? 'Contraportada' : `Páginas ${page}-${page + 1}`)} / {numPages}
                </div>
            )}
        </div>
    );
}
