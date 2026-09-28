const fs = require('fs');
let c = fs.readFileSync('src/app/landing/page.tsx', 'utf8');

// 1. Add useInView import
c = c.replace(
  'import { motion, AnimatePresence, useReducedMotion, useScroll, useTransform } from "framer-motion";',
  'import { motion, AnimatePresence, useReducedMotion, useScroll, useTransform, useInView } from "framer-motion";'
);

// 2. Add InteractiveNeuralVortex import after lucide imports
c = c.replace(
  '} from "lucide-react";',
  '} from "lucide-react";\nimport InteractiveNeuralVortex from "@/components/ui/interactive-neural-vortex-background";'
);

// 3. Add Reveal component before the export
c = c.replace(
  'export default function LandingPage() {',
  `/* scroll-reveal wrapper */
function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function LandingPage() {`
);

// 4. Replace the hero section - swap the hero div with vortex version
const oldHero = `      {/* ===== HERO with scroll parallax ===== */}
      <div ref={heroRef} className="relative" style={{ height: "120vh" }}>
        <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden">
          <motion.div style={{ opacity: heroOpacity, y: heroY, scale: heroScale }} className="relative z-10 text-center px-6 w-full">
            <motion.p initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="text-[11px] font-mono tracking-[0.5em] text-muted-foreground/40 mb-8">
              A NEW DYNASTY
            </motion.p>
            <motion.h1 initial={reduceMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }} className="text-[clamp(3rem,10vw,14rem)] font-bold leading-[0.85] tracking-[-0.05em] select-none">
              ORLEIA<span className="text-muted-foreground/25">OS</span>
            </motion.h1>
            <motion.p initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }} className="mt-8 text-lg md:text-xl text-muted-foreground max-w-xl mx-auto font-body leading-relaxed">
              AI-powered productivity for habits, mindfulness, notes, tasks, and spreadsheets. All local. All private. All yours.
            </motion.p>
            <motion.div initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.7 }} className="mt-10 flex flex-wrap justify-center items-center gap-4">
              <a href="https://app.lexisapp.xyz" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-foreground text-background px-8 py-3.5 text-sm font-medium transition-all hover:opacity-90 active:scale-[0.97]">
                Get Started Free <ArrowUpRight className="h-4 w-4" />
              </a>
              <span className="text-xs font-mono tracking-wider text-muted-foreground/40">NO SIGN-UP, FREE FOREVER</span>
            </motion.div>
            <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.9 }} className="mt-8 flex flex-wrap justify-center gap-3">
              <a href="https://6bdmafsuooogvteq.public.blob.vercel-storage.com/Orleia-2.0.0-win-x64.exe" download className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/30 backdrop-blur px-4 py-2 text-xs font-medium text-foreground/60 hover:text-foreground hover:border-border/80 transition-colors cursor-pointer">
                <WinIcon /> Windows <span className="text-[10px] text-muted-foreground/40">EXE</span>
              </a>
              <a href="https://6bdmafsuooogvteq.public.blob.vercel-storage.com/downloads/Orleia-2.0.0-linux-x86_64.AppImage" download className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/30 backdrop-blur px-4 py-2 text-xs font-medium text-foreground/60 hover:text-foreground hover:border-border/80 transition-colors cursor-pointer">
                <LinuxIcon /> Linux <span className="text-[10px] text-muted-foreground/40">AppImage</span>
              </a>
            </motion.div>
            <motion.p initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="mt-8 text-[10px] font-mono tracking-wider text-muted-foreground/25">
              SCROLL TO EXPLORE
            </motion.p>
          </motion.div>
        </div>
      </div>`;

const newHero = `      {/* ===== HERO with Neural Vortex ===== */}
      <div ref={heroRef} className="relative" style={{ height: "120vh" }}>
        <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden">
          <InteractiveNeuralVortex />
          <motion.div style={{ opacity: heroOpacity, y: heroY, scale: heroScale }} className="relative z-10 text-center px-6 w-full">
            <motion.p initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="text-[11px] font-mono tracking-[0.5em] text-white/40 mb-8">
              A NEW DYNASTY
            </motion.p>
            <motion.h1 initial={reduceMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }} className="text-[clamp(3rem,10vw,14rem)] font-bold leading-[0.85] tracking-[-0.05em] select-none text-white">
              ORLEIA<span className="text-white/25">OS</span>
            </motion.h1>
            <motion.p initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }} className="mt-8 text-lg md:text-xl text-white/60 max-w-xl mx-auto font-body leading-relaxed">
              AI-powered productivity for habits, mindfulness, notes, tasks, and spreadsheets. All local. All private. All yours.
            </motion.p>
            <motion.div initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.7 }} className="mt-10 flex flex-wrap justify-center items-center gap-4">
              <a href="https://app.lexisapp.xyz" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white text-black px-8 py-3.5 text-sm font-medium transition-all hover:opacity-90 active:scale-[0.97] rounded-full">
                Get Started Free <ArrowUpRight className="h-4 w-4" />
              </a>
              <span className="text-xs font-mono tracking-wider text-white/40">NO SIGN-UP, FREE FOREVER</span>
            </motion.div>
            <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.9 }} className="mt-8 flex flex-wrap justify-center gap-3">
              <a href="https://6bdmafsuooogvteq.public.blob.vercel-storage.com/Orleia-2.0.0-win-x64.exe" download className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur px-4 py-2 text-xs font-medium text-white/60 hover:text-white hover:border-white/20 transition-colors cursor-pointer">
                <WinIcon /> Windows <span className="text-[10px] text-white/30">EXE</span>
              </a>
              <a href="https://6bdmafsuooogvteq.public.blob.vercel-storage.com/downloads/Orleia-2.0.0-linux-x86_64.AppImage" download className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur px-4 py-2 text-xs font-medium text-white/60 hover:text-white hover:border-white/20 transi
