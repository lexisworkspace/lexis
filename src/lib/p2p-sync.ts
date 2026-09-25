"use client";

// Orleia P2P sync — WebRTC peer-to-peer, no server needed.
// Devices connect directly and sync data in real-time.
// Works on same WiFi (instant) and across networks (NAT traversal).

import { storage } from "./storage";
import type { AppData } from "@/types";

const SYNC_FIELDS = [
  "habits", "habitCategories", "habitLogs", "notes", "noteTags",
  "noteFolders", "journalEntries", "tasks", "taskLists", "profile", "noorRelationship",
] as const;

type SyncData = Pick<AppData, (typeof SYNC_FIELDS)[number]>;

function extractSyncData(full: AppData): SyncData {
  const out = {} as Record<string, unknown>;
  for (const field of SYNC_FIELDS) out[field] = full[field];
  return out as SyncData;
}

function mergeSyncData(local: AppData, remote: SyncData): AppData {
  const merged = { ...local };
  for (const field of SYNC_FIELDS) (merged as Record<string, unknown>)[field] = remote[field];
  return merged;
}

// STUN servers for NAT traversal (free, public)
const STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

let peerConnection: RTCPeerConnection | null = null;
let dataChannel: RTCDataChannel | null = null;
let onSyncCallback: ((data: SyncData) => void) | null = null;
let onConnectionChange: ((connected: boolean) => void) | null = null;
let lastSentJson: string | null = null;
let sendDebounce: ReturnType<typeof setTimeout> | null = null;

export function onP2PSync(cb: (data: SyncData) => void): void {
  onSyncCallback = cb;
}

export function onP2PConnectionChange(cb: (connected: boolean) => void): void {
  onConnectionChange = cb;
}

function sendData(data: SyncData) {
  if (!dataChannel || dataChannel.readyState !== "open") return;
  const json = JSON.stringify(data);
  if (json === lastSentJson) return;
  lastSentJson = json;
  try {
    dataChannel.send(json);
  } catch { /* ignore */ }
}

function debouncedSend() {
  if (sendDebounce) clearTimeout(sendDebounce);
  sendDebounce = setTimeout(() => {
    sendDebounce = null;
    sendData(extractSyncData(storage.getData()));
  }, 500);
}

function handleMessage(msg: string) {
  try {
    const remote = JSON.parse(msg) as SyncData;
    const remoteJson = JSON.stringify(remote);
    if (remoteJson === lastSentJson) return;
    lastSentJson = remoteJson;
    const local = storage.getData();
    const merged = mergeSyncData(local, remote);
    storage.importData(JSON.stringify(merged));
    onSyncCallback?.(remote);
  } catch { /* ignore */ }
}

function setupDataChannel(channel: RTCDataChannel) {
  dataChannel = channel;
  channel.onmessage = (e) => handleMessage(e.data);
  channel.onopen = () => {
    onConnectionChange?.(true);
    // Send current data on connect
    sendData(extractSyncData(storage.getData()));
  };
  channel.onclose = () => {
    onConnectionChange?.(false);
    dataChannel = null;
  };
}

// Listen for local changes and send to peer
let storageUnsubscribe: (() => void) | null = null;

function startListening() {
  if (storageUnsubscribe) return;
  storageUnsubscribe = storage.subscribe(() => {
    if (dataChannel?.readyState === "open") {
      debouncedSend();
    }
  });
}

export function stopP2P() {
  if (storageUnsubscribe) { storageUnsubscribe(); storageUnsubscribe = null; }
  if (sendDebounce) { clearTimeout(sendDebounce); sendDebounce = null; }
  dataChannel?.close();
  peerConnection?.close();
  dataChannel = null;
  peerConnection = null;
  lastSentJson = null;
  onConnectionChange?.(false);
}

// ── Host: create offer ──

export async function createOffer(): Promise<string> {
  stopP2P();
  peerConnection = new RTCPeerConnection({ iceServers: STUN_SERVERS });

  const channel = peerConnection.createDataChannel("orleia-sync", { ordered: true });
  setupDataChannel(channel);

  peerConnection.oniceconnectionstatechange = () => {
    const state = peerConnection?.iceConnectionState;
    if (state === "failed" || state === "disconnected" || state === "closed") {
      onConnectionChange?.(false);
    }
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  // Wait for ICE gathering to complete
  await new Promise<void>((resolve) => {
    if (peerConnection!.iceGatheringState === "complete") { resolve(); return; }
    peerConnection!.onicegatheringstatechange = () => {
      if (peerConnection!.iceGatheringState === "complete") resolve();
    };
    // Timeout after 5s
    setTimeout(resolve, 5000);
  });

  const fullOffer = JSON.stringify(peerConnection!.localDescription);
  startListening();
  return btoa(fullOffer);
}

// ── Joiner: accept offer, create answer ──

export async function acceptOffer(offerB64: string): Promise<string> {
  stopP2P();
  const offerStr = atob(offerB64);
  const offer = JSON.parse(offerStr) as RTCSessionDescriptionInit;

  peerConnection = new RTCPeerConnection({ iceServers: STUN_SERVERS });

  peerConnection.ondatachannel = (e) => {
    setupDataChannel(e.channel);
  };

  peerConnection.oniceconnectionstatechange = () => {
    const state = peerConnection?.iceConnectionState;
    if (state === "failed" || state === "disconnected" || state === "closed") {
      onConnectionChange?.(false);
    }
  };

  await peerConnection.setRemoteDescription(offer);
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  await new Promise<void>((resolve) => {
    if (peerConnection!.iceGatheringState === "complete") { resolve(); return; }
    peerConnection!.onicegatheringstatechange = () => {
      if (peerConnection!.iceGatheringState === "complete") resolve();
    };
    setTimeout(resolve, 5000);
  });

  const fullAnswer = JSON.stringify(peerConnection!.localDescription);
  startListening();
  return btoa(fullAnswer);
}

// ── Host: accept answer ──

export async function acceptAnswer(answerB64: string): Promise<void> {
  if (!peerConnection) throw new Error("No peer connection");
  const answerStr = atob(answerB64);
  const answer = JSON.parse(answerStr) as RTCSessionDescriptionInit;
  await peerConnection.setRemoteDescription(answer);
}
