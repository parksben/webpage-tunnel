/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

/**
 * Expose local APIs to be called by other pages via postMessage
 * @param methods - Object containing API methods to expose
 */
function serve(methods) {
    const handleMessage = (event) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        const message = event.data;
        // Handle handshake
        if (message.type === 'WEBPAGE_TUNNEL_HANDSHAKE') {
            (_a = event.source) === null || _a === void 0 ? void 0 : _a.postMessage({
                type: 'WEBPAGE_TUNNEL_HANDSHAKE_ACK',
                id: message.id,
            }, event.origin);
            return;
        }
        // Handle API requests
        if (message.type === 'WEBPAGE_TUNNEL_REQUEST') {
            const { id, method, params } = message;
            if (!method || !methods[method]) {
                (_b = event.source) === null || _b === void 0 ? void 0 : _b.postMessage({
                    type: 'WEBPAGE_TUNNEL_RESPONSE',
                    id,
                    error: `Method ${method} not found`,
                }, event.origin);
                return;
            }
            try {
                const result = yield methods[method](params);
                (_c = event.source) === null || _c === void 0 ? void 0 : _c.postMessage({
                    type: 'WEBPAGE_TUNNEL_RESPONSE',
                    id,
                    result,
                }, event.origin);
            }
            catch (error) {
                (_d = event.source) === null || _d === void 0 ? void 0 : _d.postMessage({
                    type: 'WEBPAGE_TUNNEL_RESPONSE',
                    id,
                    error: error instanceof Error ? error.message : String(error),
                }, event.origin);
            }
        }
    });
    window.addEventListener('message', handleMessage);
    return () => {
        window.removeEventListener('message', handleMessage);
    };
}

/* @ts-self-types="./index.d.ts" */
let urlAlphabet =
  'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';
let nanoid = (size = 21) => {
  let id = '';
  let i = size | 0;
  while (i--) {
    id += urlAlphabet[(Math.random() * 64) | 0];
  }
  return id
};

/**
 * Generate unique ID for messages
 */
function generateId() {
    return nanoid();
}
/**
 * Request client for calling APIs exposed by other pages
 */
class RequestBase {
    constructor(options) {
        this.targetWindows = [];
        this.pendingRequests = new Map();
        this.connected = false;
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
            this[method] = this.createMethod(method);
        }
        // Setup connection with timeout
        this.setupConnectionWithTimeout();
    }
    /**
     * Setup connection with timeout
     */
    setupConnectionWithTimeout() {
        return __awaiter(this, void 0, void 0, function* () {
            let timeoutId = null;
            let timeoutFired = false;
            const timeoutPromise = new Promise((_, reject) => {
                timeoutId = setTimeout(() => {
                    timeoutFired = true;
                    const error = new Error(`Connection timeout after ${this.connectionTimeout}ms. Failed to establish connection with ${this.server}. Please ensure: 1) The target page is loaded, 2) serve() is called on the target page, 3) The target page is accessible from the current context.`);
                    reject(error);
                }, this.connectionTimeout);
            });
            try {
                yield Promise.race([this.setupConnection(), timeoutPromise]);
                // Clear timeout if connection succeeded
                if (timeoutId && !timeoutFired) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
            }
            catch (error) {
                // Clear timeout if connection failed before timeout
                if (timeoutId && !timeoutFired) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                throw error;
            }
        });
    }
    /**
     * Extract origin from URL
     */
    extractOrigin(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.origin;
        }
        catch (_a) {
            return '*';
        }
    }
    /**
     * Setup connection to target window
     */
    setupConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
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
                            yield this.handshake();
                            return;
                        }
                    }
                }
                catch (_d) {
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
                            if ((_a = iframe.src) === null || _a === void 0 ? void 0 : _a.startsWith(this.server)) {
                                const cw = iframe.contentWindow;
                                if (cw && !this.targetWindows.includes(cw)) {
                                    this.targetWindows.push(cw);
                                }
                            }
                        }
                        if (this.targetWindows.length > 0) {
                            // Wait a bit to ensure iframe is fully initialized
                            yield new Promise((resolve) => setTimeout(resolve, 100));
                            yield this.handshake();
                            return;
                        }
                        // If not found and not the last retry, wait and try again
                        if (retry < maxRetries - 1) {
                            yield new Promise((resolve) => setTimeout(resolve, retryDelay));
                        }
                    }
                }
                catch (e) {
                    // Cross-origin parent, cannot access parent's iframes
                }
                // If we're in an iframe, don't search current document (no iframes inside iframe)
                return;
            }
            // Search for iframe with matching src in current document
            const iframes = Array.from(document.querySelectorAll('iframe'));
            for (const iframe of iframes) {
                if ((_b = iframe.src) === null || _b === void 0 ? void 0 : _b.startsWith(this.server)) {
                    // Check if iframe is already loaded
                    const isLoaded = ((_c = iframe.contentDocument) === null || _c === void 0 ? void 0 : _c.readyState) === 'complete';
                    if (!isLoaded) {
                        yield new Promise((resolve) => {
                            iframe.addEventListener('load', () => {
                                resolve();
                            }, { once: true });
                            // Fallback timeout
                            setTimeout(() => {
                                resolve();
                            }, 2000);
                        });
                    }
                    // Small delay to ensure iframe scripts are initialized
                    yield new Promise((resolve) => setTimeout(resolve, 200));
                    // Get contentWindow
                    const cw = iframe.contentWindow;
                    if (!cw) {
                        throw new Error('Failed to get iframe contentWindow');
                    }
                    this.targetWindows.push(cw);
                }
            }
            if (this.targetWindows.length > 0) {
                yield this.handshake();
                return;
            }
            const observer = new MutationObserver((mutations) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                for (const mutation of mutations) {
                    for (const node of Array.from(mutation.addedNodes)) {
                        if (node instanceof HTMLIFrameElement && ((_a = node.src) === null || _a === void 0 ? void 0 : _a.startsWith(this.server))) {
                            if (node.contentWindow) {
                                this.targetWindows.push(node.contentWindow);
                            }
                            // Do not disconnect; continue to collect future matching iframes
                            yield this.handshake();
                            // continue scanning for more
                        }
                    }
                }
            }));
            observer.observe(document.body, {
                childList: true,
                subtree: true,
            });
        });
    }
    /**
     * Perform handshake with target window
     */
    handshake() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const id = generateId();
                const timer = window.setTimeout(() => {
                    this.pendingRequests.delete(id);
                    reject(new Error(`Handshake timeout with ${this.server}. The target page may not have called serve() yet, or the connection was blocked.`));
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
                    reject(new Error(`No target window found for ${this.server}. Please ensure the target iframe is loaded and accessible.`));
                    return;
                }
                try {
                    const targets = this.getTargets();
                    for (const win of targets) {
                        win.postMessage({
                            type: 'WEBPAGE_TUNNEL_HANDSHAKE',
                            id,
                        }, this.targetOrigin);
                    }
                }
                catch (e) {
                    reject(e);
                }
            });
        });
    }
    /**
     * Handle incoming messages
     */
    handleMessage(event) {
        // Verify origin if specified
        if (this.targetOrigin !== '*' && event.origin !== this.targetOrigin) {
            return;
        }
        const message = event.data;
        // Handle handshake acknowledgment
        if (message.type === 'WEBPAGE_TUNNEL_HANDSHAKE_ACK') {
            const pending = this.pendingRequests.get(message.id);
            if (pending) {
                clearTimeout(pending.timer);
                this.pendingRequests.delete(message.id);
                pending.resolve(undefined);
            }
            return;
        }
        // Handle response
        if (message.type === 'WEBPAGE_TUNNEL_RESPONSE') {
            const pending = this.pendingRequests.get(message.id);
            if (pending) {
                clearTimeout(pending.timer);
                this.pendingRequests.delete(message.id);
                if (message.error) {
                    pending.reject(new Error(message.error));
                }
                else {
                    pending.resolve(message.result);
                }
            }
        }
    }
    /**
     * Create a method that sends requests to the target window
     */
    createMethod(method) {
        return (params) => __awaiter(this, void 0, void 0, function* () {
            // Wait for connection if not connected
            if (!this.connected) {
                yield new Promise((resolve) => {
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
                        win.postMessage({
                            type: 'WEBPAGE_TUNNEL_REQUEST',
                            id,
                            method,
                            params,
                        }, this.targetOrigin);
                    }
                    catch (e) {
                        // Ignore individual postMessage errors; continue broadcasting
                    }
                }
            });
        });
    }
    /**
     * Get target windows based on targetWindow configuration
     */
    getTargets() {
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
    destroy() {
        window.removeEventListener('message', this.handleMessage);
        // Clear all pending requests silently
        for (const [, pending] of this.pendingRequests.entries()) {
            clearTimeout(pending.timer);
            // Silently reject to avoid unhandled promise rejection errors
            try {
                pending.reject(new Error('Request cancelled'));
            }
            catch (_a) {
                // Ignore errors during cleanup
            }
        }
        this.pendingRequests.clear();
        this.targetWindows = [];
        this.connected = false;
    }
}
const Request = RequestBase;

export { Request, serve };
//# sourceMappingURL=webpage-tunnel.esm.js.map
