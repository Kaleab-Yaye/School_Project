<?php
// api/admin/users.php

require_once __DIR__ . '/../middleware/admin_check.php';

header('Content-Type: application/json');

$db = Database::getInstance();
$conn = $db->getConnection();
$db->selectDatabase();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // List all users
    try {
        $stmt = $conn->query("SELECT id, username, email, role, is_banned, created_at FROM users ORDER BY created_at DESC");
        $users = $stmt->fetchAll();

        echo json_encode([
            'success' => true,
            'data' => $users
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Toggle ban state
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    if (!$data) {
        $data = $_POST;
    }

    $target_user_id = isset($data['user_id']) ? (int)$data['user_id'] : 0;
    
    if ($target_user_id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'User ID is required.']);
        exit;
    }

    // Protect self-ban
    if ($target_user_id === (int)$current_user['id']) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'You cannot ban/unban your own admin account.']);
        exit;
    }

    try {
        // Get user current status
        $stmt = $conn->prepare("SELECT is_banned, username FROM users WHERE id = ?");
        $stmt->execute([$target_user_id]);
        $targetUser = $stmt->fetch();

        if (!$targetUser) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'User not found.']);
            exit;
        }

        $new_ban_state = $targetUser['is_banned'] ? 0 : 1;

        $update = $conn->prepare("UPDATE users SET is_banned = ? WHERE id = ?");
        $update->execute([$new_ban_state, $target_user_id]);

        $statusMsg = $new_ban_state ? 'banned' : 'unbanned';

        echo json_encode([
            'success' => true,
            'message' => "User {$targetUser['username']} has been successfully {$statusMsg}.",
            'data' => [
                'user_id' => $target_user_id,
                'is_banned' => $new_ban_state
            ]
        ]);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
