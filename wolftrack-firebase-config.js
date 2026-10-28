// ==========================================================================
// CONFIGURACIÓN CENTRALIZADA DE FIREBASE - WOLFTRACK & JIKOPUNTOS
// ==========================================================================
// Proyecto Firebase: JikoPuntos (com-example-jikopuntos-f9ff5)
// App Web: Wolftrack web Sensun Shop
// ==========================================================================
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    updateProfile,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getDatabase, 
    ref, 
    set, 
    get, 
    push, 
    update, 
    remove, 
    onValue, 
    serverTimestamp,
    query,
    orderByChild,
    equalTo
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

export const wolfTrackFirebaseConfig = {
    apiKey: "AIzaSyCsllCwOtTpW9WFRnzBu7l2tsPKmxjX2Y0",
    authDomain: "com-example-jikopuntos-f9ff5.firebaseapp.com",
    databaseURL: "https://com-example-jikopuntos-f9ff5-default-rtdb.firebaseio.com",
    projectId: "com-example-jikopuntos-f9ff5",
    storageBucket: "com-example-jikopuntos-f9ff5.firebasestorage.app",
    messagingSenderId: "854546825584",
    appId: "1:854546825584:web:c2e36707639788fd7ecfb5",
    measurementId: "G-NBGNP4KMYV"
};

// Inicialización multi-app con nombre único para evitar colisiones con sensunshopweb
const APP_NAME = "wolfTrackApp";
const wolfApp = getApps().find(a => a.name === APP_NAME) 
    || initializeApp(wolfTrackFirebaseConfig, APP_NAME);

const wolfAuth = getAuth(wolfApp);
const wolfRtdb = getDatabase(wolfApp);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export {
    wolfApp,
    wolfAuth,
    wolfRtdb,
    googleProvider,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    updateProfile,
    onAuthStateChanged,
    signInWithPopup,
    ref,
    set,
    get,
    push,
    update,
    remove,
    onValue,
    serverTimestamp,
    query,
    orderByChild,
    equalTo
};
