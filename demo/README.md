# Chat Demo

![Chat Demo](./screenshot.png)

A simple bidirectional chat application demonstrating cross-origin communication between two web pages using `webpage-tunnel`.

## What This Demo Shows

- **Cross-iframe messaging**: User A (parent page) and User B (iframe) exchange messages in real-time
- **Bidirectional communication**: Both sides can send and receive messages
- **Cross-origin setup**: Pages run on different ports (3001 and 3002) to simulate real-world scenarios

## Quick Start

1. Start the demo server:

```bash
node server.js
```

2. Open http://localhost:3001 in your browser. You'll see:
- **Left side**: User A's chat interface
- **Right side**: User B's chat interface (embedded via iframe)

3. Type messages in either side and hit "Send" to see real-time communication in action.
