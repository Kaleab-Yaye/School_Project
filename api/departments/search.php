<?php
// api/departments/search.php

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/database.php';

$query = isset($_GET['q']) ? trim($_GET['q']) : '';

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

    $stmt = $conn->prepare("SELECT id, name FROM departments WHERE name LIKE ? ORDER BY name ASC LIMIT 10");
    $stmt->execute([$query . '%']);
    $depts = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => $depts
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
