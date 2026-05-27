<?php
// router.php — PHP built-in server router for Render.com

$uri  = $_SERVER['REQUEST_URI'];
$path = parse_url($uri, PHP_URL_PATH);
$file = __DIR__ . urldecode($path);

// Default to index.html
if ($path === '/' || $path === '') {
    readfile(__DIR__ . '/index.html');
    exit;
}

// PHP files — require (not include) so they run in clean scope
if (is_file($file) && pathinfo($file, PATHINFO_EXTENSION) === 'php') {
    require $file;
    exit;
}

// Static files
if (is_file($file)) {
    $ext  = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    $mime = [
        'html'  => 'text/html',
        'css'   => 'text/css',
        'js'    => 'application/javascript',
        'csv'   => 'text/csv',
        'json'  => 'application/json',
        'png'   => 'image/png',
        'jpg'   => 'image/jpeg',
        'jpeg'  => 'image/jpeg',
        'ico'   => 'image/x-icon',
        'svg'   => 'image/svg+xml',
        'woff'  => 'font/woff',
        'woff2' => 'font/woff2',
    ][$ext] ?? 'application/octet-stream';
    header('Content-Type: ' . $mime);
    if (in_array($ext, ['html', 'csv'])) {
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
    }
    readfile($file);
    exit;
}

http_response_code(404);
echo '404 Not Found: ' . htmlspecialchars($path);
