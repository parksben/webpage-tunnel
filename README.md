# Webpage Tunnel

[![npm version](https://img.shields.io/npm/v/webpage-tunnel.svg)](https://www.npmjs.com/package/webpage-tunnel)
[![npm downloads](https://img.shields.io/npm/dm/webpage-tunnel.svg)](https://www.npmjs.com/package/webpage-tunnel)
[![license](https://img.shields.io/npm/l/webpage-tunnel.svg)](https://www.npmjs.com/package/webpage-tunnel)

One efficient framework for implement two-way communication between webpages in browser.

## 主要功能

1. 不同页面间的双向通信：

* 网页即服务（Webpage as Service）：通过工厂函数 `serve()` 将网页中的功能、逻辑封装为可远程调用的 API
* 远程过程调用（Remote Procedure Call）：通过工具类 `Request` 实现 API 的远程调用
* 通过网页间 API 的相互调用可实现不同站点间的双向通信

2. 支持流式通信：

* 通过工厂函数 `serveSSE` 实现类似服务器发送事件（Server-Sent Events, SSE）的流式 API
* 通过工厂类 `RequestSSE` 实现流式 API 的远程调用

## 技术原理

基于浏览器端 postMessage API 实现网页间通信

## Install

NPM

```bash
npm install webpage-tunnel
```

CDN

```html
<script src="https://unpkg.com/webpage-tunnel/dist/webpage-tunnel.umd.js"></script>
<!-- Via global variable `WebpageTunnel` -->
```

## QuickStart

### 在服务端网页中使用 `provide()` 封装远程 API

```typescript
// user-service.ts for page https://b.com/profile
import { serve } from 'webpage-tunnel';

interface RequestParams {
  userId: string
}

serve({
  getUserInfo: ({ userId }: RequestParams) => {
    const dom = document.querySelector('.user-info');
    if (dom instanceof HTMLElement === false) {
      return {
        status: 0,
        message: 'User info not found',
      }
    }
    return {
      status: 1,
      message: 'Success',
      data: {
        id: userId,
        name: dom.querySelector('.name')?.textContent || '',
        email: dom.querySelector('.email')?.textContent || '',
        avatar: (dom.querySelector('.avatar') as HTMLImageElement)?.src || '',
      },
    }
  },
  getPlayList: async ({ userId }: RequestParams) => {
    const { data } = await fetch(`/api/user/${userId}/playList`).then(res => res.json());
    if (Array.isArray(data) && data.length > 0) {
      return {
        status: 1,
        message: 'Success',
        data,
      }
    }
    return {
      status: 0,
      message: 'Play list is empty',
      data: [],
    }
  },
})
```

### 在客户端网页中使用 `Request` 调用远程 API

```typescript
// user-client.ts for page https://a.com/user-client
import { Request } from 'webpage-tunnel';

interface UserInfo {
  id: string
  name: string
  email: string
  avatar: string
}
interface PlayListItem {
  id: string
  title: string
  cover: string
}
interface ApiResponse<T> {
  status: number
  message: string
  data?: T
}
interface RequestParams {
  userId: string
}

const userApi = new Request({
  server: 'https://b.com/profile', // the page where serve is called
  methods: ['getUserInfo', 'getPlayList'], // specify the methods to be called remotely
  timeout: 10 * 1000, // the request timeout
});

userApi
  .getUserInfo<RequestParams, ApiResponse<UserInfo>>(params)
  .then(({ data }) => {
    console.log('User Info:', data);
  })
  .catch((error) => {
    console.error(error);
  })

userApi
  .getPlayList<RequestParams, ApiResponse<PlayListItem[]>>(params)
  .then(({ data }) => {
    console.log('Play List:', data);
  })
  .catch((error) => {
    console.error(error);
  })
```

### 在服务端网页中使用 `serveSSE()` 封装流式 API

```typescript
// chat-service.ts for page https://b.com/chat
import { type SSEController, serveSSE } from 'webpage-tunnel';

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

serveSSE({
  chat: (messages: ChatMessage[], controller: SSEController) => {
    const responses = [
      'Hello! How can I help you?',
      'I am a chatbot.',
      'What is your name?',
      'Nice to meet you!',
      'Goodbye!',
    ];
    let index = 0;

    const intervalId = setInterval(() => {
      if (index < responses.length) {
        controller.enqueue(responses[index]); // trigger onProgress callback in client
        index += 1;
      } else {
        clearInterval(intervalId);
        controller.close(); // trigger onComplete callback in client
      }
    }, 300);

    // Handle cancellation from client
    return () => {
      clearInterval(intervalId);
      controller.cancel();
    };
  },
})
```

### 在客户端网页中使用 `RequestSSE` 调用流式 API

```typescript
// chat-client.ts for page https://a.com/chat-client
import { EventType, RequestSSE, SSEEvent } from 'webpage-tunnel';

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const chatApi = new RequestSSE({
  server: 'https://b.com/chat', // the page where serveSSE is called
  methods: ['chat'], // specify the methods to be called remotely
});

const messages: ChatMessage[] = [
  { role: 'user', content: 'Hello!' },
];

const handler = ({ type, data, error }: SSEEvent) => {
  if (type === EventType.Start) {
    console.log('Chat started');
    return;
  }
  if (type === EventType.Progress) {
    console.log('Chat progress:', data);
    return;
  }
  if (type === EventType.Complete) {
    console.log('Chat completed');
    return;
  }
  if (type === EventType.Cancel) {
    console.log('Chat cancelled');
    return;
  }
  if (type === EventType.Error) {
    console.error('Chat error:', error.message);
    return;
  }
}

const task = chatApi.chat<ChatMessage[], string>(messages, handler);

setTimeout(() => {
  task.cancel();
  console.log('Chat cancelled');
}, 10 * 1000);
```