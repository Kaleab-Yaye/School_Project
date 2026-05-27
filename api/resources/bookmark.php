<?php
// api/resources/bookmark.php

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

    // Check if already bookmarked
    $stmt = $conn->prepare("SELECT id FROM bookmarks WHERE user_id = ? AND resource_id = ?");
    $stmt->execute([$userId, $resource_id]);
    $existingBookmark = $stmt->fetch();

    if ($existingBookmark) {
        // Remove bookmark
        $delete = $conn->prepare("DELETE FROM bookmarks WHERE user_id = ? AND resource_id = ?");
        $delete->execute([$userId, $resource_id]);
        $bookmarked = false;
        $message = "Resource removed from bookmarks.";
    } else {
        // Add bookmark
        $insert = $conn->prepare("INSERT INTO bookmarks (user_id, resource_id) VALUES (?, ?)");
        $insert->execute([$userId, $resource_id]);
        $bookmarked = true;
        $message = "Resource bookmarked.";
    }

    echo json_encode([
        'success' => true,
        'message' => $message,
        'data' => [
            'bookmarked' => $bookmarked
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
