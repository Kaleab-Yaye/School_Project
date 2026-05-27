<?php
// api/courses/create.php

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

$semester_id = isset($data['semester_id']) ? (int)$data['semester_id'] : 0;
$name = isset($data['name']) ? trim($data['name']) : '';
$course_code = isset($data['course_code']) ? trim($data['course_code']) : null;
$description = isset($data['description']) ? trim($data['description']) : '';
$cover_image = isset($data['cover_image']) ? trim($data['cover_image']) : null;

if ($semester_id <= 0 || empty($name)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Semester ID and Course name are required.']);
    exit;
}

$gradientSeed = substr(md5($name . $semester_id), 0, 10);

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    $db->selectDatabase();

    // Check duplicate name within the same semester
    $stmt = $conn->prepare("SELECT id FROM courses WHERE semester_id = ? AND name = ?");
    $stmt->execute([$semester_id, $name]);
    if ($stmt->fetch()) {
        http_response_code(409); // Conflict
        echo json_encode(['success' => false, 'message' => 'This course already exists in this semester.']);
        exit;
    }

    $insert = $conn->prepare("
        INSERT INTO courses (semester_id, name, course_code, cover_image, gradient_seed, description, created_by) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $insert->execute([$semester_id, $name, $course_code, $cover_image, $gradientSeed, $description, $current_user['id']]);

    echo json_encode([
        'success' => true,
        'message' => 'Course created successfully.',
        'data' => [
            'id' => $conn->lastInsertId(),
            'name' => $name,
            'course_code' => $course_code,
            'semester_id' => $semester_id
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
