'use client';

import React, { useEffect, useState, ReactNode, useRef } from 'react';

interface ResponsiveScalerProps {
  children: ReactNode;
}

export default function ResponsiveScaler({ children }: ResponsiveScalerProps) {
  const [mounted, setMounted] = useState(false);
  const scaleRef = useRef(1);

  useEffect(() => {
    setMounted(true);
    
    const applyResponsiveZoom = () => {
      if (typeof window === 'undefined') return;
      
      const width = window.innerWidth;
      let scale = 1;

      if (width < 1100) {
        scale = 0.65;
      } else if (width < 1300) {
        scale = 0.75;
      } else if (width < 1500) {
        scale = 0.8; // 1366px için %80 (0.8) idealdir
      } else if (width < 1700) {
        scale = 0.9;
      } else {
        scale = 1;
      }

      scaleRef.current = scale;

      const targetElements = [document.documentElement, document.body];
      targetElements.forEach(el => {
        if (el) {
          const style = el.style as any;
          // CSS zoom özelliğini doğrudan ve zorlayıcı şekilde uygula
          style.zoom = scale.toString();
          
          // Firefox gibi tarayıcılar için fallback (Transform bazlı)
          if (!('zoom' in style)) {
            style.transform = `scale(${scale})`;
            style.transformOrigin = 'top left';
            style.width = `${100 / scale}%`;
          }
        }
      });
    };

    // 1. Hemen çalıştır
    applyResponsiveZoom();
    
    // 2. Hydration sonrası (Next.js) çakışmaları önlemek için 500ms sonra tekrarla
    const timer = setTimeout(applyResponsiveZoom, 500);
    
    // 3. Sayfa tamamen yüklendiğinde garantiye al
    window.addEventListener('load', applyResponsiveZoom);
    window.addEventListener('resize', applyResponsiveZoom);

    // 4. Periyodik kontrol (Yenileme sonrası gitmesini engellemek için ilk 5 saniye)
    const interval = setInterval(applyResponsiveZoom, 1000);
    setTimeout(() => clearInterval(interval), 5000);

    return () => {
      window.removeEventListener('resize', applyResponsiveZoom);
      window.removeEventListener('load', applyResponsiveZoom);
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  // Tema arka planını sabitle
  useEffect(() => {
    if (mounted) {
      const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--background').trim() || '#0f172a';
      document.body.style.backgroundColor = bgColor;
      document.documentElement.style.backgroundColor = bgColor;
    }
  }, [mounted]);

  if (!mounted) return <>{children}</>;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        html, body {
          margin: 0;
          padding: 0;
          background-color: var(--background) !important;
          min-height: 100vh;
          overflow-x: hidden;
          overflow-y: auto !important;
        }
        .min-h-screen {
          min-height: 100vh !important;
        }
      `}} />
      {children}
    </>
  );
}
