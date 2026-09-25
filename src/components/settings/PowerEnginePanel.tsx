"use client";

// ============================================================
// Settings → Skills — Noor Skills manager.
// Local-first: skills are standing instructions the user teaches
// Noor, stored only on this device and injected into Noor's
// system prompt. No accounts, no upload, no API keys.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { Zap, Plus, Trash2, Pencil, X as XIcon, Check, Sparkles, Upload } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  NoorSkill,
  getSkills,
  addSkill,
  updateSkill,
  deleteSkill,
  parseSkillFile,
  seedStarterPack,
  missingStarterSkills,
  STARTER_PACK,
  MAX_SKILLS,
  MAX_ACTIVE_SKILLS,
  MAX_INSTRUCTION_CHARS,
} from "@/lib/noor-skills";

export function PowerEnginePanel() {
  const { t } = useI18n();
  const [skills, setSkills] = useState<NoorSkill[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [notice, setNotice] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importState, setImportState] = useState<"idle" | "error" | "truncated">("idle");
  const [dragging, setDragging] = useState(false);
  const [starterBusy, setStarterBusy] = useState(false);

  const refresh = useCallback(() => setSkills(getSkills()), []);

  useEffect(() => {
    seedStarterPack(); // first-run only: new users get the pack enabled
    refresh();
    setHydrated(true);
    const onChange = () => refresh();
    window.addEventListener("orleia:skills-changed", onChange);
    return () => window.removeEventListener("orleia:skills-changed", onChange);
  }, [refresh]);

  const activeCount = skills.filter((s) => s.enabled).length;

  const handleAdd = () => {
    if (!name.trim() || !instructions.trim()) {
      setNotice(t("skills.errEmpty"));
      return;
    }
    if (skills.length >= MAX_SKILLS) {
      setNotice(t("skills.errLimit"));
      return;
    }
    if (activeCount >= MAX_ACTIVE_SKILLS) {
      setNotice(t("skills.errActive"));
      return;
    }
    const created = addSkill(name, instructions);
    if (!created) {
      setNotice(t("skills.errLimit"));
      return;
    }
    setName("");
    setInstructions("");
    setNotice("");
  };

  const addStarterPack = () => {
    setStarterBusy(true);
    const missing = missingStarterSkills();
    const room = MAX_SKILLS - skills.length;
    const activeRoom = MAX_ACTIVE_SKILLS - skills.filter((s) => s.enabled).length;
    missing.slice(0, Math.min(room, activeRoom + missing.length)).forEach((tpl, i) => {
      addSkill(tpl.name, tpl.instructions, i < activeRoom);
    });
    setSkills(getSkills());
    setStarterBusy(false);
  };

  const handleToggle = (skill: NoorSkill) => {
    if (!skill.enabled && activeCount >= MAX_ACTIVE_SKILLS) {
      setNotice(t("skills.errActive"));
      return;
    }
    setNotice("");
    updateSkill(skill.id, { enabled: !skill.enabled });
  };

  const startEdit = (skill: NoorSkill) => {
    setEditingId(skill.id);
    setEditName(skill.name);
    setEditInstructions(skill.instructions);
    setNotice("");
  };

  const saveEdit = () => {
    if (!editingId) return;
    if (!editName.trim() || !editInstructions.trim()) {
      setNotice(t("skills.errEmpty"));
      return;
    }
    updateSkill(editingId, { name: editName, instructions: editInstructions });
    setEditingId(null);
    setNotice("");
  };

  // ---------------- SKILL.md import ----------------
  const handleImportFile = async (file: File) => {
    setImportState("idle");
    setNotice("");
    if (skills.length >= MAX_SKILLS) {
      setNotice(t("skills.errLimit"));
      return;
    }
    if (activeCount >= MAX_ACTIVE_SKILLS) {
      setNotice(t("skills.errActive"));
      return;
    }
    if (file.size > 256 * 1024) {
      setImportState("error");
      return;
    }
    let raw = "";
    try {
      raw = await file.text();
    } catch {
      setImportState("error");
      return;
    }
    const parsed = parseSkillFile(file.name, raw);
    if (!parsed) {
      setImportState("error");
      return;
    }
    const created = addSkill(parsed.name, parsed.instructions);
    if (!created) {
      setNotice(t("skills.errLimit"));
      return;
    }
    if (parsed.truncated) setImportState("truncated");
  };

  return (
    <div className="space-y-4">
      {/* Trust line */}
      <div className="card flex items-start gap-3 p-4">
        <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <p className="text-sm text-muted-foreground">{t("skills.localNote")}</p>
      </div>

      {/* Create */}
      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{t("skills.addTitle")}</h3>
          <span className="text-xs text-muted-foreground">
            {hydrated ? activeCount : 0}/{MAX_ACTIVE_SKILLS} {t("skills.activeCount")}
          </span>
        </div>
        <div className="space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("skills.namePlaceholder")}
            maxLength={60}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary-500/50"
          />
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder={t("skills.instructionsPlaceholder")}
            maxLength={MAX_INSTRUCTION_CHARS}
            rows={3}
            className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary-500/50"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground/60">
              {instructions.length}/{MAX_INSTRUCTION_CHARS}
            </span>
            <button
              onClick={handleAdd}
              disabled={!hydrated}
              className="flex items-center gap-1.5 rounded-full border border-primary-500/40 px-4 py-1.5 text-sm font-medium text-primary-500 transition-colors hover:bg-primary-500/10 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              {t("common.add")}
            </button>
          </div>
          {notice && <p className="text-xs text-amber-600 dark:text-amber-400">{notice}</p>}
        </div>
      </div>

      {/* Import — drag & drop a SKILL.md */}
      <div
        className={cn(
          "card flex flex-col items-center justify-center gap-2 p-6 text-center transition-colors",
          dragging && "border-primary-500/50 bg-primary-500/5"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void handleImportFile(f);
        }}
      >
        <Upload className="h-5 w-5 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">{t("skills.dropHint")}</p>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary"
        >
          <Upload className="h-3.5 w-3.5" />
          {t("skills.import")}
        </button>
        {importState === "error" && (
          <p className="text-xs text-amber-600 dark:text-amber-400">{t("skills.errImport")}</p>
        )}
        {missingStarterSkills().length > 0 && skills.length + missingStarterSkills().length <= MAX_SKILLS && (
          <button
            onClick={addStarterPack}
            disabled={starterBusy}
            className="flex items-center gap-1.5 rounded-full border border-primary-500/40 px-3 py-1.5 text-xs font-medium text-primary-500 transition-colors hover:bg-primary-500/10 disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t("skills.starterPack")} ({missingStarterSkills().length})
          </button>
        )}
        {importState === "truncated" && (
          <p className="text-xs text-muted-foreground">{t("skills.truncated")}</p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown,.txt,text/markdown,text/plain"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleImportFile(f);
            e.target.value = "";
          }}
        />
      </div>

      {/* List */}
      <div className="space-y-2">
        {hydrated && skills.length === 0 && (
          <div className="card flex flex-col items-center gap-2 p-8 text-center">
            <Sparkles className="h-5 w-5 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{t("skills.empty")}</p>
          </div>
        )}
        {skills.map((skill) => (
          <div key={skill.id} className="card p-4">
            {editingId === skill.id ? (
              <div className="space-y-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={60}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary-500/50"
                />
                <textarea
                  value={editInstructions}
                  onChange={(e) => setEditInstructions(e.target.value)}
                  maxLength={MAX_INSTRUCTION_CHARS}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary-500/50"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setEditingId(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary"
                    aria-label={t("common.cancel")}
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={saveEdit}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-primary-500/40 text-primary-500 transition-colors hover:bg-primary-500/10"
                    aria-label={t("common.save")}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <button
                  onClick={() => handleToggle(skill)}
                  className="mt-0.5 shrink-0"
                  aria-label={t("skills.toggle")}
                  aria-pressed={skill.enabled}
                >
                  <span
                    className={cn(
                      "relative block h-5 w-9 shrink-0 rounded-full transition-colors",
                      skill.enabled ? "bg-primary-500" : "border border-border bg-secondary"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
                        skill.enabled ? "left-[18px]" : "left-0.5"
                      )}
                    />
                  </span>
                </button>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-medium", !skill.enabled && "text-muted-foreground")}>
                    {skill.name}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{skill.instructions}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => startEdit(skill)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary"
                    aria-label={t("skills.edit")}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deleteSkill(skill.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-red-500"
                    aria-label={t("common.delete")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
