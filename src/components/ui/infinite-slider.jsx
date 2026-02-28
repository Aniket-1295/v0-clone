"use client";

import { useRef, useState } from "react";
import { motion, useAnimationFrame } from "motion/react";
import { cn } from "@/lib/utils";

export function InfiniteSlider({
  children,
  speed = 40,
  speedOnHover = null,
  gap = 16,
  direction = "horizontal",
  reverse = false,
  className,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef(null);
  const innerRef = useRef(null);
  const xRef = useRef(0);

  const currentSpeed = isHovered && speedOnHover != null ? speedOnHover : speed;

  useAnimationFrame((_, delta) => {
    if (!innerRef.current) return;
    const pixelsPerMs = currentSpeed / 1000;
    const movement = pixelsPerMs * delta;

    if (direction === "horizontal") {
      xRef.current -= reverse ? -movement : movement;
      const width = innerRef.current.offsetWidth / 2;
      if (Math.abs(xRef.current) >= width) {
        xRef.current = 0;
      }
      innerRef.current.style.transform = `translateX(${xRef.current}px)`;
    } else {
      xRef.current -= reverse ? -movement : movement;
      const height = innerRef.current.offsetHeight / 2;
      if (Math.abs(xRef.current) >= height) {
        xRef.current = 0;
      }
      innerRef.current.style.transform = `translateY(${xRef.current}px)`;
    }
  });

  const childrenArray = Array.isArray(children) ? children : [children];

  return (
    <div
      ref={containerRef}
      className={cn("overflow-hidden", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        ref={innerRef}
        className={cn(
          "flex w-max",
          direction === "vertical" && "flex-col"
        )}
        style={{
          gap: `${gap}px`,
        }}
      >
        {childrenArray.map((child, i) => (
          <div key={i} style={{ display: "flex", gap: `${gap}px` }}>
            {child}
          </div>
        ))}
        {childrenArray.map((child, i) => (
          <div key={`clone-${i}`} style={{ display: "flex", gap: `${gap}px` }} aria-hidden>
            {child}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
