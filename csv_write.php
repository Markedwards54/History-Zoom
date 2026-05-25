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

// ── Path resolution ─────────────────────────────────────────
$persistentDir = '/var/data';
$projectDir    = __DIR__;
$isRender      = is_dir($persistentDir) && is_writable($persistentDir);

if ($isRender) {
    $filePath  = $persistentDir . '/' . $f;
    $backupDir = $persistentDir . '/backups';
    if (!file_exists($filePath)) {
        $seed = $projectDir . '/' . $f;
        if (file_exists($seed)) copy($seed, $filePath);
    }
} else {
    $filePath  = $projectDir . '/' . $f;
    $backupDir = $projectDir . '/backups';
}

// ── Backup function ─────────────────────────────────────────
// Keeps last 20 timestamped backups per file
function makeBackup($filePath, $backupDir, $filename) {
    if (!file_exists($filePath)) return;
    if (!is_dir($backupDir)) mkdir($backupDir, 0755, true);

    // Daily backup — one per day per file
    $today    = date('Y-m-d');
    $dayStamp = $backupDir . '/' . $filename . '.' . $today . '.bak';
    if (!file_exists($dayStamp)) {
        copy($filePath, $dayStamp);
    }

    // Frequent backup — one per 15 minutes
    $stamp    = date('Y-m-d_Hi'); // e.g. 2026-05-23_1430
    // Round to nearest 15 min
    $min      = (int)date('i');
    $slot     = str_pad(floor($min / 15) * 15, 2, '0', STR_PAD_LEFT);
    $freqStamp = $backupDir . '/' . $filename . '.' . date('Y-m-d_H') . $slot . '.bak';
    copy($filePath, $freqStamp);

    // Prune — keep only last 20 frequent backups per file (not daily ones)
    $pattern = $backupDir . '/' . $filename . '.*.bak';
    $files   = glob($pattern);
    if ($files && count($files) > 20) {
        usort($files, fn($a,$b) => filemtime($a) - filemtime($b));
        $toDelete = array_slice($files, 0, count($files) - 20);
        foreach ($toDelete as $old) {
            // Never delete daily backups
            if (!preg_match('/\d{4}-\d{2}-\d{2}\.bak$/', $old)) {
                @unlink($old);
            }
        }
    }
}

if (!file_exists($filePath)) {
    echo json_encode(['success' => false, 'error' => 'File not found: ' . $filePath]);
    exit;
}

// ── REPLACE ALL MODE ────────────────────────────────────────
if (!empty($data['replaceAll']) && isset($data['rows'])) {
    makeBackup($filePath, $backupDir, $f);
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

// ── SINGLE ROW UPDATE / APPEND ──────────────────────────────
$row = trim($data['newRow'] ?? '');
if (!$row) { echo '{"success":false,"error":"no row"}'; exit; }

// Make backup BEFORE writing
makeBackup($filePath, $backupDir, $f);

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

$found   = false;
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
            $t = trim($line); if ($t === '' || $t[0] === 'm') continue;
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
