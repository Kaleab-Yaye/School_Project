<?php
// api/departments/create.php

require_once __DIR__ . '/../middleware/auth_check.php';

// If auth_check succeeds, we have access to $current_user
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

$name = isset($data['name']) ? trim($data['name']) : '';
$description = isset($data['description']) ? trim($data['description']) : '';
$cover_image = isset($data['cover_image']) ? trim($data['cover_image']) : null;

if (empty($name)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Department name is required.']);
    exit;
}

// Simple slug generation logic in PHP
function generateSlug($text) {
    $text = preg_replace('~[^\pL\d]+~u', '-', $text);
    $text = iconv('utf-8', 'us-ascii//TRANSLIT', $text);
    $text = preg_replace('~[^-\w]+~', '', $text);
    $text = trim($text, '-');
    $text = preg_replace('~-+~', '-', $text);
    $text = strtolower($text);
    if (empty($text)) return 'n-a';
    return $text;
}

$slug = generateSlug($name);
$gradientSeed = substr(md5($name), 0, 10);

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    $db->selectDatabase();

    // Check for duplicate name
    $stmt = $conn->prepare("SELECT id FROM departments WHERE name = ?");
    $stmt->execute([$name]);
    if ($stmt->fetch()) {
        http_response_code(409); // Conflict
        echo json_encode(['success' => false, 'message' => 'A department with this name already exists.']);
        exit;
    }

    $insert = $conn->prepare("
        INSERT INTO departments (name, slug, cover_image, gradient_seed, description, created_by) 
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $insert->execute([$name, $slug, $cover_image, $gradientSeed, $description, $current_user['id']]);
    $departmentId = $conn->lastInsertId();

    // Auto-create Year 1-5 with Semester 1 & 2 for each
    $insertYear = $conn->prepare("
        INSERT INTO years (department_id, name, gradient_seed, created_by) 
        VALUES (?, ?, ?, ?)
    ");
    $insertSemester = $conn->prepare("
        INSERT INTO semesters (year_id, name, created_by) 
        VALUES (?, ?, ?)
    ");

    for ($y = 1; $y <= 5; $y++) {
        $yearName = "Year " . $y;
        $yearGradientSeed = substr(md5($yearName . $departmentId), 0, 10);
        $insertYear->execute([$departmentId, $yearName, $yearGradientSeed, $current_user['id']]);
        $yearId = $conn->lastInsertId();

        if ($y === 1) {
            $insertSemester->execute([$yearId, 'Semester 2', $current_user['id']]);
        } else {
            $insertSemester->execute([$yearId, 'Semester 1', $current_user['id']]);
            $insertSemester->execute([$yearId, 'Semester 2', $current_user['id']]);
        }
    }

    echo json_encode([
        'success' => true,
        'message' => 'Department created successfully with Years 1-5 and Semesters.',
        'data' => [
            'id' => $departmentId,
            'name' => $name,
            'slug' => $slug
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
