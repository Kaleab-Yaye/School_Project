<?php
// api/semesters/get.php

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/database.php';

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid or missing Semester ID.']);
    exit;
}

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    $db->selectDatabase();

    // Fetch semester details with its parent context
    $stmt = $conn->prepare("
        SELECT s.*, y.name as year_name, y.id as year_id, d.name as department_name, d.id as department_id
        FROM semesters s
        JOIN years y ON s.year_id = y.id
        JOIN departments d ON y.department_id = d.id
        WHERE s.id = ?
    ");
    $stmt->execute([$id]);
    $semester = $stmt->fetch();

    if (!$semester) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Semester not found.']);
        exit;
    }

    // Fetch child courses + count resources
    $stmtCourses = $conn->prepare("
        SELECT c.*,
        (
            SELECT COUNT(r.id)
            FROM resources r
            WHERE r.course_id = c.id
        ) as resource_count
        FROM courses c
        WHERE c.semester_id = ?
        ORDER BY c.name ASC
    ");
    $stmtCourses->execute([$id]);
    $courses = $stmtCourses->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => [
            'semester' => $semester,
            'courses' => $courses
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
