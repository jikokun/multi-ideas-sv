/**
 * Explorador e Inspector de Imágenes de Google Drive para Multi Ideas SV
 * Permite leer en tiempo real la carpeta oficial de imágenes del negocio,
 * sus subcarpetas y todos los archivos con sus enlaces directos CDN (lh3.googleusercontent.com).
 */

const ENDPOINT_DRIVE = 'https://script.google.com/macros/s/AKfycbz5Zq7CYZTgrA6QoCAWCLzIRx-Y_fLyex_OMS124dCQPCxj-fJTd6okjS6Bovv4PT_w/exec';
const FOLDER_NAME = process.argv[2] || 'Imagenes_Negocio_MultiIdeasSv';

async function obtenerEstructura(folderName = FOLDER_NAME) {
  try {
    const url = `${ENDPOINT_DRIVE}?folder=${encodeURIComponent(folderName)}`;
    console.log(`📡 Consultando Google Drive para: "${folderName}"...`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('❌ Error al consultar Google Drive:', err.message);
    return null;
  }
}

function imprimirArbol(folder, indent = '') {
  console.log(`${indent}📁 [CARPETA] ${folder.name} (${folder.files.length} archivos, ${folder.subfolders.length} subcarpetas)`);
  console.log(`${indent}   🔗 Enlace Drive: ${folder.url}`);
  
  if (folder.files && folder.files.length > 0) {
    folder.files.forEach(f => {
      const isInit = f.name.startsWith('.init_');
      const icon = isInit ? '⚙️' : '🖼️';
      console.log(`${indent}   ${icon} ${f.name} (${(f.size / 1024).toFixed(1)} KB)`);
      console.log(`${indent}      ⚡ CDN: ${f.cdnUrl}`);
    });
  }

  if (folder.subfolders && folder.subfolders.length > 0) {
    folder.subfolders.forEach(sf => {
      imprimirArbol(sf, indent + '   ');
    });
  }
}

async function main() {
  const result = await obtenerEstructura();
  if (result && result.status === 'success' && result.data) {
    console.log('\n======================================================');
    console.log('📂 ESTRUCTURA ACTUAL DE GOOGLE DRIVE - MULTI IDEAS SV');
    console.log('======================================================\n');
    imprimirArbol(result.data);
    console.log('\n======================================================');
    console.log('✅ Escaneo completado con éxito.');
  } else {
    console.log('⚠️ No se pudo obtener la carpeta o no existe.', result);
  }
}

if (require.main === module) {
  main();
}

module.exports = { obtenerEstructura, ENDPOINT_DRIVE, FOLDER_NAME };
