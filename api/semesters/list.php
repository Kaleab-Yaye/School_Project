<?php
// api/semesters/list.php

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/database.php';

$year_id = isset($_GET['year_id']) ? (int)$_GET['year_id'] : 0;

if ($year_id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Year ID is required.']);
    exit;
}

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    $db->selectDatabase();

    $stmt = $conn->prepare("SELECT * FROM semesters WHERE year_id = ? ORDER BY name ASC");
    $stmt->execute([$year_id]);
    $semesters = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => $semesters
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
