<?php
// api/resources/delete.php

require_once __DIR__ . '/../middleware/auth_check.php';

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

$id = isset($data['id']) ? (int)$data['id'] : 0;

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Resource ID is required.']);
    exit;
}

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    $db->selectDatabase();

    // Check resource existence and uploader owner
    $stmt = $conn->prepare("SELECT uploaded_by, file_path FROM resources WHERE id = ?");
    $stmt->execute([$id]);
    $resource = $stmt->fetch();

    if (!$resource) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Resource not found.']);
        exit;
    }

    // Check permissions (uploader OR admin)
    if ((int)$resource['uploaded_by'] !== (int)$current_user['id'] && $current_user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Unauthorized to delete this resource.']);
        exit;
    }

    $conn->beginTransaction();

    // Delete PDF file if exists
    if (!empty($resource['file_path'])) {
        $fullPath = __DIR__ . '/../../' . $resource['file_path'];
        if (file_exists($fullPath)) {
            unlink($fullPath);
        }
    }

    // Delete resource row
    $delete = $conn->prepare("DELETE FROM resources WHERE id = ?");
    $delete->execute([$id]);

    $conn->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Resource deleted successfully.'
    ]);

} catch (PDOException $e) {
    if (isset($conn) && $conn->inTransaction()) {
        $conn->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
