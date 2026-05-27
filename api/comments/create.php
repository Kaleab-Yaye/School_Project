<?php
// api/comments/create.php

require_once __DIR__ . '/../middleware/auth_check.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data) {
    $data = $_POST;
}

$resource_id = isset($data['resource_id']) ? (int)$data['resource_id'] : 0;
$body = isset($data['body']) ? trim($data['body']) : '';

if ($resource_id <= 0 || empty($body)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Resource ID and Comment text are required.']);
    exit;
}

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    $db->selectDatabase();

    $insert = $conn->prepare("INSERT INTO comments (resource_id, user_id, body) VALUES (?, ?, ?)");
    $insert->execute([$resource_id, $current_user['id'], $body]);

    $commentId = $conn->lastInsertId();

    // Fetch the inserted comment details along with user details to return to the UI immediately
    $stmt = $conn->prepare("
        SELECT c.*, u.username, u.avatar 
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
    ");
    $stmt->execute([$commentId]);
    $comment = $stmt->fetch();

    echo json_encode([
        'success' => true,
        'message' => 'Comment added successfully.',
        'data' => $comment
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
