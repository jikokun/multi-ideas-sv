import { rtdb, auth, signInAnonymously } from '../../firebase-config.js';
import { ref, get, set, update, runTransaction, onValue, query, orderByChild, equalTo } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import '../../laboratorio/tarjetero_sobres_core.js';
import '../../data/tarjetas_default_data.js';
import './jiko_tcg_engine.js';
import './jiko_tcg_service.js';

let offset = 0;
onValue(ref(rtdb, '.info/serverTimeOffset'), snapshot => { offset = Number(snapshot.val()) || 0; });
const store = {
    get: async path => (await get(ref(rtdb, path))).val(),
    set: (path, value) => set(ref(rtdb, path), value),
    update: values => update(ref(rtdb), values),
    transaction: async (path, callback) => {
        const result = await runTransaction(ref(rtdb, path), callback, { applyLocally: false });
        return { committed: result.committed, value: result.snapshot.val() };
    },
    watch: (path, callback) => onValue(ref(rtdb, path), snapshot => callback(snapshot.val()), error => console.warn('[TCG Firebase]', error.message)),
    watchConnection: callback => onValue(ref(rtdb, '.info/connected'), snapshot => callback(snapshot.val() === true)),
    watchPending: callback => onValue(query(ref(rtdb, 'stream/usuarios'), orderByChild('tarjetas/pendiente'), equalTo(true)), snapshot => callback(snapshot.val() || {}), error => console.warn('[TCG recuperación]', error.message)),
    isOnline: async () => (await get(ref(rtdb, '.info/connected'))).val() === true
};
export const TcgCloud = new window.JikoTcgService(store, window.JikoBoosterCore, { now: () => Date.now() + offset });
export const initializeTcg = async () => {
    if (!auth.currentUser) await signInAnonymously(auth).catch(error => console.warn('[TCG sesión]', error.message));
    return TcgCloud.init(window.DEFAULT_JIKOKUN_COLLECTIONS['Coleccion_Jikokun_001-100'].cards);
};
window.JikoTcgCloud = TcgCloud;
