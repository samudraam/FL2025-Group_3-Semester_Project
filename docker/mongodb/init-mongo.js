// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

// Create the database and collections
db = db.getSiblingDB("badmintonapp");

// Create collections without validation (let Mongoose handle validation)
db.createCollection("users");

db.createCollection("games");
db.createCollection("friendrequests");
db.createCollection("authtokens");

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

print("MongoDB initialization completed successfully!");
