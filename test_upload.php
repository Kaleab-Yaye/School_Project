<?php
// C:\wamp64\www\School_Project\test_upload.php
// Simulated script to test if PHP can write to the uploads directory.

$uploadDir = __DIR__ . '/uploads/resources/';
echo "1. Target upload directory: " . $uploadDir . PHP_EOL;

if (!file_exists($uploadDir)) {
    echo "2. Directory does not exist. Attempting to create it..." . PHP_EOL;
    if (mkdir($uploadDir, 0777, true)) {
        echo "   -> Successfully created directory!" . PHP_EOL;
    } else {
        echo "   -> ERROR: Failed to create directory. Check permissions!" . PHP_EOL;
        exit;
    }
} else {
    echo "2. Directory exists." . PHP_EOL;
}

echo "3. Testing write permission by writing a test file..." . PHP_EOL;
$testFile = $uploadDir . 'test_write.txt';
if (file_put_contents($testFile, 'Upload Directory Write Test Successful') !== false) {
    echo "   -> SUCCESS: File written to disk!" . PHP_EOL;
    unlink($testFile); // Clean up
} else {
    echo "   -> ERROR: Directory is not writable. Check WAMP/Windows folder permissions!" . PHP_EOL;
}

// Check PHP upload settings
echo "4. Checking PHP upload configuration limits:" . PHP_EOL;
echo "   - upload_max_filesize: " . ini_get('upload_max_filesize') . PHP_EOL;
echo "   - post_max_size: " . ini_get('post_max_size') . PHP_EOL;
echo "   - upload_tmp_dir: " . (ini_get('upload_tmp_dir') ?: 'Default system temp') . PHP_EOL;
