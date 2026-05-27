<?php
// api/comments/delete.php

require_once __DIR__ . '/../middleware/auth_check.php';

header('Content-Type: application/json');

// Support both DELETE and POST for compatibility with clients
if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data) {
    $data = $_POST;
}

$comment_id = isset($data['id']) ? (int)$data['id'] : 0;

if ($comment_id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Comment ID is required.']);
    exit;
}

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    $db->selectDatabase();

    // Check comment existence and owner
    $stmt = $conn->prepare("SELECT user_id FROM comments WHERE id = ?");
    $stmt->execute([$comment_id]);
    $comment = $stmt->fetch();

    if (!$comment) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Comment not found.']);
        exit;
    }

    // Authorization check: User must be author OR admin
    if ($comment['user_id'] !== $current_user['id'] && $current_user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Unauthorized to delete this comment.']);
        exit;
    }

    // Delete comment
    $delete = $conn->prepare("DELETE FROM comments WHERE id = ?");
    $delete->execute([$comment_id]);

    echo json_encode([
        'success' => true,
        'message' => 'Comment deleted successfully.'
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
