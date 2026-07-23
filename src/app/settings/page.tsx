"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Upload,
  Trash2,
  Sparkles,
  Palette,
  Monitor,
  Check,
  AlertTriangle,
  Shield,
  ShieldOff,
} from "lucide-react";
import { storage } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { isPasswordSet, clearPassword, PasswordGate } from "@/components/layout/PasswordGate";


export default function SettingsPage() {
  const [data, setData] = useState(storage.getData());
  const [showConfirm, setShowConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [hasPassword, setHasPassword] = useState(isPasswordSet());
  const [clearingPassword, setClearingPassword] = useState(false);
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);

  useEffect(() => {
    setHasPassword(isPasswordSet());
  }, []);

  const refresh = () => setData({ ...storage.getData() });

  const handleExport = () => {
    const json = storage.exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lexis-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          if (storage.importData(content)) {
            refresh();
            alert("Data imported successfully!");
          } else {
            alert("Failed to import data. Invalid format.");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      await storage.clearAll();
      window.location.reload();
    } catch (e) {
      console.error("Failed to clear data", e);
      setClearing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold md:text-3xl">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your preferences and data</p>
      </motion.div>

      {/* Theme */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="card"
      >
        <div className="flex items-center gap-2 mb-4">
          <Palette className="h-5 w-5 text-primary-500" />
          <h2 className="font-semibold">Appearance</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Theme</label>
            <div className="flex gap-2">
              {["light", "dark", "system"].map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    storage.updateTheme({ theme: t as any });
                    const isDark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
                    document.documentElement.classList.toggle("dark", isDark);
                    refresh();
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-all",
                    data.theme.theme === t
                      ? "border-primary-500 bg-primary-500/10 text-primary-500"
                      : "border-border hover:border-muted-foreground/30"
                  )}
                >
                  <Monitor className="h-4 w-4" />
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Font Size</label>
            <div className="flex gap-2">
              {(["sm", "md", "lg"] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => { storage.updateTheme({ fontSize: size }); refresh(); }}
                  className={cn(
                    "rounded-xl border px-4 py-2 text-sm transition-all",
                    data.theme.fontSize === size
                      ? "border-primary-500 bg-primary-500/10 text-primary-500"
                      : "border-border hover:border-muted-foreground/30"
                  )}
                >
                  {size === "sm" ? "Small" : size === "md" ? "Medium" : "Large"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Data Management */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card"
      >
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary-500" />
          <h2 className="font-semibold">Data</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          All your data is stored locally in your browser. Export to back up or transfer your data.
        </p>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </button>
          <button onClick={handleImport} className="btn-secondary flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import Data
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            className="btn-secondary flex items-center gap-2 text-zinc-400 border-zinc-400/20 hover:bg-zinc-500/10"
          >
            <Trash2 className="h-4 w-4" />
            Clear All Data
          </button>
        </div>

        {/* Export notification */}
        {copied && (              <div className="mt-3 flex items-center gap-2 text-sm text-zinc-400">
            <Check className="h-4 w-4" />
            Data exported successfully
          </div>
        )}
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card"
      >
        <h2 className="font-semibold mb-4">Storage Usage</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Habits", value: data.habits.length },
            { label: "Notes", value: data.notes.length },
            { label: "Journal Entries", value: data.journalEntries.length },
            { label: "Tasks", value: data.tasks.length },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-muted p-3 text-center">
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Security */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.175 }}
        className="card"
      >
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-primary-500" />
          <h2 className="font-semibold">Security</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {hasPassword
            ? "Your app is protected with a local password. This password never leaves your device."
            : "No password is set. Anyone with access to this browser can open LEXIS."
          }
        </p>
        <div className="flex flex-wrap gap-3">
          {hasPassword ? (
            <button
              onClick={() => {
                if (window.confirm("Remove your password? Anyone with access to this browser will be able to open LEXIS.")) {
                  setClearingPassword(true);
                  try {
                    clearPassword();
                    setHasPassword(false);
                  } catch (e) {
                    console.error("Failed to clear password", e);
                  } finally {
                    setClearingPassword(false);
                  }
                }
              }}
              disabled={clearingPassword}
              className="btn-secondary flex items-center gap-2 text-zinc-400 border-zinc-400/20 hover:bg-zinc-500/10 disabled:opacity-50"
            >
              <ShieldOff className="h-4 w-4" />
              {clearingPassword ? "Removing..." : "Remove Password"}
            </button>
          ) : (
            <button
              onClick={() => setShowPasswordSetup(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Shield className="h-4 w-4" />
              Set Password
            </button>
          )}
        </div>
      </motion.div>

      {/* Password Setup Overlay */}
      {showPasswordSetup && (
        <div className="fixed inset-0 z-[100]">
          <PasswordGate
            mode="setup"
            onUnlock={() => {
              setShowPasswordSetup(false);
              setHasPassword(true);
            }}
            showSkip
          />
        </div>
      )}

      {/* About */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <h2 className="font-semibold mb-2">About LEXIS</h2>
        <p className="text-sm text-muted-foreground">
          Version 1.0.0 · Built with Next.js, TypeScript, and Tailwind CSS.
          All data stored locally. No data is sent to any server.
        </p>
      </motion.div>

      {/* Clear Confirmation Modal */}
      {showConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowConfirm(false)}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-500/10">
                <AlertTriangle className="h-7 w-7 text-zinc-400" />
              </div>
            </div>
            <h3 className="text-lg font-bold mb-2">Clear All Data?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              This action cannot be undone. All your habits, notes, journal entries, and tasks will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={handleClear} disabled={clearing} className="flex-1 rounded-xl bg-zinc-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Delete Everything
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
