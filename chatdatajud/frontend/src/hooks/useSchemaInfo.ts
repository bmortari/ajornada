import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { SchemaInfo } from '../types/chat';

const MAX_RETRIES = 3;

export function useSchemaInfo() {
  const schemaInfo = useAppStore((s) => s.schemaInfo);
  const setSchemaInfo = useAppStore((s) => s.setSchemaInfo);
  const retryCount = useRef(0);

  useEffect(() => {
    // Only fetch once, and stop after MAX_RETRIES failures
    if (schemaInfo || retryCount.current >= MAX_RETRIES) return;

    let cancelled = false;

    async function load() {
      try {
        const resp = await fetch('/api/cube/schema-summary');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data: SchemaInfo = await resp.json();
        if (!cancelled && !data.hasOwnProperty('error')) {
          setSchemaInfo(data);
        }
      } catch (err) {
        retryCount.current++;
        console.warn(`[useSchemaInfo] Failed to load schema (attempt ${retryCount.current}/${MAX_RETRIES}):`, err);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [schemaInfo, setSchemaInfo]);

  return { schemaInfo, loading: !schemaInfo };
}
