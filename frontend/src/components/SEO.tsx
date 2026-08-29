import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { getPublicSeo, SeoMetadata } from '../lib/api';

let globalSeoCache: Record<string, SeoMetadata> | null = null;
let fetching = false;
let subscribers: ((data: Record<string, SeoMetadata>) => void)[] = [];

export interface SEOProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogImage?: string;
  noindex?: boolean;
}

export const SEO = (props: SEOProps) => {
  const [seoMap, setSeoMap] = useState<Record<string, SeoMetadata> | null>(globalSeoCache);

  useEffect(() => {
    if (globalSeoCache) {
      setSeoMap(globalSeoCache);
      return;
    }
    subscribers.push(setSeoMap);
    if (!fetching) {
      fetching = true;
      getPublicSeo().then(res => {
        globalSeoCache = res.seo;
        subscribers.forEach(cb => cb(globalSeoCache!));
        subscribers = [];
      }).catch(err => {
         console.error("Failed to load SEO metadata", err);
         fetching = false;
      });
    }
    return () => {
      subscribers = subscribers.filter(cb => cb !== setSeoMap);
    };
  }, []);

  const path = window.location.pathname;
  const customSeo = seoMap ? seoMap[path] : null;

  const title = customSeo?.title || props.title;
  const description = customSeo?.description || props.description;
  const ogImage = customSeo?.og_image || props.ogImage;
  const canonicalUrl = props.canonicalUrl;

  let robots = "index, follow";
  if (customSeo?.robots) {
    robots = customSeo.robots;
  } else if (props.noindex) {
    robots = "noindex, nofollow";
  }

  const isNoIndex = robots.includes('noindex');

  return (
    <Helmet>
      {/* Basic Metadata */}
      <title>{title}</title>
      <meta name="description" content={description} />

      {/* Indexing Control */}
      <meta name="robots" content={robots} />

      {/* Open Graph Tags for Social Sharing */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      {ogImage && <meta property="og:image" content={ogImage} />}
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}

      {/* Structured Data (JSON-LD) */}
      {!isNoIndex && (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "NewsMediaOrganization",
            "name": "Diario Mercantil Venezuela",
            "url": "https://diariomercantil.com",
            "logo": "https://diariomercantil.com/logo-blanco.png",
            "description": "Periódico de circulación legal en Venezuela para avisos legales, edictos, asambleas y publicaciones de Registro Mercantil."
          })}
        </script>
      )}
    </Helmet>
  );
};
