<?php
require_once __DIR__ . '/auth.php';
$token = $_COOKIE['hz_edit_token'] ?? '';
if ($token) { @unlink(hz_token_path($token)); }
setcookie('hz_edit_token', '', ['expires' => time()-1, 'path' => '/']);
header('Content-Type: application/json');
echo '{"success":true}';
