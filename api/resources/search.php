<?php
// api/resources/search.php

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/database.php';

$query = isset($_GET['q']) ? trim($_GET['q']) : '';
$course_id = isset($_GET['course_id']) ? (int)$_GET['course_id'] : 0;
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 12;

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    $db->selectDatabase();

    $sql = "
        SELECT r.*, u.username as uploader_name, c.name as course_name 
        FROM resources r
        LEFT JOIN users u ON r.uploaded_by = u.id
        LEFT JOIN courses c ON r.course_id = c.id
        WHERE 1=1
    ";
    
    $params = [];

    if ($course_id > 0) {
        $sql .= " AND r.course_id = ?";
        $params[] = $course_id;
    }

    if (!empty($query)) {
        // Use standard LIKE search for compatibility/simplicity, fulltext index fallback
        $sql .= " AND (r.title LIKE ? OR r.description LIKE ?)";
        $params[] = '%' . $query . '%';
        $params[] = '%' . $query . '%';
    }

    $sql .= " ORDER BY r.created_at DESC LIMIT ?";
    
    $stmt = $conn->prepare($sql);
    
    // Bind parameters
    $paramIndex = 1;
    foreach ($params as $param) {
        $stmt->bindValue($paramIndex++, $param);
    }
    
    $stmt->bindValue($paramIndex, $limit, PDO::PARAM_INT);
    $stmt->execute();
    
    $resources = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => $resources
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
