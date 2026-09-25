'use client'

import { useRef } from "react"
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowDown } from "lucide-react"

export const ParallaxScrollModels = () => {
    const sections = [
        {
            id: 1,
            title: "Ethos 4.7",
            tag: "DEEP REASONING",
            description: "Frontier-scale analytical power for complex problems. When you need deep thinking, strategic planning, or multi-step reasoning, Ethos is the model that gets it right.",
            svg: `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="400" fill="#0a0a0a"/><circle cx="200" cy="200" r="150" fill="none" stroke="#fff" stroke-width="0.3" opacity="0.1"/><circle cx="200" cy="200" r="120" fill="none" stroke="#fff" stroke-width="0.5" opacity="0.15"/><circle cx="200" cy="200" r="90" fill="none" stroke="#fff" stroke-width="0.8" opacity="0.2"/><circle cx="200" cy="200" r="60" fill="none" stroke="#fff" stroke-width="1" opacity="0.3"/><circle cx="200" cy="200" r="30" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.4"/><circle cx="200" cy="200" r="8" fill="#fff" opacity="0.5"/><line x1="200" y1="50" x2="200" y2="350" stroke="#fff" stroke-width="0.3" opacity="0.1"/><line x1="50" y1="200" x2="350" y2="200" stroke="#fff" stroke-width="0.3" opacity="0.1"/></svg>`,
            reverse: false
        },
        {
            id: 2,
            title: "Logos 4.5",
            tag: "BALANCED",
            description: "Smart enough for real work, fast enough to not slow you down. Logos handles daily tasks, answers questions, and keeps your workflow moving without missing a beat.",
            svg: `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="400" fill="#0a0a0a"/><path d="M100 300 Q150 200 200 250 T300 150" fill="none" stroke="#fff" stroke-width="1" opacity="0.3"/><path d="M80 320 Q160 180 240 230 T340 120" fill="none" stroke="#fff" stroke-width="0.8" opacity="0.2"/><path d="M120 280 Q170 220 220 260 T320 170" fill="none" stroke="#fff" stroke-width="1.2" opacity="0.4"/><circle cx="300" cy="150" r="4" fill="#fff" opacity="0.5"/><circle cx="200" cy="250" r="4" fill="#fff" opacity="0.5"/><circle cx="100" cy="300" r="4" fill="#fff" opacity="0.5"/></svg>`,
            reverse: true
        },
        {
            id: 3,
            title: "Verse 4",
            tag: "INSTANT",
            description: "Lightning-fast responses for quick questions and live chats. When you need an answer now, Verse delivers in milliseconds without sacrificing quality.",
            svg: `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="400" fill="#0a0a0a"/><polygon points="200,60 230,160 340,160 250,220 280,330 200,260 120,330 150,220 60,160 170,160" fill="none" stroke="#fff" stroke-width="0.8" opacity="0.3"/><polygon points="200,100 220,160 290,160 235,200 255,270 200,230 145,270 165,200 110,160 180,160" fill="none" stroke="#fff" stroke-width="0.5" opacity="0.15"/><circle cx="200" cy="180" r="6" fill="#fff" opacity="0.5"/></svg>`,
            reverse: false
        }
    ]

    const sectionRefs = sections.map(() => useRef<HTMLDivElement>(null));
    
    const scrollYProgress = sections.map((_, index) => {
        return useScroll({
            target: sectionRefs[index],
            offset: ["start end", "center start"]
        }).scrollYProgress;
    });

    const opacityContents = scrollYProgress.map(progress => 
        useTransform(progress, [0, 0.5], [0, 1])
    );
    
    const clipProgresses = scrollYProgress.map(progress => 
        useTransform(progress, [0, 0.5], ["inset(0 100% 0 0)", "inset(0 0% 0 0)"])
    );
    
    const translateContents = scrollYProgress.map(progress => 
        useTransform(progress, [0, 1], [-120, 0])
    );

  return (
    <section id="noor" className="px-6 border-t border-border/30">
      <div className="min-h-[60vh] w-full flex flex-col items-center justify-center py-16">
        <p className="text-[11px] font-mono tracking-[0.4em] text-muted-foreground/40 mb-4">NOOR</p>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-center">Your AI companion.</h2>
        <p className="mt-4 text-muted-foreground/60 font-body text-lg max-w-xl text-center">Three distinct minds, one workspace. Reads your data, helps you think deeper.</p>
        <p className="mt-12 flex items-center gap-1.5 text-xs text-muted-foreground/40">SCROLL <ArrowDown size={14} /></p>
      </div>
      <div className="flex flex-col md:px-0 px-10 gap-0">
            {sections.map((section, index) => (
                <div 
                    key={section.id}
                    ref={sectionRefs[index]} 
                    className={`min-h-[70vh] flex items-center justify-center md:gap-32 gap-16 ${section.reverse ? 'flex-row-reverse' : ''}`}
                >
                    <motion.div style={{ y: translateContents[index] }}>
                        <span className="text-[10px] font-mono tracking-[0.15em] text-muted-foreground/40">{section.tag}</span>
                        <div className="text-4xl md:text-6xl font-bold tracking-tight max-w-sm mt-2">{section.title}</div>
                        <motion.p 
                            style={{ y: translateContents[index] }} 
                            className="text-muted-foreground/60 max-w-sm mt-6 font-body leading-relaxed"
                        >
                            {section.description}
                        </motion.p>
                    </motion.div>
                    <motion.div 
                        style={{ 
                            opacity: opacityContents[index],
                            clipPath: clipProgresses[index],
                            scale: useTransform(scrollYProgress[index], [0, 0.5], [0.85, 1]),
                        }}
                        className="relative"
                    >
                        <div 
                            className="w-80 h-80"
                            dangerouslySetInnerHTML={{ __html: section.svg }}
                        />
                    </motion.div>
                </div>
            ))}
        </div>
    </section>
  );
};
