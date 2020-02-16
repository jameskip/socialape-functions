const functions = require("firebase-functions");
const app = require("express")();

const {
  signup,
  login,
  FBAuth,
  uploadImage,
  updateUserDetails,
  getAuthenticatedUser
} = require("./handlers/users");

const {
  getAllScreams,
  createScream,
  getScream,
  commentOnScream
} = require("./handlers/screams");

// Routes
app.get("/screams", getAllScreams);
app.post("/scream", FBAuth, createScream);
app.get("/scream/:screamId", getScream);
// TODO: delete scream
// TODO: like a scream
// TODO: unlike a scream
app.post("/scream/:screamId/comment", FBAuth, commentOnScream);

app.post("/signup", signup);
app.post("/login", login);
app.post("/user/image", FBAuth, uploadImage);
app.post("/user", FBAuth, updateUserDetails);
app.get("/user", FBAuth, getAuthenticatedUser);

exports.api = functions.https.onRequest(app);
