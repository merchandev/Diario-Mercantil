import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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

const PageContent = React.forwardRef<HTMLDivElement, { pageNumber: number; width: number; height: number }>(({ pageNumber, width, height }, ref) => {
    return (
        <div ref={ref} className="page bg-white rounded-3xl overflow-hidden shadow-[0_35px_50px_rgba(0,0,0,0.35)] flex items-center justify-center relative">
            <div className="w-full h-full flex items-center justify-center p-0 m-0">
                <Page
                    pageNumber={pageNumber}
                    width={width}
                    height={height}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    className="max-w-full max-h-full object-contain"
                />
            </div>
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

    const handleResize = useCallback(() => {
        if (!containerRef.current) return;
        const { clientWidth, clientHeight } = containerRef.current;

        const targetRatio = 1 / 1.414;
        let h = clientHeight - 60;
        let w = h * targetRatio;

        if (w * 2 > clientWidth - 60) {
            w = (clientWidth - 60) / 2;
            h = w / targetRatio;
        }

        setDimensions({ width: Math.max(320, Math.floor(w)), height: Math.max(420, Math.floor(h)) });
    }, []);

    useEffect(() => {
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [handleResize]);

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

    const pageLabel = useMemo(() => {
        if (page === 0) return 'Portada';
        if (page === numPages - 1 && numPages % 2 === 0) return 'Contraportada';
        return `Páginas ${page}-${page + 1}`;
    }, [page, numPages]);

    return (
        <div
            ref={containerRef}
            className={`relative w-full overflow-hidden transition-all duration-500 ease-in-out bg-gradient-to-br from-slate-950 via-slate-900 to-black ${isFullscreen ? 'h-screen fixed inset-0 z-50 rounded-none' : 'min-h-[640px] rounded-[28px] shadow-[0_40px_90px_rgba(0,0,0,0.65)] border border-white/10'}`}
        >
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_transparent_55%)]" />
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_bottom,_rgba(255,255,255,0.04),_transparent_50%)]" />

            <div className="absolute top-4 left-4 z-30 space-y-1 text-white text-xs uppercase tracking-[0.4em]">
                <p className="text-white/50">Visor</p>
                <p className="text-white/90 text-base font-semibold">Espressivo PDF</p>
            </div>

            <div className="absolute top-4 right-4 z-30 flex gap-2">
                <button
                    onClick={toggleFullscreen}
                    className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all shadow-lg"
                    title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                >
                    {isFullscreen ? <IconMinimize className="w-5 h-5" /> : <IconMaximize className="w-5 h-5" />}
                </button>
            </div>

            <div className="absolute inset-x-0 top-16 px-6 z-20">
                <div className="max-w-4xl mx-auto rounded-full border border-white/20 bg-slate-900/60 backdrop-blur px-5 py-2 text-center text-xs text-slate-200 shadow-lg">
                    {numPages ? `${pageLabel} · ${numPages} páginas` : 'Cargando contenido...'}
                </div>
            </div>

            {loading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-white/80">
                    <div className="animate-pulse rounded-full w-16 h-16 border-4 border-white/30 border-t-transparent mb-4"></div>
                    <p>Preparando la edición digital</p>
                </div>
            )}

            <div className="relative w-full h-full flex items-center justify-center px-4 py-16">
                <Document
                    file={src}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    className="flex justify-center w-full h-full"
                    loading={null}
                >
                    {!loading && numPages > 0 && dimensions.width > 100 && (
                        <div className="w-full flex justify-center">
                            {/* @ts-ignore */}
                            <HTMLFlipBook
                                width={dimensions.width}
                                height={dimensions.height}
                                size="stretch"
                                minWidth={200}
                                maxWidth={2000}
                                minHeight={400}
                                maxHeight={2500}
                                maxShadowOpacity={0.65}
                                showCover={true}
                                className="relative shadow-[0_40px_120px_rgba(0,0,0,0.55)] rounded-[28px]"
                                ref={bookRef}
                                onFlip={(e: any) => setPage(e.data)}
                                useMouseEvents={true}
                                swipeDistance={30}
                                flippingTime={900}
                            >
                                {Array.from(new Array(numPages), (el, index) => (
                                    <PageContent
                                        key={`page_${index + 1}`}
                                        pageNumber={index + 1}
                                        width={dimensions.width}
                                        height={dimensions.height}
                                    />
                                ))}
                            </HTMLFlipBook>
                        </div>
                    )}
                </Document>
            </div>

            {!loading && numPages > 0 && (
                <>
                    <button
                        onClick={prevButtonClick}
                        disabled={page === 0}
                        className="absolute left-8 bottom-6 z-30 flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 border border-white/10 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-xl transition hover:scale-[1.02]"
                    >
                        <IconChevronLeft className="w-4 h-4" />
                        Anterior
                    </button>
                    <button
                        onClick={nextButtonClick}
                        disabled={page >= numPages - 1}
                        className="absolute right-8 bottom-6 z-30 flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 border border-white/10 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-xl transition hover:scale-[1.02]"
                    >
                        Siguiente
                        <IconChevronRight className="w-4 h-4" />
                    </button>
                </>
            )}
        </div>
    );
}
