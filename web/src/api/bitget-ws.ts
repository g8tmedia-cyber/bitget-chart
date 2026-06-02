/**
 * Bitget V2 public WebSocket client.
 *
 * Scope: subscribe to one candle channel and emit bar updates.
 * URL: wss://ws.bitget.com/v2/ws/public
 *
 * Auto-reconnects with exponential backoff (1s → 30s cap), reset on
 * successful subscribe. Sends a JSON `{"op":"ping"}` every 25s to keep
 * idle connections alive (Bitget V2 expects JSON, not the V1 plain
 * "ping" string).
 *
 * Public spec: server pushes
 *   {
 *     "action": "snapshot" | "update",
 *     "arg": { instType, channel, instId },
 *     "data": [[ts, open, high, low, close, baseVol, quoteVol], ...]
 *   }
 * and `{"op":"pong"}` in response to our ping.
 */

import type { Candle } from "../api/types";

const WS_URL = "wss://ws.bitget.com/v2/ws/public";
const PING_INTERVAL_MS = 25_000;
const RECONNECT_MAX_MS = 30_000;
const RECONNECT_BASE_MS = 1_000;
const PING_PAYLOAD = JSON.stringify({ op: "ping" });

export interface CandleStreamOptions {
  symbol: string;
  /** WS channel name, e.g. "candle1H" */
  channel: string;
  /** Called for every tick. Multiple ticks per candle are expected. */
  onTick: (candle: Candle) => void;
  /** Optional: connection state changes for UI feedback */
  onStatus?: (status: "connecting" | "open" | "closed" | "error") => void;
}

export class CandleStream {
  private ws: WebSocket | null = null;
  private pingTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private backoff = RECONNECT_BASE_MS;
  private stopped = false;
  private opts: CandleStreamOptions;
  private subscribeMsg: string;

  constructor(opts: CandleStreamOptions) {
    this.opts = opts;
    this.subscribeMsg = JSON.stringify({
      op: "subscribe",
      args: [
        {
          instType: "USDT-FUTURES",
          channel: opts.channel,
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

  /** Tear down current socket and immediately reconnect (e.g. on TF change). */
  restart() {
    this.clearTimers();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.backoff = RECONNECT_BASE_MS;
    this.start();
  }

  private connect() {
    if (this.stopped) return;
    this.opts.onStatus?.("connecting");
    let ws: WebSocket;
    try {
      ws = new WebSocket(WS_URL);
    } catch (e) {
      console.error("[CandleStream] WebSocket constructor threw:", e);
      this.opts.onStatus?.("error");
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      console.log(
        `[CandleStream] connected, subscribing to ${this.opts.channel} for ${this.opts.symbol}`,
      );
      this.opts.onStatus?.("open");
      this.backoff = RECONNECT_BASE_MS;
      ws.send(this.subscribeMsg);
      this.pingTimer = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(PING_PAYLOAD);
        }
      }, PING_INTERVAL_MS);
    };

    ws.onmessage = (ev) => {
      // Bitget V2 pong response is JSON: {"op":"pong"}
      if (typeof ev.data === "string") {
        if (ev.data === "pong") return; // legacy / safe fallback
        let msg: {
          op?: string;
          action?: string;
          arg?: { channel: string; instId: string };
          data?: string[][];
        };
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (msg.op === "pong") return;
        if (!msg.data || !Array.isArray(msg.data)) return;
        if (msg.arg?.channel !== this.opts.channel) return;
        for (const row of msg.data) {
          const [ts, o, h, l, c, baseVol, quoteVol] = row;
          this.opts.onTick({
            time: Math.floor(Number(ts) / 1000),
            open: Number(o),
            high: Number(h),
            low: Number(l),
            close: Number(c),
            volume: Number(baseVol),
            quoteVolume: Number(quoteVol),
          });
        }
      }
    };

    ws.onerror = (event) => {
      console.error(
        `[CandleStream] WebSocket error on ${this.opts.channel}:`,
        event,
      );
      this.opts.onStatus?.("error");
    };

    ws.onclose = (event) => {
      console.warn(
        `[CandleStream] closed (code=${event.code}, reason="${event.reason || "<none>"}", wasClean=${event.wasClean})`,
      );
      this.opts.onStatus?.("closed");
      this.clearTimers();
      if (!this.stopped) this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer != null) return;
    console.log(`[CandleStream] reconnecting in ${this.backoff}ms`);
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
