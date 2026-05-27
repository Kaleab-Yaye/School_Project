<?php
// api/departments/delete.php

require_once __DIR__ . '/../middleware/admin_check.php';

header('Content-Type: application/json');

$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data) {
    $data = $_POST;
}

$id = isset($data['id']) ? (int)$data['id'] : 0;

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Department ID is required.']);
    exit;
}

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    $db->selectDatabase();

    // Cascades take care of removing related years, courses, etc.
    $delete = $conn->prepare("DELETE FROM departments WHERE id = ?");
    $delete->execute([$id]);

    echo json_encode([
        'success' => true,
        'message' => 'Department deleted successfully.'
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
