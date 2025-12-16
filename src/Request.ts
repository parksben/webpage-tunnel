import { nanoid } from 'nanoid/non-secure';
import type { Message, MessageType, RequestMethod, RequestOptions } from './types';

/**
 * Generate unique ID for messages
 */
function generateId(): string {
  return nanoid();
}

/**
 * Request client for calling APIs exposed by other pages
 */
class RequestBase<T extends string = string> {
  private server: string;
  private timeout: number;
  private connectionTimeout: number;
  private targetWindows: Window[] = [];
  private targetOrigin: string;
  private targetWindow: Window | undefined;
  private pendingRequests: Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (reason: any) => void;
      timer: number;
    }
  > = new Map();
  private connected = false;

  constructor(options: RequestOptions<T>) {
    this.server = options.server;
    this.timeout = options.timeout || 30000;
    this.connectionTimeout = options.connectionTimeout || 5000;
    this.targetOrigin = this.extractOrigin(this.server);
    this.targetWindow = options.targetWindow;

    // Setup message listener
    this.handleMessage = this.handleMessage.bind(this);
    window.addEventListener('message', this.handleMessage);

    // Dynamically add methods to the instance
    for (const method of options.methods) {
      (this as any)[method] = this.createMethod(method);
    }

    // Setup connection with timeout
    this.setupConnectionWithTimeout();
  }

  /**
   * Setup connection with timeout
   */
  private async setupConnectionWithTimeout(): Promise<void> {
    let timeoutId: NodeJS.Timeout | null = null;
    let timeoutFired = false;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        timeoutFired = true;
        const error = new Error(
          `Connection timeout after ${this.connectionTimeout}ms. Failed to establish connection with ${this.server}. Please ensure: 1) The target page is loaded, 2) serve() is called on the target page, 3) The target page is accessible from the current context.`
        );
        reject(error);
      }, this.connectionTimeout);
    });

    try {
      await Promise.race([this.setupConnection(), timeoutPromise]);
      // Clear timeout if connection succeeded
      if (timeoutId && !timeoutFired) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    } catch (error) {
      // Clear timeout if connection failed before timeout
      if (timeoutId && !timeoutFired) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      throw error;
    }
  }

  /**
   * Extract origin from URL
   */
  private extractOrigin(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.origin;
    } catch {
      return '*';
    }
  }

  /**
   * Setup connection to target window
   */
  private async setupConnection(): Promise<void> {
    // Check if current window is in an iframe
    if (window.parent !== window) {
      // First, check if parent itself is the server (child → parent communication)
      try {
        const parentOrigin = this.extractOrigin(document.referrer || this.server);
        const serverOrigin = this.extractOrigin(this.server);

        // Check if parent's origin matches server origin
        if (parentOrigin === serverOrigin || this.targetOrigin === '*') {
          // Check if parent's URL matches the server URL (not just origin)
          // by comparing the pathname - must match exactly
          const serverUrl = new URL(this.server);
          const parentUrl = new URL(document.referrer || this.server);

          if (serverUrl.pathname === parentUrl.pathname) {
            this.targetWindows = [window.parent];
            await this.handshake();
            return;
          }
        }
      } catch {
        // Not same origin with parent, continue to sibling search
      }

      // If parent is not the server, search for sibling iframes in the parent
      try {
        // Retry mechanism: wait for sibling iframes to load
        const maxRetries = 10; // Maximum 10 retries
        const retryDelay = 100; // Wait 100ms between retries

        for (let retry = 0; retry < maxRetries; retry++) {
          const parentIframes = window.parent.document.querySelectorAll('iframe');

          // Only clear targetWindows on first attempt
          if (retry === 0) {
            this.targetWindows = [];
          }

          for (const iframe of Array.from(parentIframes)) {
            // Skip self
            if (iframe.contentWindow === window) {
              continue;
            }

            if (iframe.src?.startsWith(this.server)) {
              const cw = iframe.contentWindow;
              if (cw && !this.targetWindows.includes(cw)) {
                this.targetWindows.push(cw);
              }
            }
          }

          if (this.targetWindows.length > 0) {
            // Wait a bit to ensure iframe is fully initialized
            await new Promise((resolve) => setTimeout(resolve, 100));
            await this.handshake();
            return;
          }

          // If not found and not the last retry, wait and try again
          if (retry < maxRetries - 1) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          }
        }
      } catch (e) {
        // Cross-origin parent, cannot access parent's iframes
      }

      // If we're in an iframe, don't search current document (no iframes inside iframe)
      return;
    }

    // Search for iframe with matching src in current document
    const iframes = Array.from(document.querySelectorAll('iframe'));
    for (const iframe of iframes) {
      if (iframe.src?.startsWith(this.server)) {
        // Check if iframe is already loaded
        const isLoaded = iframe.contentDocument?.readyState === 'complete';

        if (!isLoaded) {
          await new Promise<void>((resolve) => {
            iframe.addEventListener(
              'load',
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
        const cw = iframe.contentWindow;

        if (!cw) {
          throw new Error('Failed to get iframe contentWindow');
        }

        this.targetWindows.push(cw);
      }
    }
    if (this.targetWindows.length > 0) {
      await this.handshake();
      return;
    }
    const observer = new MutationObserver(async (mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof HTMLIFrameElement && node.src?.startsWith(this.server)) {
            if (node.contentWindow) {
              this.targetWindows.push(node.contentWindow);
            }
            // Do not disconnect; continue to collect future matching iframes
            await this.handshake();
            // continue scanning for more
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
        reject(
          new Error(
            `Handshake timeout with ${this.server}. The target page may not have called serve() yet, or the connection was blocked.`
          )
        );
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
      if (this.targetWindows.length === 0) {
        reject(
          new Error(
            `No target window found for ${this.server}. Please ensure the target iframe is loaded and accessible.`
          )
        );
        return;
      }

      try {
        const targets = this.getTargets();
        for (const win of targets) {
          win.postMessage(
            {
              type: 'WEBPAGE_TUNNEL_HANDSHAKE',
              id,
            },
            this.targetOrigin
          );
        }
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
    if (this.targetOrigin !== '*' && event.origin !== this.targetOrigin) {
      return;
    }

    const message = event.data as Message;

    // Handle handshake acknowledgment
    if (message.type === ('WEBPAGE_TUNNEL_HANDSHAKE_ACK' as MessageType)) {
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        clearTimeout(pending.timer);
        this.pendingRequests.delete(message.id);
        pending.resolve(undefined);
      }
      return;
    }

    // Handle response
    if (message.type === ('WEBPAGE_TUNNEL_RESPONSE' as MessageType)) {
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

        const targets = this.getTargets();
        for (const win of targets) {
          try {
            win.postMessage(
              {
                type: 'WEBPAGE_TUNNEL_REQUEST',
                id,
                method,
                params,
              },
              this.targetOrigin
            );
          } catch (e) {
            // Ignore individual postMessage errors; continue broadcasting
          }
        }
      });
    };
  }

  /**
   * Get target windows based on targetWindow configuration
   */
  private getTargets(): Window[] {
    // If specific window specified, use it if it's in our collection
    if (this.targetWindow) {
      return this.targetWindows.includes(this.targetWindow) ? [this.targetWindow] : [];
    }
    // Default: broadcast to all matching windows
    return this.targetWindows;
  }

  /**
   * Destroy the request instance and cleanup resources
   */
  destroy(): void {
    window.removeEventListener('message', this.handleMessage);

    // Clear all pending requests silently
    for (const [, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timer);
      // Silently reject to avoid unhandled promise rejection errors
      try {
        pending.reject(new Error('Request cancelled'));
      } catch {
        // Ignore errors during cleanup
      }
    }
    this.pendingRequests.clear();

    this.targetWindows = [];
    this.connected = false;
  }
}

export type Request<T extends string = string> = RequestBase<T> & Record<T, RequestMethod>;
export const Request = RequestBase as {
  new <T extends string = string>(options: RequestOptions<T>): Request<T>;
};
