<?php
// api/comments/list.php

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/database.php';

$res_id = isset($_GET['resource_id']) ? (int)$_GET['resource_id'] : 0;

if ($res_id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Resource ID is required.']);
    exit;
}

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    $db->selectDatabase();

    $stmt = $conn->prepare("
        SELECT c.*, u.username, u.avatar 
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.resource_id = ?
        ORDER BY c.created_at ASC
    ");
    $stmt->execute([$res_id]);
    $comments = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => $comments
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
