// ==========================================================================
// CONFIGURACIÓN CENTRALIZADA DE FIREBASE - MULTI IDEAS SV & SENSUN SHOP
// ==========================================================================
// Módulos oficiales de Firebase v10 desde el CDN de Google.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    updateProfile,
    onAuthStateChanged,
    deleteUser,
    EmailAuthProvider,
    reauthenticateWithCredential,
    GoogleAuthProvider,
    signInWithPopup,
    getAdditionalUserInfo,
    signInWithRedirect,
    getRedirectResult
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Configuración real y precisa copiada de la consola de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBPDKdjd6mTRre3TJ5nYxAaaZd7uKCcbyc",
    authDomain: "sensunshopweb.firebaseapp.com",
    projectId: "sensunshopweb",
    storageBucket: "sensunshopweb.firebasestorage.app",
    messagingSenderId: "618261314687",
    appId: "1:618261314687:web:b71c592f23538e2ca2d34a",
    measurementId: "G-WYP6KJ6B0J"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar servicios para exportación
const auth = getAuth(app);
const rtdb = getDatabase(app);

// Exportar módulos y funciones listos para su uso
export { 
    app, 
    auth, 
    rtdb, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    updateProfile,
    onAuthStateChanged,
    deleteUser,
    EmailAuthProvider,
    reauthenticateWithCredential,
    GoogleAuthProvider,
    signInWithPopup,
    getAdditionalUserInfo,
    signInWithRedirect,
    getRedirectResult
};
