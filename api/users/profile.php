<?php
// api/users/profile.php

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/database.php';

$userId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

// Default to current logged-in user if id is not provided
if ($userId <= 0 && isset($_SESSION['user_id'])) {
    $userId = $_SESSION['user_id'];
}

if ($userId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'User ID is required.']);
    exit;
}

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    $db->selectDatabase();

    // Fetch user details
    $stmt = $conn->prepare("SELECT id, username, email, avatar, role, created_at FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'User profile not found.']);
        exit;
    }

    // Fetch upload count
    $stmtCount = $conn->prepare("SELECT COUNT(*) as count FROM resources WHERE uploaded_by = ?");
    $stmtCount->execute([$userId]);
    $uploadsCount = $stmtCount->fetch()['count'];

    // Fetch sum of likes received across their uploads
    $stmtLikes = $conn->prepare("SELECT SUM(like_count) as total_likes FROM resources WHERE uploaded_by = ?");
    $stmtLikes->execute([$userId]);
    $totalLikes = $stmtLikes->fetch()['total_likes'] ?? 0;

    // Fetch bookmark count
    $stmtBookmarks = $conn->prepare("SELECT COUNT(*) as count FROM bookmarks WHERE user_id = ?");
    $stmtBookmarks->execute([$userId]);
    $bookmarksCount = $stmtBookmarks->fetch()['count'];

    echo json_encode([
        'success' => true,
        'data' => [
            'user' => $user,
            'stats' => [
                'uploads' => (int)$uploadsCount,
                'likes_received' => (int)$totalLikes,
                'bookmarks' => (int)$bookmarksCount
            ]
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
