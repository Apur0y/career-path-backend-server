# WebSocket API Documentation

## Overview

This document describes the WebSocket API for the real-time chat system. All messages are sent and received as JSON objects with a `type` field indicating the event type.

## Connection

Connect to the WebSocket server at: `ws://31.97.216.98:5000`

## Event Types

### 1. Authentication

```json
{
  "type": "authenticate",
  "token": "your_token"
}
```

### 2. Send Message (with roomId)

```json
{
  "type": "message",
  "roomId": "675a1b2c3d4e5f6a7b8c9d03",
  "message": "Hello from Postman!"
}
```

### 3. Send Message (with receiverId - legacy)

```json
{
  "type": "message",
  "receiverId": "675a1b2c3d4e5f6a7b8c9d01",
  "jobPostId": "675a1b2c3d4e5f6a7b8c9d02",
  "message": "Hello using receiverId!"
}
```

### 4. Get Chat History

```json
{
  "type": "chat_history",
  "roomId": "675a1b2c3d4e5f6a7b8c9d03",
  "page": 1,
  "limit": 50
}
```

### 5. Get Chat List

```json
{
  "type": "chat_list"
}
```

### 6. Start Typing

```json
{
  "type": "typing",
  "roomId": "675a1b2c3d4e5f6a7b8c9d03"
}
```

### 7. Stop Typing

```json
{
  "type": "stop_typing",
  "roomId": "675a1b2c3d4e5f6a7b8c9d03"
}
```

### 8. Mark Messages as Read

```json
{
  "type": "message_read",
  "messageIds": ["675a1b2c3d4e5f6a7b8c9d07", "675a1b2c3d4e5f6a7b8c9d08"]
}
```

## Notes

- Always authenticate first before sending other messages
- The server automatically sends connection acknowledgment when you connect
- Messages are broadcast to all participants in the chat room
- Typing indicators are sent to other participants in real-time
- Use `roomId` for new implementations, `receiverId` + `jobPostId` for legacy support

## How to Start Chatting (First Time)

### Option 1: Using receiverId (Recommended for new chats)

When you want to start chatting with someone for the first time, use the `receiverId` approach:

```json
{
  "type": "message",
  "receiverId": "675a1b2c3d4e5f6a7b8c9d01",
  "jobPostId": "675a1b2c3d4e5f6a7b8c9d02",
  "message": "Hello! I'd like to discuss the job opportunity."
}
```

**What happens:**

1. Server automatically creates a chat room between you and the receiver
2. Room is associated with the specific job post
3. Your message is sent and stored in the new room
4. You'll receive the `roomId` in subsequent responses

### Option 2: Using existing roomId

Once you have a `roomId` (from previous messages or chat list), use it directly:

```json
{
  "type": "message",
  "roomId": "675a1b2c3d4e5f6a7b8c9d03",
  "message": "Hello again!"
}
```

### Getting Your Chat List

After sending your first message, you can get your chat list to see all your conversations:

```json
{
  "type": "chat_list"
}
```

This will return all your chat rooms, including the newly created one.
