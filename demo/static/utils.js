import { Request, serve } from './webpage-tunnel.js';

/**
 * Shared utilities for chat demo pages
 */

/**
 * Add message to chat window
 * @param {HTMLElement} chatBox - The chat box element
 * @param {string} text - Message text
 * @param {string} type - Message type: 'sent', 'received', or 'error'
 */
export function addMessage(chatBox, text, type) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;

  const textDiv = document.createElement('div');
  textDiv.textContent = text;

  const metaDiv = document.createElement('div');
  metaDiv.className = 'message-meta';
  metaDiv.textContent = new Date().toLocaleTimeString();

  messageDiv.appendChild(textDiv);
  messageDiv.appendChild(metaDiv);
  chatBox.appendChild(messageDiv);

  // Scroll to bottom
  chatBox.scrollTop = chatBox.scrollHeight;
}

/**
 * Setup chat page with serve and request
 * @param {Object} config - Configuration object
 * @param {HTMLElement} config.chatBox - Chat box element
 * @param {string} config.targetPage - Target page URL (a.html or b.html)
 * @returns {Object} - Returns { api, parentApi, cleanup }
 */
export function setupChat({ chatBox, targetPage }) {
  // Expose API using serve()
  const cleanup = serve({
    receiveMessage: ({ message }) => {
      addMessage(chatBox, message, 'received');
      return { success: true, timestamp: Date.now() };
    },
    receiveSystemMessage: ({ message }) => {
      addMessage(chatBox, `📢 ${message}`, 'system');
      return { success: true, timestamp: Date.now() };
    },
  });

  // Create Request instance for peer-to-peer communication
  const api = new Request({
    server: targetPage,
    methods: ['receiveMessage'],
    timeout: 10000,
    connectionTimeout: 10000,
  });

  // Create Request instance for parent page communication
  const parentApi = new Request({
    server: 'http://localhost:5000/',
    methods: ['logMessage'],
    timeout: 10000,
    connectionTimeout: 10000,
  });

  return { api, parentApi, cleanup };
}

/**
 * Send message handler
 * @param {Object} config - Configuration object
 * @param {HTMLElement} config.chatBox - Chat box element
 * @param {HTMLInputElement} config.messageInput - Message input element
 * @param {Object} config.api - Request API instance for peer communication
 * @param {Object} config.parentApi - Request API instance for parent page
 * @param {string} config.pageName - Current page name for logging
 */
export async function handleSendMessage({ chatBox, messageInput, api, parentApi, pageName }) {
  const message = messageInput.value.trim();

  if (!message) {
    return;
  }

  // Display sent message locally
  addMessage(chatBox, message, 'sent');
  messageInput.value = '';

  try {
    // Send message via webpage-tunnel to peer
    await api.receiveMessage({ message });

    // Log to parent page
    if (parentApi) {
      try {
        await parentApi.logMessage({ message, from: pageName });
      } catch (error) {
        // Silently fail if parent is not available
      }
    }
  } catch (error) {
    addMessage(chatBox, `❌ Failed to send: ${error.message}`, 'error');
  }
}

/**
 * Setup cleanup on page unload
 * @param {Function} cleanup - Cleanup function from serve()
 * @param {Object} api - Request API instance
 * @param {Object} parentApi - Parent Request API instance
 */
export function setupCleanup(cleanup, api, parentApi) {
  window.addEventListener('beforeunload', () => {
    cleanup();
    api.destroy();
    if (parentApi) {
      parentApi.destroy();
    }
  });
}
