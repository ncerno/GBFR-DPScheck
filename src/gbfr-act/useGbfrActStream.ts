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
  const [parseErrors, setParseErrors] = useState<ParseErrorRecord[]>([]);
  const clientRef = useRef<GbfrActClient | null>(null);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const setStatus = useCallback((status: GbfrActConnectionStatus, lastError?: string) => {
    setConnection({ status, url, lastError });
  }, [url]);

  const pushEvent = useCallback((event: GbfrActRawEvent) => {
    setEvents((current) => [event, ...current].slice(0, maxEvents));
    void onEventRef.current?.(event);
  }, [maxEvents]);

  const connect = useCallback(() => {
    clientRef.current?.disconnect();
    setStatus('connecting');

    const client = new GbfrActClient({
      url,
      onOpen: () => setStatus('connected'),
      onClose: () => setStatus('disconnected'),
      onError: (error) => setStatus('error', eventToMessage(error)),
      onParseError: (raw, error) => {
        setParseErrors((current) => [
          { raw, message: error instanceof Error ? error.message : String(error) },
          ...current,
        ].slice(0, 20));
      },
      onEvent: pushEvent,
    });

    clientRef.current = client;
    client.connect();
  }, [pushEvent, setStatus, url]);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    setStatus('disconnected');
  }, [setStatus]);

  const pushEvents = useCallback((nextEvents: GbfrActRawEvent[]) => {
    setEvents((current) => [...nextEvents, ...current].slice(0, maxEvents));
    for (const event of nextEvents) {
      void onEventRef.current?.(event);
    }
  }, [maxEvents]);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setParseErrors([]);
  }, []);

  useEffect(() => () => clientRef.current?.disconnect(), []);

  return useMemo(() => ({
    connection,
    events,
    parseErrors,
    connect,
    disconnect,
    clearEvents,
    pushEvent,
    pushEvents,
  }), [clearEvents, connect, connection, disconnect, events, parseErrors, pushEvent, pushEvents]);
}

function eventToMessage(error: Event) {
  if ('message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return 'WebSocket 连接错误';
}
