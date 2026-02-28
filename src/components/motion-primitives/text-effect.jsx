"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const defaultVariants = {
  "fade-in-blur": {
    hidden: { opacity: 0, filter: "blur(12px)", y: 12 },
    visible: { opacity: 1, filter: "blur(0px)", y: 0 },
  },
  "fade-in": {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  "slide-up": {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  },
  "scale-up": {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
  },
};

export function TextEffect({
  children,
  as: Tag = "p",
  preset = "fade-in-blur",
  per = "word",
  delay = 0,
  speedSegment = 0.3,
  className,
  variants,
}) {
  const selectedVariants = variants ?? defaultVariants[preset] ?? defaultVariants["fade-in-blur"];

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: speedSegment * 0.15,
        delayChildren: delay,
      },
    },
  };

  const segmentVariants = {
    hidden: selectedVariants.hidden,
    visible: {
      ...selectedVariants.visible,
      transition: {
        duration: speedSegment,
        ease: [0.21, 0.47, 0.32, 0.98],
      },
    },
  };

  const renderSegments = () => {
    if (per === "line") {
      const text = typeof children === "string" ? children : "";
      return text.split("\n").map((line, i) => (
        <motion.span
          key={i}
          variants={segmentVariants}
          className="block"
        >
          {line || "\u00A0"}
        </motion.span>
      ));
    }

    if (per === "word") {
      const text = typeof children === "string" ? children : "";
      return text.split(" ").map((word, i) => (
        <motion.span
          key={i}
          variants={segmentVariants}
          className="inline-block whitespace-pre"
        >
          {word}{" "}
        </motion.span>
      ));
    }

    const text = typeof children === "string" ? children : "";
    return text.split("").map((char, i) => (
      <motion.span
        key={i}
        variants={segmentVariants}
        className="inline-block whitespace-pre"
      >
        {char}
      </motion.span>
    ));
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="inline"
    >
      <Tag className={cn(className)}>
        {renderSegments()}
      </Tag>
    </motion.div>
  );
}
