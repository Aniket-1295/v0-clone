"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";

export default function DecryptedText({
  text,
  speed = 50,
  animateOn = "load",
  revealDirection = "start",
  sequential = false,
  useOriginalCharsOnly = false,
  className,
  encryptedClassName,
  parentClassName,
}) {
  const [displayText, setDisplayText] = useState(text);
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const observerRef = useRef(null);

  const chars = useOriginalCharsOnly
    ? [...new Set(text.split(""))].filter((c) => c !== " ")
    : CHARS.split("");

  const getRandomChar = () => chars[Math.floor(Math.random() * chars.length)];

  const animate = () => {
    if (isAnimating) return;
    setIsAnimating(true);

    const textArray = text.split("");
    const totalChars = textArray.length;
    const revealed = new Array(totalChars).fill(false);
    let step = 0;

    const getOrder = () => {
      const indices = textArray.map((_, i) => i).filter((i) => textArray[i] !== " ");
      if (revealDirection === "end") return indices.reverse();
      if (revealDirection === "center") {
        const mid = Math.floor(indices.length / 2);
        return [...indices.slice(mid), ...indices.slice(0, mid).reverse()];
      }
      if (revealDirection === "random") return indices.sort(() => Math.random() - 0.5);
      return indices;
    };

    const order = getOrder();
    const intervalMs = sequential ? speed : Math.max(speed / 3, 16);

    const tick = () => {
      if (step >= order.length) {
        setDisplayText(text);
        setIsAnimating(false);
        return;
      }

      const revealCount = sequential ? 1 : Math.ceil(order.length / 20);
      for (let i = 0; i < revealCount && step < order.length; i++, step++) {
        revealed[order[step]] = true;
      }

      setDisplayText(
        textArray
          .map((char, i) => {
            if (char === " ") return " ";
            if (revealed[i]) return char;
            return getRandomChar();
          })
          .join("")
      );

      animationRef.current = setTimeout(tick, intervalMs);
    };

    tick();
  };

  useEffect(() => {
    if (animateOn === "load") {
      const timeout = setTimeout(animate, 100);
      return () => clearTimeout(timeout);
    }

    if (animateOn === "view" && containerRef.current) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            animate();
            observerRef.current?.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      observerRef.current.observe(containerRef.current);
      return () => observerRef.current?.disconnect();
    }
  }, [animateOn]);

  useEffect(() => {
    return () => {
      if (animationRef.current) clearTimeout(animationRef.current);
    };
  }, []);

  return (
    <span ref={containerRef} className={cn("inline-block", parentClassName)}>
      <span className={cn(className)}>{displayText}</span>
    </span>
  );
}
