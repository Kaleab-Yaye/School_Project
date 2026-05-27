<?php
// api/departments/get.php

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/database.php';

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid or missing Department ID.']);
    exit;
}

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    $db->selectDatabase();

    // Fetch department details
    $stmt = $conn->prepare("SELECT * FROM departments WHERE id = ?");
    $stmt->execute([$id]);
    $department = $stmt->fetch();

    if (!$department) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Department not found.']);
        exit;
    }

    // Fetch child years + count courses in those years
    $stmtYears = $conn->prepare("
        SELECT y.*,
        (
            SELECT COUNT(c.id)
            FROM courses c
            JOIN semesters s ON c.semester_id = s.id
            WHERE s.year_id = y.id
        ) as course_count
        FROM years y
        WHERE y.department_id = ?
        ORDER BY y.name ASC
    ");
    $stmtYears->execute([$id]);
    $years = $stmtYears->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => [
            'department' => $department,
            'years' => $years
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
