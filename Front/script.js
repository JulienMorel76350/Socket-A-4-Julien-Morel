const socket = io("https://socket-a-4-julien-morel.onrender.com");
const availableRoomsList = document.getElementById("availableRooms");
const fullRoomsList = document.getElementById("fullRooms");
const resultsDisplay = document.querySelector(".results");
const chatMessage = document.getElementById("chatMessage");
const chatDisplay = document.querySelector(".chat");
const gameSelection = document.querySelector(".game");
let nickname = "";
let room = "";
let chatMessageCounter = 0; // Counter for numbering the chat messages
let resultCounter = 0; // Counter for numbering the results

socket.on("connect", () => {
  console.log("Connected");
  socket.emit("getRooms");
});

socket.on("message", (data) => {
  console.log(data);
  addMessageToChat(data);
});

socket.on("join", (room, role) => {
  if (role === "spectator") {
    gameSelection.classList.add("hidden");
  } else {
    gameSelection.classList.remove("hidden");
  }
});

socket.on("result", (data) => {
  console.log(data);
  displayResults(data);
});

socket.on("roomsUpdate", (rooms) => {
  updateRoomLists(rooms);
});

socket.on("chat", (message) => {
  addMessageToChat(message);
});

socket.on("disconnect", () => {
  console.log("Disconnected");
});

socket.on("join", (room, role) => {
  if (role === "spectator") {
    gameSelection.classList.add("hidden");
  } else {
    gameSelection.classList.remove("hidden");
  }
});

function enterChat() {
  nickname = document.getElementById("nickname").value;
  if (nickname) {
    document.getElementById("login").classList.add("hidden");
    document.getElementById("chatRoom").classList.remove("hidden");
    document.getElementById("wrapper_chat").classList.remove("hidden");
    document.getElementById("sidebar").classList.remove("hidden");
    socket.emit("getRooms");
  } else {
    alert("Please enter a nickname.");
  }
}

function play(choice) {
  if (room && nickname) {
    socket.emit("play", room, nickname, choice);
  } else {
    alert("Please enter a room and nickname.");
  }
}

function joinRoom(selectedRoom) {
  if (room) {
    socket.emit("leave", room);
  }
  room = selectedRoom;
  socket.emit("join", room, nickname);
}

function createRoom() {
  const newRoom = prompt("Enter a new room name:");
  if (newRoom) {
    socket.emit("createRoom", newRoom);
  }
}

function sendMessage() {
  const message = chatMessage.value;
  if (room && message) {
    socket.emit("chat", room, `${nickname}: ${message}`);
    chatMessage.value = "";
  } else {
    alert("Please enter a message.");
  }
}

function displayResults(results) {
  resultsDisplay.innerHTML = ""; // Clear previous results
  results.forEach((result) => {
    resultCounter++;
    const resultElement = document.createElement("div");
    resultElement.innerText = `${resultCounter}. ${result.player1} vs ${result.player2} : ${result.result}`;
    resultsDisplay.insertBefore(resultElement, resultsDisplay.firstChild);
  });
}

function updateRoomLists(rooms) {
  availableRoomsList.innerHTML = "";
  fullRoomsList.innerHTML = "";

  const { availableRooms, fullRooms } = rooms;

  availableRooms.forEach((roomName) => {
    const li = document.createElement("li");
    li.innerText = roomName;
    if (roomName === room) {
      li.classList.add("current-room");
    } else {
      li.onclick = () => joinRoom(roomName);
    }
    availableRoomsList.appendChild(li);
  });

  fullRooms.forEach((roomName) => {
    const li = document.createElement("li");
    li.innerText = roomName;
    if (roomName === room) {
      li.classList.add("current-room");
    } else {
      li.onclick = () => joinRoom(roomName);
    }
    fullRoomsList.appendChild(li);
  });
}

function addMessageToChat(message) {
  chatMessageCounter++;
  const messageElement = document.createElement("li");
  messageElement.innerText = `${chatMessageCounter}. ${message}`;
  chatDisplay.insertBefore(messageElement, chatDisplay.firstChild);
}
