/**
 * TradesStream — public WS subscription for the Bitget V2 public trade
 * channel (channel: `trade`). Receives taker-side fills.
 *
 * Per the docs, the first push is a snapshot of recent trades and
 * subsequent pushes are lists of new trades. Each row carries
 * `tradeId`, `price`, `size`, `side` ("buy"/"sell"), `ts` (ms).
 *
 * Auto-reconnects with exponential backoff. JSON `{"op":"ping"}` every
 * 25s to keep the connection alive.
 */

import type { PublicTrade } from "./bitget";

const WS_URL = "wss://ws.bitget.com/v2/ws/public";
const PING_INTERVAL_MS = 25_000;
const RECONNECT_MAX_MS = 30_000;
const RECONNECT_BASE_MS = 1_000;
const PING_PAYLOAD = JSON.stringify({ op: "ping" });
const PRODUCT_TYPE = "USDT-FUTURES" as const;

export interface TradesStreamOptions {
  symbol: string;
  /** Called with each new batch of trades (newest first). */
  onTrades: (trades: PublicTrade[]) => void;
  onStatus?: (status: "connecting" | "open" | "closed" | "error") => void;
}

export class TradesStream {
  private ws: WebSocket | null = null;
  private pingTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private backoff = RECONNECT_BASE_MS;
  private stopped = false;
  private opts: TradesStreamOptions;
  private subscribeMsg: string;

  constructor(opts: TradesStreamOptions) {
    this.opts = opts;
    this.subscribeMsg = JSON.stringify({
      op: "subscribe",
      args: [
        {
          instType: PRODUCT_TYPE,
          channel: "trade",
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
      console.error("[TradesStream] WebSocket constructor threw:", e);
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
          tradeId: string;
          price: string;
          size: string;
          side: string;
          ts: string;
        }[];
      };
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (msg.op === "pong") return;
      if (msg.arg?.channel !== "trade") return;
      const rows = msg.data;
      if (!rows || rows.length === 0) return;
      this.opts.onTrades(
        rows.map((r) => ({
          tradeId: r.tradeId,
          price: Number(r.price),
          size: Number(r.size),
          side: r.side === "buy" ? "buy" : "sell",
          ts: Number(r.ts),
        })),
      );
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
