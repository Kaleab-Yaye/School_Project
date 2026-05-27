<?php
// api/search/global.php

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/database.php';

$query = isset($_GET['q']) ? trim($_GET['q']) : '';

if (strlen($query) < 2) {
    echo json_encode([
        'success' => true,
        'data' => []
    ]);
    exit;
}

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    $db->selectDatabase();

    $likeQuery = $query . '%';
    $searchLimit = 10;
    
    // 1. Departments Match
    $stmtDepts = $conn->prepare("
        SELECT id, name, 'department' AS type, NULL AS parent 
        FROM departments 
        WHERE name LIKE ? 
        LIMIT ?
    ");
    $stmtDepts->bindValue(1, $likeQuery, PDO::PARAM_STR);
    $stmtDepts->bindValue(2, $searchLimit, PDO::PARAM_INT);
    $stmtDepts->execute();
    $depts = $stmtDepts->fetchAll();

    // 2. Courses Match
    $stmtCourses = $conn->prepare("
        SELECT c.id, c.name, 'course' AS type, d.name AS parent 
        FROM courses c
        JOIN semesters s ON c.semester_id = s.id
        JOIN years y ON s.year_id = y.id
        JOIN departments d ON y.department_id = d.id
        WHERE c.name LIKE ? OR c.course_code LIKE ?
        LIMIT ?
    ");
    $stmtCourses->bindValue(1, $likeQuery, PDO::PARAM_STR);
    $stmtCourses->bindValue(2, $likeQuery, PDO::PARAM_STR);
    $stmtCourses->bindValue(3, $searchLimit, PDO::PARAM_INT);
    $stmtCourses->execute();
    $courses = $stmtCourses->fetchAll();

    // 3. Resources Match
    $stmtResources = $conn->prepare("
        SELECT id, title AS name, 'resource' AS type, exam_type AS parent 
        FROM resources 
        WHERE title LIKE ? OR description LIKE ?
        LIMIT ?
    ");
    $stmtResources->bindValue(1, '%' . $query . '%', PDO::PARAM_STR);
    $stmtResources->bindValue(2, '%' . $query . '%', PDO::PARAM_STR);
    $stmtResources->bindValue(3, $searchLimit, PDO::PARAM_INT);
    $stmtResources->execute();
    $resources = $stmtResources->fetchAll();

    // Combine results
    $results = array_merge($depts, $courses, $resources);

    echo json_encode([
        'success' => true,
        'data' => $results
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error during search: ' . $e->getMessage()
    ]);
}
