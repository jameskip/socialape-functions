const functions = require('firebase-functions')
const app = require('express')()

const { signup, login, FBAuth, uploadImage } = require('./handlers/users')
const { getAllScreams, createScream } = require('./handlers/screams')

// Routes
app.get('/screams', getAllScreams)
app.post('/scream', FBAuth, createScream)

app.post('/signup', signup)
app.post('/login', login)
app.post('/user/image', FBAuth, uploadImage)

exports.api = functions.https.onRequest(app)
