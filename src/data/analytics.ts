// Anonymous usage analytics.
//
// No personal data is collected: each install generates a random id so
// repeat sessions can be counted, alongside the event name, an optional
// target (sport or drill id), platform and app version. Events are
// batched and flushed on a timer, and silently dropped if the backend is
// unreachable — analytics must never affect the app's behaviour.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { apiHeaders, markWorking, orderedBases } from './api';
import appConfig from '../../app.json';

export type EventName =
  | 'app_open'
  | 'sport_open'
  | 'drill_open'
  | 'exercise_open'
  | 'video_play'
  | 'video_complete'
  | 'search'
  | 'credits_open';

interface QueuedEvent {
  name: EventName;
  target?: string;
  install: string;
  platform: string;
  appVersion: string;
}

const INSTALL_KEY = 'dojofit.installId';
const OPT_OUT_KEY = 'dojofit.analyticsOptOut';
const FLUSH_MS = 15_000;
const MAX_QUEUE = 50;

const appVersion = String(appConfig?.expo?.version ?? '0.0.0');
let installId: string | null = null;
let optedOut = false;
let queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function randomId() {
  return Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 10)).join('');
}

async function getInstallId(): Promise<string> {
  if (installId) return installId;
  try {
    const stored = await AsyncStorage.getItem(INSTALL_KEY);
    if (stored) {
      installId = stored;
      return stored;
    }
    const fresh = randomId();
    await AsyncStorage.setItem(INSTALL_KEY, fresh);
    installId = fresh;
    return fresh;
  } catch {
    installId = installId ?? randomId(); // memory-only fallback
    return installId;
  }
}

export async function initAnalytics() {
  try {
    optedOut = (await AsyncStorage.getItem(OPT_OUT_KEY)) === '1';
  } catch {
    optedOut = false;
  }
  await getInstallId();
  track('app_open');
}

export async function setAnalyticsOptOut(value: boolean) {
  optedOut = value;
  queue = [];
  try {
    await AsyncStorage.setItem(OPT_OUT_KEY, value ? '1' : '0');
  } catch {
    // preference stays in memory for this session
  }
}

export function isAnalyticsOptedOut() {
  return optedOut;
}

export function track(name: EventName, target?: string) {
  if (optedOut) return;
  queue.push({
    name,
    target,
    install: installId ?? 'pending',
    platform: Platform.OS,
    appVersion,
  });
  if (queue.length >= MAX_QUEUE) {
    void flush();
  } else if (!timer) {
    timer = setTimeout(() => {
      timer = null;
      void flush();
    }, FLUSH_MS);
  }
}

export async function flush() {
  if (optedOut || queue.length === 0) return;
  const batch = queue;
  queue = [];
  const id = await getInstallId();
  const events = batch.map((e) => ({ ...e, install: id }));

  for (const base of orderedBases()) {
    try {
      const res = await fetch(`${base}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...apiHeaders() },
        body: JSON.stringify({ events }),
      });
      if (res.ok) {
        markWorking(base);
        return;
      }
    } catch {
      // try the next base
    }
  }
  // Dropped: analytics is best-effort and must not retry forever.
}
