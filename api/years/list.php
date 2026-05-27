<?php
// api/years/list.php

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/database.php';

$dept_id = isset($_GET['department_id']) ? (int)$_GET['department_id'] : 0;

if ($dept_id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Department ID is required.']);
    exit;
}

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    $db->selectDatabase();

    $stmt = $conn->prepare("SELECT * FROM years WHERE department_id = ? ORDER BY name ASC");
    $stmt->execute([$dept_id]);
    $years = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => $years
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
