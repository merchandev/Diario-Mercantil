import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import HTMLFlipBook from 'react-pageflip';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { IconChevronLeft, IconChevronRight, IconMaximize, IconMinimize } from '@tabler/icons-react';

import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface MagazineViewerProps {
    src: string;
}

const PageContent = React.forwardRef<HTMLDivElement, { pageNumber: number; width: number }>(({ pageNumber, width }, ref) => {
    return (
        <div ref={ref} className="page bg-white shadow-2xl rounded-sm overflow-hidden flex items-center justify-center relative group">
            {/* Spine shadow for realism */}
            <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/20 to-transparent z-10 pointer-events-none opacity-50 group-even:right-0 group-even:left-auto group-even:bg-gradient-to-l"></div>
            <Page pageNumber={pageNumber} width={width} renderTextLayer={false} renderAnnotationLayer={false} className="transition-transform duration-500 ease-in-out" />
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

    const onDocumentLoadError = (error: Error) => {
        console.error('Error al cargar PDF:', error);
        setLoading(false);
    };

    useEffect(() => {
        const handleResize = () => {
            if (!containerRef.current) return;
            const { clientWidth, clientHeight } = containerRef.current;

            // Calculate aspect ratio for A4 portrait
            const targetRatio = 1 / 1.414;

            // Give more breathing room (padding)
            let w = (clientWidth / 2) - 40;
            let h = w / targetRatio;

            if (h > clientHeight - 80) {
                h = clientHeight - 80;
                w = h * targetRatio;
            }

            setDimensions({ width: Math.max(w, 200), height: Math.max(h, 300) });
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
            className={`relative w-full bg-slate-900 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] flex flex-col items-center justify-center overflow-hidden transition-all duration-500 ease-in-out ${isFullscreen ? 'h-screen fixed inset-0 z-50 rounded-none' : 'h-[85vh] min-h-[600px] rounded-2xl shadow-2xl border border-slate-700/50'}`}
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

            {/* Loading Overlay */}
            {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-md z-20 transition-opacity duration-500">
                    <div className="relative w-20 h-20 mb-6">
                        <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-brand-500 rounded-full border-t-transparent animate-spin"></div>
                    </div>
                    <p className="text-slate-300 font-medium tracking-wide animate-pulse">Preparando la revista digital...</p>
                </div>
            )}

            <div className="relative w-full h-full flex items-center justify-center p-4 md:p-8 perspective-1000">
                <Document
                    file={src}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    className="flex justify-center"
                    loading={null}
                >
                    {!loading && numPages > 0 && dimensions.width > 100 && (
                        <div className="transform-gpu transition-transform duration-700 ease-out hover:scale-[1.02] shadow-2xl relative w-full h-full flex items-center justify-center rounded-sm">
                            {/* @ts-ignore */}
                            <HTMLFlipBook
                                width={dimensions.width}
                                height={dimensions.height}
                                size="stretch"
                                minWidth={315}
                                maxWidth={1000}
                                minHeight={400}
                                maxHeight={1533}
                                maxShadowOpacity={0.6}
                                showCover={true}
                                className="flipbook-demo mx-auto shadow-2xl drop-shadow-2xl"
                                ref={bookRef}
                                onFlip={(e: any) => setPage(e.data)}
                                useMouseEvents={true}
                                swipeDistance={30}
                                flippingTime={1200}
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
                            className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 bg-slate-800/80 backdrop-blur-md p-3 md:p-4 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] text-white hover:bg-brand-600 hover:scale-110 hover:shadow-brand-500/50 transition-all duration-300 disabled:opacity-0 disabled:pointer-events-none z-30 group"
                        >
                            <IconChevronLeft className="w-6 h-6 md:w-8 md:h-8 group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <button
                            onClick={nextButtonClick}
                            disabled={page >= numPages - 1}
                            className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 bg-slate-800/80 backdrop-blur-md p-3 md:p-4 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] text-white hover:bg-brand-600 hover:scale-110 hover:shadow-brand-500/50 transition-all duration-300 disabled:opacity-0 disabled:pointer-events-none z-30 group"
                        >
                            <IconChevronRight className="w-6 h-6 md:w-8 md:h-8 group-hover:translate-x-1 transition-transform" />
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
