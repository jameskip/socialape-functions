"use strict";
const admin = require("firebase-admin");
const serviceAccount = require("./socialape-9a7bf-firebase-adminsdk-1jogg-fe96800ee7.json");
// Init Firebase database
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://socialape-9a7bf.firebaseio.com"
});
const db = admin.firestore();
module.exports = { admin, db };
//# sourceMappingURL=admin.js.map