# Webpage Tunnel Demo

English | [中文文档](./README_ZH.md)

![Demo Screenshot](./screenshot.png)

## Main Features of This Demo

This demo demonstrates a **real-time chat system** with three interconnected pages:

- **Host Page**: Message center that monitors all communication and can broadcast messages to iframe pages
- **Page A (Iframe)**: Chat interface that can send messages to Page B
- **Page B (Iframe)**: Chat interface that can send messages to Page A

Key features:

- Iframe-to-iframe communication (direct messaging between A and B)
- Parent-to-child communication (host broadcasts to iframes)
- Child-to-parent communication (iframes log messages to host)

## How to Run This Project

1. Download all contents of this directory to your local machine

2. Execute the `server.js` script in the local directory to start the server

   ```bash
   node server.js
   ```

3. After the server starts, your browser will automatically open: <http://localhost:5000>
