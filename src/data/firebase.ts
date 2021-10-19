let firebasePromise: Promise<typeof import("firebase/app").default> | null =
  null;
let firebseStoragePromise: Promise<any> | null = null;

const _loadFirebase = async () => {
  const firebase = (
    await import(/* webpackChunkName: "firebase" */ "firebase/app")
  ).default;

  const firebaseConfig = JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG);
  firebase.initializeApp(firebaseConfig);

  return firebase;
};
const _getFirebase = async (): Promise<
  typeof import("firebase/app").default
> => {
  if (!firebasePromise) {
    firebasePromise = _loadFirebase();
  }
  return firebasePromise;
};

export const loadFirebaseStorage = async () => {
  const firebase = await _getFirebase();
  if (!firebseStoragePromise) {
    firebseStoragePromise = import(
      /* webpackChunkName: "storage" */ "firebase/storage"
    );
    await firebseStoragePromise;
  }
  return firebase;
};
