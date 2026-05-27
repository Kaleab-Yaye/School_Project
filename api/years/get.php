<?php
// api/years/get.php

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/database.php';

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid or missing Year ID.']);
    exit;
}

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    $db->selectDatabase();

    // Fetch year details along with its department info
    $stmt = $conn->prepare("
        SELECT y.*, d.name as department_name, d.id as department_id 
        FROM years y
        JOIN departments d ON y.department_id = d.id
        WHERE y.id = ?
    ");
    $stmt->execute([$id]);
    $year = $stmt->fetch();

    if (!$year) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Year not found.']);
        exit;
    }

    // Fetch semesters nested in this year + course count inside semesters
    $stmtSemesters = $conn->prepare("
        SELECT s.*,
        (
            SELECT COUNT(c.id)
            FROM courses c
            WHERE c.semester_id = s.id
        ) as course_count
        FROM semesters s
        WHERE s.year_id = ?
        ORDER BY s.name ASC
    ");
    $stmtSemesters->execute([$id]);
    $semesters = $stmtSemesters->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => [
            'year' => $year,
            'semesters' => $semesters
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
