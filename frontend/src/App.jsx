import { useEffect, useState } from "react";
import "./App.css";
import io from 'socket.io-client';
import Editor from '@monaco-editor/react';

const API_URL = "https://your-render-backend.onrender.com"; // Change this to your Render backend URL
const socket = io(API_URL, { transports: ["websocket"] });

const App = () => {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("// start coding here...");
  const [users, setUsers] = useState([]);
  const [typingUser, setTypingUser] = useState("");
  const [output, setOutput] = useState("");
  const [copySuccess, setCopySuccess] = useState("");

  useEffect(() => {
    if (!socket) return;

    socket.on("userJoined", (usersList) => setUsers(usersList));
    socket.on("codeUpdate", (newCode) => setCode(newCode));
    socket.on("userTyping", (user) => {
      setTypingUser(`${user.slice(0, 8)}... is typing`);
      setTimeout(() => setTypingUser(""), 2000);
    });
    socket.on("languageUpdate", (newLang) => setLanguage(newLang));
    socket.on("codeResponse", (response) => {
      setOutput(response?.run?.output || "Error executing code.");
    });

    return () => socket.disconnect();
  }, []);

  const joinRoom = () => {
    if (roomId && userName) {
      socket.emit("join", { roomId, userName });
      setJoined(true);
    }
  };

  const leaveRoom = () => {
    socket.emit("leaveRoom", { roomId, userName });
    setJoined(false);
    setRoomId("");
    setUserName("");
    setCode("// start coding here...");
    setLanguage("javascript");
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    socket.emit("codeChange", { roomId, code: newCode });
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    socket.emit("languageChange", { roomId, language: newLang });
  };

  const runCode = () => {
    socket.emit("compilecode", { code, roomId, language });
  };

  return !joined ? (
    <div className="join-container">
      <h1>Join a Code Room</h1>
      <input type="text" placeholder="Room ID" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
      <input type="text" placeholder="Your Name" value={userName} onChange={(e) => setUserName(e.target.value)} />
      <button onClick={joinRoom}>Join Room</button>
    </div>
  ) : (
    <div className="editor-container">
      <div className="sidebar">
        <h2>Room: {roomId}</h2>
        <button onClick={() => navigator.clipboard.writeText(roomId)}>Copy Room ID</button>
        <ul>{users.map((user, i) => (<li key={i}>{user}</li>))}</ul>
        <p>{typingUser}</p>
        <select value={language} onChange={handleLanguageChange}>
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
        </select>
        <button onClick={leaveRoom}>Leave Room</button>
      </div>

      <div className="editor-wrapper">
        <Editor height="60%" language={language} value={code} onChange={handleCodeChange} theme="vs-dark" />
        <button onClick={runCode}>Run Code</button>
        <textarea value={output} readOnly placeholder="Output will appear here..."></textarea>
      </div>
    </div>
  );
};

export default App;
