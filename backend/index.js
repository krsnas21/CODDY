import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import axios from "axios";
import cors from "cors";

const app = express();
const server = http.createServer(app);

// Keep the server active to prevent Render from sleeping (Optional)
const url = `https://coddy-4tjh.onrender.com`;
const interval = 30000;
function reloadWebsite() {
  axios
    .get(url)
    .then(() => console.log("Website reloaded"))
    .catch((error) => console.error(`Error: ${error.message}`));
}
setInterval(reloadWebsite, interval);

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json()); // For parsing JSON requests

// Setup Socket.io
const io = new Server(server, { cors: { origin: process.env.FRONTEND_URL || "*" } });

// Data Storage
const rooms = new Map();
const pistonApiUrl = process.env.PISTON_API_URL || "https://emkc.org/api/v2/piston/execute";

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  // User joins a room
  socket.on("join", ({ roomId, userName }) => {
    if (!roomId || !userName) return socket.emit("error", "Invalid roomId or username");

    if (!rooms.has(roomId)) rooms.set(roomId, new Set());
    rooms.get(roomId).add(userName);
    
    socket.join(roomId);
    
    // Send the current user list to the new user and update everyone
    socket.emit("userJoined", Array.from(rooms.get(roomId)));
    io.to(roomId).emit("userJoined", Array.from(rooms.get(roomId)));

    console.log(`${userName} joined room ${roomId}`);
  });

  // Handle code updates
  socket.on("codeChange", ({ roomId, code }) => {
    socket.to(roomId).emit("codeUpdate", code);
  });

  // Notify others when a user is typing
  socket.on("typing", ({ roomId, userName }) => {
    socket.to(roomId).emit("userTyping", userName);
  });

  // Handle language change
  socket.on("languageChange", ({ roomId, language }) => {
    io.to(roomId).emit("languageUpdate", language);
  });

  // Compile and execute code using Piston API
  socket.on("compilecode", async ({ code, roomId, language, version }) => {
    try {
      const response = await axios.post(pistonApiUrl, {
        language,
        version,
        files: [{ content: code }]
      });

      io.to(roomId).emit("codeResponse", response.data);
    } catch (error) {
      console.error("Compilation Error:", error.message);
      io.to(roomId).emit("codeResponse", { error: "Compilation failed" });
    }
  });

  // User leaves a room
  socket.on("leaveRoom", ({ roomId, userName }) => {
    if (rooms.has(roomId)) {
      rooms.get(roomId).delete(userName);
      if (rooms.get(roomId).size === 0) rooms.delete(roomId);
      io.to(roomId).emit("userJoined", Array.from(rooms.get(roomId) || []));
    }
    socket.leave(roomId);
    console.log(`${userName} left room ${roomId}`);
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
    rooms.forEach((users, roomId) => {
      users.delete(socket.id);
      if (!users.size) rooms.delete(roomId);
    });
    console.log("User disconnected:", socket.id);
  });
});

// Serve frontend files (If deployed together)
app.use(express.static(path.join(path.resolve(), "frontend/dist")));
app.get("*", (_, res) => res.sendFile(path.join(path.resolve(), "frontend", "dist", "index.html")));

// Catch-all for non-existent routes (Prevents 404 errors)
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Start the server
const port = process.env.PORT || 5000;
server.listen(port, () => console.log(`Server running on port ${port}`));
