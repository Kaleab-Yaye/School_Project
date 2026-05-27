<?php
// api/courses/search.php

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/database.php';

$query = isset($_GET['q']) ? trim($_GET['q']) : '';
$semester_id = isset($_GET['semester_id']) ? (int)$_GET['semester_id'] : 0;

if (strlen($query) < 1) {
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

    $sql = "SELECT id, name, course_code FROM courses WHERE (name LIKE ? OR course_code LIKE ?)";
    $params = [$query . '%', $query . '%'];

    if ($semester_id > 0) {
        $sql .= " AND semester_id = ?";
        $params[] = $semester_id;
    }

    $sql .= " ORDER BY name ASC LIMIT 10";

    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    $courses = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => $courses
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
