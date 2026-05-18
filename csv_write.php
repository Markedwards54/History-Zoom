<?php
error_reporting(0);
ini_set('display_errors', 0);
ob_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
ob_clean();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { echo '{"success":true}'; exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST')    { echo '{"success":false,"error":"POST required"}'; exit; }

$data = json_decode(file_get_contents('php://input'), true);
if (!$data) { echo '{"success":false,"error":"bad json"}'; exit; }

$f = basename($data['csvFile'] ?? '');
if (!in_array($f, ['events.csv', 'multiDayTextBlocks.csv', 'fomc.csv'])) {
    echo '{"success":false,"error":"bad file"}'; exit;
}

// ── Path resolution ─────────────────────────────────────────────
// On Render: persistent disk at /var/data, project files at /app (or __DIR__)
// On XAMPP:  everything in the same folder
// Strategy: check for persistent disk first, fall back to __DIR__

$persistentDir = '/var/data';
$projectDir    = __DIR__;

if (is_dir($persistentDir) && is_writable($persistentDir)) {
    // Render persistent disk — copy seed file on first run
    $filePath = $persistentDir . '/' . $f;
    if (!file_exists($filePath)) {
        // First run: copy from project directory to persistent disk
        $seed = $projectDir . '/' . $f;
        if (file_exists($seed)) copy($seed, $filePath);
    }
} else {
    // Local XAMPP
    $filePath = $projectDir . '/' . $f;
}

if (!file_exists($filePath)) {
    echo json_encode(['success' => false, 'error' => 'File not found: ' . $filePath]);
    exit;
}

// ── REPLACE ALL MODE (deletes, undos) ────────────────────────────
if (!empty($data['replaceAll']) && isset($data['rows'])) {
    $fp = fopen($filePath, 'c+');
    if (!$fp) { echo '{"success":false,"error":"cannot open"}'; exit; }
    flock($fp, LOCK_EX);
    $existing = stream_get_contents($fp);
    $lines    = explode("\n", str_replace("\r", "", $existing));
    $header   = '';
    foreach ($lines as $l) {
        if (trim($l) !== '' && !is_numeric(substr(trim($l), 0, 1))) { $header = $l; break; }
    }
    $out = ($header !== '' ? $header . "\r\n" : '') . implode("\r\n", $data['rows']) . "\r\n";
    ftruncate($fp, 0); rewind($fp); fwrite($fp, $out);
    fflush($fp); flock($fp, LOCK_UN); fclose($fp);
    echo '{"success":true,"mode":"replaced"}'; exit;
}

// ── SINGLE ROW UPDATE / APPEND ───────────────────────────────────
$row = trim($data['newRow'] ?? '');
if (!$row) { echo '{"success":false,"error":"no row"}'; exit; }

$mm = trim($data['matchMonth']    ?? '');
$md = trim($data['matchDay']      ?? '');
$my = trim($data['matchYear']     ?? '');
$mi = trim($data['matchImageUrl'] ?? '');
$mw = trim($data['matchWiki']     ?? '');

$fp = fopen($filePath, 'c+');
if (!$fp) { echo '{"success":false,"error":"cannot open"}'; exit; }
if (!flock($fp, LOCK_EX)) { fclose($fp); echo '{"success":false,"error":"cannot lock"}'; exit; }

$content  = stream_get_contents($fp);
$allLines = explode("\n", str_replace("\r", "", $content));
$lines    = [];
foreach ($allLines as $line) { if (trim($line) !== '') $lines[] = $line; }

$found = false;
$newCols = str_getcsv($row);

if ($mm !== '' && $md !== '' && $my !== '') {
    if ($f === 'events.csv') {
        $matchIndices = [];
        foreach ($lines as $i => $line) {
            $t = trim($line); if ($t === '' || $t[0] === '#') continue;
            $c = str_getcsv($t);
            if (trim($c[0]??'') != $mm || trim($c[1]??'') != $md || trim($c[2]??'') != $my) continue;
            $matchIndices[] = $i;
        }
        if (count($matchIndices) > 0) {
            $bestIdx = $matchIndices[0];
            foreach ($matchIndices as $i) {
                $c = str_getcsv(trim($lines[$i]));
                $rwiki = trim($c[3]??''); $rimg = trim($c[4]??'');
                if ($mw !== '' && $rwiki === $mw) { $bestIdx = $i; break; }
                if ($mw !== '' && strpos($mw, $rwiki) === 0) { $bestIdx = $i; break; }
                if ($mi !== '' && $rimg === $mi) { $bestIdx = $i; break; }
            }
            foreach ($matchIndices as $i) {
                if ($i === $bestIdx) { $lines[$i] = $row; $found = true; }
                else unset($lines[$i]);
            }
        }
    } elseif ($f === 'fomc.csv') {
        foreach ($lines as $i => $line) {
            $t = trim($line); if ($t === '' || $t[0] === 'm') continue; // skip header
            $c = str_getcsv($t);
            if (trim($c[0]??'') == $mm && trim($c[1]??'') == $md && trim($c[2]??'') == $my) {
                $lines[$i] = $row; $found = true; break;
            }
        }
    } else {
        $newText = trim($newCols[7] ?? '');
        foreach ($lines as $i => $line) {
            $t = trim($line); if ($t === '' || $t[0] === '#') continue;
            $c = str_getcsv($t);
            $rm = trim($c[0]??''); $rd = trim($c[1]??''); $ry = trim($c[2]??'');
            $rw = trim($c[6]??''); $rt = trim($c[7]??'');
            if ($rm != $mm || $rd != $md || $ry != $my) continue;
            $wikiMatch = ($mw === '' || $rw === $mw || strpos($mw, $rw) === 0);
            $textMatch = ($newText === '' || $rt === $newText);
            if ($wikiMatch && $textMatch) { $lines[$i] = $row; $found = true; break; }
            if ($wikiMatch && !$found)    { $lines[$i] = $row; $found = true; break; }
        }
    }
}

if (!$found) $lines[] = $row;

$lines = array_values($lines);
$out   = implode("\r\n", $lines) . "\r\n";
ftruncate($fp, 0); rewind($fp);
$r = fwrite($fp, $out);
fflush($fp); flock($fp, LOCK_UN); fclose($fp);

if ($r === false) { echo '{"success":false,"error":"write failed"}'; exit; }
echo json_encode(['success' => true, 'mode' => $found ? 'updated' : 'appended', 'file' => $f]);
