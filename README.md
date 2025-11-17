# Socket.io Chat – Week 5 MERN Assignment

Fully featured real-time chat platform built with the MERN stack and Socket.io. It delivers authentication, global and private rooms, read receipts, in-app/desktop notifications, typing indicators, reconnection flows, message persistence, pagination, and performance-focused UX.

## Tech Stack

- **Server:** Node.js, Express, Socket.io, MongoDB/Mongoose, JWT
- **Client:** React (Vite), Context API, socket.io-client, React Router, React Hot Toast

## Project Structure

```
socketio-chat/
├── client/     # Vite + React UI
└── server/     # Express + Socket.io API
```

## Features

**Core**
- Username-based authentication with JWT session storage
- Global “Lobby” room available to every user
- MongoDB message storage (`from`, `fromName`, `roomId`, `toUserId`, `text`, `ts`, `readBy`)
- Online/offline presence broadcasts and roster UI
- Typing indicators with debounce + auto-clear
- Acknowledged socket events for message delivery state

**Advanced**
- Private 1:1 rooms with automatic creation/join + history
- Unlimited public rooms (create/join/leave) with history + participants
- Read receipts (per message + live socket updates)
- Real-time notification bell, sounds, toast alerts, desktop notifications, unread counters
- Message pagination (`GET /rooms/:id/messages?before=<ts>&limit=20`)
- Resilient reconnection logic with automatic room rejoin + presence restore
- Failed message retry queue + connection status indicator

## Environment Variables

Create the following files before running the project.

`server/.env`
```
MONGO_URI=mongodb://127.0.0.1:27017/socketio-chat
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=supersecret
```

`client/.env`
```
VITE_SERVER_URL=http://localhost:5000
```

## Installation

### 1. Server
```bash
cd server
npm install
npm run dev   # runs nodemon server.js on port 5000
```

Ensure MongoDB is running locally (or update `MONGO_URI` to your Atlas/remote instance).

### 2. Client
```bash
cd client
npm install
npm run dev   # launches Vite dev server on http://localhost:5173
```

Open the Vite URL shown in the console (default `http://localhost:5173`) once both client and server dev servers are running.

## Manual Test Plan

1. **Login Flow**
   - Open two browsers (or an incognito window) and sign in with different usernames.
2. **Global Room**
   - Verify both users land in the global room (`/rooms/<globalId>`), exchange messages, and confirm instant delivery.
3. **Room Management**
   - Create a new room from the sidebar, confirm it broadcasts “user joined” notification, and check history pagination with “Load previous messages”.
4. **Private Messaging**
   - From the people list, start a DM. Confirm private history loads, messages remain in MongoDB, and read receipts display for sent items.
5. **Typing + Presence**
   - Start typing in one browser and watch the typing indicator plus presence chips change in the other session.
6. **Notifications**
   - Mute the active room (navigate to a different one) and send a message; bell count, toast, sound, and desktop notification should appear.
7. **Read Receipts**
   - Observe “Read by …” labels update when the other user views messages.
8. **Reconnection**
   - Stop and restart the server or disable/re-enable the network tab; the client auto-reconnects, rejoins rooms, and restores presence without losing state.

## Screenshots / GIF Placeholders

Add your captures to `docs/screenshots/` (not committed yet) and update the filenames if desired.

![Login Screen](docs/screenshots/login.png)
![Chat Room](docs/screenshots/chat-room.png)
![Notifications](docs/screenshots/notifications.gif)

## Deployment

1. **Server**
   - Configure production `.env` with hosted MongoDB and deployed client origin.
   - Build a production bundle (optional) and run `npm start` (which executes `node server.js`).
   - Consider process managers like PM2 and enable HTTPS for secure sockets.
2. **Client**
   - `cd client && npm run build` to generate static assets inside `client/dist`.
   - Serve the contents of `dist/` via any static host (Netlify, Vercel, S3, etc.).
   - Update `CLIENT_ORIGIN` and `VITE_SERVER_URL` to point to the deployed domains before building.

## Troubleshooting

| Issue | Fix |
| --- | --- |
| `MongoNetworkError` on server start | Confirm MongoDB is running and `MONGO_URI` is correct. |
| Socket connection refused | Make sure both server (port 5000) and client (port 5173) are running, and that `CLIENT_ORIGIN`/`VITE_SERVER_URL` match. |
| Desktop notifications not showing | Browser may block notifications—allow them when prompted or reset the permission under site settings. |
| Notification sound missing | Some browsers require a user gesture before playing audio; send one message post-login to unlock audio playback. |
| Messages stuck in “Failed” state | Use the retry buttons rendered above the composer. Ensure the socket is connected (connection badge shows “Connected”). |

## Additional Notes

- REST APIs live under `/api/*` and require the `Authorization: Bearer <token>` header.
- Socket namespaces rely on default namespace with rooms; no extra configuration is required.
- Styling uses custom CSS (no Tailwind) to remain lightweight and self-contained.

Happy chatting! 🎉



