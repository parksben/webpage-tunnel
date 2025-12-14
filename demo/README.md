# Chat Demo

A simple bidirectional chat application demonstrating cross-origin communication between two web pages using `webpage-tunnel`.

## What This Demo Shows

- **Cross-iframe messaging**: User A (parent page) and User B (iframe) exchange messages in real-time
- **Bidirectional communication**: Both sides can send and receive messages
- **Cross-origin setup**: Pages run on different ports (3001 and 3002) to simulate real-world scenarios

## Quick Start

Build the project and start the demo server:

```bash
npm run build
cd demo
node server.js
```

Open http://localhost:3001 in your browser. You'll see:
- **Left side**: User A's chat interface
- **Right side**: User B's chat interface (embedded via iframe)

Type messages in either side and hit "Send" to see real-time communication in action.

## How It Works

Both User A and User B use the same pattern:

```javascript
// Create API client to call the other side's methods
const api = new Request({
  server: 'http://localhost:3002',  // Target page URL
  methods: ['receiveMessage'],       // Methods to call
  timeout: 5000
});

// Expose methods for the other side to call
serve({
  receiveMessage: ({ message }) => {
    displayMessage(message);
    return { success: true };
  }
});

// Send a message
await api.receiveMessage({ message: 'Hello!' });
```

That's it! The library handles all the complexity of cross-origin iframe communication.
