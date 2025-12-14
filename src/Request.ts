import { nanoid } from "nanoid/non-secure";
import type { Message, MessageType, RequestMethod, RequestOptions } from "./types";

/**
 * Generate unique ID for messages
 */
function generateId(): string {
  return nanoid();
}

/**
 * Request client for calling APIs exposed by other pages
 */
export class Request {
  private server: string;
  private timeout: number;
  private targetWindow: Window | null = null;
  private targetOrigin: string;
  private pendingRequests: Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (reason: any) => void;
      timer: number;
    }
  > = new Map();
  private connected = false;

  constructor(options: RequestOptions) {
    this.server = options.server;
    this.timeout = options.timeout || 30000;
    this.targetOrigin = this.extractOrigin(this.server);

    // Setup message listener
    this.handleMessage = this.handleMessage.bind(this);
    window.addEventListener("message", this.handleMessage);

    // Dynamically add methods to the instance
    for (const method of options.methods) {
      (this as any)[method] = this.createMethod(method);
    }

    // Setup connection
    this.setupConnection();
  }

  /**
   * Extract origin from URL
   */
  private extractOrigin(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.origin;
    } catch {
      return "*";
    }
  }

  /**
   * Setup connection to target window
   */
  private async setupConnection(): Promise<void> {
    // Check if current window is in an iframe and parent is the server
    if (window.parent !== window) {
      try {
        // Try to access parent's origin (will throw if cross-origin)
        const parentOrigin = this.extractOrigin(document.referrer || this.server);
        if (parentOrigin === this.targetOrigin || this.targetOrigin === "*") {
          this.targetWindow = window.parent;
          await this.handshake();
          return;
        }
      } catch {
        // Cross-origin, continue to iframe search
      }
    }

    // Search for iframe with matching src
    const iframes = document.querySelectorAll("iframe");
    for (const iframe of Array.from(iframes)) {
      if (iframe.src?.startsWith(this.server)) {
        // Check if iframe is already loaded
        const isLoaded = iframe.contentDocument?.readyState === "complete";

        if (!isLoaded) {
          await new Promise<void>((resolve) => {
            iframe.addEventListener(
              "load",
              () => {
                resolve();
              },
              { once: true }
            );

            // Fallback timeout
            setTimeout(() => {
              resolve();
            }, 2000);
          });
        }

        // Small delay to ensure iframe scripts are initialized
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Get contentWindow
        this.targetWindow = iframe.contentWindow;

        if (!this.targetWindow) {
          throw new Error("Failed to get iframe contentWindow");
        }

        await this.handshake();
        return;
      }
    }
    const observer = new MutationObserver(async (mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof HTMLIFrameElement && node.src?.startsWith(this.server)) {
            this.targetWindow = node.contentWindow;
            observer.disconnect();
            await this.handshake();
            return;
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Perform handshake with target window
   */
  private async handshake(): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = generateId();
      const timer = window.setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error("Handshake timeout"));
      }, this.timeout);

      this.pendingRequests.set(id, {
        resolve: () => {
          this.connected = true;
          resolve();
        },
        reject,
        timer,
      });

      // Send handshake message
      if (!this.targetWindow) {
        reject(new Error("Target window is null"));
        return;
      }

      try {
        this.targetWindow.postMessage(
          {
            type: "WEBPAGE_TUNNEL_HANDSHAKE",
            id,
          },
          this.targetOrigin
        );
      } catch (e) {
        reject(e as Error);
      }
    });
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(event: MessageEvent): void {
    // Verify origin if specified
    if (this.targetOrigin !== "*" && event.origin !== this.targetOrigin) {
      return;
    }

    const message = event.data as Message;

    // Handle handshake acknowledgment
    if (message.type === ("WEBPAGE_TUNNEL_HANDSHAKE_ACK" as MessageType)) {
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        clearTimeout(pending.timer);
        this.pendingRequests.delete(message.id);
        pending.resolve(undefined);
      }
      return;
    }

    // Handle response
    if (message.type === ("WEBPAGE_TUNNEL_RESPONSE" as MessageType)) {
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        clearTimeout(pending.timer);
        this.pendingRequests.delete(message.id);

        if (message.error) {
          pending.reject(new Error(message.error));
        } else {
          pending.resolve(message.result);
        }
      }
    }
  }

  /**
   * Create a method that sends requests to the target window
   */
  private createMethod<P = any, R = any>(method: string): RequestMethod<P, R> {
    return async (params?: P): Promise<R> => {
      // Wait for connection if not connected
      if (!this.connected) {
        await new Promise((resolve) => {
          const checkConnection = setInterval(() => {
            if (this.connected) {
              clearInterval(checkConnection);
              resolve(undefined);
            }
          }, 100);
        });
      }

      return new Promise((resolve, reject) => {
        const id = generateId();
        const timer = window.setTimeout(() => {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout: ${method}`));
        }, this.timeout);

        this.pendingRequests.set(id, {
          resolve,
          reject,
          timer,
        });

        this.targetWindow?.postMessage(
          {
            type: "WEBPAGE_TUNNEL_REQUEST",
            id,
            method,
            params,
          },
          this.targetOrigin
        );
      });
    };
  }

  /**
   * Destroy the request instance and cleanup resources
   */
  destroy(): void {
    window.removeEventListener("message", this.handleMessage);

    // Clear all pending requests silently
    for (const [, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timer);
      // Silently reject to avoid unhandled promise rejection errors
      try {
        pending.reject(new Error("Request cancelled"));
      } catch {
        // Ignore errors during cleanup
      }
    }
    this.pendingRequests.clear();

    this.targetWindow = null;
    this.connected = false;
  }
}
