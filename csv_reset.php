<?php
// csv_reset.php — Force-copies seed CSVs from project dir to data dir
// Works on both XAMPP (local) and Render (persistent disk)

header('Content-Type: text/plain; charset=utf-8');

if (($_GET['confirm'] ?? '') !== 'yes') {
    echo "WARNING: This will overwrite the live CSVs with the versions in the project folder.\n\n";
    echo "On Render: overwrites /var/data/ from /app/\n";
    echo "On XAMPP:  overwrites the project folder files with themselves (safe no-op)\n\n";
    echo "Add ?confirm=yes to proceed.\n";
    exit;
}

$persistentDir = '/var/data';
$projectDir    = __DIR__;
$isRender      = is_dir($persistentDir) && is_writable($persistentDir);
$destDir       = $isRender ? $persistentDir : $projectDir;

echo "Running on: " . ($isRender ? "Render (persistent disk)" : "Local XAMPP") . "\n";
echo "Source: $projectDir\n";
echo "Dest:   $destDir\n\n";

$files = ['events.csv', 'multiDayTextBlocks.csv', 'fomc.csv'];
foreach ($files as $f) {
    $src  = $projectDir . '/' . $f;
    $dest = $destDir    . '/' . $f;

    if (!file_exists($src)) { echo "SKIP $f — not found in project dir\n"; continue; }

    // Backup existing on Render
    if ($isRender && file_exists($dest)) {
        $bakDir = $persistentDir . '/backups';
        if (!is_dir($bakDir)) mkdir($bakDir, 0755, true);
        $bak = $bakDir . '/' . $f . '.pre-reset-' . date('Y-m-d_His') . '.bak';
        copy($dest, $bak);
        echo "Backed up: " . basename($bak) . "\n";
    }

    if ($src === $dest) {
        echo "OK $f (source = dest, no copy needed)\n";
        continue;
    }

    if (copy($src, $dest)) {
        echo "✓ Copied $f (" . count(file($dest)) . " lines)\n";
    } else {
        echo "ERROR copying $f — check permissions\n";
    }
}

// Also scan and fix any year=0 rows in dest
echo "\nScanning for year=0 rows...\n";
foreach (['events.csv','multiDayTextBlocks.csv'] as $f) {
    $path = $destDir . '/' . $f;
    if (!file_exists($path)) continue;
    $lines  = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $header = array_shift($lines);
    $kept = []; $removed = 0;
    foreach ($lines as $line) {
        $c = str_getcsv($line);
        $yr = trim($c[2] ?? '');
        if ($yr === '0' || $yr === '' || !is_numeric($yr)) {
            echo "  REMOVED from $f: " . substr($line, 0, 80) . "\n";
            $removed++;
        } else {
            $kept[] = $line;
        }
    }
    if ($removed > 0) {
        file_put_contents($path, $header . "\r\n" . implode("\r\n", $kept) . "\r\n");
        echo "  Fixed $f: removed $removed bad rows\n";
    } else {
        echo "  $f: clean\n";
    }
}

echo "\nDone. Hard-refresh the calendar.\n";
