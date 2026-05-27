<?php
// api/admin/delete.php

require_once __DIR__ . '/../middleware/admin_check.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data) {
    $data = $_POST;
}

$type = isset($data['type']) ? trim($data['type']) : '';
$id = isset($data['id']) ? (int)$data['id'] : 0;

if (empty($type) || $id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Entity type and ID are required.']);
    exit;
}

$allowedTypes = ['department', 'year', 'semester', 'course', 'resource', 'comment'];

if (!in_index($type, $allowedTypes) && !in_array($type, $allowedTypes)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid entity type.']);
    exit;
}

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    $db->selectDatabase();

    // Map type to database table name
    $tableMap = [
        'department' => 'departments',
        'year' => 'years',
        'semester' => 'semesters',
        'course' => 'courses',
        'resource' => 'resources',
        'comment' => 'comments'
    ];

    $tableName = $tableMap[$type];

    // Handle files deletions if type is resource
    if ($type === 'resource') {
        $stmt = $conn->prepare("SELECT file_path FROM resources WHERE id = ?");
        $stmt->execute([$id]);
        $resRow = $stmt->fetch();
        if ($resRow && !empty($resRow['file_path'])) {
            $fullPath = __DIR__ . '/../../' . $resRow['file_path'];
            if (file_exists($fullPath)) {
                unlink($fullPath);
            }
        }
    }

    // Execute standard DELETE query
    $delete = $conn->prepare("DELETE FROM `{$tableName}` WHERE id = ?");
    $delete->execute([$id]);

    echo json_encode([
        'success' => true,
        'message' => "Successfully deleted {$type} with ID {$id}."
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error during deletion: ' . $e->getMessage()]);
}
