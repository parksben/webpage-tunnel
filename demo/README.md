# Chat Demo

A simple bidirectional chat application demonstrating cross-origin communication between two web pages using `webpage-tunnel`.

![Demo Runtime](./screenshot.png)

## What This Demo Shows

- **Cross-iframe messaging**: User A (parent page) and User B (iframe) exchange messages in real-time
- **Bidirectional communication**: Both sides can send and receive messages
- **Cross-origin setup**: Pages run on different ports (3001 and 3002) to simulate real-world scenarios

## Quick Start

1. Download the contents of this directory to local.

2. Run the demo app in your local directory.

```bash
node server.js
```

3. Open http://localhost:3001 in your browser. You'll see:
- **Left side**: User A's chat interface
- **Right side**: User B's chat interface (embedded via iframe)

4. Type messages in either side and hit "Send" to see real-time communication in action.
