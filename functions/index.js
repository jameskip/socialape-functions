const functions = require('firebase-functions')
const admin = require('firebase-admin')
const firebase = require('firebase')
const app = require('express')()

// Init Firebase database
const serviceAccount = require('../socialape-9a7bf-firebase-adminsdk-1jogg-fe96800ee7.json')
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://socialape-9a7bf.firebaseio.com'
})

const firebaseConfig = {
  apiKey: "AIzaSyCThbLv30frPmVA6qHELYQgGn81lIa58f0",
  authDomain: "socialape-9a7bf.firebaseapp.com",
  databaseURL: "https://socialape-9a7bf.firebaseio.com",
  projectId: "socialape-9a7bf",
  storageBucket: "socialape-9a7bf.appspot.com",
  messagingSenderId: "791441825599",
  appId: "1:791441825599:web:0fe9cf6631e3b883d9fd8a",
  measurementId: "G-N90ECF1FNG"
}
firebase.initializeApp(firebaseConfig)

const db = admin.firestore()

// Get screams
app.get('/screams', (request, response) => {
  db.collection('screams').orderBy('createdAt', 'desc').get()
    .then(data => {
      let screams = []
      data.forEach(doc => {
        screams.push({
          screamId: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt
        })
      })
      return response.json(screams)
    })
    .catch(error => console.error(error))
})

// Post scream
app.post('/scream', (request, response) => {
  const newScream = {
    body: request.body.body,
    userHandle: request.body.userHandle,
    createdAt: new Date().toISOString()
  }

  db.collection('screams').add(newScream)
    .then(doc => {
      return response.json({ message: `Document ${doc.id} created successfully!` })
    })
    .catch(error => {
      console.error(error)
      return response.status(500).json({ error: `Something went wrong! :(` })
    })
})

app.post('/signup', (request, response) => {
  const newUser = {
    email: request.body.email,
    password: request.body.password,
    confirmPassword: request.body.confirmPassword,
    handle: request.body.handle
  }

  let token, userId
  db.doc(`/users/${newUser.handle}`).get()
    .then(doc => {
      if (doc.exists) {
        return response.status(400).json({ handle: `${newUser.handle} handle is already taken.` })
      } else {
        return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password)
      }
    })
    .then(data => {
      userId = data.user.uid
      return data.user.getIdToken()
    })
    .then(idToken => {
      token = idToken
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        userId
      }
      return db.doc(`/users/${newUser.handle}`).set(userCredentials)
    })
    .then(() => {
      return response.status(201).json({ token })
    })
    .catch(error => {
      console.error(error)
      if (error.code === 'auth/email-already-in-use') {
        return response.status(400).json({ email: 'Email is already in use.' })
      } else {
        return response.status(500).json({ error: error.code })
      }
    })
})

exports.api = functions.https.onRequest(app)
