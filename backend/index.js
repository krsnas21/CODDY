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

app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));

const io = new Server(server, { cors: { origin: process.env.FRONTEND_URL || "*" } });
const rooms = new Map();
const pistonApiUrl = process.env.PISTON_API_URL || "https://emkc.org/api/v2/piston/execute";

io.on("connection", (socket) => {
  console.log("User Connected", socket.id);

  socket.on("join", ({ roomId, userName }) => {
    if (!roomId || !userName) return socket.emit("error", "Invalid roomId or username");

    if (!rooms.has(roomId)) rooms.set(roomId, new Set());
    rooms.get(roomId).add(userName);
    socket.join(roomId);
    io.to(roomId).emit("userJoined", Array.from(rooms.get(roomId)));
  });

  socket.on("codeChange", ({ roomId, code }) => socket.to(roomId).emit("codeUpdate", code));
  socket.on("typing", ({ roomId, userName }) => socket.to(roomId).emit("userTyping", userName));
  socket.on("languageChange", ({ roomId, language }) => io.to(roomId).emit("languageUpdate", language));

  socket.on("compilecode", async ({ code, roomId, language, version }) => {
    try {
      const response = await axios.post(pistonApiUrl, { language, version, files: [{ content: code }] });
      io.to(roomId).emit("codeResponse", response.data);
    } catch {
      io.to(roomId).emit("codeResponse", { error: "Compilation failed" });
    }
  });

  socket.on("leaveRoom", ({ roomId, userName }) => {
    if (rooms.has(roomId)) {
      rooms.get(roomId).delete(userName);
      if (rooms.get(roomId).size === 0) rooms.delete(roomId);
      io.to(roomId).emit("userJoined", Array.from(rooms.get(roomId) || []));
    }
    socket.leave(roomId);
  });

  socket.on("disconnect", () => {
    rooms.forEach((users, roomId) => {
      users.delete(socket.id);
      if (!users.size) rooms.delete(roomId);
    });
    console.log("User disconnected");
  });
});

const port = process.env.PORT || 5000;
app.use(express.static(path.join(path.resolve(), "frontend/dist")));
app.get("*", (_, res) => res.sendFile(path.join(path.resolve(), "frontend", "dist", "index.html")));
server.listen(port, () => console.log(`Server running on port ${port}`));
