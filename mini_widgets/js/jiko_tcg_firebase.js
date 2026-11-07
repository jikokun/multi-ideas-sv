import { rtdb, auth, signInAnonymously } from '../../firebase-config.js';
import { ref, get, set, update, runTransaction, onValue, query, orderByChild, equalTo } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import '../../laboratorio/tarjetero_sobres_core.js';
import '../../data/tarjetas_default_data.js';
import './jiko_tcg_engine.js';
import './jiko_tcg_service.js';

let offset = 0;
let connected = false;
onValue(ref(rtdb, '.info/serverTimeOffset'), snapshot => { offset = Number(snapshot.val()) || 0; });
// .info es estado local del SDK; get() intenta consultarlo al servidor y puede
// devolver "Invalid token in path" aun con conexión válida. Usar su observador.
onValue(ref(rtdb, '.info/connected'), snapshot => { connected = snapshot.val() === true; });
const store = {
    get: async path => (await get(ref(rtdb, path))).val(),
    set: (path, value) => set(ref(rtdb, path), value),
    update: values => update(ref(rtdb), values),
    transaction: async (path, callback) => {
        const target = ref(rtdb, path);
        let stop;
        try {
            // Mantener el dato en caché hasta confirmar: el primer callback de
            // runTransaction puede recibir null aunque el perfil exista en RTDB.
            await new Promise((resolve, reject) => { stop = onValue(target, resolve, reject); });
            const result = await runTransaction(target, callback, { applyLocally: false });
            return { committed: result.committed, value: result.snapshot.val() };
        } finally { stop?.(); }
    },
    watch: (path, callback) => onValue(ref(rtdb, path), snapshot => callback(snapshot.val()), error => console.warn('[TCG Firebase]', error.message)),
    watchConnection: callback => onValue(ref(rtdb, '.info/connected'), snapshot => callback(snapshot.val() === true)),
    watchPending: callback => onValue(query(ref(rtdb, 'stream/usuarios'), orderByChild('tarjetas/pendiente'), equalTo(true)), snapshot => callback(snapshot.val() || {}), error => console.warn('[TCG recuperación]', error.message)),
    isOnline: async () => connected
};
export const TcgCloud = new window.JikoTcgService(store, window.JikoBoosterCore, { now: () => Date.now() + offset });
export const initializeTcg = async () => {
    if (!auth.currentUser) await signInAnonymously(auth).catch(error => console.warn('[TCG sesión]', error.message));
    return TcgCloud.init(window.DEFAULT_JIKOKUN_COLLECTIONS['Coleccion_Jikokun_001-100'].cards);
};
window.JikoTcgCloud = TcgCloud;
