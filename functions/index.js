const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");

const adminApp = require("firebase-admin");
admin.initializeApp();

const app = express();
const openAiQuery = require("./routes/openaiquery");

//auth middleware, unauthenticated users will be 403 forbidden uses firebase auth token
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
        res.status(403).send(error);
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
