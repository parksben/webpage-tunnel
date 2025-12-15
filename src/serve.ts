import type { ApiMethods, Message, MessageType } from './types';

/**
 * Expose local APIs to be called by other pages via postMessage
 * @param methods - Object containing API methods to expose
 */
export function serve(methods: ApiMethods) {
  const handleMessage = async (event: MessageEvent) => {
    const message = event.data as Message;

    // Handle handshake
    if (message.type === ('WEBPAGE_TUNNEL_HANDSHAKE' as MessageType)) {
      (event.source as Window)?.postMessage(
        {
          type: 'WEBPAGE_TUNNEL_HANDSHAKE_ACK',
          id: message.id,
        },
        event.origin
      );
      return;
    }

    // Handle API requests
    if (message.type === ('WEBPAGE_TUNNEL_REQUEST' as MessageType)) {
      const { id, method, params } = message;

      if (!method || !methods[method]) {
        (event.source as Window)?.postMessage(
          {
            type: 'WEBPAGE_TUNNEL_RESPONSE',
            id,
            error: `Method ${method} not found`,
          },
          event.origin
        );
        return;
      }

      try {
        const result = await methods[method](params);
        (event.source as Window)?.postMessage(
          {
            type: 'WEBPAGE_TUNNEL_RESPONSE',
            id,
            result,
          },
          event.origin
        );
      } catch (error) {
        (event.source as Window)?.postMessage(
          {
            type: 'WEBPAGE_TUNNEL_RESPONSE',
            id,
            error: error instanceof Error ? error.message : String(error),
          },
          event.origin
        );
      }
    }
  };

  window.addEventListener('message', handleMessage);

  return () => {
    window.removeEventListener('message', handleMessage);
  };
}
