<?php
// csv_serve.php — serves CSV files from persistent disk (Render) or project dir (local)
// Called by script.js and fomc.js instead of fetching the raw CSV directly

error_reporting(0);
$f = basename($_GET['file'] ?? '');
if (!in_array($f, ['events.csv', 'multiDayTextBlocks.csv', 'fomc.csv'])) {
    http_response_code(400); echo 'bad file'; exit;
}

$persistentDir = '/var/data';
$projectDir    = __DIR__;

if (is_dir($persistentDir) && file_exists($persistentDir . '/' . $f)) {
    $path = $persistentDir . '/' . $f;
} else {
    $path = $projectDir . '/' . $f;
}

if (!file_exists($path)) { http_response_code(404); echo 'not found'; exit; }

header('Content-Type: text/csv; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Access-Control-Allow-Origin: *');
readfile($path);
