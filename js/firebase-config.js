import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBdkM8KiMdV1WMHapZRoGdSZjf0",
  authDomain: "prode-mundial-2026-f0b9f.firebaseapp.com",
  projectId: "prode-mundial-2026-f0b9f",
  storageBucket: "prode-mundial-2026-f0b9f.firebasestorage.app",
  messagingSenderId: "950846208167",
  appId: "1:950846208167:web:08a3f70ed8481cd592c382"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ⚠️ ESTE ES TU EMAIL DE ADMINISTRADOR
// Solo tú tendrás acceso al panel de administración
export const ADMIN_EMAIL = "aomasjhys@gmail.com";