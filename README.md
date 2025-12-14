# Webpage Tunnel

[![npm version](https://img.shields.io/npm/v/webpage-tunnel.svg)](https://www.npmjs.com/package/webpage-tunnel)
[![license](https://img.shields.io/npm/l/webpage-tunnel.svg)](https://github.com/yourusername/webpage-tunnel/blob/main/LICENSE)
[![downloads](https://img.shields.io/npm/dm/webpage-tunnel.svg)](https://www.npmjs.com/package/webpage-tunnel)

![Webpage Tunnel](./logo.svg)

[中文文档](./README_ZH.md)

> A secure and elegant cross-iframe API communication library based on `postMessage`.

`webpage-tunnel` enables seamless, type-safe API calls between parent pages and iframes, eliminating the complexity of `postMessage` protocol handling. With just a few lines of code, you can establish a communication tunnel between pages.

## Use Cases

- 🔗 **Micro Frontends**: Communication between micro-applications
- 📦 **Third-party Integration**: Secure data exchange with embedded third-party pages
- 🎨 **Visual Editors**: Communication between canvas and preview iframes
- 💬 **Chat Systems**: Real-time messaging between parent and iframe chat windows
- 🎮 **Game Embedding**: API calls between game containers and game iframes

## Features

- ✨ **Simple API**: Intuitive `serve()` and `Request` API design
- 🔒 **Type Safe**: Full TypeScript support with complete type inference
- ⚡ **High Performance**: Lightweight with no dependencies (~2KB gzipped)
- 🎯 **Promise-based**: All API calls return Promises
- 🔧 **Error Handling**: Built-in timeout and error handling
- 🌐 **Cross-domain Support**: Secure communication across different domains
- 📦 **Multiple Formats**: Supports UMD, ESM, and CJS

## Installation

**NPM:**

```bash
npm install webpage-tunnel
# or
yarn add webpage-tunnel
# or
pnpm add webpage-tunnel
```

**CDN for Browser:**

```html
<script src="https://unpkg.com/webpage-tunnel/dist/webpage-tunnel.umd.js"></script>
<script>
  const { serve, Request } = window.WebpageTunnel;
</script>
```

**CDN for ES Module:**

```html
<script type="module">
import { serve, Request } from 'https://unpkg.com/webpage-tunnel/dist/webpage-tunnel.esm.js';
</script>
```

## Quick Start

### 1. Embed Page

Use iframe to embed Page A into Page B:

```html
<!-- Page B HTML -->
<iframe src="https://a.com/profile"></iframe>
```

Alternatively, you can use iframe to embed Page B into Page A:

```html
<!-- Page A HTML -->
<iframe src="https://b.com/dashboard"></iframe>
```

The `webpage-tunnel` framework works correctly in both scenarios.

### 2. Expose Page API

Use the `serve()` method in Page A to expose APIs (with types):

```typescript
// Page A: profile page (https://a.com/profile)
import { serve } from 'webpage-tunnel';

interface ApiResponse<T> {
  status: number;
  message: string;
  data?: T;
}

interface RequestParams { userId: string }
interface UserInfo { id: string; name: string; email: string; avatar: string }
interface PlayListItem { id: string; title: string; cover: string }

// Expose API methods using serve()
serve({
  getUserInfo: async ({ userId }: RequestParams): Promise<ApiResponse<UserInfo>> => {
    const { data } = await fetch(`/api/user/${userId}/info`).then(res => res.json());
    return {
      status: 1,
      message: 'Success',
      data: {
        id: userId,
        name: data.name,
        email: data.email,
        avatar: data.avatar,
      },
    };
  },
  getPlayList: async ({ userId }: RequestParams): Promise<ApiResponse<PlayListItem[]>> => {
    const { data } = await fetch(`/api/user/${userId}/playList`).then(res => res.json());
    if (Array.isArray(data) && data.length > 0) {
      return { status: 1, message: 'Success', data };
    }
    return { status: 0, message: 'Play list is empty', data: [] };
  },
});
```

### 3. Call Page API

Use a `Request` instance in Page B to call the APIs exposed in Page A (with generics):

```typescript
// Page B: dashboard page (https://b.com/dashboard)
import { Request } from 'webpage-tunnel';

// Reuse types from above: ApiResponse, RequestParams, UserInfo, PlayListItem

// Create Request instance
const userApi = new Request({
  server: 'https://a.com/profile',              // Target page URL
  methods: ['getUserInfo', 'getPlayList'],      // List of API methods to call
  timeout: 10 * 1000,                           // Optional: request timeout (ms)
});

// Define request parameters
const params: RequestParams = { userId: '123' };

// Call API methods
userApi
  .getUserInfo<RequestParams, ApiResponse<UserInfo>>(params)
  .then(({ data }) => {
    console.log('User Info:', data);
  })
  .catch((error) => {
    console.error(error);
  });

userApi
  .getPlayList<RequestParams, ApiResponse<PlayListItem[]>>(params)
  .then(({ data }) => {
    console.log('Play List:', data);
  })
  .catch((error) => {
    console.error(error);
  });
```

### Demo Example

The project includes a complete bidirectional communication demo:

[View Demo](https://yourusername.github.io/webpage-tunnel/demo/)

## API Reference

### serve(methods)

Expose API methods to allow other pages to call them.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `methods` | `Record<string, ApiHandler>` | ✅ | Object containing API methods |

**ApiHandler Type:**

```typescript
type ApiHandler<P = any, R = any> = (params: P) => R | Promise<R>
```

**Example:**

```typescript
import { serve } from 'webpage-tunnel';

serve({
  // Synchronous method
  add(params: { a: number; b: number }) {
    return params.a + params.b;
  },
  
  // Asynchronous method
  async fetchData(params: { url: string }) {
    const response = await fetch(params.url);
    return response.json();
  },
  
  // Method with complex types
  async processUser(params: { user: User }) {
    // Process user data
    return { success: true, user: params.user };
  }
});
```

**Notes:**

- `serve()` should only be called once per page
- Methods can be synchronous or asynchronous
- Methods receive a single `params` object parameter
- Methods can return any JSON-serializable value

---

### Request

Create an API client to call remote page methods.

**Constructor Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `options.server` | `string` | ✅ | - | Target page URL (must include protocol and domain) |
| `options.methods` | `string[]` | ✅ | - | List of API method names to call |
| `options.timeout` | `number` | ❌ | `30000` | Request timeout in milliseconds |

**Instance Methods:**

Request instances dynamically add methods based on `options.methods`. Each method returns a `Promise`.

| Method | Description |
|--------|-------------|
| `[methodName]<P, R>(params?: P): Promise<R>` | Call remote API with generic type support |
| `destroy(): void` | Destroy instance and cleanup resources |

**Example:**

```typescript
import { Request } from 'webpage-tunnel';

// Create Request instance
const api = new Request({
  server: 'https://example.com/page',
  methods: ['getUser', 'updateUser', 'deleteUser'],
  timeout: 5000
});

// Call method with types
interface User {
  id: string;
  name: string;
}

const user = await api.getUser<{ id: string }, User>({ id: '123' });
console.log(user.name);

// Call method without types
const result = await api.updateUser({ id: '123', name: 'John' });

// Destroy instance
api.destroy();
```

---

### Type Definitions

#### `ApiHandler<P, R>`

API handler function type.

```typescript
type ApiHandler<P = any, R = any> = (params: P) => R | Promise<R>
```

| Generic Parameter | Description |
|-------------------|-------------|
| `P` | Parameter type |
| `R` | Return type |

---

#### `RequestOptions`

Request constructor configuration options.

```typescript
interface RequestOptions {
  server: string;      // Target page URL
  methods: string[];   // List of API method names
  timeout?: number;    // Timeout in milliseconds
}
```

---

#### `Message<T>`

Internal communication message structure (for advanced users).

```typescript
interface Message<T = any> {
  type: MessageType;   // Message type
  id: string;          // Unique message ID
  method?: string;     // API method name
  params?: T;          // Request parameters
  result?: any;        // Response result
  error?: string;      // Error message
}
```

---

### Error Handling

All methods called through Request return Promises, so you can use `try-catch` or `.catch()` to handle errors:

**Common Errors:**

| Error Message | Description | Solution |
|---------------|-------------|----------|
| `Handshake timeout` | Connection timeout with target page | Check if target page loads correctly and calls `serve()` |
| `Request timeout: [method]` | API call timeout | Increase `timeout` or optimize server response |
| `Method [method] not found` | Called method not registered on server | Confirm method is defined in `serve()` |
| `Request cancelled` | Request cancelled (usually by calling `destroy()`) | Normal behavior, no action needed |

**Example:**

```typescript
try {
  const data = await api.getData({ id: '123' });
  console.log(data);
} catch (error) {
  if (error.message.includes('timeout')) {
    console.error('Request timeout, please try again');
  } else if (error.message.includes('not found')) {
    console.error('API method not found');
  } else {
    console.error('Request failed:', error.message);
  }
}
```

---

## Technical Overview

Based on the browser's native `postMessage` mechanism, `webpage-tunnel` establishes a secure communication channel between two pages. Through message passing, it implements method invocation and data exchange, ensuring data security and integrity in cross-domain environments.

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

## Best Practices

### 1. Type Safety

Use TypeScript and define explicit types for API methods

```typescript
interface GetUserParams { id: string }
interface UserResponse { id: string; name: string }

const user = await api.getUser<GetUserParams, UserResponse>({ id: '123' });
```

---

### 2. Error Handling

Always add error handling for API calls

```typescript
serve({
  async getData(params) {
    try {
      return await fetchData(params);
    } catch (error) {
      return { error: error.message };
    }
  }
});
```

---

### 3. Resource Cleanup

Call `destroy()` promptly when no longer needed

```typescript
// On component unmount
componentWillUnmount() {
  this.api.destroy();
}
```

---

### 4. Timeout Configuration

Set timeout appropriately based on network conditions

```typescript
const api = new Request({
  server: 'https://example.com',
  methods: ['heavyOperation'],
  timeout: 60000  // Longer timeout for heavy operations
});
```

---

## License

[MIT License](./LICENSE)
