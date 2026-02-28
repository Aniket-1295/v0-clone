'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

function BadgeCard({ name, variant = 'dark' }) {
    const isDark = variant !== 'light';

    return (
        <div
            className={cn(
                'relative w-[280px] rounded-2xl overflow-hidden shadow-2xl select-none',
                isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'
            )}
            style={{ aspectRatio: '2/3' }}
        >
            {/* Top header strip */}
            <div
                className={cn(
                    'flex items-start justify-between px-5 pt-5 pb-3',
                    isDark ? 'bg-[#111111]' : 'bg-gray-50'
                )}
            >
                {/* v0 logo left */}
                <div className="flex flex-col gap-0.5">
                    <svg
                        viewBox="0 0 40 24"
                        fill="currentColor"
                        className="w-14 h-8"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <text
                            x="0"
                            y="20"
                            fontFamily="Arial Black, sans-serif"
                            fontWeight="900"
                            fontSize="22"
                            letterSpacing="-1"
                        >
                            v∅
                        </text>
                    </svg>
                </div>

                {/* Event details right */}
                <div className="text-right">
                    <p
                        className={cn(
                            'text-xs font-bold tracking-widest uppercase',
                            isDark ? 'text-white' : 'text-black'
                        )}
                    >
                       Build Something with 
                    </p>
                    {/* <p
                        className={cn(
                            ' flex items-center justify-center ',
                            'text-xs font-mono tracking-wider',
                            isDark ? 'text-gray-300' : 'text-gray-600'
                        )}
                    >
                       💓
                    </p> */}
                </div>
            </div>

            {/* Event name */}
            <div
                className={cn(
                    'px-5 pb-4',
                    isDark ? 'bg-[#111111]' : 'bg-gray-50'
                )}
            >
                <p
                    className={cn(
                        'text-base font-semibold leading-tight',
                        isDark ? 'text-white' : 'text-black'
                    )}
                >
                    Prompt to Production
                </p>
            </div>

            {/* Geometric pattern area */}
            <div
                className={cn(
                    'relative flex items-center justify-center',
                    isDark ? 'bg-[#0d0d0d]' : 'bg-gray-100'
                )}
                style={{ height: '160px' }}
            >
                <svg
                    viewBox="0 0 200 160"
                    className="absolute inset-0 w-full h-full opacity-25"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {/* X cross pattern */}
                    <line x1="20" y1="20" x2="180" y2="140" stroke={isDark ? '#ffffff' : '#000000'} strokeWidth="1.5" />
                    <line x1="180" y1="20" x2="20" y2="140" stroke={isDark ? '#ffffff' : '#000000'} strokeWidth="1.5" />
                    {/* Concentric diamond outlines */}
                    <polygon points="100,15 180,80 100,145 20,80" fill="none" stroke={isDark ? '#ffffff' : '#000000'} strokeWidth="0.8" />
                    <polygon points="100,35 160,80 100,125 40,80" fill="none" stroke={isDark ? '#ffffff' : '#000000'} strokeWidth="0.8" />
                    <polygon points="100,55 140,80 100,105 60,80" fill="none" stroke={isDark ? '#ffffff' : '#000000'} strokeWidth="0.8" />
                    {/* Diagonal hatching */}
                    {[...Array(8)].map((_, i) => (
                        <line
                            key={`h${i}`}
                            x1={20 + i * 22}
                            y1="20"
                            x2={20 + i * 22 - 40}
                            y2="140"
                            stroke={isDark ? '#ffffff' : '#000000'}
                            strokeWidth="0.4"
                            opacity="0.4"
                        />
                    ))}
                </svg>
            </div>

            {/* Bottom info strip */}
            <div
                className={cn(
                    'px-5 pt-4 pb-5 flex flex-col gap-1',
                    isDark ? 'bg-[#111111]' : 'bg-gray-50'
                )}
            >
                <p
                    className={cn(
                        'text-xs font-mono tracking-widest uppercase',
                        isDark ? 'text-gray-400' : 'text-gray-500'
                    )}
                >
                    Attendee
                </p>
                <p
                    className={cn(
                        'text-xl font-bold tracking-wider uppercase truncate',
                        isDark ? 'text-white' : 'text-black'
                    )}
                >
                    {name || 'YOUR NAME'}
                </p>
            </div>

            {/* Lanyard hole notch at top */}
            <div
                className={cn(
                    'absolute top-0 left-1/2 -translate-x-1/2 w-6 h-3 rounded-b-full',
                    isDark ? 'bg-[#0a0a0a]' : 'bg-white'
                )}
                style={{ border: `2px solid ${isDark ? '#333' : '#ccc'}`, borderTop: 'none' }}
            />
        </div>
    );
}

function LanyardString() {
    return (
        <div className="flex flex-col items-center" style={{ marginBottom: '-2px' }}>
            {/* Clasp */}
            <div className="w-5 h-3 rounded-sm bg-gray-500 border border-gray-400" />
            {/* String */}
            <div
                className="w-px bg-linear-to-b from-gray-400 to-gray-600"
                style={{ height: '60px' }}
            />
        </div>
    );
}

export default function LanyardWithControls({
    containerClassName,
    defaultName = '',
}) {
    const [name, setName] = useState(defaultName);
    const [inputValue, setInputValue] = useState(defaultName);
    const [variant, setVariant] = useState('dark');
    const [mounted, setMounted] = useState(false);
    const maxLen = 20;

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className={cn('flex items-center justify-center min-h-[500px]', containerClassName)}>
                <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
            </div>
        );
    }

    return (
        <div className={cn('flex flex-col items-center justify-start pt-8 pb-6 gap-6', containerClassName)}>
            {/* Card + lanyard */}
            <motion.div
                className="flex flex-col items-center"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.2 }}
            >
                <LanyardString />
                <motion.div
                    animate={{ rotate: [-1.5, 1.5, -1.5] }}
                    transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                    style={{ transformOrigin: 'top center' }}
                >
                    <BadgeCard name={name} variant={variant} />
                </motion.div>
            </motion.div>

            {/* Controls below card */}
            <motion.div
                className="flex flex-col items-center gap-3 w-full max-w-[300px]"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
            >
                {/* Attendee label */}
                {/* <div className="text-center leading-tight">
                    <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                        Attendee
                    </p>
                    <p className="text-lg font-bold uppercase tracking-wide text-foreground truncate max-w-[280px]">
                        {name || 'YOUR NAME'}
                    </p>
                </div> */}

                {/* Personalize label */}
                <p className="text-sm text-muted-foreground">Personalize your card</p>

                {/* Input row */}
                <div className="flex items-center w-full gap-2 border border-border rounded-lg bg-background px-3 py-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value.slice(0, maxLen))}
                        placeholder="Your name"
                        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none min-w-0"
                        maxLength={maxLen}
                    />
                    <span className="text-xs text-muted-foreground shrink-0">
                        {inputValue.length}/{maxLen}
                    </span>
                    <button
                        onClick={() => setName(inputValue)}
                        className="shrink-0 text-xs font-semibold bg-foreground text-background px-3 py-1 rounded-md hover:opacity-80 transition-opacity"
                    >
                        Apply
                    </button>
                </div>

                {/* Variant toggle */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setVariant('dark')}
                        className={cn(
                            'w-7 h-7 rounded-full border-2 transition-all',
                            variant === 'dark'
                                ? 'bg-foreground border-foreground scale-110'
                                : 'bg-transparent border-muted-foreground'
                        )}
                        aria-label="Dark variant"
                    />
                    <button
                        onClick={() => setVariant('light')}
                        className={cn(
                            'w-7 h-7 rounded-full border-2 transition-all',
                            variant === 'light'
                                ? 'bg-background border-foreground scale-110 shadow-md'
                                : 'bg-muted border-muted-foreground'
                        )}
                        aria-label="Light variant"
                    />
                </div>

                {/* Share row */}
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>Share:</span>
                    <a
                        href={`https://twitter.com/intent/tweet?text=I'm attending v0 IRL - Prompt to Production in New York!`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 flex items-center justify-center rounded-md border border-border bg-background hover:bg-muted transition-colors"
                        aria-label="Share on X"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.763l7.727-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117Z" />
                        </svg>
                    </a>
                    <a
                        href="https://www.linkedin.com/sharing/share-offsite/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 flex items-center justify-center rounded-md border border-border bg-background hover:bg-muted transition-colors"
                        aria-label="Share on LinkedIn"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                        </svg>
                    </a>
                    <button
                        onClick={() => {
                            navigator.clipboard?.writeText(window.location.href);
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-md border border-border bg-background hover:bg-muted transition-colors"
                        aria-label="Copy link"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
