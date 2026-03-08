import { initializeApp }                from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { getAuth, connectAuthEmulator }           from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { firebaseConfig }              from "./config.js";

const app    = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);

// ローカル開発時はエミュレーターに接続
if (location.hostname === "localhost") {
  connectFirestoreEmulator(db, "localhost", 8080);
  connectAuthEmulator(auth, "http://localhost:9099");
}
