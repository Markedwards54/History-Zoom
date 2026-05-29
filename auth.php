<?php
// auth.php — Password protection for History Zoom edit mode
// Include this at the top of csv_write.php and any write endpoint
// Change PASSWORD_HASH to sha256 of your chosen password
// Generate new hash: php -r "echo hash('sha256', 'yourpassword');"

define('PASSWORD_HASH', 'deb8dcd22925cd25ea708586e7b78ab1809c5dd0166d070a34d8650c945c9ee3');
// Default password: historyZoom2026 — CHANGE THIS before deploying

define('SESSION_DURATION', 86400); // 24 hours in seconds
define('TOKEN_FILE_DIR',   is_dir('/var/data') ? '/var/data' : __DIR__);

// Generate or validate a session token
function hz_make_token() {
    return bin2hex(random_bytes(32));
}

function hz_token_path($token) {
    $safe = preg_replace('/[^a-f0-9]/', '', $token);
    return TOKEN_FILE_DIR . '/.hz_sess_' . $safe;
}

function hz_validate_token($token) {
    if (!$token || !preg_match('/^[a-f0-9]{64}$/', $token)) return false;
    $path = hz_token_path($token);
    if (!file_exists($path)) return false;
    $issued = (int)file_get_contents($path);
    if (time() - $issued > SESSION_DURATION) { @unlink($path); return false; }
    return true;
}

function hz_issue_token($token) {
    $path = hz_token_path($token);
    file_put_contents($path, time());
}

function hz_check_auth() {
    $token = $_COOKIE['hz_edit_token'] ?? $_SERVER['HTTP_X_HZ_TOKEN'] ?? '';
    return hz_validate_token($token);
}

// Prune old session files (keep sessions directory tidy)
function hz_prune_sessions() {
    $files = glob(TOKEN_FILE_DIR . '/.hz_sess_*') ?: [];
    foreach ($files as $f) {
        if (time() - (int)file_get_contents($f) > SESSION_DURATION) @unlink($f);
    }
}
