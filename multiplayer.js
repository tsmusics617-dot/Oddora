/* =========================================================
   ODDORA — FIREBASE REALTIME MULTIPLAYER & TEAM CODE ENGINE
   File: multiplayer.js
   ========================================================= */

"use strict";

// Your Firebase credentials
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDu37ETQfOjBj8ZYKShE8rwXJSmPRF4Abo",
  authDomain: "oddora-154fa.firebaseapp.com",
  projectId: "oddora-154fa",
  storageBucket: "oddora-154fa.firebasestorage.app",
  messagingSenderId: "763212653092",
  appId: "1:763212653092:web:1a0b22dca12adb269caeb1",
  databaseURL: "https://oddora-154fa-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase safely using Compat SDK
let db = null;
try {
  if (typeof firebase !== "undefined" && !firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.database();
    console.log("Firebase Realtime Database initialized successfully!");
  } else if (typeof firebase !== "undefined") {
    db = firebase.database();
  }
} catch (e) {
  console.warn("Firebase initialization error:", e);
}

const MultiplayerEngine = {
  currentRoomId: null,
  isHost: false,
  playerRole: null, // 'host' (Player 1) or 'guest' (Player 2)

  // Generate a random 6-digit room code
  generateRoomCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  // Create a new room code for a friend to join
  async createRoom(gameId, playerName) {
    if (!db) {
      alert("Firebase Database is not connected! Check your connection.");
      return null;
    }
    
    const roomId = this.generateRoomCode();
    this.currentRoomId = roomId;
    this.isHost = true;
    this.playerRole = "host";

    const roomRef = db.ref(`rooms/${roomId}`);
    await roomRef.set({
      gameId: gameId,
      hostName: playerName || "Player 1",
      guestName: "Waiting...",
      status: "waiting", // 'waiting', 'active', 'finished'
      state: null,
      turn: "host",
      createdAt: Date.now()
    });

    return roomId;
  },

  // Join an existing room using a 6-digit code
  async joinRoom(roomId, playerName) {
    if (!db) {
      alert("Firebase Database is not connected! Check your connection.");
      return false;
    }

    const roomRef = db.ref(`rooms/${roomId}`);
    const snapshot = await roomRef.get();

    if (!snapshot.exists()) {
      alert("Room code not found! Please check the code and try again.");
      return false;
    }

    const roomData = snapshot.val();
    if (roomData.status !== "waiting") {
      alert("This room is already full or finished!");
      return false;
    }

    this.currentRoomId = roomId;
    this.isHost = false;
    this.playerRole = "guest";

    await roomRef.update({
      guestName: playerName || "Player 2",
      status: "active"
    });

    return true;
  },

  // Broadcast a game move to Firebase
  updateGameState(gameState, nextTurn) {
    if (!db || !this.currentRoomId) return;
    db.ref(`rooms/${this.currentRoomId}`).update({
      state: gameState,
      turn: nextTurn
    });
  },

  // Listen for opponent's moves live
  listenToRoom(callback) {
    if (!db || !this.currentRoomId) return;
    db.ref(`rooms/${this.currentRoomId}`).on("value", snapshot => {
      const data = snapshot.val();
      if (data && typeof callback === "function") {
        callback(data);
      }
    });
  },

  // Leave room and clean up
  leaveRoom() {
    if (db && this.currentRoomId) {
      if (this.isHost) {
        db.ref(`rooms/${this.currentRoomId}`).remove();
      }
    }
    this.currentRoomId = null;
    this.isHost = false;
    this.playerRole = null;
  }
};

window.MultiplayerEngine = MultiplayerEngine;
