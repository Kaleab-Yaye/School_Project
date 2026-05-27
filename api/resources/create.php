<?php
// api/resources/create.php

require_once __DIR__ . '/../middleware/auth_check.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

// Function to generate slug
function makeSlug($text) {
    $text = preg_replace('~[^\pL\d]+~u', '-', $text);
    $text = iconv('utf-8', 'us-ascii//TRANSLIT', $text);
    $text = preg_replace('~[^-\w]+~', '', $text);
    $text = trim($text, '-');
    $text = preg_replace('~-+~', '-', $text);
    $text = strtolower($text);
    if (empty($text)) return 'n-a';
    return $text;
}

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    $db->selectDatabase();

    // Since files are uploaded, input is multipart/form-data
    $dept_id = isset($_POST['department_id']) ? (int)$_POST['department_id'] : 0;
    $dept_name = isset($_POST['department_name']) ? trim($_POST['department_name']) : '';

    $year_id = isset($_POST['year_id']) ? (int)$_POST['year_id'] : 0;
    $year_name = isset($_POST['year_name']) ? trim($_POST['year_name']) : '';

    $sem_id = isset($_POST['semester_id']) ? (int)$_POST['semester_id'] : 0;
    $sem_name = isset($_POST['semester_name']) ? trim($_POST['semester_name']) : '';

    $course_id = isset($_POST['course_id']) ? (int)$_POST['course_id'] : 0;
    $course_name = isset($_POST['course_name']) ? trim($_POST['course_name']) : '';
    $course_code = isset($_POST['course_code']) ? trim($_POST['course_code']) : null;
    $course_desc = isset($_POST['course_desc']) ? trim($_POST['course_desc']) : '';

    $title = isset($_POST['title']) ? trim($_POST['title']) : '';
    $description = isset($_POST['description']) ? trim($_POST['description']) : '';
    $resource_type = isset($_POST['resource_type']) ? trim($_POST['resource_type']) : '';
    $exam_type = isset($_POST['exam_type']) ? trim($_POST['exam_type']) : 'other';
    $external_link = isset($_POST['external_link']) ? trim($_POST['external_link']) : null;
    $content = isset($_POST['content']) ? trim($_POST['content']) : null;

    if (empty($title) || empty($resource_type)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Resource title and type are required.']);
        exit;
    }

    // Start Transaction to guarantee DB integrity across dynamic creations
    $conn->beginTransaction();

    // 1. Resolve Department
    if ($dept_id <= 0) {
        if (empty($dept_name)) {
            throw new Exception("Department selection or creation is required.");
        }
        
        // Check if exists
        $stmt = $conn->prepare("SELECT id FROM departments WHERE name = ?");
        $stmt->execute([$dept_name]);
        $existingDept = $stmt->fetch();
        
        if ($existingDept) {
            $dept_id = $existingDept['id'];
        } else {
            $slug = makeSlug($dept_name);
            $seed = substr(md5($dept_name), 0, 10);
            $stmt = $conn->prepare("INSERT INTO departments (name, slug, gradient_seed, created_by) VALUES (?, ?, ?, ?)");
            $stmt->execute([$dept_name, $slug, $seed, $current_user['id']]);
            $dept_id = $conn->lastInsertId();

            // Auto-create Year 1-5 with Semester 2 for Year 1, and Semester 1 & 2 for Year 2-5
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
                $yearGradientSeed = substr(md5($yearName . $dept_id), 0, 10);
                $insertYear->execute([$dept_id, $yearName, $yearGradientSeed, $current_user['id']]);
                $yearId = $conn->lastInsertId();

                if ($y === 1) {
                    $insertSemester->execute([$yearId, 'Semester 2', $current_user['id']]);
                } else {
                    $insertSemester->execute([$yearId, 'Semester 1', $current_user['id']]);
                    $insertSemester->execute([$yearId, 'Semester 2', $current_user['id']]);
                }
            }
        }
    }

    // 2. Resolve Year
    if ($year_id <= 0) {
        if (empty($year_name)) {
            throw new Exception("Academic year is required.");
        }
        
        $stmt = $conn->prepare("SELECT id FROM years WHERE department_id = ? AND name = ?");
        $stmt->execute([$dept_id, $year_name]);
        $existingYear = $stmt->fetch();
        
        if ($existingYear) {
            $year_id = $existingYear['id'];
        } else {
            $seed = substr(md5($year_name . $dept_id), 0, 10);
            $stmt = $conn->prepare("INSERT INTO years (department_id, name, gradient_seed, created_by) VALUES (?, ?, ?, ?)");
            $stmt->execute([$dept_id, $year_name, $seed, $current_user['id']]);
            $year_id = $conn->lastInsertId();
        }
    }

    // 3. Resolve Semester
    if ($sem_id <= 0) {
        if (empty($sem_name)) {
            throw new Exception("Semester selection is required.");
        }
        
        $stmt = $conn->prepare("SELECT id FROM semesters WHERE year_id = ? AND name = ?");
        $stmt->execute([$year_id, $sem_name]);
        $existingSem = $stmt->fetch();
        
        if ($existingSem) {
            $sem_id = $existingSem['id'];
        } else {
            $stmt = $conn->prepare("INSERT INTO semesters (year_id, name, created_by) VALUES (?, ?, ?)");
            $stmt->execute([$year_id, $sem_name, $current_user['id']]);
            $sem_id = $conn->lastInsertId();
        }
    }

    // 4. Resolve Course
    if ($course_id <= 0) {
        if (empty($course_name)) {
            throw new Exception("Course class name is required.");
        }
        
        $stmt = $conn->prepare("SELECT id FROM courses WHERE semester_id = ? AND name = ?");
        $stmt->execute([$sem_id, $course_name]);
        $existingCourse = $stmt->fetch();
        
        if ($existingCourse) {
            $course_id = $existingCourse['id'];
        } else {
            $seed = substr(md5($course_name . $sem_id), 0, 10);
            $stmt = $conn->prepare("INSERT INTO courses (semester_id, name, course_code, gradient_seed, description, created_by) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$sem_id, $course_name, $course_code, $seed, $course_desc, $current_user['id']]);
            $course_id = $conn->lastInsertId();
        }
    }

    // 5. Check Duplicate Resource
    $stmt = $conn->prepare("SELECT id FROM resources WHERE course_id = ? AND title = ? AND exam_type = ?");
    $stmt->execute([$course_id, $title, $exam_type]);
    if ($stmt->fetch()) {
        throw new Exception("A resource with this title and exam type already exists under this course.", 409);
    }

    // 6. Handle File Uploads
    $file_path = null;
    if ($resource_type === 'pdf') {
        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            throw new Exception("PDF file upload is required.");
        }

        $file = $_FILES['file'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        
        if ($ext !== 'pdf') {
            throw new Exception("Invalid file type. Only PDF documents are allowed.");
        }

        if ($file['size'] > 50 * 1024 * 1024) {
            throw new Exception("File size exceeds the 50MB limit.");
        }

        // Generate unique filename
        $fileName = bin2hex(random_bytes(16)) . '.pdf';
        
        // Define absolute path in htdocs student-hub uploads folder
        // Note: we place it in "../../uploads/resources/" relative to this endpoint
        $uploadDir = __DIR__ . '/../../uploads/resources/';
        
        if (!file_exists($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        $destPath = $uploadDir . $fileName;

        if (!move_uploaded_file($file['tmp_name'], $destPath)) {
            throw new Exception("Failed to save uploaded file onto server filesystem.");
        }

        // Relative path for client usage
        $file_path = 'uploads/resources/' . $fileName;
    }

    // 7. Insert Resource
    $seed = substr(md5($title . time()), 0, 10);
    $stmt = $conn->prepare("
        INSERT INTO resources (course_id, uploaded_by, title, description, resource_type, file_path, external_link, content, exam_type, gradient_seed) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $course_id,
        $current_user['id'],
        $title,
        $description,
        $resource_type,
        $file_path,
        $external_link,
        $content,
        $exam_type,
        $seed
    ]);
    
    $resource_id = $conn->lastInsertId();

    // Commit Transaction
    $conn->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Resource uploaded and categorized successfully.',
        'data' => [
            'id' => $resource_id,
            'title' => $title,
            'course_id' => $course_id
        ]
    ]);

} catch (Exception $e) {
    if (isset($conn) && $conn->inTransaction()) {
        $conn->rollBack();
    }
    
    $code = $e->getCode();
    if ($code !== 409 && $code !== 400) {
        http_response_code(500);
    } else {
        http_response_code($code);
    }
    
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
