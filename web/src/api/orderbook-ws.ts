/**
 * OrderBookStream — public WS subscription for the Bitget V2 order book
 * (channel: `books15`).
 *
 * Per the docs, `books15` is a top-15-level full snapshot pushed on
 * every change (~150ms for futures), so the handler always receives
 * a complete book to replace the local copy. There is no incremental
 * merge — the payload's `asks` and `bids` arrays are authoritative
 * for the top 15 levels.
 *
 * Auto-reconnects with exponential backoff (1s → 30s cap). Sends a
 * JSON `{"op":"ping"}` every 25s to keep the connection alive.
 */

import type { OrderBookSnapshot } from "./bitget";

const WS_URL = "wss://ws.bitget.com/v2/ws/public";
const PING_INTERVAL_MS = 25_000;
const RECONNECT_MAX_MS = 30_000;
const RECONNECT_BASE_MS = 1_000;
const PING_PAYLOAD = JSON.stringify({ op: "ping" });
const PRODUCT_TYPE = "USDT-FUTURES" as const;

export interface OrderBookStreamOptions {
  symbol: string;
  /** Called with the latest full book each push. */
  onSnapshot: (snap: OrderBookSnapshot) => void;
  onStatus?: (status: "connecting" | "open" | "closed" | "error") => void;
}

export class OrderBookStream {
  private ws: WebSocket | null = null;
  private pingTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private backoff = RECONNECT_BASE_MS;
  private stopped = false;
  private opts: OrderBookStreamOptions;
  private subscribeMsg: string;

  constructor(opts: OrderBookStreamOptions) {
    this.opts = opts;
    this.subscribeMsg = JSON.stringify({
      op: "subscribe",
      args: [
        {
          instType: PRODUCT_TYPE,
          channel: "books15",
          instId: opts.symbol,
        },
      ],
    });
  }

  start() {
    this.stopped = false;
    this.connect();
  }

  stop() {
    this.stopped = true;
    this.clearTimers();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.opts.onStatus?.("closed");
  }

  private connect() {
    if (this.stopped) return;
    this.opts.onStatus?.("connecting");
    let ws: WebSocket;
    try {
      ws = new WebSocket(WS_URL);
    } catch (e) {
      console.error("[OrderBookStream] WebSocket constructor threw:", e);
      this.opts.onStatus?.("error");
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.backoff = RECONNECT_BASE_MS;
      ws.send(this.subscribeMsg);
      this.pingTimer = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(PING_PAYLOAD);
      }, PING_INTERVAL_MS);
      this.opts.onStatus?.("open");
    };

    ws.onmessage = (ev) => {
      if (typeof ev.data !== "string") return;
      if (ev.data === "pong") return;
      let msg: {
        op?: string;
        action?: string;
        arg?: { channel: string; instId: string };
        data?: {
          asks: string[][];
          bids: string[][];
          ts: string;
        }[];
      };
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (msg.op === "pong") return;
      if (msg.arg?.channel !== "books15") return;
      const row = msg.data?.[0];
      if (!row) return;
      this.opts.onSnapshot({
        asks: row.asks
          .map(([p, s]) => ({ price: Number(p), size: Number(s) }))
          .sort((a, b) => a.price - b.price),
        bids: row.bids
          .map(([p, s]) => ({ price: Number(p), size: Number(s) }))
          .sort((a, b) => b.price - a.price),
        ts: Number(row.ts),
      });
    };

    ws.onerror = () => {
      this.opts.onStatus?.("error");
    };

    ws.onclose = () => {
      this.opts.onStatus?.("closed");
      this.clearTimers();
      if (!this.stopped) this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer != null) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.backoff = Math.min(this.backoff * 2, RECONNECT_MAX_MS);
      this.connect();
    }, this.backoff);
  }

  private clearTimers() {
    if (this.pingTimer != null) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.reconnectTimer != null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
