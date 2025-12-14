const { Request, serve } = window.WebpageTunnel;

const chatBox = document.getElementById('chatBox');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

// Add message to chat window
function addMessage(text, type) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;
  
  const textDiv = document.createElement('div');
  textDiv.textContent = text;
  
  const metaDiv = document.createElement('div');
  metaDiv.className = 'message-meta';
  metaDiv.textContent = new Date().toLocaleTimeString();
  
  messageDiv.appendChild(textDiv);
  messageDiv.appendChild(metaDiv);
  chatBox.appendChild(messageDiv);
  
  // Scroll to bottom
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Create Request instance to connect to User A
const userAAPI = new Request({
  server: 'http://localhost:3001',
  methods: ['receiveMessage'],
  timeout: 5000
});

// Expose API for User A to call
serve({
  // Receive message from User A
  receiveMessage: ({ message }) => {
    addMessage(message, 'received');
    return { success: true, timestamp: Date.now() };
  }
});

// Send message to User A
async function sendMessage() {
  const message = messageInput.value.trim();
  
  if (!message) {
    return;
  }
  
  // Display sent message locally
  addMessage(message, 'sent');
  messageInput.value = '';
  
  try {
    // Send message to User A via webpage-tunnel
    const result = await userAAPI.receiveMessage({ message });
    console.log('Message sent successfully:', result);
  } catch (error) {
    console.error('Failed to send message:', error);
    addMessage('❌ Failed to send: ' + error.message, 'error');
  }
}

// Event listeners
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});
