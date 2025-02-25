import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import { Server } from "socket.io";
import axios from "axios";
import cors from "cors";

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 10000;

// ✅ Allow requests from your frontend
app.use(cors({ origin: "*" }));
app.use(express.json());

const io = new Server(server, { cors: { origin: "*" } });

// ✅ API Route Test
app.get("/", (_, res) => res.send("API is working! 🚀"));

const rooms = new Map();
const pistonApiUrl = "https://emkc.org/api/v2/piston/execute";

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join", ({ roomId, userName }) => {
    if (!roomId || !userName) return;
    if (!rooms.has(roomId)) rooms.set(roomId, new Set());
    rooms.get(roomId).add(userName);
    socket.join(roomId);
    io.to(roomId).emit("userJoined", Array.from(rooms.get(roomId)));
  });

  socket.on("codeChange", ({ roomId, code }) => socket.to(roomId).emit("codeUpdate", code));
  socket.on("typing", ({ roomId, userName }) => socket.to(roomId).emit("userTyping", userName));
  socket.on("languageChange", ({ roomId, language }) => io.to(roomId).emit("languageUpdate", language));

  socket.on("compilecode", async ({ code, roomId, language }) => {
    try {
      const { data } = await axios.post(pistonApiUrl, {
        language,
        version: "*",
        files: [{ content: code }]
      });
      io.to(roomId).emit("codeResponse", data);
    } catch (error) {
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

  socket.on("disconnect", () => console.log("User Disconnected"));
});

// ✅ Start server
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
