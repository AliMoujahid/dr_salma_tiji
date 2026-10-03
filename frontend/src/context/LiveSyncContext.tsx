import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { API_URL } from '../config/api';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';

export type LiveEventType =
  | 'PATIENTS_CHANGED'
  | 'APPOINTMENTS_CHANGED'
  | 'WAITING_ROOM_CHANGED'
  | 'FINANCIALS_CHANGED'
  | 'DOCUMENTS_CHANGED'
  | 'SETTINGS_CHANGED'
  | 'NOTIFICATIONS_CHANGED';

export interface LiveSyncPayload {
  type: LiveEventType;
  action: 'create' | 'update' | 'delete' | 'archive' | 'favorite' | 'status_change' | 'refresh';
  entityId?: string;
  entityName?: string;
  sourceUser?: string;
  timestamp: number;
  data?: any;
}

interface LiveSyncContextType {
  isConnected: boolean;
  lastEvent: LiveSyncPayload | null;
}

const LiveSyncContext = createContext<LiveSyncContextType>({
  isConnected: false,
  lastEvent: null,
});

export const LiveSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastEvent, setLastEvent] = useState<LiveSyncPayload | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connectSSE = () => {
      try {
        const streamUrl = `${API_URL}/events/live`;
        eventSource = new EventSource(streamUrl);

        eventSource.onopen = () => {
          setIsConnected(true);
        };

        eventSource.onmessage = (e) => {
          try {
            const payload: LiveSyncPayload = JSON.parse(e.data);
            setLastEvent(payload);

            // Dispatch a native DOM event for decoupled sub-components
            window.dispatchEvent(
              new CustomEvent('cabinet:livesync', {
                detail: payload,
              })
            );

            // Notify user if another PC updated something
            if (payload.sourceUser && payload.sourceUser !== user?.name) {
              if (payload.type === 'PATIENTS_CHANGED' && payload.action === 'create') {
                toast.info(
                  'Synchronisation Réseau',
                  `Nouveau patient ajouté par ${payload.sourceUser}${payload.entityName ? ` : ${payload.entityName}` : ''}`
                );
              } else if (payload.type === 'APPOINTMENTS_CHANGED' && payload.action === 'create') {
                toast.info(
                  'Nouveau Rendez-vous',
                  `Rendez-vous programmé par ${payload.sourceUser}`
                );
              }
            }
          } catch (err) {
            console.error('[LiveSync] Failed to parse event payload:', err);
          }
        };

        eventSource.onerror = () => {
          setIsConnected(false);
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Reconnect after 3 seconds
          if (!reconnectTimeout) {
            reconnectTimeout = setTimeout(() => {
              reconnectTimeout = null;
              connectSSE();
            }, 3000);
          }
        };
      } catch (err) {
        console.warn('[LiveSync] SSE connection error:', err);
      }
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [user?.name, toast]);

  return (
    <LiveSyncContext.Provider value={{ isConnected, lastEvent }}>
      {children}
    </LiveSyncContext.Provider>
  );
};

/**
 * Custom hook to listen to specific real-time clinic events
 */
export const useLiveSync = (
  types: LiveEventType | LiveEventType[],
  callback: (payload: LiveSyncPayload) => void
) => {
  const targetTypes = Array.isArray(types) ? types : [types];
  const stableCallback = useCallback(callback, [callback]);

  useEffect(() => {
    const handleSync = (event: Event) => {
      const customEvent = event as CustomEvent<LiveSyncPayload>;
      if (customEvent.detail && targetTypes.includes(customEvent.detail.type)) {
        stableCallback(customEvent.detail);
      }
    };

    window.addEventListener('cabinet:livesync', handleSync);
    return () => {
      window.removeEventListener('cabinet:livesync', handleSync);
    };
  }, [targetTypes, stableCallback]);
};

export const useLiveSyncStatus = () => useContext(LiveSyncContext);
