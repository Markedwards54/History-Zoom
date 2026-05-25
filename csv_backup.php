<?php
// csv_backup.php — Browse and restore CSV backups
// Access at: https://your-app.onrender.com/csv_backup.php

$persistentDir = '/var/data';
$projectDir    = __DIR__;
$isRender      = is_dir($persistentDir) && is_writable($persistentDir);
$backupDir     = ($isRender ? $persistentDir : $projectDir) . '/backups';

$action = $_GET['action'] ?? 'list';
$file   = basename($_GET['file'] ?? '');
$backup = basename($_GET['backup'] ?? '');

// ── RESTORE action ─────────────────────────────────────────
if ($action === 'restore' && $file && $backup) {
    $src  = $backupDir . '/' . $backup;
    $dest = ($isRender ? $persistentDir : $projectDir) . '/' . $file;
    if (file_exists($src) && in_array($file, ['events.csv','multiDayTextBlocks.csv','fomc.csv'])) {
        // Backup current before restoring
        $ts = date('Y-m-d_His');
        copy($dest, $backupDir . '/' . $file . '.before-restore-' . $ts . '.bak');
        copy($src, $dest);
        $msg = "✓ Restored $file from $backup";
    } else {
        $msg = "⚠ Restore failed";
    }
}

// ── DOWNLOAD action ────────────────────────────────────────
if ($action === 'download' && $backup) {
    $src = $backupDir . '/' . $backup;
    if (file_exists($src)) {
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="' . $backup . '"');
        header('Cache-Control: no-cache');
        readfile($src);
        exit;
    }
}

// ── LIST backups ───────────────────────────────────────────
$backups = [];
if (is_dir($backupDir)) {
    foreach (glob($backupDir . '/*.bak') as $path) {
        $name  = basename($path);
        $size  = round(filesize($path) / 1024, 1);
        $mtime = filemtime($path);
        $backups[] = ['name' => $name, 'size' => $size, 'mtime' => $mtime, 'path' => $path];
    }
    usort($backups, fn($a,$b) => $b['mtime'] - $a['mtime']);
}

// Group by base file
$grouped = [];
foreach ($backups as $b) {
    $base = preg_match('/^(events\.csv|multiDayTextBlocks\.csv|fomc\.csv)/', $b['name'], $m) ? $m[1] : 'other';
    $grouped[$base][] = $b;
}
?>
<!DOCTYPE html>
<html>
<head>
  <title>History Zoom — Backup Manager</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #1a1a2e; color: #e8e0d0; padding: 24px; }
    h1   { color: #d4af37; font-size: 1.4rem; margin-bottom: 6px; letter-spacing: 0.1em; }
    p.sub { color: #7a7a9e; font-size: 13px; margin-bottom: 28px; }
    h2   { color: #d4af37; font-size: 0.9rem; letter-spacing: 0.1em; text-transform: uppercase;
           border-bottom: 1px solid #2a2a4e; padding-bottom: 6px; margin: 20px 0 10px; }
    .msg { background: #0a2a0a; border: 1px solid #1a5a1a; color: #5ab870; padding: 10px 16px;
           border-radius: 6px; margin-bottom: 20px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th    { background: #0d0d1e; color: #7a7a9e; padding: 7px 10px; text-align: left;
            font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; }
    td    { padding: 7px 10px; border-bottom: 1px solid #1a1a3e; color: #c8c0b0; }
    tr:hover td { background: #0d0d2e; }
    .daily { color: #d4af37; font-size: 10px; margin-left: 4px; }
    .btn  { display: inline-block; padding: 4px 10px; border-radius: 3px; font-size: 11px;
            text-decoration: none; cursor: pointer; border: none; font-family: Arial; }
    .btn-dl  { background: #0d1a3e; color: #6a9adc; border: 1px solid #2a4a8e; }
    .btn-res { background: #1a0a0a; color: #e88; border: 1px solid #5a1a1a; margin-left: 4px; }
    .btn-dl:hover  { background: #1a2a5e; }
    .btn-res:hover { background: #3a1010; }
    .back { display: inline-block; margin-top: 24px; color: #d4af37; text-decoration: none; font-size: 13px; }
    .empty { color: #3a3a5e; font-style: italic; padding: 12px 10px; }
  </style>
</head>
<body>
  <h1>📦 Backup Manager</h1>
  <p class="sub">Backups are created automatically every 15 minutes when edits are made, plus one daily snapshot per file.</p>

  <?php if (!empty($msg)): ?>
    <div class="msg"><?= htmlspecialchars($msg) ?></div>
  <?php endif; ?>

  <?php if (!is_dir($backupDir) || empty($backups)): ?>
    <p class="empty">No backups yet. They'll appear here after your first edit.</p>
  <?php else: ?>
    <?php foreach (['events.csv','multiDayTextBlocks.csv','fomc.csv'] as $csvFile): ?>
      <?php $list = $grouped[$csvFile] ?? []; ?>
      <h2><?= $csvFile ?> — <?= count($list) ?> backup<?= count($list) !== 1 ? 's' : '' ?></h2>
      <?php if (empty($list)): ?>
        <p class="empty">No backups for this file yet.</p>
      <?php else: ?>
        <table>
          <tr><th>Backup File</th><th>Date / Time</th><th>Size</th><th>Actions</th></tr>
          <?php foreach ($list as $b): ?>
            <?php $isDaily = preg_match('/\d{4}-\d{2}-\d{2}\.bak$/', $b['name']); ?>
            <tr>
              <td>
                <?= htmlspecialchars($b['name']) ?>
                <?php if ($isDaily): ?><span class="daily">★ DAILY</span><?php endif; ?>
              </td>
              <td><?= date('D M j, Y  g:ia', $b['mtime']) ?></td>
              <td><?= $b['size'] ?>KB</td>
              <td>
                <a class="btn btn-dl" href="?action=download&backup=<?= urlencode($b['name']) ?>">⬇ Download</a>
                <a class="btn btn-res"
                   href="?action=restore&file=<?= urlencode($csvFile) ?>&backup=<?= urlencode($b['name']) ?>"
                   onclick="return confirm('Restore <?= htmlspecialchars($csvFile) ?> from this backup?\n\nThe current version will be saved first so you can undo.')">
                  ↩ Restore
                </a>
              </td>
            </tr>
          <?php endforeach; ?>
        </table>
      <?php endif; ?>
    <?php endforeach; ?>
  <?php endif; ?>

  <a class="back" href="/">← Back to Calendar</a>
</body>
</html>
