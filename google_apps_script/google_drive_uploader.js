/**
 * MultiIdeasSv - Google Drive Manager, Uploader & CDN Explorer (Apps Script)
 * Versión Avanzada con Soporte Recursivo para Subcarpetas.
 * 
 * Capacidades:
 * 1. doGet:
 *    - ?action=all (por defecto): Escanea y muestra la estructura completa de carpetas, subcarpetas y archivos.
 *    - ?folder=tarjetas_jikokun: Muestra específicamente la carpeta con TODAS sus subcarpetas internas y archivos.
 *    - ?action=status: Ping rápido de estado online.
 * 2. doPost:
 *    - Subida de avatares, fotos de la Tiendita o cartas/imágenes directo a subcarpetas.
 *    - Enlaces CDN directos y veloces: https://lh3.googleusercontent.com/d/{id}
 */

function doGet(e) {
  try {
    var mainFolderId = "1dgWclFLAzfcxBj2BY6rgLhkhi5_K_AkQ";
    var mainFolder = DriveApp.getFolderById(mainFolderId);
    
    var params = (e && e.parameter) ? e.parameter : {};
    var action = params.action || "";
    var specificFolder = params.folder || "";

    // 1. PING RÁPIDO DE ESTADO: ?action=status
    if (action === "status") {
      return ContentService.createTextOutput(JSON.stringify({
        status: "online",
        service: "MultiIdeasSv Google Drive Manager",
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. CONSULTAR CARPETA ESPECÍFICA (CON TODAS SUS SUBCARPETAS Y ARCHIVOS):
    // Ej: ?folder=tarjetas_jikokun o ?action=folder
    if (specificFolder || action === "folder") {
      var searchName = specificFolder || "tarjetas_jikokun";
      var folder = findFolderByName(mainFolder, searchName);
      
      if (!folder) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          message: "No se encontró la carpeta '" + searchName + "' en el Google Drive."
        })).setMimeType(ContentService.MimeType.JSON);
      }

      // Escaneo profundo de esta carpeta con todas sus subcarpetas y archivos
      var detailedFolder = scanFolder(folder, 0, 3);

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        data: detailedFolder,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. MODO EXPLORADOR TOTAL (POR DEFECTO):
    // Devuelve todas las carpetas raíz (incluyendo Tarjetas_jikokun, Usuarios_MultiIdeasSv, etc.)
    // junto con todas las subcarpetas que contengan y sus archivos.
    var rootFiles = [];
    var rootFolders = [];

    // Archivos directos en la raíz principal
    var rfIt = mainFolder.getFiles();
    while (rfIt.hasNext()) {
      rootFiles.push(formatFileInfo(rfIt.next()));
    }

    // Carpetas en la raíz principal
    var fIt = mainFolder.getFolders();
    while (fIt.hasNext()) {
      var currentFolder = fIt.next();
      // Escanear cada carpeta con sus subcarpetas y archivos
      rootFolders.push(scanFolder(currentFolder, 0, 3));
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "online",
      service: "MultiIdeasSv Google Drive Manager",
      mainFolder: {
        id: mainFolder.getId(),
        name: mainFolder.getName(),
        url: mainFolder.getUrl()
      },
      totalRootFolders: rootFolders.length,
      totalRootFiles: rootFiles.length,
      rootFiles: rootFiles,
      folders: rootFolders,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var mainFolderId = "1dgWclFLAzfcxBj2BY6rgLhkhi5_K_AkQ";
    var mainFolder = DriveApp.getFolderById(mainFolderId);
    
    var data = {};
    if (e && e.parameter && e.parameter.base64) {
      data = e.parameter;
    } else if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch(errJson) {
        data = e.parameter || {};
      }
    }

    var base64 = data.base64 || "";
    var mimeType = data.mimeType || "image/png";
    var filename = data.filename || ("archivo_" + Date.now() + ".png");
    var userName = data.userName || "Usuario_Anonimo";
    var userEmail = data.userEmail || "sin_correo";

    // Si es Tiendita, tarjetas o se indica keepFiles, no se borran los otros archivos
    var esTienda = (userName === "Tiendita_Jiko" || data.isShop === true);
    var esTarjetas = (data.folderName && data.folderName.toLowerCase().indexOf("tarjeta") !== -1);
    var mantenerOtrosArchivos = (esTienda || esTarjetas || data.keepFiles === true || data.isMultiple === true || data.mode === "append");

    if (!base64) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "No se recibieron datos de la imagen."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Carpeta destino solicitada
    var targetFolderName = data.folderName || (userName + " (" + userEmail + ")");
    targetFolderName = targetFolderName.replace(/[\\/:*?"<>|]/g, "_").trim();

    var targetFolder = null;

    // 1. Buscar si la carpeta ya existe (en raíz o subcarpetas)
    targetFolder = findFolderByName(mainFolder, targetFolderName);

    // 2. Si no existe, crearla donde corresponda
    if (!targetFolder) {
      if (data.inRoot === true || targetFolderName.toLowerCase().indexOf("tarjeta") !== -1) {
        targetFolder = mainFolder.createFolder(targetFolderName);
      } else {
        // Carpeta de usuarios común
        var appFolder = null;
        var appFolders = mainFolder.getFoldersByName("Usuarios_MultiIdeasSv");
        if (appFolders.hasNext()) {
          appFolder = appFolders.next();
        } else {
          appFolder = mainFolder.createFolder("Usuarios_MultiIdeasSv");
        }
        targetFolder = appFolder.createFolder(targetFolderName);
      }
    }

    // Si viene una subcarpeta interna especificada (ej: subfolderName: "Serie_01")
    if (data.subfolderName) {
      var subName = data.subfolderName.replace(/[\\/:*?"<>|]/g, "_").trim();
      var subIt = targetFolder.getFoldersByName(subName);
      if (subIt.hasNext()) {
        targetFolder = subIt.next();
      } else {
        targetFolder = targetFolder.createFolder(subName);
      }
    }

    // 3. GESTIÓN DE ARCHIVOS EXISTENTES
    if (mantenerOtrosArchivos) {
      // Reemplaza sólo si tiene exactamente el mismo nombre de archivo
      var sameNameFiles = targetFolder.getFilesByName(filename);
      while (sameNameFiles.hasNext()) {
        sameNameFiles.next().setTrashed(true);
      }
    } else {
      // Modo avatar: elimina foto anterior
      var existingFiles = targetFolder.getFiles();
      while (existingFiles.hasNext()) {
        existingFiles.next().setTrashed(true);
      }
    }

    // 4. Crear archivo
    var decoded = Utilities.base64Decode(base64);
    var blob = Utilities.newBlob(decoded, mimeType, filename);
    var file = targetFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var fileId = file.getId();
    var fileUrl = "https://lh3.googleusercontent.com/d/" + fileId;
    var directUrl = "https://docs.google.com/uc?export=download&id=" + fileId;
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      fileId: fileId,
      fileUrl: fileUrl,
      directUrl: directUrl,
      filename: filename,
      targetFolder: targetFolder.getName(),
      message: "Archivo guardado exitosamente."
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Escanea de forma recursiva una carpeta, obteniendo todos sus archivos directos
 * y todas sus subcarpetas con sus respectivos archivos.
 */
function scanFolder(folder, currentDepth, maxDepth) {
  if (currentDepth === undefined) currentDepth = 0;
  if (maxDepth === undefined) maxDepth = 3;

  var directFiles = [];
  var fIt = folder.getFiles();
  while (fIt.hasNext()) {
    directFiles.push(formatFileInfo(fIt.next()));
  }

  var subfolders = [];
  if (currentDepth < maxDepth) {
    var subIt = folder.getFolders();
    while (subIt.hasNext()) {
      var sf = subIt.next();
      subfolders.push(scanFolder(sf, currentDepth + 1, maxDepth));
    }
  }

  return {
    id: folder.getId(),
    name: folder.getName(),
    url: folder.getUrl(),
    totalFiles: directFiles.length,
    totalDirectFiles: directFiles.length,
    files: directFiles,
    totalSubfolders: subfolders.length,
    subfolders: subfolders
  };
}

/**
 * Helper para formatear datos de archivo con URLs CDN de Google Drive
 */
function formatFileInfo(file) {
  var id = file.getId();
  return {
    id: id,
    name: file.getName(),
    mimeType: file.getMimeType(),
    size: file.getSize(),
    cdnUrl: "https://lh3.googleusercontent.com/d/" + id,
    directUrl: "https://docs.google.com/uc?export=download&id=" + id,
    viewUrl: file.getUrl()
  };
}

/**
 * Helper para buscar carpetas de forma insensible a mayúsculas/minúsculas
 * (busca en raíz, Usuarios_MultiIdeasSv y cualquier subcarpeta)
 */
function findFolderByName(mainFolder, name) {
  var target = (name || "").trim().toLowerCase();
  if (!target) return null;

  // 1. Buscar en la raíz directamente
  var it = mainFolder.getFolders();
  while (it.hasNext()) {
    var f = it.next();
    if (f.getName().toLowerCase() === target) return f;
  }

  // 2. Buscar dentro de Usuarios_MultiIdeasSv
  var appFolders = mainFolder.getFoldersByName("Usuarios_MultiIdeasSv");
  if (appFolders.hasNext()) {
    var appFolder = appFolders.next();
    var subIt = appFolder.getFolders();
    while (subIt.hasNext()) {
      var sf = subIt.next();
      if (sf.getName().toLowerCase() === target) return sf;
    }
  }

  // 3. Buscar en segundo nivel en todas las carpetas raíz
  var rootIt = mainFolder.getFolders();
  while (rootIt.hasNext()) {
    var rf = rootIt.next();
    var rsubIt = rf.getFolders();
    while (rsubIt.hasNext()) {
      var rsf = rsubIt.next();
      if (rsf.getName().toLowerCase() === target) return rsf;
    }
  }

  return null;
}
