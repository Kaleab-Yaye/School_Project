<?php
// api/users/bookmarks.php

require_once __DIR__ . '/../middleware/auth_check.php';

header('Content-Type: application/json');

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    $db->selectDatabase();

    $stmt = $conn->prepare("
        SELECT r.*, c.name as course_name, u.username as uploader_name
        FROM bookmarks b
        JOIN resources r ON b.resource_id = r.id
        JOIN courses c ON r.course_id = c.id
        LEFT JOIN users u ON r.uploaded_by = u.id
        WHERE b.user_id = ?
        ORDER BY b.created_at DESC
    ");
    $stmt->execute([$current_user['id']]);
    $bookmarks = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => $bookmarks
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
