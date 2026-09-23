import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "SİZİN_API_KEY",
  authDomain: "nevera-mebel.firebaseapp.com",
  projectId: "nevera-mebel",
  storageBucket: "nevera-mebel.appspot.com",
  messagingSenderId: "SİZİN_SENDER_ID",
  appId: "SİZİN_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
