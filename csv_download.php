<?php
// csv_download.php — Download current CSVs from Render's persistent disk
// Access at: https://your-app.onrender.com/csv_download.php
// Then copy downloaded files back into your local project and commit

$allowed = ['events.csv', 'multiDayTextBlocks.csv', 'fomc.csv'];
$f = basename($_GET['file'] ?? '');

// If no file specified, show a simple download page
if (!$f || !in_array($f, $allowed)) { ?>
<!DOCTYPE html>
<html>
<head>
  <title>History Zoom — Download CSVs</title>
  <style>
    body { font-family: Arial, sans-serif; background: #1a1a2e; color: #e8e0d0;
           display: flex; flex-direction: column; align-items: center;
           justify-content: center; min-height: 100vh; margin: 0; }
    h1   { color: #d4af37; letter-spacing: 0.1em; margin-bottom: 8px; }
    p    { color: #7a7a9e; margin-bottom: 32px; font-size: 14px; }
    .btn { display: block; width: 300px; margin: 10px auto;
           padding: 14px 20px; background: linear-gradient(135deg, #b8962e, #d4af37);
           color: #1a1200; border: none; border-radius: 6px; font-weight: bold;
           font-size: 14px; text-decoration: none; text-align: center;
           letter-spacing: 0.05em; cursor: pointer; }
    .btn:hover { background: linear-gradient(135deg, #c9a840, #e8c050); }
    .note { margin-top: 32px; background: #0d0d1e; border: 1px solid #2a2a4e;
            border-radius: 6px; padding: 16px 24px; max-width: 400px;
            font-size: 12px; color: #7a7a9e; line-height: 1.7; }
    .note strong { color: #d4af37; }
    a.back { color: #d4af37; text-decoration: none; margin-top: 24px;
             font-size: 13px; display: block; }
    a.back:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>📥 Download CSVs</h1>
  <p>Download the latest data files from the server</p>
  <a class="btn" href="csv_download.php?file=events.csv">⬇ events.csv</a>
  <a class="btn" href="csv_download.php?file=multiDayTextBlocks.csv">⬇ multiDayTextBlocks.csv</a>
  <a class="btn" href="csv_download.php?file=fomc.csv">⬇ fomc.csv</a>
  <div class="note">
    <strong>To sync back to your desktop:</strong><br>
    1. Download all three files above<br>
    2. Copy them into <code>C:\xampp\htdocs\History - Zoom\</code><br>
    3. In VS Code → Source Control → Stage → Commit → Push<br><br>
    <strong>Do this before editing locally</strong> so you start with the latest data.
  </div>
  <a class="back" href="/">← Back to Calendar</a>
</body>
</html>
<?php exit; }

// ── Serve the requested file ───────────────────────────────────
$persistentDir = '/var/data';
$projectDir    = __DIR__;

if (is_dir($persistentDir) && file_exists($persistentDir . '/' . $f)) {
    $path = $persistentDir . '/' . $f;
} else {
    $path = $projectDir . '/' . $f;
}

if (!file_exists($path)) {
    http_response_code(404);
    echo 'File not found: ' . $f;
    exit;
}

// Force browser download
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $f . '"');
header('Content-Length: ' . filesize($path));
header('Cache-Control: no-cache, no-store, must-revalidate');
readfile($path);
