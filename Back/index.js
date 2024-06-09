import express from "express";
import http from "http";
import ip from "ip";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const server = http.createServer(app);
const PORT = 3000;
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
app.use(cors());
app.get("/", (req, res) => {
  res.json("ip address: http://" + ip.address() + ":" + PORT);
});

let rooms = {};

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("disconnect", () => {
    console.log("user disconnected");
    leaveAllRooms(socket);
  });

  socket.on("join", (room, nickname) => {
    console.log(`join room: ${room} as ${nickname}`);
    if (!rooms[room]) {
      rooms[room] = {
        players: {},
        spectators: {},
        results: [],
        nicknames: {},
        queue: [],
      };
    }

    if (Object.keys(rooms[room].players).length < 2) {
      socket.join(room);
      rooms[room].players[socket.id] = null; // Pas de coup par défaut
      rooms[room].nicknames[socket.id] = nickname;
      io.to(room).emit(
        "message",
        `${nickname} a rejoint la salle ${room} en tant que joueur`
      );
    } else {
      socket.join(room);
      rooms[room].spectators[socket.id] = true;
      rooms[room].nicknames[socket.id] = nickname;
      rooms[room].queue.push(socket.id);
      io.to(room).emit(
        "message",
        `${nickname} a rejoint la salle ${room} en tant que spectateur`
      );
    }

    io.emit("roomsUpdate", getAvailableRooms());
  });

  socket.on("leave", (room) => {
    console.log("leave room: " + room);
    socket.leave(room);
    if (rooms[room]) {
      const nickname = rooms[room].nicknames[socket.id];
      delete rooms[room].players[socket.id];
      delete rooms[room].spectators[socket.id];
      delete rooms[room].nicknames[socket.id];
      if (
        Object.keys(rooms[room].players).length === 0 &&
        Object.keys(rooms[room].spectators).length === 0
      ) {
        delete rooms[room];
      }

      io.to(room).emit("message", `${nickname} a quitté la salle ${room}`);
    }
    checkQueue(room);
    io.emit("roomsUpdate", getAvailableRooms());
  });

  socket.on("play", (room, nickname, choice) => {
    if (!rooms[room]) {
      rooms[room] = {
        players: {},
        spectators: {},
        results: [],
        nicknames: {},
        queue: [],
      };
    }
    rooms[room].players[socket.id] = choice;

    if (Object.keys(rooms[room].players).length === 2) {
      const [player1, player2] = Object.keys(rooms[room].players);
      const choice1 = rooms[room].players[player1];
      const choice2 = rooms[room].players[player2];
      const result = determineWinner(
        choice1,
        choice2,
        rooms[room].nicknames[player1],
        rooms[room].nicknames[player2]
      );

      rooms[room].results.push({
        player1: rooms[room].nicknames[player1],
        choice1,
        player2: rooms[room].nicknames[player2],
        choice2,
        result,
      });
      io.to(room).emit("result", rooms[room].results);

      // Clear players for the next round
      rooms[room].players = {};
      checkQueue(room);
    }
  });

  socket.on("getRooms", () => {
    socket.emit("roomsUpdate", getAvailableRooms());
  });

  socket.on("chat", (room, message) => {
    io.to(room).emit("chat", message);
  });

  socket.on("createRoom", (newRoom, nickname) => {
    const currentRooms = Array.from(socket.rooms).filter(
      (r) => r !== socket.id
    );
    currentRooms.forEach((room) => {
      if (room !== socket.id) {
        socket.leave(room);
        if (rooms[room]) {
          const nickname = rooms[room].nicknames[socket.id];
          delete rooms[room].players[socket.id];
          delete rooms[room].spectators[socket.id];
          delete rooms[room].nicknames[socket.id];
          if (
            Object.keys(rooms[room].players).length === 0 &&
            Object.keys(rooms[room].spectateurs).length === 0
          ) {
            delete rooms[room];
          }
          io.to(room).emit("message", `${nickname} a quitté la salle ${room}`);
        }
      }
    });

    if (!rooms[newRoom]) {
      rooms[newRoom] = {
        players: {},
        spectators: {},
        results: [],
        nicknames: {},
        queue: [],
      };
      socket.join(newRoom);
      rooms[newRoom].players[socket.id] = null; // Pas de coup par défaut
      rooms[newRoom].nicknames[socket.id] = nickname;
      io.emit("roomsUpdate", getAvailableRooms());
      io.to(newRoom).emit(
        "message",
        `${nickname} a créé et rejoint la salle ${newRoom} en tant que joueur`
      );
    } else {
      socket.emit("message", "La salle existe déjà.");
    }
  });

  function checkQueue(room) {
    if (rooms[room]) {
      if (
        Object.keys(rooms[room].players).length < 2 &&
        rooms[room].queue.length > 0
      ) {
        const nextPlayerId = rooms[room].queue.shift();
        rooms[room].players[nextPlayerId] = null; // Pas de coup par défaut
        delete rooms[room].spectators[nextPlayerId];
        io.to(room).emit(
          "message",
          `${rooms[room].nicknames[nextPlayerId]} a rejoint la salle ${room} en tant que joueur`
        );
      }
    }
  }

  function leaveAllRooms(socket) {
    for (let room in rooms) {
      if (rooms[room].players[socket.id]) {
        const nickname = rooms[room].nicknames[socket.id];
        delete rooms[room].players[socket.id];
        delete rooms[room].nicknames[socket.id];
        if (
          Object.keys(rooms[room].players).length === 0 &&
          Object.keys(rooms[room].spectateurs).length === 0
        ) {
          delete rooms[room];
        }
        checkQueue(room);
        io.to(room).emit("message", `${nickname} a quitté la salle ${room}`);
      } else if (rooms[room].spectateurs[socket.id]) {
        const nickname = rooms[room].nicknames[socket.id];
        delete rooms[room].spectateurs[socket.id];
        delete rooms[room].nicknames[socket.id];
        if (
          Object.keys(rooms[room].spectateurs).length === 0 &&
          Object.keys(rooms[room].players).length === 0
        ) {
          delete rooms[room];
        }
        checkQueue(room);
        io.to(room).emit("message", `${nickname} a quitté la salle ${room}`);
      }
    }
    io.emit("roomsUpdate", getAvailableRooms());
  }
});

function determineWinner(choice1, choice2, player1, player2) {
  if (choice1 === choice2) {
    return "Égalité";
  }
  if (
    (choice1 === "pierre" && choice2 === "sciseaux") ||
    (choice1 === "sciseaux" && choice2 === "paper") ||
    (choice1 === "paper" && choice2 === "pierre")
  ) {
    return `${player1} gagne avec ${choice1} contre ${player2} avec ${choice2}`;
  }
  return `${player2} gagne avec ${choice2} contre ${player1} avec ${choice1}`;
}

function getAvailableRooms() {
  let availableRooms = [];
  let fullRooms = [];
  for (let room in rooms) {
    const roomInfo = {
      name: room,
      count:
        Object.keys(rooms[room].players).length +
        Object.keys(rooms[room].spectators).length,
    };
    if (Object.keys(rooms[room].players).length < 2) {
      availableRooms.push(roomInfo);
    } else {
      fullRooms.push(roomInfo);
    }
  }
  return { availableRooms, fullRooms };
}

server.listen(PORT, () => {
  console.log("Server ip : http://" + ip.address() + ":" + PORT);
});
