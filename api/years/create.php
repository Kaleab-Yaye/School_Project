<?php
// api/years/create.php

require_once __DIR__ . '/../middleware/auth_check.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data) {
    $data = $_POST;
}

$department_id = isset($data['department_id']) ? (int)$data['department_id'] : 0;
$name = isset($data['name']) ? trim($data['name']) : '';
$cover_image = isset($data['cover_image']) ? trim($data['cover_image']) : null;

if ($department_id <= 0 || empty($name)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Department ID and Year name are required.']);
    exit;
}

$gradientSeed = substr(md5($name . $department_id), 0, 10);

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    $db->selectDatabase();

    // Check duplicate name within the same department
    $stmt = $conn->prepare("SELECT id FROM years WHERE department_id = ? AND name = ?");
    $stmt->execute([$department_id, $name]);
    if ($stmt->fetch()) {
        http_response_code(409); // Conflict
        echo json_encode(['success' => false, 'message' => 'This academic year already exists in this department.']);
        exit;
    }

    $insert = $conn->prepare("
        INSERT INTO years (department_id, name, cover_image, gradient_seed, created_by) 
        VALUES (?, ?, ?, ?, ?)
    ");
    $insert->execute([$department_id, $name, $cover_image, $gradientSeed, $current_user['id']]);

    echo json_encode([
        'success' => true,
        'message' => 'Academic year created successfully.',
        'data' => [
            'id' => $conn->lastInsertId(),
            'name' => $name,
            'department_id' => $department_id
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
