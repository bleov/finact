import { app, BrowserWindow, ipcMain, dialog } from "electron";
import Store from "electron-store";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import expressWs from "express-ws";

const config = new Store();
const server = express();
expressWs(server);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.platform === "linux") {
  app.commandLine.appendSwitch("gtk-version", "3");
}

let win;
let playbackState = {
  state: { playing: false },
  queue: null
};
let connectedSockets = [];
let playbackPortUsed = false;

function createWindow() {
  let options = {
    width: 1200,
    height: 800,
    minWidth: 400,
    minHeight: 400,
    darkTheme: true,
    show: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  };
  Object.assign(options, config.get("windowBounds"));

  win = new BrowserWindow(options);
  if (process.env.NODE_ENV === "dev") {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  } else {
    win.loadFile(path.join(__dirname, "../build/dist/index.html"));
  }

  win.once("ready-to-show", win.show);

  win.on("close", () => {
    config.set("windowBounds", win.getBounds());
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  if (playbackPortUsed) {
    dialog.showMessageBox(win, {
      message: `Port 8514 is already in use. The playback control server will not be available.`,
      type: "warning",
      buttons: ["OK"]
    });
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && process.env.NODE_ENV !== "dev") {
    app.quit();
  }
});

ipcMain.on("message-from-renderer", async (event, data) => {
  data = JSON.parse(data);
  if (data.type) {
    switch (data.type) {
      case "quit":
        app.quit();
        break;
      case "playback-state-changed":
        playbackState = { state: data.state, queue: data.queue };
        broadcastMessage({
          type: "playback-state",
          state: playbackState.state,
          queue: playbackState.queue
        });
        break;
      case "playback-progress":
        if (playbackState.state && playbackState.state.playing) {
          playbackState.state.position = data.position;
          broadcastMessage({
            type: "playback-progress",
            position: playbackState.state.position
          });
        }
        break;
      case "playback-options-changed":
        playbackState.state.repeat = data.repeat;
        playbackState.state.volume = data.volume;
        broadcastMessage({
          type: "playback-options",
          repeat: playbackState.state.repeat,
          volume: playbackState.state.volume
        });
        break;
      default:
        console.warn("Received message of unknown type: ", data.type);
        break;
    }
  }
});

// Playback server
const apiDocs = {
  "/full": "Returns the playback state and queue",
  "/state": "Returns the playback state",
  "/queue": "Returns the playback queue",
  "/basicQueue": "Returns the queue with basic item info"
};

server.use((_, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  next();
});

server.get("/", (req, res) => {
  res.json(apiDocs);
});
server.get("/full", (req, res) => {
  res.json({
    state: playbackState.state,
    queue: playbackState.queue
  });
});
server.get("/state", (req, res) => {
  res.json({
    state: playbackState.state
  });
});
server.get("/queue", (req, res) => {
  res.json({
    queue: playbackState.queue
  });
});
server.get("/basicQueue", (_, res) => {
  res.json({
    queue: {
      index: playbackState.queue?.index,
      itemIds: playbackState.queue?.itemIds ?? []
    }
  });
});

server.ws("/", (ws, req) => {
  let index;
  connectedSockets.push(ws);
  index = connectedSockets.length - 1;
  console.log(`WebSocket connection ${index} opened from ${req.ip}`);
  ws.send(
    JSON.stringify({
      type: "playback-state",
      state: playbackState.state,
      queue: playbackState.queue
    })
  );
  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);
      switch (data.command) {
        case "play-item":
          if (data.itemId) {
            win.webContents.send("command-to-renderer", JSON.stringify({ type: "play-item", itemId: data.itemId }));
          } else {
            console.warn("Received play command without itemId");
            ws.send(
              JSON.stringify({
                type: "error",
                message: "play command requires itemId"
              })
            );
          }
          break;
        case "pause":
          win.webContents.send("command-to-renderer", JSON.stringify({ type: "pause" }));
          break;
        case "resume":
          win.webContents.send("command-to-renderer", JSON.stringify({ type: "resume" }));
          break;
        case "stop":
          win.webContents.send("command-to-renderer", JSON.stringify({ type: "stop" }));
          break;
        case "next":
          win.webContents.send("command-to-renderer", JSON.stringify({ type: "next" }));
          break;
        case "previous":
          win.webContents.send("command-to-renderer", JSON.stringify({ type: "previous" }));
          break;
        case "set-volume":
          if (typeof data.volume === "number") {
            win.webContents.send("command-to-renderer", JSON.stringify({ type: "set-volume", volume: data.volume }));
          } else {
            console.warn("Received set-volume command without valid volume");
            ws.send(
              JSON.stringify({
                type: "error",
                message: "set-volume command requires a valid volume number"
              })
            );
          }
          break;
        case "seek":
          if (typeof data.position === "number") {
            win.webContents.send("command-to-renderer", JSON.stringify({ type: "seek", position: data.position }));
          } else {
            console.warn("Received seek command without valid position");
            ws.send(
              JSON.stringify({
                type: "error",
                message: "seek command requires a valid position number"
              })
            );
          }
          break;
        case "set-repeat":
          if (["none", "all", "one"].includes(data.mode)) {
            win.webContents.send("command-to-renderer", JSON.stringify({ type: "set-repeat", mode: data.mode }));
          } else {
            console.warn("Received set-repeat command with invalid mode: ", data.mode);
            ws.send(
              JSON.stringify({
                type: "error",
                message: "set-repeat command requires a valid mode (none, all, one)"
              })
            );
          }
          break;
        case "quit":
          app.quit();
          break;
        default:
          console.warn("Received unknown command: ", data.command);
          ws.send(
            JSON.stringify({
              type: "error",
              message: `Unknown command type`
            })
          );
          break;
      }
    } catch (error) {
      console.error("Error parsing message: ", error);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Invalid message format"
        })
      );
    }
  });
  ws.on("close", () => {
    console.log(`WebSocket connection ${index} closed`);
    delete connectedSockets[index];
  });
});

function broadcastMessage(message) {
  connectedSockets.forEach((socket) => {
    if (socket && socket.readyState === 1) {
      socket.send(JSON.stringify(message));
    }
  });
}
server.listen(8514, "0.0.0.0", (error) => {
  if (error) {
    console.error("Error starting playback server:");
    console.error(error);
  } else {
    console.log("Playback server listening on port 8514");
  }
});

process.on("uncaughtException", (error) => {
  console.error(error);
  if (error.message.includes("EADDRINUSE")) {
    playbackPortUsed = true;
  }
});
