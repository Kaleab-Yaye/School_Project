<?php
// api/resources/get.php

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/database.php';

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid or missing Resource ID.']);
    exit;
}

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    $db->selectDatabase();

    // 1. Fetch resource metadata & uploader
    $stmt = $conn->prepare("
        SELECT r.*, u.username as uploader_name, u.avatar as uploader_avatar, c.name as course_name, c.id as course_id
        FROM resources r
        LEFT JOIN users u ON r.uploaded_by = u.id
        LEFT JOIN courses c ON r.course_id = c.id
        WHERE r.id = ?
    ");
    $stmt->execute([$id]);
    $resource = $stmt->fetch();

    if (!$resource) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Resource not found.']);
        exit;
    }

    // 2. Increment views counter
    $conn->prepare("UPDATE resources SET view_count = view_count + 1 WHERE id = ?")->execute([$id]);
    $resource['view_count']++; // increment in returning payload too

    // 3. Check if current user liked or bookmarked this resource
    $is_liked = false;
    $is_bookmarked = false;
    if (isset($_SESSION['user_id'])) {
        $userId = $_SESSION['user_id'];
        
        $likeStmt = $conn->prepare("SELECT id FROM likes WHERE user_id = ? AND resource_id = ?");
        $likeStmt->execute([$userId, $id]);
        $is_liked = (bool)$likeStmt->fetch();

        $bookmarkStmt = $conn->prepare("SELECT id FROM bookmarks WHERE user_id = ? AND resource_id = ?");
        $bookmarkStmt->execute([$userId, $id]);
        $is_bookmarked = (bool)$bookmarkStmt->fetch();
    }

    // 4. Fetch Comments
    $commentStmt = $conn->prepare("
        SELECT c.*, u.username, u.avatar 
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.resource_id = ?
        ORDER BY c.created_at ASC
    ");
    $commentStmt->execute([$id]);
    $comments = $commentStmt->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => [
            'resource' => $resource,
            'is_liked' => $is_liked,
            'is_bookmarked' => $is_bookmarked,
            'comments' => $comments
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
