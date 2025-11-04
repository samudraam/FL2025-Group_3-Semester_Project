// MongoDB initialization script
// This script runs for MongoDB setup run docker compose up -d to start the container

// Create the database and collections
db = db.getSiblingDB("badmintonapp");

// Create collections without validation (let Mongoose handle validation)
db.createCollection("users");
db.createCollection("games");
db.createCollection("friendrequests");
db.createCollection("authtokens");
db.createCollection("messages");
db.createCollection("conversations");

// Drop any existing indexes first
try {
  db.users.dropIndexes();
} catch (e) {
  // Collection might not exist yet
}

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true, sparse: true });
db.users.createIndex({ firebaseUid: 1 }, { unique: true });
db.users.createIndex({ phone: 1 }, { unique: true, sparse: true });
db.games.createIndex({ createdAt: -1 });
db.games.createIndex({ players: 1 });
db.friendrequests.createIndex({ from: 1, to: 1 });
db.authtokens.createIndex({ token: 1 }, { unique: true });
db.authtokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ADD THESE MESSAGE INDEXES
db.messages.createIndex({ sender: 1, recipient: 1, createdAt: -1 });

// ADD THESE CONVERSATION INDEXES (not unique to avoid multikey issues)
db.conversations.createIndex({ participants: 1 });

print("MongoDB initialization completed successfully!");
