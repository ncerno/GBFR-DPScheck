import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GbfrActRawEvent } from './events';
import { GbfrActClient } from './client';
import type { GbfrActConnectionState, GbfrActConnectionStatus } from './connection';
import { defaultGbfrActConnectionState } from './connection';

interface UseGbfrActStreamOptions {
  url: string;
  maxEvents?: number;
  onEvent?: (event: GbfrActRawEvent) => void | Promise<void>;
}

export type GbfrActEventSource = 'live' | 'replay';

interface PushEventOptions {
  source?: GbfrActEventSource;
  persist?: boolean;
}

interface ParseErrorRecord {
  raw: string;
  message: string;
}

export function useGbfrActStream({ url, maxEvents = 200, onEvent }: UseGbfrActStreamOptions) {
  const [connection, setConnection] = useState<GbfrActConnectionState>({
    ...defaultGbfrActConnectionState,
    url,
  });
  const [events, setEvents] = useState<GbfrActRawEvent[]>([]);
  const [combatEvents, setCombatEvents] = useState<GbfrActRawEvent[]>([]);
  const [parseErrors, setParseErrors] = useState<ParseErrorRecord[]>([]);
  const [eventSource, setEventSource] = useState<GbfrActEventSource>('live');
  const [eventCount, setEventCount] = useState(0);
  const [eventTypeCounts, setEventTypeCounts] = useState<Record<string, number>>({});
  const [sourceCounts, setSourceCounts] = useState<Record<GbfrActEventSource, number>>({
    live: 0,
    replay: 0,
  });
  const [lastReceivedAtMs, setLastReceivedAtMs] = useState<number | null>(null);
  const [lastDamageReceivedAtMs, setLastDamageReceivedAtMs] = useState<number | null>(null);
  const clientRef = useRef<GbfrActClient | null>(null);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const setStatus = useCallback((status: GbfrActConnectionStatus, lastError?: string) => {
    setConnection({ status, url, lastError });
  }, [url]);

  const pushEvent = useCallback((event: GbfrActRawEvent, options: PushEventOptions = {}) => {
    const source = options.source ?? 'live';
    const persist = options.persist ?? source === 'live';
    const receivedAtMs = Date.now();

    setEventSource(source);
    setEventCount((current) => current + 1);
    setEventTypeCounts((current) => incrementEventTypeCounts(current, [event]));
    setSourceCounts((current) => ({
      ...current,
      [source]: (current[source] ?? 0) + 1,
    }));
    setLastReceivedAtMs(receivedAtMs);
    if (event.type === 'damage') {
      setLastDamageReceivedAtMs(receivedAtMs);
    }
    setEvents((current) => [event, ...current].slice(0, maxEvents));
    setCombatEvents((current) => [event, ...current]);
    if (persist) {
      void onEventRef.current?.(event);
    }
  }, [maxEvents]);

  const connect = useCallback(() => {
    clientRef.current?.disconnect();
    setStatus('connecting');

    const client = new GbfrActClient({
      url,
      onOpen: () => {
        if (clientRef.current === client) {
          setStatus('connected');
        }
      },
      onClose: () => {
        if (clientRef.current === client) {
          setStatus('disconnected');
        }
      },
      onError: (error) => {
        if (clientRef.current === client) {
          setStatus('error', eventToMessage(error));
        }
      },
      onParseError: (raw, error) => {
        if (clientRef.current !== client) {
          return;
        }

        setParseErrors((current) => [
          { raw, message: error instanceof Error ? error.message : String(error) },
          ...current,
        ].slice(0, 20));
      },
      onEvent: (event) => {
        if (clientRef.current === client) {
          pushEvent(event);
        }
      },
    });

    clientRef.current = client;
    client.connect();
  }, [pushEvent, setStatus, url]);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    setStatus('disconnected');
  }, [setStatus]);

  const pushEvents = useCallback((nextEvents: GbfrActRawEvent[], options: PushEventOptions = {}) => {
    const source = options.source ?? 'replay';
    const persist = options.persist ?? source === 'live';
    const receivedAtMs = Date.now();

    setEventSource(source);
    setEventCount((current) => current + nextEvents.length);
    setEventTypeCounts((current) => incrementEventTypeCounts(current, nextEvents));
    setSourceCounts((current) => ({
      ...current,
      [source]: (current[source] ?? 0) + nextEvents.length,
    }));
    setLastReceivedAtMs(nextEvents.length > 0 ? receivedAtMs : null);
    if (nextEvents.some((event) => event.type === 'damage')) {
      setLastDamageReceivedAtMs(receivedAtMs);
    }
    setEvents((current) => [...nextEvents, ...current].slice(0, maxEvents));
    setCombatEvents((current) => [...nextEvents, ...current]);
    if (persist) {
      for (const event of nextEvents) {
        void onEventRef.current?.(event);
      }
    }
  }, [maxEvents]);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setCombatEvents([]);
    setParseErrors([]);
    setEventSource('live');
    setEventCount(0);
    setEventTypeCounts({});
    setSourceCounts({ live: 0, replay: 0 });
    setLastReceivedAtMs(null);
    setLastDamageReceivedAtMs(null);
  }, []);

  useEffect(() => () => clientRef.current?.disconnect(), []);

  return useMemo(() => ({
    connection,
    events,
    combatEvents,
    eventSource,
    eventCount,
    bufferedEventCount: events.length,
    eventTypeCounts,
    sourceCounts,
    lastReceivedAtMs,
    lastDamageReceivedAtMs,
    parseErrors,
    connect,
    disconnect,
    clearEvents,
    pushEvent,
    pushEvents,
  }), [clearEvents, combatEvents, connect, connection, disconnect, eventCount, eventSource, eventTypeCounts, events, lastDamageReceivedAtMs, lastReceivedAtMs, parseErrors, pushEvent, pushEvents, sourceCounts]);
}

function eventToMessage(error: Event) {
  if ('message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return 'WebSocket 连接错误';
}

function incrementEventTypeCounts(current: Record<string, number>, events: GbfrActRawEvent[]) {
  if (events.length === 0) {
    return current;
  }

  const next = { ...current };
  for (const event of events) {
    const type = event.type || 'unknown';
    next[type] = (next[type] ?? 0) + 1;
  }

  return next;
}
