# Webpage Tunnel Demo

A simple bidirectional chat application demonstrating iframe-to-iframe communication using `webpage-tunnel`.

## What This Demo Shows

- **Iframe-to-iframe messaging**: Two iframes (Page A and Page B) embedded in the same host page can communicate directly
- **Bidirectional communication**: Both pages expose APIs using `serve()` and call each other using `Request`
- **Real-time chat**: Messages sent from one page appear instantly in the other
- **Resource cleanup**: Proper cleanup of event listeners and Request instances

## File Structure

```
demo/
├── pages/
│   ├── index.html   # Host page that embeds both iframe pages
│   ├── a.html       # Page A - Chat interface with inline JavaScript
│   ├── b.html       # Page B - Chat interface with inline JavaScript
│   └── style.css    # Shared styles for both pages
├── server.js        # Static file server (port 5000)
└── README.md        # This file
```

## How It Works

1. **pages/index.html**: The host page that embeds `a.html` and `b.html` side-by-side using iframes. Contains no JavaScript logic.

2. **pages/a.html**: 
   - Uses `serve()` to expose a `receiveMessage` API
   - Creates a `Request` instance to call Page B's API
   - Sends messages to Page B when user clicks "Send"

3. **pages/b.html**: 
   - Uses `serve()` to expose a `receiveMessage` API
   - Creates a `Request` instance to call Page A's API
   - Sends messages to Page A when user clicks "Send"

4. **Communication flow**:
   - Page A ➔ `Request.receiveMessage()` ➔ Page B's `serve({ receiveMessage })`
   - Page B ➔ `Request.receiveMessage()` ➔ Page A's `serve({ receiveMessage })`

## Quick Start

1. Install dependencies (if needed):

```bash
npm install
```

2. Run the demo server:

```bash
node demo/server.js
```

3. Open http://localhost:5000 in your browser

4. You'll see two chat interfaces side by side. Type a message in either side and click "Send" to see real-time communication between the two iframes.

## Key Code Patterns

### Exposing APIs with serve()

```javascript
const cleanup = serve({
  receiveMessage: ({ message }) => {
    // Handle incoming message
    addMessage(message, 'received');
    return { success: true, timestamp: Date.now() };
  },
});
```

### Calling Remote APIs with Request

```javascript
const api = new Request({
  server: 'http://localhost:5000/b.html',
  methods: ['receiveMessage'],
  timeout: 5000,
});

// Call the remote API
await api.receiveMessage({ message: 'Hello!' });
```

### Resource Cleanup

```javascript
window.addEventListener('beforeunload', () => {
  cleanup();       // Clean up serve() listener
  api.destroy();   // Clean up Request instance
});
```

## Notes

- All JavaScript code is embedded directly in the HTML files for simplicity
- The demo uses the UMD build from unpkg CDN: `//unpkg.com/webpage-tunnel/dist/webpage-tunnel.umd.js`
- Both pages run on the same origin (localhost:5000) but communicate through iframes
- Messages are displayed with timestamps and proper styling
