"use client";
import { useState, useEffect } from "react";
import DecryptedText from "./DecryptedText";

const buildDate = () => {
  const now = new Date();
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const months = ["January","February","March","April","May","June",
                  "July","August","September","October","November","December"];
  const ordinal = (n) => {
    const s = ["th","st","nd","rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  return `${days[now.getDay()]} ${months[now.getMonth()]} ${ordinal(now.getDate())}, ${now.getFullYear()}`;
};

export default function LiveDateText() {
  const [date, setDate] = useState(buildDate);
  const [city, setCity] = useState(navigator.geolocation ? "" : "Unknown Location");

  // Update date every minute
  useEffect(() => {
    const interval = setInterval(() => setDate(buildDate()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Get user's real location via browser Geolocation API
  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`
          );
          const data = await res.json();
          const cityName =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.county ||
            "Unknown Location";
          setCity(cityName);
        } catch {
          setCity("Unknown Location");
        }
      },
      () => setCity("Unknown Location")
    );
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center gap-2 py-6 px-8">

    {/* Glowing background blur */}
    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 via-transparent to-white/5 blur-2xl pointer-events-none" />

    {/* Thin top rule */}
    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent mb-4" />

    {/* Date line */}
    <DecryptedText
      text={date}
      animateOn="view"
      revealDirection="start"
      sequential
      useOriginalCharsOnly={false}
      speed={60}
      className="
        font-mono uppercase tracking-[0.25em]
        text-2xl md:text-4xl lg:text-3xl
        text-white font-bold
        drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]
      "
    />

    {/* Divider dot row */}
    <div className="flex items-center gap-2 my-1">
      <div className="w-12 h-px bg-white/20" />
      <div className="w-1 h-1 rounded-full bg-white/50" />
      <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
      <div className="w-1 h-1 rounded-full bg-white/50" />
      <div className="w-12 h-px bg-white/20" />
    </div>

    {/* City line */}
    <DecryptedText
      text={city.toUpperCase()}
      animateOn="view"
      revealDirection="center"
      sequential
      useOriginalCharsOnly={false}
      speed={80}
      className="
        font-mono uppercase tracking-[0.5em]
        text-base md:text-lg lg:text-xl
        text-white/50
        drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]
      "
    />

    {/* Thin bottom rule */}
    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent mt-4" />
  </div>
  );
}