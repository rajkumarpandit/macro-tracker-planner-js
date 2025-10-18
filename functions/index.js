const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

// Express app for api
const express = require('express');
const app = express();

// Routes
app.get('/hello-world', (req, res) => {
    res.send('Hello from Firebase!');
});

exports.api = functions.https.onRequest(app);
