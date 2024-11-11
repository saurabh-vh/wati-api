require('dotenv').config();
const express = require('express');
const app = express();
const port = 3000;
const axios = require('axios');
// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.json());
const BEARER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlY2NmMTljNy05MmIyLTQyYTgtOWM2OS0wYjFkNzUxNDdiMjUiLCJ1bmlxdWVfbmFtZSI6Im5pc2hhbnQudmlydHVhbGhvbWVzQGdtYWlsLmNvbSIsIm5hbWVpZCI6Im5pc2hhbnQudmlydHVhbGhvbWVzQGdtYWlsLmNvbSIsImVtYWlsIjoibmlzaGFudC52aXJ0dWFsaG9tZXNAZ21haWwuY29tIiwiYXV0aF90aW1lIjoiMTEvMTEvMjAyNCAwODoxMTo1OSIsImRiX25hbWUiOiJ3YXRpX2FwcF90cmlhbCIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6IlRSSUFMIiwiZXhwIjoxNzMxOTc0NDAwLCJpc3MiOiJDbGFyZV9BSSIsImF1ZCI6IkNsYXJlX0FJIn0.A7S2BBSRhmXqoyHWenRFRyujx50eD_wibBBdUWVaIOw';
// Sample data (collection)
let items = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' }
];
    
// GET endpoint - Retrieve all items
app.get('/api/items', (req, res) => {
    res.json(items);
});

// GET endpoint - Retrieve a single item by ID
app.get('/api/items/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const item = items.find(i => i.id === id);

    if (item) {
        res.json(item);
    } else {
        res.status(404).json({ message: 'Item not found' });
    }
});
let lastUserMsg = null; // Variable to store the last message

const callGETapi = async () => {
    try {
        console.log("called");
        const getMessagesResponse = await axios.get(
            'https://app-server.wati.io/api/v1/getMessages/919653188918',
            {
                params: {
                    pageSize: 4,
                    pageNumber: 1
                },
                headers: {
                    'Authorization': `Bearer ${BEARER_TOKEN}`
                }
            }
        );

        // Filter for the latest 'SENT' message
        const messagesData = getMessagesResponse.data;
        const latestMessage = messagesData.messages.items.filter(
            message => message?.statusString === 'SENT'
        )[0]?.text;

        // Check if the message is new and not the same as the last one
        if (latestMessage && latestMessage !== lastUserMsg) {
            lastUserMsg = latestMessage; // Update lastUserMsg with the new message
            console.log("New message detected:", lastUserMsg);
            await callPOSTapi(lastUserMsg); // Pass the new message to POST API call
        }
    } catch (error) {
        console.error('Error fetching messages:', error);
    }
}

const callPOSTapi = async (messageText) => {
    try {
        // Call OpenAI API for completion
        const openAiResponse = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "you are a helpful assistant who knows about the world helps the user, keep the responses short" },
                    { role: "user", content: messageText }
                ],
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        const openAiMessageText = openAiResponse.data.choices[0].message.content;

        // Set up form data for the external API using OpenAI's response
        const formData = new URLSearchParams();
        formData.append('messageText', openAiMessageText);

        // Call the external API with Bearer token authentication
        await axios.post(
            'https://app-server.wati.io/api/v1/sendSessionMessage/919653188918',
            formData,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Bearer ${BEARER_TOKEN}`
                }
            }
        );

        console.log('Message sent successfully to external API:', openAiMessageText);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Check for new messages every 3 seconds
setInterval(() => {
    callGETapi();
}, 3000);

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
