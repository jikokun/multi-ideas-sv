/**
 * MultiIdeasSv - Google Drive Uploader & CDN Generator (Apps Script)
 * Soporta:
 * 1. Avatares de perfil únicos (reemplaza foto anterior).
 * 2. Catálogo de Tiendita / Productos / Negocios múltiples (conserva todos los archivos en la misma carpeta).
 * 3. Actualización de archivos por nombre exacto (si subes pupusas.png reemplaza solo pupusas.png).
 */
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

    // Opciones de comportamiento
    // Si es Tiendita o se indica keepFiles / isMultiple, NO se borran los otros archivos de la carpeta
    var esTienda = (userName === "Tiendita_Jiko" || data.isShop === true);
    var mantenerOtrosArchivos = (esTienda || data.keepFiles === true || data.isMultiple === true || data.mode === "append");

    if (!base64) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "No se recibieron datos de la imagen."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 1. Obtener o crear carpeta principal "Usuarios_MultiIdeasSv"
    var appFolder;
    var appFolders = mainFolder.getFoldersByName("Usuarios_MultiIdeasSv");
    if (appFolders.hasNext()) {
      appFolder = appFolders.next();
    } else {
      appFolder = mainFolder.createFolder("Usuarios_MultiIdeasSv");
    }

    // 2. Obtener o crear la subcarpeta específica
    // Si viene folderName explícito se respeta, de lo contrario usa "Nombre (correo)"
    var userFolderName = data.folderName || (userName + " (" + userEmail + ")");
    userFolderName = userFolderName.replace(/[\\/:*?"<>|]/g, "_").trim();
    
    var targetFolder;
    var existingFolders = appFolder.getFoldersByName(userFolderName);
    if (existingFolders.hasNext()) {
      targetFolder = existingFolders.next();
    } else {
      targetFolder = appFolder.createFolder(userFolderName);
    }

    // 3. GESTIÓN INTELIGENTE DE ARCHIVOS EXISTENTES
    if (mantenerOtrosArchivos) {
      // MODO MULTI-ARCHIVO (TIENDITA / CATÁLOGO / NEGOCIOS):
      // Si ya existe un archivo con EL MISMO NOMBRE EXACTO, se envía a papelera SOLO ESE archivo para actualizarlo,
      // pero se conservan intactos todos los demás platillos/fotos de la carpeta.
      var sameNameFiles = targetFolder.getFilesByName(filename);
      while (sameNameFiles.hasNext()) {
        sameNameFiles.next().setTrashed(true);
      }
    } else {
      // MODO AVATAR / FOTO DE PERFIL ÚNICA:
      // Elimina la foto de perfil anterior para evitar duplicados de perfil
      var existingFiles = targetFolder.getFiles();
      while (existingFiles.hasNext()) {
        existingFiles.next().setTrashed(true);
      }
    }

    // 4. Crear el archivo dentro de la carpeta
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
      userFolder: userFolderName,
      message: mantenerOtrosArchivos 
        ? "Archivo guardado exitosamente en catálogo (archivos anteriores conservados)." 
        : "Foto de perfil actualizada correctamente."
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    service: "MultiIdeasSv Google Drive Uploader",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
