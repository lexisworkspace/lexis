"use client";

import { openDB, DBSchema, IDBPDatabase } from "idb";
import { AppData } from "@/types";

const DB_NAME = "lexis";
const DB_VERSION = 1;
const STORE_NAME = "appData";
const DATA_KEY = "main";

interface LexisDB extends DBSchema {
  appData: {
    key: string;
    value: AppData;
  };
}

let dbPromise: Promise<IDBPDatabase<LexisDB>> | null = null;

function getDB(): Promise<IDBPDatabase<LexisDB>> {
  if (!dbPromise) {
    dbPromise = openDB<LexisDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

export async function loadFromIDB(): Promise<AppData | null> {
  try {
    const db = await getDB();
    const data = await db.get(STORE_NAME, DATA_KEY);
    return data || null;
  } catch (e) {
    console.warn("Failed to load from IndexedDB", e);
    return null;
  }
}

export async function saveToIDB(data: AppData): Promise<void> {
  try {
    const db = await getDB();
    await db.put(STORE_NAME, data, DATA_KEY);
  } catch (e) {
    console.warn("Failed to save to IndexedDB", e);
  }
}

export async function clearIDB(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear(STORE_NAME);
  } catch (e) {
    console.warn("Failed to clear IndexedDB", e);
  }
}
