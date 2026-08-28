"use client";

import { motion } from "framer-motion";

interface NoorTypingProps {
  modelName?: string;
}

export function NoorTyping({ modelName }: NoorTypingProps) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20">
        <span className="text-sm">✦</span>
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl bg-secondary/60 px-4 py-3">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40"
            animate={{
              y: [0, -6, 0],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
        {modelName && (
          <span className="ml-2 text-[10px] text-muted-foreground/40">
            {modelName}
          </span>
        )}
      </div>
    </div>
  );
}
