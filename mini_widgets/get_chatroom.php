<?php
// Permitir solicitudes CORS desde OBS y tu dominio
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

$channel = isset($_GET['channel']) ? strtolower(trim($_GET['channel'])) : '';

if (empty($channel)) {
    http_response_code(400);
    echo json_encode(["error" => "Parámetro 'channel' requerido"]);
    exit;
}

// Configuración de caché simple en archivo local
$cacheFile = sys_get_temp_dir() . "/kick_chat_" . md5($channel) . ".json";
$cacheTime = 86400; // 24 Horas

if (file_exists($cacheFile) && (time() - filemtime($cacheFile) < $cacheTime)) {
    echo file_get_contents($cacheFile);
    exit;
}

// Petición al endpoint interno simulando cabeceras de navegador real para evitar Cloudflare
$url = "https://kick.com/api/v2/channels/" . urlencode($channel);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json',
    'Accept-Language: en-US,en;q=0.9',
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200 && $response) {
    $data = json_decode($response, true);
    if (isset($data['chatroom']['id'])) {
        $result = json_encode([
            "status" => "success",
            "channel" => $channel,
            "chatroom_id" => $data['chatroom']['id']
        ]);
        file_put_contents($cacheFile, $result);
        echo $result;
        exit;
    }
}

// Respuesta en caso de fallo
http_response_code(500);
echo json_encode(["error" => "No se pudo obtener el chatroom_id para " . $channel]);
?>