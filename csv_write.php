<?php
// Capture ALL output — prevents any warning/notice from corrupting JSON
ob_start();

error_reporting(0);
ini_set('display_errors', 0);

// Send headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean(); echo '{"success":true}'; exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ob_end_clean(); echo '{"success":false,"error":"POST required"}'; exit;
}


require_once __DIR__ . '/auth.php';
if (!hz_check_auth()) {
    ob_end_clean();
    echo '{"success":false,"error":"unauthorized","code":401}';
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
if (!$data) {
    ob_end_clean(); echo '{"success":false,"error":"bad json"}'; exit;
}

$f = basename($data['csvFile'] ?? '');
if (!in_array($f, ['events.csv', 'multiDayTextBlocks.csv', 'fomc.csv'])) {
    ob_end_clean(); echo '{"success":false,"error":"bad file"}'; exit;
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

// ── Backup ──────────────────────────────────────────────────
function makeBackup($filePath, $backupDir, $filename) {
    if (!file_exists($filePath)) return;
    if (!is_dir($backupDir)) @mkdir($backupDir, 0755, true);

    $today     = date('Y-m-d');
    $dayStamp  = $backupDir . '/' . $filename . '.' . $today . '.bak';
    if (!file_exists($dayStamp)) @copy($filePath, $dayStamp);

    $min       = (int)date('i');
    $slot      = str_pad(floor($min / 15) * 15, 2, '0', STR_PAD_LEFT);
    $freqStamp = $backupDir . '/' . $filename . '.' . date('Y-m-d_H') . $slot . '.bak';
    @copy($filePath, $freqStamp);

    // Prune daily: keep last 30
    $daily = array_filter(glob($backupDir . '/' . $filename . '.*.bak') ?: [],
        fn($f) => preg_match('/\d{4}-\d{2}-\d{2}\.bak$/', $f));
    if (count($daily) > 30) {
        usort($daily, fn($a,$b) => filemtime($a) - filemtime($b));
        foreach (array_slice($daily, 0, count($daily) - 30) as $old) @unlink($old);
    }

    // Prune frequent: keep last 20
    $freq = array_filter(glob($backupDir . '/' . $filename . '.*.bak') ?: [],
        fn($f) => !preg_match('/\d{4}-\d{2}-\d{2}\.bak$/', $f));
    if (count($freq) > 20) {
        usort($freq, fn($a,$b) => filemtime($a) - filemtime($b));
        foreach (array_slice($freq, 0, count($freq) - 20) as $old) @unlink($old);
    }
}

if (!file_exists($filePath)) {
    ob_end_clean();
    echo json_encode(['success' => false, 'error' => 'File not found: ' . $filePath]);
    exit;
}

// ── REPLACE ALL MODE ────────────────────────────────────────
if (!empty($data['replaceAll']) && isset($data['rows'])) {
    makeBackup($filePath, $backupDir, $f);
    $fp = fopen($filePath, 'c+');
    if (!$fp) { ob_end_clean(); echo '{"success":false,"error":"cannot open"}'; exit; }
    flock($fp, LOCK_EX);
    $existing = stream_get_contents($fp);
    $lines    = explode("\n", str_replace("\r", "", $existing));
    $header   = '';
    foreach ($lines as $l) {
        if (trim($l) !== '' && !is_numeric(substr(trim($l), 0, 1))) { $header = $l; break; }
    }
    $out = ($header !== '' ? $header . "\r\n" : '') . implode("\r\n", $data['rows']) . "\r\n";
    // Auto-add tooltip column to header if missing
    if ($header !== '' && strpos($header, 'tooltip') === false) {
        $header = $header . ',tooltip';
        $out = $header . "\r\n" . implode("\r\n", $data['rows']) . "\r\n";
    }
    ftruncate($fp, 0); rewind($fp); fwrite($fp, $out);
    fflush($fp); flock($fp, LOCK_UN); fclose($fp);
    ob_end_clean();
    echo '{"success":true,"mode":"replaced"}';
    exit;
}

// ── SINGLE ROW UPDATE / APPEND ──────────────────────────────
$row = trim($data['newRow'] ?? '');
if (!$row) { ob_end_clean(); echo '{"success":false,"error":"no row"}'; exit; }

makeBackup($filePath, $backupDir, $f);

$mm = trim($data['matchMonth']    ?? '');
$md = trim($data['matchDay']      ?? '');
$my = trim($data['matchYear']     ?? '');
$mi = trim($data['matchImageUrl'] ?? '');
$mw = trim($data['matchWiki']     ?? '');

$fp = fopen($filePath, 'c+');
if (!$fp) { ob_end_clean(); echo '{"success":false,"error":"cannot open"}'; exit; }
if (!flock($fp, LOCK_EX)) { fclose($fp); ob_end_clean(); echo '{"success":false,"error":"cannot lock"}'; exit; }

$content  = stream_get_contents($fp);
$allLines = explode("\n", str_replace("\r", "", $content));
$lines    = [];
foreach ($allLines as $line) { if (trim($line) !== '') $lines[] = $line; }

// Auto-add tooltip column if missing (one-time migration)
$tooltipAdded = false;
if (count($lines) > 0 && strpos($lines[0], 'tooltip') === false) {
    $lines[0] = $lines[0] . ',tooltip';
    for ($i = 1; $i < count($lines); $i++) {
        $lines[$i] = $lines[$i] . ',';
    }
    // Write immediately so future reads see the column
    $migrated = implode("\r\n", $lines) . "\r\n";
    ftruncate($fp, 0); rewind($fp); fwrite($fp, $migrated); rewind($fp);
    $content = $migrated;
    $tooltipAdded = true;
}

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
            $bestIdx  = null;
            $newCols  = str_getcsv($row);
            $newWiki  = trim($newCols[3] ?? '');
            $newImg   = trim($newCols[4] ?? '');

            // Find exact match: same date + same wiki + same image = true duplicate
            foreach ($matchIndices as $i) {
                $c = str_getcsv(trim($lines[$i]));
                $rwiki = trim($c[3]??''); $rimg = trim($c[4]??'');
                // Exact wiki match (handles comma-in-URL)
                if ($mw !== '' && ($rwiki === $mw || strpos($mw, $rwiki) === 0)) {
                    // Also match on image URL if provided
                    if ($mi === '' || $rimg === $mi) { $bestIdx = $i; break; }
                }
                // Fallback: image URL match alone
                if ($mi !== '' && $rimg === $mi) { $bestIdx = $i; break; }
            }

            if ($bestIdx !== null) {
                // Update the matched row only — leave other events on same date untouched
                $lines[$bestIdx] = $row;
                $found = true;
                $debugMsg = "updated row $bestIdx";
                // Only remove rows that are true duplicates (identical wiki+image)
                foreach ($matchIndices as $i) {
                    if ($i === $bestIdx) continue;
                    $c = str_getcsv(trim($lines[$i]));
                    $rwiki = trim($c[3]??''); $rimg = trim($c[4]??'');
                    $sameWiki = ($rwiki === $newWiki || ($newWiki && strpos($newWiki, $rwiki) === 0));
                    $sameImg  = ($rimg === $newImg);
                    if ($sameWiki && $sameImg) { unset($lines[$i]); $debugMsg .= " removed-dupe-$i"; }
                }
            } else {
                $debugMsg = "no-match among " . count($matchIndices) . " rows for date $mm/$md/$my wiki=" . substr($mw,30,30) . " img=" . substr($mi,0,30);
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

if ($r === false) { ob_end_clean(); echo '{"success":false,"error":"write failed"}'; exit; }
ob_end_clean();
echo json_encode(['success' => true, 'mode' => $found ? 'updated' : 'appended', 'file' => $f, 'debug' => $debugMsg ?? 'n/a', 'tooltipAdded' => $tooltipAdded ?? false]);
