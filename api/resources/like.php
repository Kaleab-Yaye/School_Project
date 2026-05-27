<?php
// api/resources/like.php

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

if ($resource_id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Resource ID is required.']);
    exit;
}

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    $db->selectDatabase();

    $userId = $current_user['id'];

    // Check if already liked
    $stmt = $conn->prepare("SELECT id FROM likes WHERE user_id = ? AND resource_id = ?");
    $stmt->execute([$userId, $resource_id]);
    $existingLike = $stmt->fetch();

    $conn->beginTransaction();

    if ($existingLike) {
        // Unlike: Delete like row
        $delete = $conn->prepare("DELETE FROM likes WHERE user_id = ? AND resource_id = ?");
        $delete->execute([$userId, $resource_id]);

        // Decrement like_count
        $update = $conn->prepare("UPDATE resources SET like_count = GREATEST(0, like_count - 1) WHERE id = ?");
        $update->execute([$resource_id]);

        $liked = false;
        $message = "Resource unliked.";
    } else {
        // Like: Insert like row
        $insert = $conn->prepare("INSERT INTO likes (user_id, resource_id) VALUES (?, ?)");
        $insert->execute([$userId, $resource_id]);

        // Increment like_count
        $update = $conn->prepare("UPDATE resources SET like_count = like_count + 1 WHERE id = ?");
        $update->execute([$resource_id]);

        $liked = true;
        $message = "Resource liked.";
    }

    // Get current like count
    $countStmt = $conn->prepare("SELECT like_count FROM resources WHERE id = ?");
    $countStmt->execute([$resource_id]);
    $newCount = $countStmt->fetch()['like_count'];

    $conn->commit();

    echo json_encode([
        'success' => true,
        'message' => $message,
        'data' => [
            'liked' => $liked,
            'like_count' => (int)$newCount
        ]
    ]);

} catch (PDOException $e) {
    if (isset($conn) && $conn->inTransaction()) {
        $conn->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
