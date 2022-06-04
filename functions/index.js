const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

const adminApp = require("firebase-admin");
admin.initializeApp();

const app = express();
const openAiQuery = require("./routes/openaiquery");

app.use(cors({ origin: true }));
app.use(express.json());
app.use((req, res, next) => {
  const token = req.body.authToken;
  if (token) {
    adminApp
      .auth()
      .verifyIdToken(token)
      .then((decodedToken) => {
        req.user = decodedToken;
        next();
      })
      .catch((error) => {
        res.status(403).send("error decoding token", error);
      });
  } else {
    res.status(403).send("token is required");
  }
});
app.use("/openaiquery", openAiQuery);
app.get("/", (req, res) => {
  res.send(req.user);
});

exports.api = functions.https.onRequest(app);

//create a new firestore document when a new user is created
exports.createUser = functions.auth.user().onCreate((user) => {
  return admin.firestore().collection("users").doc(user.uid).set({
    email: user.email,
    displayName: null,
    photoURL: null,
    subscriptionActive: false,
    tokensUsed: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
});
