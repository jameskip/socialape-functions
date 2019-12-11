const firebase = require('firebase')
const { db, admin } = require('../util/admin')
const { isEmpty, isValidEmail, isValidPassword, reduceUserDetails } = require('../util/validators')

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

// Firebase authentication middleware
exports.FBAuth = (request, response, next) => {
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

exports.signup = (request, response) => {
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

  const noImg = 'default-profile.png'

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
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${noImg}?alt=media`,
        userId
      }
      return db.doc(`/users/${newUser.handle}`).set(userCredentials)
    })
    .then(() => response.status(201).json({ token }))
    .catch(error => {
      if (error.code === 'auth/email-already-in-use') response.status(400).json({ email: 'Email is already in use.' })
      else response.status(500).json({ error: error.code })
    })
}

exports.login = (request, response) => {
  const user = {
    email: request.body.email,
    password: request.body.password
  }

  // Validate user credentials
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
}

exports.updateUserDetails = (request, response) => {
  const userDetails = reduceUserDetails(request.body)

  db.doc(`/users/${request.user.handle}`)
    .update(userDetails)
    .then(() => response.json({ message: 'Details saved successfuly' }))
    .catch((error) => {
      console.error(error)
      response.status(500).json({ error: error.code })
    })
}

exports.uploadImage = (request, response) => {
  const BusBoy = require('busboy')
  const path = require('path')
  const os = require('os')
  const fs = require('fs')

  const busboy = new BusBoy({ headers: request.headers })

  let imageFileName
  let imageToBeUploaded

  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') response.status(500).json({ error: 'Must be image type.' })

    const imageExtension = filename.split('.')[filename.split('.').length - 1]
    imageFileName = `${Math.round(Math.random() * 10000000)}.${imageExtension}`
    const filepath = path.join(os.tmpdir(), imageFileName)
    imageToBeUploaded = { filepath, mimetype }
    file.pipe(fs.createWriteStream(filepath))
  })

  busboy.on('finish', () => {
    admin.storage().bucket('socialape-9a7bf.appspot.com').upload(imageToBeUploaded.filepath, {
      resumable: false,
      metadata: {
        metadata: {
          contentType: imageToBeUploaded.mimetype
        }
      }
    })
      .then(() => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${imageFileName}?alt=media`
        return db.doc(`/users/${request.user.handle}`).update({ imageUrl })
      })
      .then(() => response.json({ message: 'Image uploaded successfuly!' }))
      .catch((error) => response.status(500).json({ error: error.code }))
  })

  busboy.end(request.rawBody)
}
