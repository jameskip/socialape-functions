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
  apiKey: 'AIzaSyCThbLv30frPmVA6qHELYQgGn81lIa58f0',
  authDomain: 'socialape-9a7bf.firebaseapp.com',
  databaseURL: 'https://socialape-9a7bf.firebaseio.com',
  projectId: 'socialape-9a7bf',
  storageBucket: 'socialape-9a7bf.appspot.com',
  messagingSenderId: '791441825599',
  appId: '1:791441825599:web:0fe9cf6631e3b883d9fd8a',
  measurementId: 'G-N90ECF1FNG'
}
firebase.initializeApp(firebaseConfig)

const db = admin.firestore()

// Get screams
app.get('/screams', (request, response) => {
  db.collection('screams')
    .orderBy('createdAt', 'desc')
    .get()
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
    .catch(error => response.status(400).json({ error: error.code }))
})

const FBAuth = (request, response, next) => {
  let idToken
  if (request.headers.authorization && request.headers.authorization.startsWith('Bearer ')) idToken = request.headers.authorization.split('Bearer ')[1]
  else response.status(403).json({ error: 'Unauthorized' })

  admin.auth().verifyIdToken(idToken)
    .then(decodedToken => {
      request.user = decodedToken
      return db.collection('users')
        .where('userId', '==', request.user.uid)
        .limit(1)
        .get()
    })
    .then(data => {
      request.user.handle = data.docs[0].data().handle
      return next()
    })
    .catch(error => response.status(403).json({ error: 'Unauthorized: ' + error }))
}

// Post scream
app.post('/scream', FBAuth, (request, response) => {
  if (request.body.body.trim() === '') response.status(400).json({ error: 'Body must not be empty' })

  const newScream = {
    body: request.body.body,
    userHandle: request.user.handle,
    createdAt: new Date().toISOString()
  }

  db.collection('screams')
    .add(newScream)
    .then(doc => response.json({ message: `Document ${doc.id} created successfully!` }))
    .catch(error => response.status(500).json({ error: `Something went wrong! :(` }))
})

// Validation helper functions
const isEmpty = string => string.trim() === '' ? true : false
const isValidEmail = email => email.match(/^(([^<>()[\]\\.,;:\s@']+(\.[^<>()[\]\\.,;:\s@']+)*)|('.+'))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/) ? true : false
const isValidPassword = password => password.length >= 8

app.post('/signup', (request, response) => {
  const newUser = {
    email: request.body.email,
    password: request.body.password,
    confirmPassword: request.body.confirmPassword,
    handle: request.body.handle
  }

  // Validate
  let errors = {}
  if (isEmpty(newUser.email)) errors.email = 'Must not be empty.'
  else if (!isValidEmail(newUser.email)) errors.email = 'Must be a valid email address.'
  if (isEmpty(newUser.password)) errors.password = 'Must not be empty'
  else if (!isValidPassword(newUser.password)) errors.password = 'Must have 8 or more characters'
  if (newUser.password !== newUser.confirmPassword) errors.confirmPassword = 'Passwords must match'
  if (isEmpty(newUser.handle)) errors.handle = 'Must not be empty'

  if (Object.keys(errors).length > 0) response.status(400).json({ errors })

  let token, userId
  db.doc(`/users/${newUser.handle}`)
    .get()
    .then(doc => {
      if (doc.exists) { return response.status(400).json({ handle: `${newUser.handle} handle is already taken.` }) }
      else { return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password) }
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
    .then(() => response.status(201).json({ token }))
    .catch(error => {
      if (error.code === 'auth/email-already-in-use') response.status(400).json({ email: 'Email is already in use.' })
      else response.status(500).json({ error: error.code })
    })
})

app.post('/login', (request, response) => {
  const user = {
    email: request.body.email,
    password: request.body.password
  }

  // Validate
  let errors = {}
  if (isEmpty(user.email)) errors.email = 'Must not be empty'
  else if (!isValidEmail(user.email)) errors.email = 'Must be valid'
  if (isEmpty(user.password)) errors.password = 'Must not be empty'
  else if (!isValidPassword(user.password)) errors.password = 'Must have 8 or more characters'

  if (Object.keys(errors).length > 0) response.status(400).json({ errors })

  firebase.auth().signInWithEmailAndPassword(user.email, user.password)
    .then(data => data.user.getIdToken())
    .then(token => response.json({ token }))
    .catch(error => {
      if (error.code === 'auth/wrong-password') response.status(403).json({ general: 'Wrong credentials, please try again.' })
      else response.status(400).json({ error: error.code })
    })
})

exports.api = functions.https.onRequest(app)
