<?php
// hz_login.php — Login endpoint
require_once __DIR__ . '/auth.php';

ob_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { ob_end_clean(); echo '{"success":true}'; exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST')    { ob_end_clean(); echo '{"success":false,"error":"POST required"}'; exit; }

$data = json_decode(file_get_contents('php://input'), true);
$pass = $data['password'] ?? '';

if (hash('sha256', $pass) !== PASSWORD_HASH) {
    ob_end_clean();
    echo '{"success":false,"error":"Incorrect password"}';
    exit;
}

hz_prune_sessions();
$token = hz_make_token();
hz_issue_token($token);

// Set cookie: 24hr, SameSite=Lax works on iOS
setcookie('hz_edit_token', $token, [
    'expires'  => time() + SESSION_DURATION,
    'path'     => '/',
    'secure'   => isset($_SERVER['HTTPS']),
    'httponly' => false, // JS needs to read it for the header approach
    'samesite' => 'Lax',
]);

ob_end_clean();
echo json_encode(['success' => true, 'token' => $token]);
