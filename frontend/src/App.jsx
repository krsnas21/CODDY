import { useEffect, useState } from "react";
import "./App.css";
import io from 'socket.io-client';
import Editor from '@monaco-editor/react';

const socket = io("https://coddy-4tjh.onrender.com");

const App = () => {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("// start code here");
  const [copySuccess, setCopySuccess] = useState("");
  const [users, setUsers] = useState([]);
  const [typingUser, setTypingUser] = useState("");
  const [output, setOutput] = useState("");
  const [version, setVersion] = useState("*");

  useEffect(() => {
    const events = [
      { event: "userJoined", handler: handleUserJoined },
      { event: "codeUpdate", handler: handleCodeUpdate },
      { event: "userTyping", handler: handleUserTyping },
      { event: "languageUpdate", handler: handleLanguageUpdate },
      { event: "codeResponse", handler: handleCodeResponse },
    ];

    events.forEach(({ event, handler }) => socket.on(event, handler));

    return () => {
      events.forEach(({ event, handler }) => socket.off(event, handler));
    };
  }, []);

  const handleUserJoined = (usersList) => setUsers(usersList);
  const handleCodeUpdate = (newCode) => setCode(newCode);
  const handleUserTyping = (user) => {
    setTypingUser(`${user.slice(0, 8)}.... is typing`);
    setTimeout(() => setTypingUser(""), 2000);
  };
  const handleLanguageUpdate = (newLanguage) => setLanguage(newLanguage);
  const handleCodeResponse = (response) => setOutput(response.run?.output || "Error executing code.");

  const joinRoom = () => {
    if (roomId && userName) {
      socket.emit("join", { roomId, userName });
      setJoined(true);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") joinRoom();
  };

  const leaveRoom = () => {
    socket.emit("leaveRoom");
    setJoined(false);
    setRoomId("");
    setUserName("");
    setCode("// start code here");
    setLanguage("javascript");
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopySuccess("Copied");
    setTimeout(() => setCopySuccess(""), 2000);
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    socket.emit("codeChange", { roomId, code: newCode });
  };

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    socket.emit("languageChange", { roomId, language: newLanguage });
  };

  const runCode = () => {
    socket.emit("compilecode", { code, roomId, language });
  };
  

  if (!joined) {
    return (
      <div className="join-container">
        <div className="join-form">
          <h1><b>Start Collaboration</b></h1>
          <input type="text" placeholder="Room Id" value={roomId} onChange={(e) => setRoomId(e.target.value)} onKeyDown={handleKeyPress} />
          <input type="text" placeholder="Your Name" value={userName} onChange={(e) => setUserName(e.target.value)} onKeyDown={handleKeyPress} />
          <button onClick={joinRoom}>Join Room</button>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <div className="sidebar">
        <div className="room-info">
          <h2>Code Room: {roomId}</h2>
          <button onClick={copyRoomId} className="copy-button">Copy ID</button>
          {copySuccess && <span className="copy-success">{copySuccess}</span>}
        </div>
        <h3>Users in Room:</h3>
        <ul>{users.map((user, index) => (<li key={index}>{user.slice(0, 8)}....</li>))}</ul>
        <p className="typing-indicator">{typingUser}</p>
        <select className="language-selector" value={language} onChange={handleLanguageChange}>
          <option value="javascript">Javascript</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
          <option value="c">C</option>
        </select>
        <button className="leave-button" onClick={leaveRoom}>Leave Room</button>
      </div>

      <div className="editor-wrapper">
        <Editor height={"60%"} language={language} value={code} onChange={handleCodeChange} theme="vs-dark" options={{ minimap: { enabled: false }, fontSize: 14 }} />
        <button className="run-btn" onClick={runCode}>RUN</button>
        <textarea className="output-console" value={output} readOnly placeholder="Output..."></textarea>
      </div>
    </div>
  );
};

export default App;
