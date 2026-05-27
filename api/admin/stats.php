<?php
// api/admin/stats.php

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/database.php';

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    $db->selectDatabase();

    // Fetch counts
    $stmtUsers = $conn->query("SELECT COUNT(*) as count FROM users");
    $usersCount = $stmtUsers->fetch()['count'];

    $stmtDepts = $conn->query("SELECT COUNT(*) as count FROM departments");
    $deptsCount = $stmtDepts->fetch()['count'];

    $stmtResources = $conn->query("SELECT COUNT(*) as count FROM resources");
    $resourcesCount = $stmtResources->fetch()['count'];

    echo json_encode([
        'success' => true,
        'data' => [
            'users' => (int)$usersCount,
            'departments' => (int)$deptsCount,
            'resources' => (int)$resourcesCount
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
