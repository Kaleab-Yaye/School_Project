<?php
// api/middleware/auth_check.php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../config/database.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Unauthorized. Please log in.'
    ]);
    exit;
}

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    $db->selectDatabase();

    $stmt = $conn->prepare("SELECT id, username, email, avatar, role, is_banned FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $current_user = $stmt->fetch();

    if (!$current_user) {
        // Session user no longer exists in DB
        session_destroy();
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'message' => 'User not found. Please log in again.'
        ]);
        exit;
    }

    if ($current_user['is_banned']) {
        session_destroy();
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'message' => 'Your account has been banned.'
        ]);
        exit;
    }

    // Set user info to session or just global variable for endpoints to use
    // We already have $current_user now.
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Database error during authentication check: ' . $e->getMessage()
    ]);
    exit;
}
