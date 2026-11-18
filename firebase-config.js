// ==========================================================================
// CONFIGURACIÓN CENTRALIZADA DE FIREBASE - MULTI IDEAS SV & SENSUN SHOP
// ==========================================================================
// Módulos oficiales de Firebase v10 desde el CDN de Google.
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
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
    reauthenticateWithPopup,
    GoogleAuthProvider,
    signInWithPopup,
    getAdditionalUserInfo,
    signInWithRedirect,
    getRedirectResult,
    signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, get, ref } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Configuración real y precisa copiada de la consola de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBPDKdjd6mTRre3TJ5nYxAaaZd7uKCcbyc",
    authDomain: "sensunshopweb.firebaseapp.com",
    databaseURL: "https://sensunshopweb-default-rtdb.firebaseio.com",
    projectId: "sensunshopweb",
    storageBucket: "sensunshopweb.firebasestorage.app",
    messagingSenderId: "618261314687",
    appId: "1:618261314687:web:b71c592f23538e2ca2d34a",
    measurementId: "G-WYP6KJ6B0J"
};

// Inicializar Firebase evitando colisión de app duplicada
const app = getApps().find(existing => existing.name === "[DEFAULT]") || initializeApp(firebaseConfig);

// Inicializar servicios para exportación
const auth = getAuth(app);
const rtdb = getDatabase(app);

export async function getStreamAvatar(username) {
    const key = username.replace(/[.#$\[\]\/]/g, "_");
    const snapshot = await get(ref(rtdb, `stream/usuarios/${key}/avatar`));
    return snapshot.val();
}

export function subscribeWhilePageOpen(subscribe) {
    let unsubscribe = subscribe();
    function stop() {
        unsubscribe?.();
        unsubscribe = null;
    }
    function resume(event) {
        if (event.persisted && !unsubscribe) unsubscribe = subscribe();
    }
    window.addEventListener("pagehide", stop);
    window.addEventListener("pageshow", resume);
    return () => {
        stop();
        window.removeEventListener("pagehide", stop);
        window.removeEventListener("pageshow", resume);
    };
}

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
    reauthenticateWithPopup,
    GoogleAuthProvider,
    signInWithPopup,
    getAdditionalUserInfo,
    signInWithRedirect,
    getRedirectResult,
    signInAnonymously
};
