<?php
// api/users/uploads.php

require_once __DIR__ . '/../middleware/auth_check.php';

header('Content-Type: application/json');

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    $db->selectDatabase();

    $stmt = $conn->prepare("
        SELECT r.*, c.name as course_name 
        FROM resources r
        JOIN courses c ON r.course_id = c.id
        WHERE r.uploaded_by = ?
        ORDER BY r.created_at DESC
    ");
    $stmt->execute([$current_user['id']]);
    $uploads = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => $uploads
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
