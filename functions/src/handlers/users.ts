export {};
const firebase = require("firebase");
const { db, admin } = require("../util/admin");
const {
  isEmpty,
  isValidEmail,
  isValidPassword,
  reduceUserDetails
} = require("../util/validators");

const firebaseConfig = {
  apiKey: "AIzaSyCThbLv30frPmVA6qHELYQgGn81lIa58f0",
  authDomain: "socialape-9a7bf.firebaseapp.com",
  databaseURL: "https://socialape-9a7bf.firebaseio.com",
  projectId: "socialape-9a7bf",
  storageBucket: "socialape-9a7bf.appspot.com",
  messagingSenderId: "791441825599",
  appId: "1:791441825599:web:0fe9cf6631e3b883d9fd8a",
  measurementId: "G-N90ECF1FNG"
};
firebase.initializeApp(firebaseConfig);

interface IBody {
  email: string;
  password: string;
  confirmPassword: string;
  handle: string;
}

interface User {
  body?: IBody;
  uid?: string;
  handle?: string;
  imageUrl?: string;
  [propName: string]: any;
}

interface IErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  handle?: string;
  code?: string;
  name?: string;
  message?: string;
}

interface IRequest extends Express.Request {
  headers: {
    authorization: string;
  };
  body: IBody;
  user: User;
  rawBody: string;
}

interface IResponse extends Express.Response {
  status: Function;
  body: IBody;
  json: Function;
}

interface ImageUp {
  filepath: string;
  mimetype: string;
}

// Firebase authentication middleware
exports.FBAuth = (req: IRequest, res: IResponse, next: Function) => {
  let idToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    idToken = req.headers.authorization.split("Bearer ")[1];
  } else {
    res.status(403).json({ error: "Unauthorized" });
  }
  admin
    .auth()
    .verifyIdToken(idToken)
    .then((decodedToken: User) => {
      req.user = decodedToken;
      return db
        .collection("users")
        .where("userId", "==", req.user.uid)
        .limit(1)
        .get();
    })
    .then((data: User) => {
      req.user.handle = data.docs[0].data().handle;
      req.user.imageUrl = data.docs[0].data().imageUrl;
      return next();
    })
    .catch((error: Error) =>
      res.status(403).json({ error: "Unauthorized: " + error })
    );
};

exports.signup = (req: IRequest, res: IResponse) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle
  };

  // Validate user input
  const errors: IErrors = {};
  if (isEmpty(newUser.email)) {
    errors.email = "Must not be empty.";
  } else if (!isValidEmail(newUser.email)) {
    errors.email = "Must be a valid email address.";
  }
  if (isEmpty(newUser.password)) {
    errors.password = "Must not be empty";
  } else if (!isValidPassword(newUser.password)) {
    errors.password = "Must have 8 or more characters";
  }
  if (newUser.password !== newUser.confirmPassword) {
    errors.confirmPassword = "Passwords must match";
  }
  if (isEmpty(newUser.handle)) {
    errors.handle = "Must not be empty";
  }
  if (Object.keys(errors).length > 0) {
    res.status(400).json({ errors });
  }

  const noImg = "default-profile.png";

  let token: string, userId: string;
  db.doc(`/users/${newUser.handle}`)
    .get()
    .then((doc: User) => {
      if (doc.exists) {
        return res
          .status(400)
          .json({ handle: `${newUser.handle} handle is already taken.` });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then((data: User) => {
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then((idToken: string) => {
      token = idToken;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${noImg}?alt=media`,
        userId
      };
      return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => res.status(201).json({ token }))
    .catch((error: any) => {
      if (error.code === "auth/email-already-in-use") {
        return res.status(400).json({ email: "Email is already in use." });
      } else {
        return res.status(500).json({ error: error.code });
      }
    });
};

exports.login = (req: IRequest, res: IResponse) => {
  const user = {
    email: req.body.email,
    password: req.body.password
  };

  // Validate user credentials
  const errors: IErrors = {};
  if (isEmpty(user.email)) {
    errors.email = "Must not be empty";
  } else if (!isValidEmail(user.email)) {
    errors.email = "Must be valid";
  }
  if (isEmpty(user.password)) {
    errors.password = "Must not be empty";
  } else if (!isValidPassword(user.password)) {
    errors.password = "Must have 8 or more characters";
  }
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then((data: User) => data.user.getIdToken())
    .then((token: string) => res.json({ token }))
    .catch((error: any) => {
      if (error.code === "auth/wrong-password") {
        return res
          .status(403)
          .json({ general: "Wrong credentials, please try again." });
      } else {
        return res.status(400).json({ error: error.code });
      }
    });
};

exports.updateUserDetails = (req: IRequest, res: IResponse) => {
  const userDetails = reduceUserDetails(req.body);

  db.doc(`/users/${req.user.handle}`)
    .update(userDetails)
    .then(() => res.json({ message: "Details saved successfuly" }))
    .catch((error: any) => {
      console.error(error);
      return res.status(500).json({ error: error.code });
    });
};

exports.getAuthenticatedUser = (req: IRequest, res: IResponse) => {
  const userData: User = {};
  db.doc(`/users/${req.user.handle}`)
    .get()
    .then((doc: User) => {
      if (doc.exists) {
        userData.credentials = doc.data();
        return db
          .collection("likes")
          .where("userHandle", "==", req.user.handle)
          .get();
      }
      throw Error;
    })
    .then((data: []) => {
      userData.likes = [];
      data.forEach((doc: User) => userData.likes.push(doc.data()));
      return res.json(userData);
    })
    .catch((error: any) => {
      console.error(error);
      return res.status(500).json({ error: error.code });
    });
};

exports.uploadImage = (req: IRequest, res: IResponse) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({ headers: req.headers });

  let imageFileName: string;
  let imageToBeUploaded: ImageUp;

  busboy.on(
    "file",
    (
      fieldname: string,
      file: any,
      filename: string,
      encoding: any,
      mimetype: string
    ) => {
      if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
        res.status(500).json({ error: "Must be image type." });
      }

      const imageExtension = filename.split(".")[
        filename.split(".").length - 1
      ];
      imageFileName = `${Math.round(
        Math.random() * 10000000
      )}.${imageExtension}`;
      const filepath = path.join(os.tmpdir(), imageFileName);
      imageToBeUploaded = { filepath, mimetype };
      file.pipe(fs.createWriteStream(filepath));
    }
  );

  busboy.on("finish", () => {
    admin
      .storage()
      .bucket("socialape-9a7bf.appspot.com")
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype
          }
        }
      })
      .then(() => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${imageFileName}?alt=media`;
        return db.doc(`/users/${req.user.handle}`).update({ imageUrl });
      })
      .then(() => res.json({ message: "Image uploaded successfuly!" }))
      .catch((error: any) => res.status(500).json({ error: error.code }));
  });

  busboy.end(req.rawBody);
};
