<p align="center">
  <img src="conception.svg" width="80%">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/webpage-tunnel">
    <img src="https://img.shields.io/npm/v/webpage-tunnel?style=flat-square&label=Version" alt="npm version">
  </a>
  <a href="https://github.com/parksben/webpage-tunnel/stargazers">
    <img alt="GitHub stars" src="https://img.shields.io/github/stars/parksben/webpage-tunnel?style=flat-square&label=Stars">
  </a>
  <a href="https://github.com/parksben/webpage-tunnel/network/members">
    <img alt="GitHub forks" src="https://img.shields.io/github/forks/parksben/webpage-tunnel?style=flat-square&label=Forks">
  </a>
  <a href="https://www.npmjs.com/package/webpage-tunnel">
    <img alt="npm downloads" src="https://img.shields.io/npm/dw/webpage-tunnel?style=flat-square&label=Downloads">
  </a>
  <a href="https://github.com/parksben/webpage-tunnel/blob/main/LICENSE">
    <img alt="License" src="https://img.shields.io/github/license/parksben/webpage-tunnel?style=flat-square">
  </a>
</p>

<p align="center">English | <a href="README_ZH.md">简体中文</a></p>


# Webpage Tunnel

> A secure and elegant cross-iframe API communication library based on `postMessage`.

`webpage-tunnel` enables seamless, type-safe API calls between parent pages and iframes, eliminating the complexity of `postMessage` protocol handling. With just a few lines of code, you can establish a communication tunnel between pages.

## Use Cases

- 🔗 **Micro Frontends**: Communication between micro-applications
- 📦 **Third-party Integration**: Secure data exchange with embedded third-party pages
- 🎨 **Visual Editors**: Communication between canvas and preview iframes

## Features

- ✨ **Simple API**: Intuitive `serve()` and `Request` API design
- 🔒 **Type Safe**: Full TypeScript support with complete type inference
- ⚡ **High Performance**: Lightweight design (~2KB gzipped)
- 🎯 **Promise-based**: All API calls return Promises
- 🔧 **Error Handling**: Built-in timeout and error handling
- 🌐 **Cross-domain Support**: Secure communication across different domains
- 📦 **Multiple Formats**: Supports UMD, ESM, and CJS

## Demo

<https://webpage-tunnel.parksben.xyz>

## Table of Contents

- [Webpage Tunnel](#webpage-tunnel)
  - [Use Cases](#use-cases)
  - [Features](#features)
  - [Demo](#demo)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Quickstart](#quickstart)
    - [1. Embed Page](#1-embed-page)
    - [2. Expose Page API](#2-expose-page-api)
    - [3. Call Page API](#3-call-page-api)
  - [API Reference](#api-reference)
    - [serve(methods)](#servemethods)
    - [Request](#request)
    - [Type Definitions](#type-definitions)
      - [`ApiHandler<P, R>`](#apihandlerp-r)
      - [`RequestOptions`](#requestoptions)
      - [`Message<T>`](#messaget)
    - [Error Handling](#error-handling)
  - [Technical Overview](#technical-overview)
  - [Best Practices](#best-practices)
    - [1. Resource Cleanup with serve()](#1-resource-cleanup-with-serve)
    - [2. Type Safety](#2-type-safety)
    - [3. Error Handling](#3-error-handling)
    - [4. Resource Cleanup in Request](#4-resource-cleanup-in-request)
    - [5. Timeout Configuration](#5-timeout-configuration)
  - [License](#license)

## Installation

**NPM:**

```bash
npm install webpage-tunnel
# or
yarn add webpage-tunnel
# or
pnpm add webpage-tunnel
```

**CDN(UMD):**

```html
<script src="https://unpkg.com/webpage-tunnel/dist/webpage-tunnel.umd.js"></script>
<script>
  const { serve, Request } = window.WebpageTunnel;
</script>
```

**CDN(ESM):**

```html
<script type="module">
import { serve, Request } from 'https://unpkg.com/webpage-tunnel/dist/webpage-tunnel.esm.js';
</script>
```

## Quickstart

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

You can also embed both Page A and Page B into the same host page:

```html
<!-- Host Page HTML -->
<iframe src="https://a.com/profile"></iframe>
<iframe src="https://b.com/dashboard"></iframe>
```

The `webpage-tunnel` framework works correctly in all three scenarios.

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
const cleanup = serve({
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

// Clean up when page unloads
window.addEventListener('beforeunload', () => {
  cleanup();
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
try {
  const userInfo = await userApi.getUserInfo<RequestParams, ApiResponse<UserInfo>>(params);
  console.log('User Info:', userInfo.data);
  
  const playList = await userApi.getPlayList<RequestParams, ApiResponse<PlayListItem[]>>(params);
  console.log('Play List:', playList.data);
} catch (error) {
  console.error('API call failed:', error.message);
}
  
// Destroy Request instance when page unloads
window.addEventListener('beforeunload', () => {
  userApi.destroy();
});
```

## API Reference

### serve(methods)

Expose API methods to allow other pages to call them.

**Parameters:**

| Parameter | Type                         | Required | Description                   |
| --------- | ---------------------------- | -------- | ----------------------------- |
| `methods` | `Record<string, ApiHandler>` | ✅        | Object containing API methods |

**Return Value:**

`serve()` returns a cleanup function that removes the message event listener:

```typescript
const cleanup = serve(methods);

// Later, when you need to stop listening for messages
cleanup();  // Removes the message event listener
```

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

  -**Return Value:**
  -
  -`serve()` returns a cleanup function that removes the message event listener:
  -
  -```typescript
  -const cleanup = serve(methods);
  -
  -// Later, when you need to stop listening for messages
  -cleanup();  // Removes the message event listener
  -```
  }
});
```

**Notes:**

- `serve()` should only be called once per page
- Methods can be synchronous or asynchronous
- Methods receive a single `params` object parameter
- Methods can return any JSON-serializable value
- The cleanup function should be called when unloading the page or when no longer needed

---

### Request

Create an API client to call remote page methods.

**Constructor Parameters:**

| Parameter           | Type       | Required | Default | Description                                                                                  |
| ------------------- | ---------- | -------- | ------- | -------------------------------------------------------------------------------------------- |
| `options.server`    | `string`   | ✅        | -       | Target page URL (must include protocol and domain)                                           |
| `options.methods`   | `string[]` | ✅        | -       | List of API method names to call                                                             |
| `options.timeout`   | `number`   | ❌        | `30000` | Request timeout in milliseconds                                                              |
| `options.connectionTimeout` | `number` | ❌ | `5000` | Maximum time (in milliseconds) to wait for connection establishment |
| `options.targetWindow` | `Window`   | ❌        | -       | Specific target window for multiple matching iframes. If omitted, broadcasts to all matching iframes |

**Instance Methods:**

Request instances dynamically add methods based on `options.methods`. Each method returns a `Promise`.

| Method                                       | Description                               |
| -------------------------------------------- | ----------------------------------------- |
| `[methodName]<P, R>(params?: P): Promise<R>` | Call remote API with generic type support. Will automatically wait for connection if not yet established |
| `destroy(): void`                            | Destroy instance and cleanup resources    |

**Example:**

```typescript
import { Request } from 'webpage-tunnel';

// Create Request instance (broadcast to all matching iframes)
const api = new Request({
  server: 'https://example.com/page',
  methods: ['getUser', 'updateUser', 'deleteUser'],
  timeout: 5000,
  connectionTimeout: 3000  // Wait up to 3s for connection
});

// Create Request instance targeting a specific iframe
const iframe = document.querySelector('iframe');
const apiSpecific = new Request({
  server: 'https://example.com/page',
  methods: ['getUser', 'updateUser', 'deleteUser'],
  targetWindow: iframe?.contentWindow || undefined
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

| Generic Parameter | Description    |
| ----------------- | -------------- |
| `P`               | Parameter type |
| `R`               | Return type    |

---

#### `RequestOptions`

Request constructor configuration options.

```typescript
interface RequestOptions {
  server: string;             // Target page URL
  methods: string[];          // List of API method names
  timeout?: number;           // Request timeout in milliseconds (default: 30000)
  connectionTimeout?: number; // Connection timeout in milliseconds (default: 5000)
  targetWindow?: Window;      // Specific target window (optional)
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

| Error Message               | Description                                        | Solution                                                 |
| --------------------------- | -------------------------------------------------- | -------------------------------------------------------- |
| `Connection timeout after [time]ms` | Connection establishment timeout       | Increase `connectionTimeout` or ensure target page loads correctly |
| `Handshake timeout with [server]` | Handshake with target page timeout     | Check if target page calls `serve()` correctly           |
| `No target window found for [server]` | Target iframe not found or inaccessible | Ensure iframe is loaded and accessible                |
| `Request timeout: [method]` | API call timeout                                   | Increase `timeout` or optimize server response           |
| `Method [method] not found` | Called method not registered on server             | Confirm method is defined in `serve()`                   |
| `Request cancelled`         | Request cancelled (usually by calling `destroy()`) | Normal behavior, no action needed                        |

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

<img width="956" height="966" alt="Technical Overview" src="https://github.com/user-attachments/assets/b4efe19c-704e-445c-a332-4f29b5da70b0" />

## Best Practices

### 1. Resource Cleanup with serve()

Always store and call the cleanup function returned by `serve()` when the page unloads

```typescript
// Store the cleanup function
const cleanup = serve({
  getUserInfo: async (params) => {
    // Implementation
  },
  getPlayList: async (params) => {
    // Implementation
  }
});

// Call cleanup when page unloads or service is no longer needed
window.addEventListener('beforeunload', () => {
  cleanup();  // Removes the message event listener
});

// Or in a cleanup function (React/Vue)
onUnmounted(() => {
  cleanup();
});
```

**Why this matters:**

- Prevents memory leaks by removing event listeners
- Ensures proper resource management in single-page applications
- Avoids potential issues when pages are reloaded or navigated away

---

### 2. Type Safety

Use TypeScript and define explicit types for API methods

```typescript
interface GetUserParams { id: string }
interface UserResponse { id: string; name: string }

const user = await api.getUser<GetUserParams, UserResponse>({ id: '123' });
```

---

### 3. Error Handling

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

### 4. Resource Cleanup in Request

Call `destroy()` promptly when Request instances are no longer needed

```typescript
// On component unmount
componentWillUnmount() {
  this.api.destroy();
}
```

---

### 5. Timeout Configuration

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
