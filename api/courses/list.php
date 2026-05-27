<?php
// api/courses/list.php

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/database.php';

$semester_id = isset($_GET['semester_id']) ? (int)$_GET['semester_id'] : 0;

if ($semester_id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Semester ID is required.']);
    exit;
}

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    $db->selectDatabase();

    $stmt = $conn->prepare("SELECT * FROM courses WHERE semester_id = ? ORDER BY name ASC");
    $stmt->execute([$semester_id]);
    $courses = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => $courses
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
