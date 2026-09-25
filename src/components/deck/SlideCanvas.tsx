"use client";

import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Deck, DeckSlide } from "@/types";
import { getDeckTheme, slideAccent, slideBackground } from "@/lib/deck-themes";

/**
 * Auto-growing textarea: wraps and expands with content so NOTHING is
 * ever clipped in edit mode — an <input> scrolls long text invisibly
 * ("I have to just guess"), while present mode wraps in a div.
 */
const AutoGrow = ({
  value,
  onCommit,
  placeholder,
  style,
  className,
}: {
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  className?: string;
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onCommit(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "w-full bg-transparent outline-none resize-none overflow-hidden placeholder:opacity-30",
        className
      )}
      style={style}
    />
  );
};

const EditableText = ({
  value,
  onCommit,
  placeholder,
  style,
  className,
  editing,
}: {
  value: string;
  onCommit: (v: string) => void;
  placeholder: string;
  style?: React.CSSProperties;
  className?: string;
  editing?: boolean;
}) =>
  editing ? (
    /* Always the auto-growing textarea — inputs clip, textareas wrap,
       exactly like the non-editing div. Editor = present, guaranteed. */
    <AutoGrow value={value} onCommit={onCommit} placeholder={placeholder} style={style} className={className} />
  ) : (
    <div className={className} style={style}>
      {value}
    </div>
  );

export function SlideCanvas({
  slide,
  deck,
  editing,
  onChange,
}: {
  slide: DeckSlide;
  deck: Deck;
  editing?: boolean;
  onChange?: (updates: Partial<DeckSlide>) => void;
}) {
  const theme = getDeckTheme(deck);
  const accent = slideAccent(slide, theme);
  const centered =
    slide.layout === "title" || slide.layout === "end" || slide.layout === "statement" || slide.layout === "quote" || slide.layout === "section";
  const hasImage = Boolean(slide.imageUrl);
  // Title/end/section keep their centered hero look; image goes behind as a dimmed cover.
  const imageAsBackground = slide.layout === "title" || slide.layout === "end" || slide.layout === "section";
  const setTitle = (title: string) => onChange?.({ title });
  const setContent = (content: string[]) => onChange?.({ content });

  const Kicker = () =>
    slide.kicker ? (
      <div
        className="uppercase tracking-[0.18em] font-medium mb-[2.2%] opacity-70"
        style={{ color: accent, fontSize: "1.6cqw", fontFamily: theme.bodyFont }}
      >
        {slide.kicker}
      </div>
    ) : null;

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none"
      style={{ background: slideBackground(slide, theme, accent), color: theme.text }}
    >
      {/* Image as dimmed background for hero layouts */}
      {hasImage && imageAsBackground && (
        <>
          <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
          <div className="absolute inset-0" style={{ background: theme.dark ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.35)" }} />
        </>
      )}

      <div
        className={cn(
          "absolute inset-0 flex flex-col",
          centered ? "justify-center px-[8%]" : "justify-start pt-[6%] px-[8%]"
        )}
        style={hasImage && !imageAsBackground ? { width: "58%", minWidth: "40%" } : undefined}
      >
        {slide.layout === "quote" ? (
          <>
            <div className="leading-none mb-[1.5%]" style={{ color: accent, fontSize: "8cqw", fontFamily: "Georgia, serif" }}>
              &ldquo;
            </div>
            <EditableText
              editing={editing}
              value={slide.title}
              onCommit={setTitle}
              placeholder="Quote text..."
              className="font-medium italic"
              style={{ fontSize: "4.2cqw", lineHeight: 1.25, fontFamily: theme.titleFont }}
            />
            {(slide.content[0] || editing) && (
              <div className="mt-[3%] opacity-60" style={{ fontSize: "2cqw", fontFamily: theme.bodyFont }}>
                &mdash;{" "}
                {editing ? (
                  <AutoGrow
                    value={slide.content[0] || ""}
                    onCommit={(v) => setContent([v])}
                    placeholder="Author, source"
                    className="w-72"
                  />
                ) : (
                  slide.content[0]
                )}
              </div>
            )}
          </>
        ) : slide.layout === "section" ? (
          <>
            <Kicker />
            <div className="flex items-baseline gap-[2%]">
              {slide.kicker?.match(/\d+/) && (
                <span className="font-bold opacity-25" style={{ fontSize: "9cqw", fontFamily: theme.titleFont, color: accent }}>
                  {slide.kicker.match(/\d+/)![0]}
                </span>
              )}
              <EditableText
              editing={editing}
                value={slide.title}
                onCommit={setTitle}
                placeholder="Section name"
                className="font-bold tracking-tight"
                style={{ fontSize: "5.6cqw", fontFamily: theme.titleFont }}
              />
            </div>
            {slide.content[0] && (
              <div className="mt-[2.5%] opacity-55" style={{ fontSize: "2cqw", fontFamily: theme.bodyFont }}>
                {slide.content[0]}
              </div>
            )}
          </>
        ) : slide.layout === "stats" ? (
          <>
            <Kicker />
            <EditableText
              editing={editing}
              value={slide.title}
              onCommit={setTitle}
              placeholder="Headline result..."
              className="font-bold tracking-tight mb-[4%]"
              style={{ fontSize: "3.8cqw", fontFamily: theme.titleFont }}
            />
            <div className="grid grid-cols-3 gap-[3%] flex-1 min-h-0 items-stretch pb-[6%]">
              {(slide.stats && slide.stats.length ? slide.stats : [{ value: "", label: "" }, { value: "", label: "" }, { value: "", label: "" }]).map((st, i) => (
                <div
                  key={i}
                  className="rounded-2xl flex flex-col justify-center px-[7%] py-[6%] border"
                  style={{ borderColor: `${accent}30`, background: `${accent}0d` }}
                >
                  {editing ? (
                    <>
                      <AutoGrow
                        value={st.value}
                        onCommit={(v) => {
                          const stats = [...(slide.stats || [{ value: "", label: "" }, { value: "", label: "" }, { value: "", label: "" }])];
                          stats[i] = { ...stats[i], value: v };
                          onChange?.({ stats });
                        }}
                        placeholder="38%"
                        className="font-bold"
                        style={{ fontSize: "4.6cqw", fontFamily: theme.titleFont, color: accent }}
                      />
                      <AutoGrow
                        value={st.label}
                        onCommit={(v) => {
                          const stats = [...(slide.stats || [{ value: "", label: "" }, { value: "", label: "" }, { value: "", label: "" }])];
                          stats[i] = { ...stats[i], label: v };
                          onChange?.({ stats });
                        }}
                        placeholder="label"
                        className="opacity-60"
                        style={{ fontSize: "1.7cqw", fontFamily: theme.bodyFont }}
                      />
                    </>
                  ) : (
                    <>
                      <div className="font-bold" style={{ fontSize: "4.6cqw", fontFamily: theme.titleFont, color: accent }}>
                        {st.value}
                      </div>
                      <div className="opacity-60 mt-[6%]" style={{ fontSize: "1.7cqw", fontFamily: theme.bodyFont }}>
                        {st.label}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : slide.layout === "timeline" ? (
          <>
            <Kicker />
            <EditableText
              editing={editing}
              value={slide.title}
              onCommit={setTitle}
              placeholder="Sequence headline..."
              className="font-bold tracking-tight mb-[5%]"
              style={{ fontSize: "3.8cqw", fontFamily: theme.titleFont }}
            />
            <div className="relative flex-1 min-h-0 pb-[8%]">
              <div className="absolute left-0 right-0 top-[13px] h-[2px] opacity-40" style={{ background: accent }} />
              <div className="grid auto-cols-fr grid-flow-col h-full" style={{ columnGap: "2%" }}>
                {(slide.stats && slide.stats.length ? slide.stats : [{ value: "", label: "" }, { value: "", label: "" }]).map((st, i) => (
                  <div key={i} className="relative pt-8">
                    <div
                      className="absolute top-[7px] left-0 w-4 h-4 rounded-full border-2"
                      style={{ borderColor: accent, background: theme.dark ? "#0b0b14" : "#fff" }}
                    />                      {editing ? (
                        <>
                          <AutoGrow
                            value={st.value}
                            onCommit={(v) => {
                              const stats = [...(slide.stats || [{ value: "", label: "" }, { value: "", label: "" }])];
                              stats[i] = { ...stats[i], value: v };
                              onChange?.({ stats });
                            }}
                            placeholder="Q1 2026"
                            className="font-semibold"
                            style={{ fontSize: "1.9cqw", fontFamily: theme.titleFont, color: accent }}
                          />
                          <AutoGrow
                            value={st.label}
                            onCommit={(v) => {
                              const stats = [...(slide.stats || [{ value: "", label: "" }, { value: "", label: "" }])];
                              stats[i] = { ...stats[i], label: v };
                              onChange?.({ stats });
                            }}
                            placeholder="Milestone"
                            className="opacity-75"
                            style={{ fontSize: "1.6cqw", fontFamily: theme.bodyFont }}
                          />
                        </>
                      ) : (
                      <>
                        <div className="font-semibold" style={{ fontSize: "1.9cqw", fontFamily: theme.titleFont, color: accent }}>
                          {st.value}
                        </div>
                        <div className="opacity-75 mt-1" style={{ fontSize: "1.6cqw", fontFamily: theme.bodyFont }}>
                          {st.label}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : slide.layout === "two-col" ? (
          <>
            <Kicker />
            <EditableText
              editing={editing}
              value={slide.title}
              onCommit={setTitle}
              placeholder="Contrast headline..."
              className="font-bold tracking-tight mb-[4%]"
              style={{ fontSize: "3.8cqw", fontFamily: theme.titleFont }}
            />
            <div className="grid grid-cols-2 flex-1 min-h-0 pb-[6%]" style={{ columnGap: "4%" }}>
              {/* Left */}
              <div className="rounded-2xl p-[6%] border" style={{ borderColor: `${accent}35`, background: `${accent}0f` }}>
                {(slide.content.filter((c) => c.trim()).length ? slide.content : ["", ""]).slice(0, 3).map((c, i) => (
                  <div key={i} className="flex items-start gap-[0.6em] mb-[4%]" style={{ fontSize: "1.9cqw", fontFamily: theme.bodyFont }}>
                    <span className="mt-[0.5em] rounded-full shrink-0" style={{ background: accent, width: "0.35em", height: "0.35em", minWidth: 6, minHeight: 6 }} />
                    {editing ? (
                      <AutoGrow
                        value={c}
                        onCommit={(v) => {
                          const next = [...slide.content];
                          next[i] = v;
                          setContent(next);
                        }}
                        placeholder="Left column"
                        className="flex-1"
                      />
                    ) : (
                      <span className="opacity-90">{c}</span>
                    )}
                  </div>
                ))}
              </div>
              {/* Right */}
              <div className="rounded-2xl p-[6%] border opacity-90" style={{ borderColor: `${theme.muted === "rgba(250,250,250,0.5)" ? "ffffff22" : "00000018"}` }}>
                {((slide.contentRight && slide.contentRight.length ? slide.contentRight : ["", ""]) as string[]).slice(0, 3).map((c, i) => (
                  <div key={i} className="flex items-start gap-[0.6em] mb-[4%]" style={{ fontSize: "1.9cqw", fontFamily: theme.bodyFont }}>
                    <span className="mt-[0.5em] rounded-full shrink-0 opacity-50" style={{ background: theme.text, width: "0.35em", height: "0.35em", minWidth: 6, minHeight: 6 }} />
                    {editing ? (
                      <AutoGrow
                        value={c}
                        onCommit={(v) => {
                          const right = [...(slide.contentRight || ["", ""])];
                          right[i] = v;
                          onChange?.({ contentRight: right });
                        }}
                        placeholder="Right column"
                        className="flex-1"
                      />
                    ) : (
                      <span className="opacity-75">{c}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : slide.layout === "bullets" ? (
          <>
            <Kicker />
            <EditableText
              editing={editing}
              value={slide.title}
              onCommit={setTitle}
              placeholder="Assertion headline..."
              className="font-bold tracking-tight mb-[3%]"
              style={{ fontSize: "4.2cqw", fontFamily: theme.titleFont }}
            />
            <div className="space-y-[1.8%]">
              {(slide.content.length ? slide.content : [""]).map((c, i) => (
                <div key={i} className="flex items-start gap-[0.8em]" style={{ fontSize: "2.3cqw", fontFamily: theme.bodyFont }}>
                  <span className="mt-[0.55em] rounded-full shrink-0" style={{ background: accent, width: "0.32em", height: "0.32em", minWidth: 7, minHeight: 7 }} />
                  {editing ? (
                    <AutoGrow
                      value={c}
                      onCommit={(v) => {
                        const next = [...slide.content];
                        next[i] = v;
                        setContent(next);
                      }}
                      placeholder={i === 0 ? "Claim with its reason" : "Evidence line"}
                      className="flex-1"
                    />
                  ) : (
                    <span className="opacity-90">{c}</span>
                  )}
                </div>
              ))}
              {editing && (
                <button
                  onClick={() => setContent([...slide.content, ""])}
                  className="text-sm opacity-40 hover:opacity-80 transition-opacity mt-2 text-left"
                >
                  + Add point
                </button>
              )}
            </div>
          </>
        ) : slide.layout === "statement" ? (
          <>
            <Kicker />
            <EditableText
              editing={editing}
              value={slide.title}
              onCommit={setTitle}
              placeholder="One big sentence..."
              className="font-bold tracking-tight"
              style={{ fontSize: "4.6cqw", lineHeight: 1.15, fontFamily: theme.titleFont }}
            />
            {(slide.content[0] || editing) && (
              <div className="mt-[3%] opacity-55" style={{ fontSize: "2cqw", fontFamily: theme.bodyFont }}>
                {editing ? (
                  <AutoGrow
                    value={slide.content[0] || ""}
                    onCommit={(v) => setContent([v])}
                    placeholder="Supporting line"
                  />
                ) : (
                  slide.content[0]
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {/* title / end */}
            <div className="w-[7%] h-[5px] min-h-[5px] rounded-full mb-[4%]" style={{ background: accent }} />
            <EditableText
              editing={editing}
              value={slide.title}
              onCommit={setTitle}
              placeholder={slide.layout === "end" ? "Thank you" : "Title"}
              className="font-bold tracking-tight"
              style={{ fontSize: "6cqw", fontFamily: theme.titleFont }}
            />
            {(slide.content[0] || editing) && (
              <div className="mt-[3%] opacity-55" style={{ fontSize: "2.3cqw", fontFamily: theme.bodyFont }}>
                {editing ? (
                  <AutoGrow
                    value={slide.content[0] || ""}
                    onCommit={(v) => setContent([v])}
                    placeholder="Subtitle"
                  />
                ) : (
                  slide.content[0]
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Side image panel for content layouts */}
      {hasImage && !imageAsBackground && (
        <div className="absolute top-0 right-0 bottom-0" style={{ width: "42%" }}>
          <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(to right, ${theme.dark ? "#0b0b14" : "#ffffff"}cc 0%, transparent 40%)` }}
          />
        </div>
      )}

      {/* Footer */}
      <div
        className="absolute bottom-[3.5%] left-[8%] flex items-center justify-between opacity-35"
        style={{ fontSize: "1.3cqw", fontFamily: theme.bodyFont, ...(hasImage && !imageAsBackground ? { width: "50%" } : { width: "84%" }) }}
      >
        <span className="truncate">{deck.title}</span>
      </div>

      {/* Image remove button (edit mode only) */}
      {editing && hasImage && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onChange?.({ imageUrl: undefined });
          }}
          className="absolute top-3 right-3 z-20 p-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white/90 hover:bg-red-500/80 transition-all"
          title="Remove image"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function SlideThumb({ slide, deck }: { slide: DeckSlide; deck: Deck }) {
  return (
    <div className="relative w-full aspect-video overflow-hidden [container-type:size]">
      <SlideCanvas slide={slide} deck={deck} />
    </div>
  );
}
