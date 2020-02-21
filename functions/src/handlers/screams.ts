const { db } = require("../util/admin");

interface IBody {
  email: string;
  password: string;
  confirmPassword: string;
  handle: string;
  body: string;
}

interface User {
  body?: IBody;
  uid?: string;
  handle?: string;
  imageUrl?: string;
}

interface IRequest extends Express.Request {
  headers: {
    authorization: string;
  };
  body: IBody;
  user: User;
  rawBody: string;
  params: { screamId: string; handle: string };
}

interface IResponse extends Express.Response {
  status: Function;
  body: IBody;
  json: Function;
}

interface IErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  handle?: string;
  code?: string;
}

interface Scream {
  id: number;
  data: Function;
  [propName: string]: any;
  exists: boolean;
  screamId?: string;
  userHandle?: string;
  userImage?: string;
  comments: string[];
}

exports.getAllScreams = (req: IRequest, res: IResponse) => {
  db.collection("screams")
    .orderBy("createdAt", "desc")
    .get()
    .then((data: Scream[]) => {
      let screams: object[] = [];
      data.forEach((doc: Scream) => {
        screams.push({
          screamId: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: new Date().toISOString()
        });
      });
      return res.json(screams);
    })
    .catch((error: IErrors) => res.status(400).json({ error: error.code }));
};

exports.createScream = (req: IRequest, res: IResponse) => {
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
    .then((doc: Scream) => {
      const resScream = newScream;
      resScream.screamId = doc.id;
      return res.json(resScream);
    })
    .catch((error: Error) =>
      res.status(500).json({ error: `Something went wrong! :(` })
    );
};

exports.getScream = (req: IRequest, res: IResponse) => {
  let screamData: any = {};
  db.doc(`/screams/${req.params.screamId}`)
    .get()
    .then((doc: Scream) => {
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
    .then((data: Scream[]) => {
      screamData.comments = [];
      data.forEach(doc => {
        screamData.comments.push(doc.data());
      });
      return res.json(screamData);
    })
    .catch((error: IErrors) => {
      console.error(error);
      return res.status(500).json({ message: error.code });
    });
};

exports.commentOnScream = (req: IRequest, res: IResponse) => {
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
    .then((doc: Scream) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Scream not found" });
      }
      return db.collection("comments").add(newComment);
    })
    .then(() => res.json(newComment))
    .catch((error: Error) => {
      console.error(error);
      return res.status(500).json({ error: "Something went wrong!" });
    });
};

exports.likeScream = (req: IRequest, res: IResponse) => {
  const likeDocument = db
    .collection("likes")
    .where("userHandle", "==", req.user.handle)
    .where("screamId", "==", req.params.screamId)
    .limit(1);

  const screamDocument = db.doc(`/screams/${req.params.screamId}`);

  let screamData: {
    screamId: number;
    likeCount: number;
  };

  screamDocument
    .get()
    .then((doc: Scream) => {
      if (doc.exists) {
        screamData = doc.data();
        screamData.screamId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).message({ message: "Scream not found" });
      }
    })
    .then((data: Scream) => {
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
      } else {
        return res.status(400).json({ error: "Scream alread liked" });
      }
    })
    .catch((error: IErrors) => {
      console.error(error);
      res.status(500).json({ error: error.code });
    });
};
