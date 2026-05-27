<?php
// api/courses/get.php

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/database.php';

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid or missing Course ID.']);
    exit;
}

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    $db->selectDatabase();

    // Fetch course with full navigation breadcrumbs
    $stmt = $conn->prepare("
        SELECT c.*, 
               s.name as semester_name, s.id as semester_id,
               y.name as year_name, y.id as year_id,
               d.name as department_name, d.id as department_id
        FROM courses c
        JOIN semesters s ON c.semester_id = s.id
        JOIN years y ON s.year_id = y.id
        JOIN departments d ON y.department_id = d.id
        WHERE c.id = ?
    ");
    $stmt->execute([$id]);
    $course = $stmt->fetch();

    if (!$course) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Course not found.']);
        exit;
    }

    // Fetch resources for this course
    $stmtResources = $conn->prepare("
        SELECT r.*, u.username as uploader_name
        FROM resources r
        LEFT JOIN users u ON r.uploaded_by = u.id
        WHERE r.course_id = ?
        ORDER BY r.created_at DESC
    ");
    $stmtResources->execute([$id]);
    $resources = $stmtResources->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => [
            'course' => $course,
            'resources' => $resources
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
