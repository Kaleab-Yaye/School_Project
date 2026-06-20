<?php
// api/resources/download.php
// Forces a file download with proper Content-Disposition headers

require_once __DIR__ . '/../config/database.php';

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($id <= 0) {
    http_response_code(400);
    echo 'Invalid resource ID.';
    exit;
}

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    $db->selectDatabase();

    // Fetch resource record
    $stmt = $conn->prepare("SELECT title, file_path, resource_type FROM resources WHERE id = ?");
    $stmt->execute([$id]);
    $resource = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$resource) {
        http_response_code(404);
        echo 'Resource not found.';
        exit;
    }

    if ($resource['resource_type'] !== 'pdf' || empty($resource['file_path'])) {
        http_response_code(400);
        echo 'This resource does not have a downloadable file.';
        exit;
    }

    // Build absolute file path on disk
    $filePath = realpath(__DIR__ . '/../../' . $resource['file_path']);

    if (!$filePath || !file_exists($filePath)) {
        http_response_code(404);
        echo 'File not found on server. It may have been deleted.';
        exit;
    }

    // Security: ensure file is within the uploads directory
    $uploadsDir = realpath(__DIR__ . '/../../uploads');
    
    // Normalize both paths for case-insensitive comparison on Windows
    $normalizedFilePath = str_replace('\\', '/', strtolower($filePath));
    $normalizedUploadsDir = str_replace('\\', '/', strtolower($uploadsDir));
    
    if (strpos($normalizedFilePath, $normalizedUploadsDir) !== 0) {
        http_response_code(403);
        echo 'Access denied.';
        exit;
    }

    // Generate a clean download filename from the resource title
    // Replace all non-alphanumeric/hyphen/underscore characters (including spaces) with underscores
    $safeTitle = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $resource['title']);
    $safeTitle = trim($safeTitle, '_');
    if (empty($safeTitle)) $safeTitle = 'document';
    $downloadName = $safeTitle . '.pdf';

    // Clear any active output buffers to prevent file corruption or warnings from leaking
    while (ob_get_level()) {
        ob_end_clean();
    }

    // Set headers to force download as a binary stream (foolproof for all browsers)
    header('Content-Description: File Transfer');
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . $downloadName . '"');
    header('Content-Transfer-Encoding: binary');
    header('Expires: 0');
    header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
    header('Pragma: public');
    header('Content-Length: ' . filesize($filePath));

    // Disable execution time limit for this request to support slow connections
    set_time_limit(0);

    // Output the file contents
    readfile($filePath);
    exit;

} catch (Exception $e) {
    http_response_code(500);
    echo 'Server error: ' . $e->getMessage();
}
