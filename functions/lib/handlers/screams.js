"use strict";
const { db } = require("../util/admin");
exports.getAllScreams = (req, res) => {
    db.collection("screams")
        .orderBy("createdAt", "desc")
        .get()
        .then((data) => {
        let screams = [];
        data.forEach((doc) => {
            screams.push({
                screamId: doc.id,
                body: doc.data().body,
                userHandle: doc.data().userHandle,
                createdAt: new Date().toISOString()
            });
        });
        return res.json(screams);
    })
        .catch((error) => res.status(400).json({ error: error.code }));
};
exports.createScream = (req, res) => {
    if (req.body.body.trim() === "") {
        return res.status(400).json({ error: "Body must not be empty" });
    }
    const newScream = {
        body: req.body.body,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0,
        screamId: 0
    };
    db.collection("screams")
        .add(newScream)
        .then((doc) => {
        const resScream = newScream;
        resScream.screamId = doc.id;
        return res.json(resScream);
    })
        .catch((error) => res.status(500).json({ error: `Something went wrong! :(` }));
};
exports.getScream = (req, res) => {
    let screamData = {};
    db.doc(`/screams/${req.params.screamId}`)
        .get()
        .then((doc) => {
        if (!doc.exists) {
            return res.status(404).json({ message: "Scream not found" });
        }
        screamData = doc.data();
        screamData.screamId = doc.id;
        return db
            .collection("comments")
            .orderBy("createdAt", "desc")
            .where("screamId", "==", req.params.screamId)
            .get();
    })
        .then((data) => {
        screamData.comments = [];
        data.forEach(doc => {
            screamData.comments.push(doc.data());
        });
        return res.json(screamData);
    })
        .catch((error) => {
        console.error(error);
        return res.status(500).json({ message: error.code });
    });
};
exports.commentOnScream = (req, res) => {
    if (req.body.body.trim() === "") {
        return res.status("400").json({ error: "Must not be empty" });
    }
    const newComment = {
        userHandle: req.user.handle,
        userImage: req.user.imageUrl,
        screamId: req.params.screamId,
        body: req.body.body,
        createdAt: new Date().toISOString()
    };
    db.doc(`/screams/${req.params.screamId}`)
        .get()
        .then((doc) => {
        if (!doc.exists) {
            return res.status(404).json({ error: "Scream not found" });
        }
        return db.collection("comments").add(newComment);
    })
        .then(() => res.json(newComment))
        .catch((error) => {
        console.error(error);
        return res.status(500).json({ error: "Something went wrong!" });
    });
};
exports.likeScream = (req, res) => {
    const likeDocument = db
        .collection("likes")
        .where("userHandle", "==", req.user.handle)
        .where("screamId", "==", req.params.screamId)
        .limit(1);
    const screamDocument = db.doc(`/screams/${req.params.screamId}`);
    let screamData;
    screamDocument
        .get()
        .then((doc) => {
        if (doc.exists) {
            screamData = doc.data();
            screamData.screamId = doc.id;
            return likeDocument.get();
        }
        else {
            return res.status(404).message({ message: "Scream not found" });
        }
    })
        .then((data) => {
        if (data.empty) {
            return db
                .collection("likes")
                .add({
                screamId: req.params.screamId,
                userHandle: req.user.handle
            })
                .then(() => {
                screamData.likeCount++;
                return screamDocument.update({ likeCount: screamData.likeCount });
            })
                .then(() => {
                return res.json(screamData);
            });
        }
        else {
            return res.status(400).json({ error: "Scream alread liked" });
        }
    })
        .catch((error) => {
        console.error(error);
        res.status(500).json({ error: error.code });
    });
};
//# sourceMappingURL=screams.js.map