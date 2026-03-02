// SSE streaming client for AI chat endpoints
// Handles POST-based SSE (not native EventSource which only supports GET)

import { fetchEventSource } from "@microsoft/fetch-event-source";

export interface SSEEvent {
  type: "reasoning" | "chunk" | "action" | "complete" | "done" | "error";
  content?: string;
  action?: string;
  message?: string;
  success?: boolean;
  data?: unknown;
  campo?: string;
  error?: string;
  arguments?: any;
}

export interface SSEOptions {
  url: string;
  body?: unknown;
  onMessage: (event: SSEEvent) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
  signal?: AbortSignal;
}

export async function streamSSE({
  url,
  body,
  onMessage,
  onError,
  onClose,
  signal,
}: SSEOptions): Promise<void> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("lia_token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Force bypass Next.js proxy to avoid HTTP buffering of SSE
  let baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  // Fallback heuristic: If we don't have a protocol, enforce the direct Uvicorn port
  if (!baseUrl.startsWith("http")) baseUrl = "http://localhost:8000";
  
  const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url}`;

  await fetchEventSource(fullUrl, {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal,
    onmessage(ev) {
      if (!ev.data) return;
      try {
        const parsed: SSEEvent = JSON.parse(ev.data);
        
        // Map the native SSE event type to parsed.type to match our hook logic
        if (ev.event) {
          parsed.type = ev.event as SSEEvent["type"];
        } else if (!parsed.type) {
          // Fallback if neither ev.event nor parsed.type is present in the data
          parsed.type = "chunk";
        }

        // Debug log (can be removed in production)
        if (process.env.NODE_ENV === 'development') {
          console.log('[SSE]', ev.event || 'message', parsed);
        }

        onMessage(parsed);
      } catch (error) {
        // Log parse errors in development
        if (process.env.NODE_ENV === 'development') {
          console.warn('[SSE] Failed to parse event data:', ev.data, error);
        }
      }
    },
    onerror(err) {
      if (onError) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
      // Don't reconnect
      throw err;
    },
    onclose() {
      onClose?.();
    },
    openWhenHidden: true,
  });
}

export function createAbortController(): AbortController {
  return new AbortController();
}
