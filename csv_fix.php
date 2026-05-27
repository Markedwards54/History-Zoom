<?php
// csv_fix.php — One-time cleanup: removes year=0 blocks from persistent disk CSVs
// Visit: https://history-zoom.onrender.com/csv_fix.php

ob_start();
error_reporting(E_ALL);
ini_set('display_errors', 1);

$persistentDir = '/var/data';
$projectDir    = __DIR__;
$isRender      = is_dir($persistentDir) && is_writable($persistentDir);
$dataDir       = $isRender ? $persistentDir : $projectDir;

ob_end_clean();
header('Content-Type: text/plain; charset=utf-8');

$files = ['events.csv', 'multiDayTextBlocks.csv'];
foreach ($files as $fname) {
    $path = $dataDir . '/' . $fname;
    if (!file_exists($path)) { echo "SKIP $fname (not found)\n"; continue; }

    $lines   = file($path, FILE_IGNORE_NEW_LINES);
    $header  = array_shift($lines);
    $before  = count($lines);
    $removed = [];
    $kept    = [];

    foreach ($lines as $line) {
        if (trim($line) === '') continue;
        $cols = str_getcsv($line);

        if ($fname === 'events.csv') {
            $yr = isset($cols[2]) ? trim($cols[2]) : '';
            if ($yr === '0' || $yr === '' || (!is_numeric($yr))) {
                $removed[] = $line;
                continue;
            }
        } else {
            // multiDayTextBlocks — startYear is col 2
            $sy = isset($cols[2]) ? trim($cols[2]) : '';
            if ($sy === '0' || $sy === '' || (!is_numeric($sy))) {
                $removed[] = "text=" . ($cols[7] ?? '?') . " sy=" . $sy;
                continue;
            }
        }
        $kept[] = $line;
    }

    // Write back
    $out = $header . "\r\n" . implode("\r\n", $kept) . "\r\n";
    file_put_contents($path, $out);

    echo "$fname: removed " . count($removed) . " bad rows, kept " . count($kept) . "\n";
    foreach ($removed as $r) echo "  REMOVED: " . substr($r, 0, 100) . "\n";
}
echo "\nDone. Refresh the calendar to verify.\n";
