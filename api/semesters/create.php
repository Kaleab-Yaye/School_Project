<?php
// api/semesters/create.php

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

$year_id = isset($data['year_id']) ? (int)$data['year_id'] : 0;
$name = isset($data['name']) ? trim($data['name']) : '';

if ($year_id <= 0 || empty($name)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Year ID and Semester name are required.']);
    exit;
}

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    $db->selectDatabase();

    // Check duplicate name within the same year
    $stmt = $conn->prepare("SELECT id FROM semesters WHERE year_id = ? AND name = ?");
    $stmt->execute([$year_id, $name]);
    if ($stmt->fetch()) {
        http_response_code(409); // Conflict
        echo json_encode(['success' => false, 'message' => 'This semester already exists in this year.']);
        exit;
    }

    $insert = $conn->prepare("
        INSERT INTO semesters (year_id, name, created_by) 
        VALUES (?, ?, ?)
    ");
    $insert->execute([$year_id, $name, $current_user['id']]);

    echo json_encode([
        'success' => true,
        'message' => 'Semester created successfully.',
        'data' => [
            'id' => $conn->lastInsertId(),
            'name' => $name,
            'year_id' => $year_id
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
