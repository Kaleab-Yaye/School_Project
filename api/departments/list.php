<?php
// api/departments/list.php

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/database.php';

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    $db->selectDatabase();

    // Query departments and count courses
    $stmt = $conn->query("
        SELECT d.*, 
        (
            SELECT COUNT(c.id) 
            FROM courses c
            JOIN semesters s ON c.semester_id = s.id
            JOIN years y ON s.year_id = y.id
            WHERE y.department_id = d.id
        ) as course_count
        FROM departments d
        ORDER BY d.name ASC
    ");
    
    $departments = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => $departments
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
