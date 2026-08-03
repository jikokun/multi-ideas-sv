<?php
// Permitir solicitudes CORS desde OBS y cualquier dominio
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$channel = isset($_GET['channel']) ? strtolower(trim($_GET['channel'])) : '';
$channel = preg_replace('/^@/', '', $channel);

if (empty($channel)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "error" => "Parámetro 'channel' requerido"]);
    exit;
}

// Configuración de directorio de caché local
$cacheDir = __DIR__ . '/cache';
if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0755, true);
}

$cacheFile = (is_dir($cacheDir) && is_writable($cacheDir))
    ? $cacheDir . "/kick_" . md5($channel) . ".json"
    : sys_get_temp_dir() . "/kick_" . md5($channel) . ".json";

$cacheTime = 43200; // 12 Horas

// Devolver caché si existe y no ha expirado
if (file_exists($cacheFile) && (time() - filemtime($cacheFile) < $cacheTime)) {
    $cachedContent = @file_get_contents($cacheFile);
    if ($cachedContent) {
        echo $cachedContent;
        exit;
    }
}

// Helper para guardar caché y retornar respuesta
function returnSuccess($channelName, $roomId, $file) {
    $result = json_encode([
        "status" => "success",
        "channel" => $channelName,
        "chatroom_id" => $roomId
    ]);
    @file_put_contents($file, $result);
    echo $result;
    exit;
}

// 1. Método cURL con cabeceras de navegador real
$url = "https://kick.com/api/v2/channels/" . urlencode($channel);

if (function_exists('curl_init')) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 6);
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
            returnSuccess($channel, $data['chatroom']['id'], $cacheFile);
        }
    }
}

// 2. Método file_get_contents con Stream Context
try {
    $opts = [
        "http" => [
            "method" => "GET",
            "header" => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\r\nAccept: application/json\r\n",
            "timeout" => 5
        ],
        "ssl" => [
            "verify_peer" => false,
            "verify_peer_name" => false
        ]
    ];
    $context = stream_context_create($opts);
    $streamRes = @file_get_contents($url, false, $context);
    if ($streamRes) {
        $dataStream = json_decode($streamRes, true);
        if (isset($dataStream['chatroom']['id'])) {
            returnSuccess($channel, $dataStream['chatroom']['id'], $cacheFile);
        }
    }
} catch (\Throwable $t) {}

// 3. Método Proxy de respaldo mediante AllOrigins
try {
    $proxyUrl = "https://api.allorigins.win/raw?url=" . urlencode($url);
    $proxyRes = @file_get_contents($proxyUrl);
    if ($proxyRes) {
        $dataProxy = json_decode($proxyRes, true);
        if (isset($dataProxy['chatroom']['id'])) {
            returnSuccess($channel, $dataProxy['chatroom']['id'], $cacheFile);
        }
    }
} catch (\Throwable $t) {}

// Si todo falla, responder error JSON sin lanzar HTTP 500
echo json_encode(["status" => "error", "error" => "No se pudo obtener el chatroom_id para " . $channel]);
?>