"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Elves are on it... 🧝",
  "Pumping fuel into the engines...",
  "Teaching the AI to read pixel by pixel...",
  "Summoning the Sitecore spirits...",
  "Counting fields obsessively...",
  "Untangling nested divs...",
  "Interrogating the design for secrets...",
  "Bribing the model with GPU cycles...",
  "Cross-referencing with 10,000 component libraries...",
  "Imagining what a content author would break first...",
  "Converting chaos into templates...",
  "Parsing vibes into data structures...",
  "Locating the invisible accordion...",
  "Asking nicely for JSON output...",
  "Almost there... probably...",
];

export function AnalysisLoader({ label = "Analyzing" }: { label?: string }) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setMsgIndex((i) => (i + 1) % MESSAGES.length);
        setFade(true);
      }, 300);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm">
      {/* SVG Brain / Scan animation */}
      <div className="relative mb-8">
        {/* Outer pulsing ring */}
        <svg
          width="160"
          height="160"
          viewBox="0 0 160 160"
          className="absolute inset-0"
        >
          <circle
            cx="80"
            cy="80"
            r="72"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="12 8"
            className="text-primary/20 animate-[spin_8s_linear_infinite]"
            style={{ transformOrigin: "80px 80px" }}
          />
          <circle
            cx="80"
            cy="80"
            r="60"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="6 14"
            className="text-primary/30 animate-[spin_5s_linear_infinite_reverse]"
            style={{ transformOrigin: "80px 80px" }}
          />
        </svg>

        {/* Scanning arc */}
        <svg
          width="160"
          height="160"
          viewBox="0 0 160 160"
          className="absolute inset-0 animate-[spin_2s_linear_infinite]"
          style={{ transformOrigin: "80px 80px" }}
        >
          <defs>
            <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop
                offset="0%"
                stopColor="hsl(var(--primary))"
                stopOpacity="0"
              />
              <stop
                offset="100%"
                stopColor="hsl(var(--primary))"
                stopOpacity="1"
              />
            </linearGradient>
          </defs>
          <path
            d="M 80 80 m 0 -48 a 48 48 0 0 1 48 48"
            fill="none"
            stroke="url(#arcGrad)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="80" cy="32" r="3" fill="hsl(var(--primary))" />
        </svg>

        {/* Centre icon — brain-like SVG */}
        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg
            width="72"
            height="72"
            viewBox="0 0 72 72"
            fill="none"
            className="text-primary drop-shadow-md"
          >
            {/* Left lobe */}
            <path
              d="M36 14c-8 0-16 5-18 13-2 6 0 12 4 16-2 2-4 5-4 9 0 6 5 10 10 10 2 0 4-0.5 6-1.5"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-[pulse_2s_ease-in-out_infinite]"
            />
            {/* Right lobe */}
            <path
              d="M36 14c8 0 16 5 18 13 2 6 0 12-4 16 2 2 4 5 4 9 0 6-5 10-10 10-2 0-4-0.5-6-1.5"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-[pulse_2s_ease-in-out_infinite_0.3s]"
            />
            {/* Center line */}
            <line
              x1="36"
              y1="14"
              x2="36"
              y2="61"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              opacity="0.5"
            />
            {/* Synapses — small node circles */}
            {[
              [24, 28],
              [48, 28],
              [20, 42],
              [52, 42],
              [30, 55],
              [42, 55],
            ].map(([cx, cy], i) => (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r="2.5"
                fill="currentColor"
                className="animate-[pulse_1.5s_ease-in-out_infinite]"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </svg>
        </div>
      </div>

      {/* Label */}
      <p className="text-lg font-semibold text-foreground mb-3">{label}</p>

      {/* Animated dots */}
      <div className="flex gap-1.5 mb-6">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block w-2 h-2 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>

      {/* Rotating funny message */}
      <p
        className="text-sm text-muted-foreground max-w-xs text-center transition-opacity duration-300"
        style={{ opacity: fade ? 1 : 0 }}
      >
        {MESSAGES[msgIndex]}
      </p>
    </div>
  );
}
