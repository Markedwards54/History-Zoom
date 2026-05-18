<?php
// router.php — PHP built-in server router for Render.com
// Routes all requests: serves static files directly, handles PHP files

$uri = $_SERVER['REQUEST_URI'];
$path = parse_url($uri, PHP_URL_PATH);

// Strip query string and decode
$file = __DIR__ . urldecode($path);

// Default to index.html
if ($path === '/' || $path === '') {
    include __DIR__ . '/index.html';
    exit;
}

// If it's a real file, serve it
if (is_file($file)) {
    // Let PHP handle .php files
    if (pathinfo($file, PATHINFO_EXTENSION) === 'php') {
        include $file;
        exit;
    }
    // Serve static files with correct MIME type
    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    $mime = [
        'html' => 'text/html',
        'css'  => 'text/css',
        'js'   => 'application/javascript',
        'csv'  => 'text/csv',
        'json' => 'application/json',
        'png'  => 'image/png',
        'jpg'  => 'image/jpeg',
        'ico'  => 'image/x-icon',
        'svg'  => 'image/svg+xml',
        'woff' => 'font/woff',
        'woff2'=> 'font/woff2',
    ][$ext] ?? 'application/octet-stream';
    header('Content-Type: ' . $mime);
    // No-cache for HTML and CSV so edits are seen immediately
    if (in_array($ext, ['html', 'csv'])) {
        header('Cache-Control: no-cache, no-store, must-revalidate');
    }
    readfile($file);
    exit;
}

// 404
http_response_code(404);
echo '404 Not Found';
