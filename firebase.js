import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Konfigurasi Firebase milik kamu
const firebaseConfig = {
  apiKey: "AIzaSyCMjhDLBxADuVKAXu63GaTCo-whHtgZ2s4",
  authDomain: "pocketwarungbuyusuf.firebaseapp.com",
  projectId: "pocketwarungbuyusuf",
  storageBucket: "pocketwarungbuyusuf.appspot.com",
  messagingSenderId: "43296073935",
  appId: "1:43296073935:web:7d36db866697d59c1f2fba",
  measurementId: "G-MPD31CMZPW"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const docRef = doc(db, "warung", "user-pribadi");

export async function loadFromFirebase() {
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      localStorage.setItem('warungState', JSON.stringify(data));
      window.state = data;
      window.renderPockets();
    } else {
      window.renderPockets(); // fallback
    }
  } catch (e) {
    console.error("Gagal ambil dari Firebase:", e);
    window.renderPockets(); // fallback local
  }
}

export function saveToFirebase(state) {
  setDoc(docRef, state).catch(err => {
    console.error("Gagal simpan ke Firebase:", err);
  });
}
