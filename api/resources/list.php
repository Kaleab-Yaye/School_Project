<?php
// api/resources/list.php

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/database.php';

$course_id = isset($_GET['course_id']) ? (int)$_GET['course_id'] : 0;

if ($course_id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Course ID is required.']);
    exit;
}

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    $db->selectDatabase();

    $stmt = $conn->prepare("
        SELECT r.*, u.username as uploader_name
        FROM resources r
        LEFT JOIN users u ON r.uploaded_by = u.id
        WHERE r.course_id = ?
        ORDER BY r.created_at DESC
    ");
    $stmt->execute([$course_id]);
    $resources = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => $resources
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
