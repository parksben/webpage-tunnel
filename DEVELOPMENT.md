# Development

## Installation

```bash
npm install
```

## Build

```bash
npm run build
```

## Test

```bash
npm test
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage
```

## Code Quality

```bash
npm run format  # Format code with Biome
npm run lint    # Lint code with Biome
npm run check   # Check and fix code
```

## Project Structure

```text
webpage-tunnel/
├── src/                # Source code (TypeScript)
│   ├── index.ts       # Main entry point
│   ├── serve.ts       # Server API implementation
│   ├── Request.ts     # Client API implementation
│   └── types.ts       # Type definitions
├── test/              # Unit tests (Jest)
│   ├── serve.test.ts
│   ├── Request.test.ts
│   └── index.test.ts
├── dist/              # Build output
│   ├── *.cjs.js      # CommonJS module
│   ├── *.esm.js      # ES module
│   ├── *.umd.js      # UMD module
│   └── *.d.ts        # TypeScript declarations
└── package.json
```

## Technical Principles

```mermaid
sequenceDiagram
    autonumber
    participant B as Page B (Caller)
    participant A as Page A (Server)

    Note over B: Initialize Request({ server, methods, timeout })
    B->>A: postMessage: Handshake Request (HANDSHAKE)
    A-->>B: postMessage: Handshake Acknowledgment (HANDSHAKE_ACK)
    Note over B,A: Channel established, start API calls

    rect rgb(245, 248, 255)
    B->>A: postMessage: API Request (REQUEST: method, params, id)
    A->>A: serve(methods)[method](params)
    A-->>B: postMessage: API Response (RESPONSE: result | error, id)
    end

    alt Timeout/Error
      B->>B: Timeout triggered/Error caught (reject)
    else Success
      B->>B: Promise resolve, process response data
    end
```
