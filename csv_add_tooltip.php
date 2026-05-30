<?php
// csv_add_tooltip.php — Adds tooltip column to live CSVs on Render's persistent disk
// Run once: https://history-zoom.onrender.com/csv_add_tooltip.php?confirm=yes

header('Content-Type: text/plain; charset=utf-8');

if (($_GET['confirm'] ?? '') !== 'yes') {
    echo "Add ?confirm=yes to proceed.\n";
    echo "This adds a 'tooltip' column to events.csv and multiDayTextBlocks.csv\n";
    exit;
}

$persistentDir = '/var/data';
$projectDir    = __DIR__;
$isRender      = is_dir($persistentDir) && is_writable($persistentDir);
$dataDir       = $isRender ? $persistentDir : $projectDir;

echo "Data dir: $dataDir\n\n";

foreach (['events.csv', 'multiDayTextBlocks.csv'] as $fname) {
    $path = $dataDir . '/' . $fname;
    if (!file_exists($path)) { echo "SKIP $fname — not found\n"; continue; }

    $lines  = file($path, FILE_IGNORE_NEW_LINES);
    $header = array_shift($lines);

    if (strpos($header, 'tooltip') !== false) {
        echo "OK $fname — tooltip column already exists\n";
        continue;
    }

    // Add tooltip column to header and every data row
    $newHeader = $header . ',tooltip';
    $newLines  = [$newHeader];
    foreach ($lines as $line) {
        if (trim($line) !== '') $newLines[] = $line . ',';
    }

    file_put_contents($path, implode("\r\n", $newLines) . "\r\n");
    echo "✓ $fname — added tooltip column (" . count($newLines) - 1 . " rows)\n";
}

echo "\nDone. The tooltip column is now active on Render's persistent disk.\n";
