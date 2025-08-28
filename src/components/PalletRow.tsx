"use client";

import { motion, useAnimation, useInView, useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";
import clsx from "clsx";

type SwatchRowProps = {
    colors: string[];
    dotSize?: number; // px diameter
    gap?: number;     // px between dots when expanded
    className?: string;
};

export default function SwatchRow({
                                      colors,
                                      dotSize = 16,
                                      gap = 8,
                                      className,
                                  }: SwatchRowProps) {
    const count = colors.length;


    // width so abs-positioned dots have room to expand
    const rowWidth = useMemo(() => {
        if (count <= 0) return 0;
        if (count === 1) {
            const nudge = Math.min(gap, dotSize * 0.75); // small wiggle room
            return dotSize + nudge;
        }
        return dotSize + (count - 1) * (dotSize + gap);
    }, [count, dotSize, gap]);

    const prefersReduced = useReducedMotion();
    const ref = useRef<HTMLDivElement | null>(null);
    const lastScrollY = useRef<number>(0);
    const scrollingDown = useRef<boolean>(false); // was true
    const openedSinceTop = useRef<boolean>(false);

    // amount: 0 -> becomes false only when fully out of view
    const inView = useInView(ref, { amount: 0 });
    const controls = useAnimation();

    const inViewRef = useRef(false);
    useEffect(() => { inViewRef.current = inView; }, [inView]);

    useEffect(() => {
        if (prefersReduced) {
            controls.set("open");
            return;
        }

        if (inView && !openedSinceTop.current) {
            controls.start("open");
            openedSinceTop.current = true; // stay open until we hit top again
        }
        // Note: we do NOT auto-close when out of view anymore.
    }, [inView, controls, prefersReduced]);

    useEffect(() => {
        const onScroll = () => {
            const y = window.scrollY || window.pageYOffset || 0;
            const goingDown = y > lastScrollY.current;
            scrollingDown.current = goingDown;
            lastScrollY.current = y;

            // If we are effectively at the top, re-arm the animation for next time
            if (y === 0) {
                openedSinceTop.current = false;
                if (!prefersReduced) controls.set("closed");
            }
            if (goingDown && inViewRef.current && !openedSinceTop.current) {
                controls.start("open");
                openedSinceTop.current = true;
            }
        };

        onScroll(); // initialize
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [controls, prefersReduced]);

    const containerVariants = {
        closed: {},
        open: {
            transition: prefersReduced
                ? undefined
                : { staggerChildren: 0.06, delayChildren: 0.09 },
        },
    };

    const dotVariants: Variants = {
        closed: (custom: { i: number; count: number }) => {
            const { i } = custom;
            return {
                x: 0,
                opacity: i === 0 ? 1 : 0,
                scale: i === 0 ? 1 : 0.9,
            };
        },
        open: (custom: { i: number; count: number }) => {
            const { i, count } = custom;
            const step = dotSize + gap;

            if (count === 1 && i === 0) {
                const nudge = Math.min(gap, dotSize * 0.75);
                return {
                    x: [0, nudge, 0],   // stay within the widened container
                    opacity: 1,
                    scale: 1,
                    transition: { duration: 0.5, times: [0, 0.6, 1], ease: "easeInOut" },
                };
            }

            return {
                x: i * step,
                opacity: 1,
                scale: 1,
                transition: { type: "spring", stiffness: 400, damping: 30 },
            };
        },
    };

    const initial = prefersReduced ? false : "closed";
    const animate = prefersReduced ? "open" : controls;
    if (count === 0) return null;

    return (
        <motion.div
            ref={ref}
            className={clsx("relative overflow-hidden", className)}
            style={{ width: rowWidth, height: dotSize }}
            variants={containerVariants}
            initial={initial}
            animate={animate}
        >
            {colors.map((hex, i) => (
                <motion.span
                    key={`${hex}-${i}`}
                    className="absolute rounded-full border"
                    style={{ width: dotSize, height: dotSize, left: 0, top: 0, backgroundColor: hex }}
                    variants={dotVariants}
                    custom={{ i, count }}     // ⬅️ add count here
                    role="img"
                    aria-label={`Color swatch ${i + 1} ${hex}`}
                    title={hex}
                />
            ))}
        </motion.div>
    );
}