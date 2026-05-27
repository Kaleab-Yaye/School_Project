<?php
// api/middleware/admin_check.php

require_once __DIR__ . '/auth_check.php';

if ($current_user['role'] !== 'admin') {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Forbidden. Admin privileges required.'
    ]);
    exit;
}
