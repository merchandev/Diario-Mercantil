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
            className={`relative w-full overflow-hidden ${isFullscreen ? 'h-screen fixed inset-0 z-50' : 'min-h-[600px]'} rounded-[30px] bg-gradient-to-br from-[#771919] via-[#6F0E15] to-[#3f080d] border border-white/15 shadow-[0_40px_110px_rgba(0,0,0,0.7)]`}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-[#771919] via-[#6F0E15] to-[#2c0509]" />
            <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-10 text-center text-white">
                <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.5em] text-white/60">Visor</p>
                    <p className="text-2xl font-semibold tracking-[0.4em]">Espressivo PDF</p>
                </div>

                <div className="flex items-center justify-between w-full gap-4">
                    <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.4em] text-white/70 shadow-lg">
                        {numPages ? pageLabel : 'Cargando contenido...'}
                    </div>
                    <button
                        onClick={toggleFullscreen}
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                        title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                    >
                        {isFullscreen ? <IconMinimize className="w-5 h-5" /> : <IconMaximize className="w-5 h-5" />}
                    </button>
                </div>

                {loading && (
                    <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/15 bg-white/10 px-6 py-6 shadow-xl">
                        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-transparent" />
                        <p className="text-sm text-white/70">Preparando la edición digital</p>
                    </div>
                )}

                {!loading && (
                    <div className="w-full px-6">
                        <Document
                            file={src}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={onDocumentLoadError}
                            className="flex justify-center"
                            loading={null}
                        >
                            {numPages > 0 && dimensions.width > 100 && (
                                <div className="w-full flex justify-center">
                                    {/* @ts-ignore */}
                                    <HTMLFlipBook
                                        width={dimensions.width}
                                        height={dimensions.height}
                                        size="stretch"
                                        minWidth={280}
                                        maxWidth={1200}
                                        minHeight={380}
                                        maxHeight={2000}
                                        maxShadowOpacity={0.6}
                                        showCover={true}
                                        className="relative rounded-[30px] border border-white/10 bg-white shadow-[0_40px_120px_rgba(0,0,0,0.55)]"
                                        ref={bookRef}
                                        onFlip={(e: any) => setPage(e.data)}
                                        useMouseEvents={true}
                                        swipeDistance={30}
                                        flippingTime={850}
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
                )}

                {!loading && numPages === 0 && (
                    <div className="text-sm text-white/60">No hay páginas disponibles.</div>
                )}

                {!loading && numPages > 0 && (
                    <div className="flex w-full items-center justify-between gap-4 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-white shadow-lg">
                        <button
                            onClick={prevButtonClick}
                            disabled={page === 0}
                            className="flex items-center gap-2 rounded-full bg-transparent px-3 py-2 text-sm uppercase tracking-[0.3em] text-white transition hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <IconChevronLeft className="w-4 h-4" />
                            Anterior
                        </button>
                        <button
                            onClick={nextButtonClick}
                            disabled={page >= numPages - 1}
                            className="flex items-center gap-2 rounded-full bg-transparent px-3 py-2 text-sm uppercase tracking-[0.3em] text-white transition hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Siguiente
                            <IconChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
