/**
 * Common types and interfaces for webpage-tunnel
 */

/**
 * Message type for postMessage communication
 */
export enum MessageType {
  REQUEST = 'WEBPAGE_TUNNEL_REQUEST',
  RESPONSE = 'WEBPAGE_TUNNEL_RESPONSE',
  HANDSHAKE = 'WEBPAGE_TUNNEL_HANDSHAKE',
  HANDSHAKE_ACK = 'WEBPAGE_TUNNEL_HANDSHAKE_ACK',
}

/**
 * Message structure for postMessage
 */
export interface Message<T = any> {
  type: MessageType;
  id: string;
  method?: string;
  params?: T;
  result?: any;
  error?: string;
}

/**
 * API handler function type
 */
export type ApiHandler<P = any, R = any> = (params: P) => R | Promise<R>;

/**
 * API method collection
 */
export type ApiMethods = Record<string, ApiHandler>;

/**
 * Request configuration options
 */
export interface RequestOptions {
  server: string;
  methods: string[];
  timeout?: number;
  /**
   * Optional target window for multiple matching iframes.
   * If specified, only this specific window will be targeted.
   * If omitted, all matching iframes will receive the request (broadcast).
   */
  targetWindow?: Window;
}

/**
 * Request method type - dynamically adds methods based on configuration
 */
export type RequestMethod<P = any, R = any> = (params?: P) => Promise<R>;
