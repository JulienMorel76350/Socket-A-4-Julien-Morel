const socket = io("https://socket-a-4-julien-morel.onrender.com");
const availableRoomsList = document.getElementById("availableRooms");
const fullRoomsList = document.getElementById("fullRooms");
const resultsDisplay = document.querySelector(".results");
const chatMessage = document.getElementById("chatMessage");
const chatDisplay = document.querySelector(".chat");
const gameSelection = document.querySelector(".game");
let nickname = "";
let room = "";
let chatMessageCounter = 0;
let resultCounter = 0;

socket.on("connect", () => {
  console.log("Connecté");
  socket.emit("getRooms");
});

socket.on("message", (data) => {
  console.log(data);
  addMessageToChat(data);
});

socket.on("join", (room, role) => {
  if (role === "spectateur") {
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
  console.log("Déconnecté");
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
    alert("Veuillez entrer un pseudonyme.");
  }
}

function play(choice) {
  if (room && nickname) {
    socket.emit("play", room, nickname, choice);
  } else {
    alert("Veuillez entrer dans une salle et un pseudonyme.");
  }
}

function joinRoom(selectedRoom) {
  if (room) {
    socket.emit("leave", room);
  }
  room = selectedRoom;
  socket.emit("join", room, nickname);
  resetChat(); // Reset chat when changing rooms
  resetResults(); // Reset results when changing rooms
}

function createRoom() {
  const newRoom = prompt("Entrez un nom pour la nouvelle salle :");
  if (newRoom) {
    if (room) {
      socket.emit("leave", room);
    }
    room = newRoom;
    socket.emit("createRoom", newRoom, nickname);
    resetChat();
    resetResults(); // Reset results when creating a new room
  }
}

function sendMessage() {
  const message = chatMessage.value;
  if (room && message) {
    socket.emit("chat", room, `${nickname}: ${message}`);
    chatMessage.value = "";
  } else {
    alert("Veuillez entrer un message.");
  }
}

function displayResults(results) {
  resultsDisplay.innerHTML = ""; // Effacer les résultats précédents
  resultCounter = 0; // Réinitialiser le compteur de résultats
  results.forEach((result) => {
    resultCounter++;
    const resultElement = document.createElement("div");
    resultElement.innerText = `${resultCounter}. ${result.player1} (${result.choice1}) vs ${result.player2} (${result.choice2}) : ${result.result}`;
    resultsDisplay.insertBefore(resultElement, resultsDisplay.firstChild);
  });
}

function updateRoomLists(rooms) {
  availableRoomsList.innerHTML = "";
  fullRoomsList.innerHTML = "";

  const { availableRooms, fullRooms } = rooms;

  availableRooms.forEach((roomInfo) => {
    const li = document.createElement("li");
    li.innerText = `${roomInfo.name} (${roomInfo.count} joueur(s))`;
    if (roomInfo.name === room) {
      li.classList.add("current-room");
    } else {
      li.onclick = () => joinRoom(roomInfo.name);
    }
    availableRoomsList.appendChild(li);
  });

  fullRooms.forEach((roomInfo) => {
    const li = document.createElement("li");
    li.innerText = `${roomInfo.name} (${roomInfo.count} spectateur(s))`;
    if (roomInfo.name === room) {
      li.classList.add("current-room");
    } else {
      li.onclick = () => joinRoom(roomInfo.name);
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

function resetChat() {
  chatDisplay.innerHTML = ""; // Clear chat messages
  chatMessageCounter = 0; // Reset chat message counter
}

function resetResults() {
  resultsDisplay.innerHTML = ""; // Clear results
  resultCounter = 0; // Reset result counter
}
