import os

content = """\
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Link2, Unlink, RefreshCw, Check, AlertCircle, Calendar, FileText, CheckSquare, Zap, Globe, Shield, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { storage } from "@/lib/storage";
import type { ConnectorService, ConnectorConfig, ConnectorDefinition } from "@/types";

const CONNECTORS: ConnectorDefinition[] = [
  { service: "google-calendar", name: "Google Calendar", description: "Sync your Google Calendar events into Lexis", icon: "\U0001f4c5", color: "#4285F4", capabilities: ["calendar"], needsOAuth: true },
  { service: "notion", name: "Notion", description: "Import pages and databases from Notion", icon: "\U0001f4dd", color: "#000000", capabilities: ["notes", "tasks"], needsOAuth: true },
  { service: "todoist", name: "Todoist", description: "Pull your Todoist tasks into Lexis", icon: "\u2705", color: "#E44332", capabilities: ["tasks"], needsOAuth: true },
  { service: "slack", name: "Slack", description: "Get Slack reminders in Lexis", icon: "\U0001f4ac", color: "#4A154B", capabilities: ["tasks"], needsOAuth: true },
  { service: "github", name: "GitHub", description: "Sync GitHub issues as tasks", icon: "\U0001f419", color: "#333333", capabilities: ["tasks"], needsOAuth: true },
  { service: "trello", name: "Trello", description: "Import Trello boards as tasks", icon: "\U0001f4cb", color: "#0079BF", capabilities: ["tasks"], needsOAuth: true },
  { service: "asana", name: "Asana", description: "Sync Asana projects with Lexis", icon: "\U0001f3af", color: "#F06A6A", capabilities: ["tasks"], needsOAuth: true },
  { service: "jira", name: "Jira", description: "Import Jira issues as tasks", icon: "\U0001f527", color: "#0052CC", capabilities: ["tasks"], needsOAuth: false },
];

function CapabilityBadge({ cap }: { cap: string }) {
  const Icon = cap === "calendar" ? Calendar : cap === "notes" ? FileText : CheckSquare;
  return <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground"><Icon className="h-3 w-3" />{cap}</span>;
}

function ConnectorCard({ def, config, onConnect, onDisconnect, onSync }: {
  def: ConnectorDefinition; config: ConnectorConfig | undefined;
  onConnect: (s: ConnectorService) => void; onDisconnect: (id: string) => void; onSync: (id: string) => void;
}) {
  const { t } = useI18n();
  const [showSetup, setShowSetup] = useState(false);
  const isConnected = config?.status === "connected" || config?.status === "syncing";
  const isSyncing = config?.status === "syncing";
  const hasError = config?.status === "error";

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-2xl" style={{ backgroundColor: def.color + "15" }}>{def.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{def.name}</h3>
            {isConnected && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400"><Check className="h-3 w-3" />{t("connectors.connected")}</span>}
            {hasError && <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400"><AlertCircle className="h-3 w-3" />{t("connectors.error")}</span>}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{def.description}</p>
          <div className="mt-2 flex flex-wrap gap-1">{def.capabilities.map((cap) => <CapabilityBadge key={cap} cap={cap} />)}</div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        {isConnected ? (
          <>
            <button onClick={() => config && onSync(config.id)} disabled={isSyncing} className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"><RefreshCw className={"h-3.5 w-3.5 " + (isSyncing ? "animate-spin" : "")} />{t("connectors.syncNow")}</button>
            <button onClick={() => config && onDisconnect(config.id)} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary"><Unlink className="h-3.5 w-3.5" />{t("connectors.disconnect")}</button>
            {config?.lastSync && <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground"><Clock className="h-3 w-3" />{new Date(config.lastSync).toLocaleString()}</span>}
          </>
        ) : showSetup ? (
          <div className="w-full space-y-3">
            {def.needsOAuth ? <div className="rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground"><Shield className="mb-1 inline h-4 w-4" />Connect via {def.name} secure sign-in.</div> : <input type="text" placeholder="Enter your API key..." className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />}
            <div className="flex gap-2">
              <button onClick={() => { onConnect(def.service); setShowSetup(false); }} className="flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-colors hover:opacity-90"><Link2 className="h-3.5 w-3.5" />{t("connectors.connect")}</button>
              <button onClick={() => setShowSetup(false)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary">{t("connectors.cancel")}</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowSetup(true)} className="flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-colors hover:opacity-90"><Link2 className="h-3.5 w-3.5" />{t("connectors.connect")}</button>
        )}
      </div>
    </motion.div>
  );
}

export default function ConnectorsPage() {
  const { t } = useI18n();
  const [connectors, setConnectors] = useState<ConnectorConfig[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setConnectors(storage.getConnectors()); setLoaded(true); }, []);
  const refresh = useCallback(() => { setConnectors(storage.getConnectors()); }, []);
  const handleConnect = useCallback((service: ConnectorService) => {
    if (storage.getConnectorByService(service)) return;
    storage.addConnector({ service, status: "connected", token: "demo", serviceConfig: {}, lastSync: null, syncOptions: { tasks: true, calendar: true, notes: true }, error: null });
    refresh();
  }, [refresh]);
  const handleDisconnect = useCallback((id: string) => { storage.removeConnector(id); refresh(); }, [refresh]);
  const handleSync = useCallback((id: string) => {
    storage.updateConnector(id, { status: "syncing" }); refresh();
    setTimeout(() => { storage.updateConnector(id, { status: "connected", lastSync: new Date().toISOString() }); refresh(); }, 2000);
  }, [refresh]);
  const connectedCount = connectors.filter((c) => c.status === "connected").length;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <a href="/" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"><ArrowLeft className="h-4 w-4" /></a>
        <div className="flex-1"><h1 className="text-sm font-semibold text-foreground">{t("connec
