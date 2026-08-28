"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const REACTIONS = ["👍", "❤️", "🎯", "🔥", "💡", "😂"];

interface MessageReactionsProps {
  reactions?: Record<string, string>;
  onReact: (emoji: string) => void;
  onRemove: (emoji: string) => void;
}

export function MessageReactions({ reactions = {}, onReact, onRemove }: MessageReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);

  const hasReactions = Object.keys(reactions).length > 0;

  return (
    <div className="relative">
      {/* Existing reactions */}
      {hasReactions && (
        <div className="flex flex-wrap gap-1 mt-1">
          {Object.entries(reactions).map(([emoji, userId]) => (
            <motion.button
              key={emoji}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onRemove(emoji)}
              className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-secondary/60 px-2 py-0.5 text-xs hover:border-muted-foreground/30 transition-colors"
            >
              <span>{emoji}</span>
              <span className="text-[10px] text-muted-foreground/60">1</span>
            </motion.button>
          ))}
        </div>
      )}

      {/* Add reaction button */}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className={cn(
            "rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground/0 hover:text-muted-foreground/60 transition-all",
            !hasReactions && "group-hover:text-muted-foreground/40"
          )}
        >
          +
        </button>

        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 4 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-0 mb-1 flex items-center gap-0.5 rounded-xl border border-border bg-card p-1.5 shadow-xl z-50"
            >
              {REACTIONS.map((emoji) => (
                <motion.button
                  key={emoji}
                  whileHover={{ scale: 1.3 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    onReact(emoji);
                    setShowPicker(false);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-secondary transition-colors text-sm"
                >
                  {emoji}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
