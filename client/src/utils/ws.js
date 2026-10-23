// WebSocket real-time subscription client for LOOP
class LoopSocketClient {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 20;
    this.role = "guest";
    this.identifier = "";
    this.isConnecting = false;
  }

  connect(role = "guest", identifier = "") {
    this.role = role;
    this.identifier = identifier;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    let wsUrl;
    const customWs = import.meta.env.VITE_WS_URL;
    const customApi = import.meta.env.VITE_API_URL;
    if (customWs) {
      wsUrl = `${customWs.replace(/\/+$/, "")}/ws?role=${encodeURIComponent(role)}&identifier=${encodeURIComponent(identifier)}`;
    } else if (customApi) {
      const base = customApi.replace(/\/api\/?$/, "").replace(/^http:/, "ws:").replace(/^https:/, "wss:");
      wsUrl = `${base.replace(/\/+$/, "")}/ws?role=${encodeURIComponent(role)}&identifier=${encodeURIComponent(identifier)}`;
    } else {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      wsUrl = `${protocol}//${host}/ws?role=${encodeURIComponent(role)}&identifier=${encodeURIComponent(identifier)}`;
    }

    try {
      this.isConnecting = true;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.emitLocal("connected", { role, identifier });
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.event) {
            this.emitLocal(payload.event, payload.data);
          }
        } catch (e) {
          console.error("WS Parse error:", e);
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.emitLocal("disconnected", {});
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 8000);
          this.reconnectAttempts++;
          setTimeout(() => this.connect(this.role, this.identifier), delay);
        }
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
      };
    } catch (err) {
      this.isConnecting = false;
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emitLocal(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in listener for ${event}:`, err);
        }
      });
    }
  }

  disconnect() {
    if (this.ws) {
      this.reconnectAttempts = this.maxReconnectAttempts;
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsClient = new LoopSocketClient();
