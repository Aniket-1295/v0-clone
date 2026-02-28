import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
// import { InfiniteSlider } from '@/components/ui/infinite-slider'
// import { ProgressiveBlur } from '@/components/ui/progressive-blur'
import { TextEffect } from "@/components/motion-primitives/text-effect";
import { AnimatedGroup } from "@/components/motion-primitives/animated-group";
// import V0Icon from "@/components/icons/v0-icon";
// import VercelWordmarkIcon from "@/components/icons/vercel-wordmark-icon";
// import GlobantLogoIcon from "@/components/icons/globant-logo-icon";
import DecryptedText from "@/components/DecryptedText";
import { transitionVariants } from "@/lib/utils";
import LanyardWithControls from "@/components/lanyard-with-controls";
import LiveDateText from '@/components/LiveLocationText';
export default function HeroSection() {
    return (
        <main className="overflow-x-hidden">
            <section className='lg:min-h-screen'>
                <div className="pb-24 pt-12 md:pb-32 lg:pb-56 lg:pt-10 lg:grid lg:grid-cols-2 lg:grid-rows-1 grid-cols-1 grid-rows-2">

                    {/* Left: text content */}
                    <div className="relative mx-auto flex max-w-xl flex-col px-6 lg:block">
                        <div className="mx-auto max-w-2xl text-center lg:ml-0 lg:text-left">
                            <div className=''>
                            <LiveDateText />
                            </div>
                            <TextEffect
                                preset="fade-in-blur"
                                speedSegment={0.3}
                                as="h1"
                                className="max-w-2xl text-balance text-6xl font-semibold md:text-7xl xl:text-8xl">
                                Prompt to
                            </TextEffect>
                            <TextEffect
                                preset="fade-in-blur"
                                speedSegment={0.3}
                                as="h1"
                                className="max-w-2xl text-balance text-6xl font-semibold md:text-7xl xl:text-8xl">
                                Production
                            </TextEffect>
                            <TextEffect
                                per="line"
                                preset="fade-in-blur"
                                speedSegment={0.3}
                                delay={0.5}
                                as="p"
                               className="mt-8 max-w-2xl text-pretty text-lg font-mono tracking-wide text-white/60 border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                                v0 turns your words into production-ready UI — instantly.
                                Describe it, ship it.
                            </TextEffect>
                            <AnimatedGroup
                                variants={{
                                    container: {
                                        visible: {
                                            transition: {
                                                staggerChildren: 0.05,
                                                delayChildren: 0.75,
                                            },
                                        },
                                    },
                                    ...transitionVariants,
                                }}
                                className="mt-12 flex flex-col items-center justify-center gap-2 sm:flex-row lg:justify-start"
                            >
                                <Button
                                    asChild
                                    size="lg"
                                    className="px-5 text-base">
                                    <Link href="#link">
                                        <span className="text-nowrap">Register Now</span>
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    size="lg"
                                    variant="ghost"
                                    className="px-5 text-base bg-black/30 backdrop-blur-sm hover:bg-black/40">
                                    <Link href="#link">
                                        <span className="text-nowrap">Contact Host</span>
                                    </Link>
                                </Button>
                            </AnimatedGroup>
                        </div>
                    </div>

                    {/* Right: animated lanyard card */}
                    <AnimatedGroup
                        preset="blur-slide"
                        triggerOnView
                        className="lg:absolute lg:top-0 lg:right-0 lg:w-1/2 relative w-full flex flex-col items-center justify-center select-none"
                    >
                        <LanyardWithControls
                            containerClassName="w-full flex flex-col items-center justify-center"
                            defaultName=""
                        />
                    </AnimatedGroup>

                </div>
            </section>

            {/* Supported by logos */}
            {/* <section className="bg-background pb-16 md:pb-32">
                <AnimatedGroup
                    preset="blur-slide"
                    triggerOnView
                    className="group relative m-auto max-w-6xl px-6"
                >
                    <div className="flex flex-col items-center md:flex-row">
                        <div className="md:max-w-44 md:border-r md:pr-6">
                            <p className="text-end text-sm font-mono uppercase">Supported by</p>
                        </div>
                        <div className="relative py-6 md:w-[calc(100%-11rem)]">
                            <InfiniteSlider
                                speedOnHover={20}
                                speed={40}
                                gap={112}>
                                <div className="flex items-center">
                                    <V0Icon size={35} aria-label="v0 Logo" className='text-foreground mx-auto' />
                                </div>
                                <div className="flex items-center">
                                    <VercelWordmarkIcon size={20} aria-label="Vercel Logo"
                                        className='text-foreground mx-auto' />
                                </div>
                                <div className="flex items-center">
                                    <GlobantLogoIcon size={20} aria-label="Globant Logo"
                                        className='text-foreground mx-auto' />
                                </div>
                            </InfiniteSlider>
                            <div className="bg-linear-to-r from-background absolute inset-y-0 left-0 w-20"></div>
                            <div className="bg-linear-to-l from-background absolute inset-y-0 right-0 w-20"></div>
                            <ProgressiveBlur
                                className="pointer-events-none absolute left-0 top-0 h-full w-20"
                                direction="left"
                                blurIntensity={1}
                            />
                            <ProgressiveBlur
                                className="pointer-events-none absolute right-0 top-0 h-full w-20"
                                direction="right"
                                blurIntensity={1}
                            />
                        </div>
                    </div>
                </AnimatedGroup>
            </section> */}
        </main>
    )
}
