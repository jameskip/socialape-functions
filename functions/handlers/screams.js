const { db } = require('../util/admin')

exports.getAllScreams = (request, response) => {
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
          createdAt: new Date().toISOString(),
        })
      })
      return response.json(screams)
    })
    .catch(error => response.status(400).json({ error: error.code }))
}

exports.createScream = (request, response) => {
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
}
