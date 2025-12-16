# Webpage Tunnel Demo

[English](./README.md) | 简体中文

## 主要功能

本示例演示了一个**实时聊天系统**，包含三个相互连接的页面：

- **主页面**：消息中心，监控所有通信，并可向 iframe 页面广播消息
- **页面 A（Iframe）**：聊天界面，可以向页面 B 发送消息
- **页面 B（Iframe）**：聊天界面，可以向页面 A 发送消息

核心功能：

- Iframe 间通信（A 和 B 之间直接消息传递）
- 父到子通信（主页面向 iframe 广播）
- 子到父通信（iframe 向主页面记录日志）

## 运行示例

1. 下载本目录下的全部内容到本地

2. 在本地目录下执行 `server.js` 脚本以启动服务器

   ```bash
   node server.js
   ```

3. 服务启动后，浏览器会自动访问 <http://localhost:5000>