import React, { useState, memo } from 'react'
import { BookOpen } from 'lucide-react';

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackText?: string;
}

export const ImageWithFallback = memo(function ImageWithFallback(props: Props) {
  const [didError, setDidError] = useState(false)

  const { src, alt, style, className, fallbackText, ...rest } = props

  // If there's no src, or it errored, render a beautiful local fallback
  if (didError || !src || src.trim() === '') {
    const isSmall = className?.includes('w-12') || className?.includes('h-16');
    const displayTitle = fallbackText || alt || 'Buku';
    
    // Pick a deterministic gradient based on title length or first char
    const gradients = [
      'from-indigo-900 via-purple-900 to-indigo-950',
      'from-slate-900 via-zinc-900 to-stone-950',
      'from-blue-950 via-slate-900 to-indigo-950',
      'from-fuchsia-950 via-purple-900 to-slate-900',
    ];
    const hash = displayTitle.length;
    const gradient = gradients[hash % gradients.length];

    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br ${gradient} border border-white/5 overflow-hidden relative ${className ?? ''}`}
        style={style}
        aria-label={alt || 'Sampul Buku'}
        role="img"
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20" />
        
        {!isSmall ? (
          <>
            <BookOpen size={32} className="text-white/30 mb-3" />
            <span className="text-white/80 font-bold text-center px-4 line-clamp-3 leading-snug drop-shadow-md" style={{ fontFamily: 'Lora, serif', fontSize: '1.1rem' }}>
              {displayTitle}
            </span>
            <span className="absolute bottom-3 text-[10px] text-white/30 uppercase tracking-widest font-semibold">SeakuNovel</span>
          </>
        ) : (
          <BookOpen size={16} className="text-white/40" />
        )}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt || ''}
      className={className}
      style={style}
      loading="lazy"
      {...rest}
      onError={() => setDidError(true)}
    />
  )
});