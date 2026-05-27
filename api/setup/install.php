<?php
// api/setup/install.php

require_once __DIR__ . '/../config/database.php';

header('Content-Type: text/html; charset=utf-8');

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    
    echo "<h2>Starting Database Installation...</h2>";

    // 1. Create Database if not exists
    $dbName = 'student_resource_hub';
    $conn->exec("CREATE DATABASE IF NOT EXISTS `$dbName` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    echo "<p style='color: green;'>✓ Database `$dbName` created or already exists.</p>";
    
    // Select the DB
    $conn->exec("USE `$dbName`");

    // 2. Create tables
    
    // Users table
    $usersTable = "CREATE TABLE IF NOT EXISTS `users` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `username` VARCHAR(50) NOT NULL UNIQUE,
        `email` VARCHAR(100) NOT NULL UNIQUE,
        `password_hash` VARCHAR(255) NOT NULL,
        `avatar` VARCHAR(255) NULL,
        `role` ENUM('student', 'admin') DEFAULT 'student',
        `is_banned` TINYINT DEFAULT 0,
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    $conn->exec($usersTable);
    echo "<p style='color: green;'>✓ Table `users` created.</p>";

    // Departments table
    $departmentsTable = "CREATE TABLE IF NOT EXISTS `departments` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `name` VARCHAR(100) NOT NULL UNIQUE,
        `slug` VARCHAR(100) NOT NULL UNIQUE,
        `cover_image` VARCHAR(255) NULL,
        `gradient_seed` VARCHAR(50) NOT NULL,
        `description` TEXT NULL,
        `created_by` INT,
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    $conn->exec($departmentsTable);
    echo "<p style='color: green;'>✓ Table `departments` created.</p>";

    // Years table
    $yearsTable = "CREATE TABLE IF NOT EXISTS `years` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `department_id` INT NOT NULL,
        `name` VARCHAR(50) NOT NULL,
        `cover_image` VARCHAR(255) NULL,
        `gradient_seed` VARCHAR(50) NOT NULL,
        `created_by` INT,
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY `unique_dept_year` (`department_id`, `name`),
        FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    $conn->exec($yearsTable);
    echo "<p style='color: green;'>✓ Table `years` created.</p>";

    // Semesters table
    $semestersTable = "CREATE TABLE IF NOT EXISTS `semesters` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `year_id` INT NOT NULL,
        `name` VARCHAR(50) NOT NULL,
        `created_by` INT,
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY `unique_year_semester` (`year_id`, `name`),
        FOREIGN KEY (`year_id`) REFERENCES `years`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    $conn->exec($semestersTable);
    echo "<p style='color: green;'>✓ Table `semesters` created.</p>";

    // Courses table
    $coursesTable = "CREATE TABLE IF NOT EXISTS `courses` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `semester_id` INT NOT NULL,
        `name` VARCHAR(100) NOT NULL,
        `course_code` VARCHAR(20) NULL,
        `cover_image` VARCHAR(255) NULL,
        `gradient_seed` VARCHAR(50) NOT NULL,
        `description` TEXT NULL,
        `created_by` INT,
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY `unique_semester_course` (`semester_id`, `name`),
        FOREIGN KEY (`semester_id`) REFERENCES `semesters`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    $conn->exec($coursesTable);
    echo "<p style='color: green;'>✓ Table `courses` created.</p>";

    // Resources table
    $resourcesTable = "CREATE TABLE IF NOT EXISTS `resources` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `course_id` INT NOT NULL,
        `uploaded_by` INT,
        `title` VARCHAR(200) NOT NULL,
        `description` TEXT NULL,
        `resource_type` ENUM('pdf', 'link', 'text') NOT NULL,
        `file_path` VARCHAR(255) NULL,
        `external_link` VARCHAR(500) NULL,
        `content` TEXT NULL,
        `exam_type` ENUM('midterm', 'final', 'quiz', 'notes', 'other') NOT NULL,
        `cover_image` VARCHAR(255) NULL,
        `gradient_seed` VARCHAR(50) NOT NULL,
        `like_count` INT DEFAULT 0,
        `view_count` INT DEFAULT 0,
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY `unique_course_resource` (`course_id`, `title`, `exam_type`),
        FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    $conn->exec($resourcesTable);
    echo "<p style='color: green;'>✓ Table `resources` created.</p>";

    // Comments table
    $commentsTable = "CREATE TABLE IF NOT EXISTS `comments` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `resource_id` INT NOT NULL,
        `user_id` INT NOT NULL,
        `body` TEXT NOT NULL,
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    $conn->exec($commentsTable);
    echo "<p style='color: green;'>✓ Table `comments` created.</p>";

    // Likes table
    $likesTable = "CREATE TABLE IF NOT EXISTS `likes` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `user_id` INT NOT NULL,
        `resource_id` INT NOT NULL,
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY `unique_user_like` (`user_id`, `resource_id`),
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    $conn->exec($likesTable);
    echo "<p style='color: green;'>✓ Table `likes` created.</p>";

    // Bookmarks table
    $bookmarksTable = "CREATE TABLE IF NOT EXISTS `bookmarks` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `user_id` INT NOT NULL,
        `resource_id` INT NOT NULL,
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY `unique_user_bookmark` (`user_id`, `resource_id`),
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    $conn->exec($bookmarksTable);
    echo "<p style='color: green;'>✓ Table `bookmarks` created.</p>";

    // 3. Create Indexes
    echo "<h3>Creating indexes...</h3>";
    
    // Check and create index on departments(name)
    $conn->exec("CREATE INDEX `idx_dept_name` ON `departments` (`name`)");
    // Check and create index on courses(name)
    $conn->exec("CREATE INDEX `idx_course_name` ON `courses` (`name`)");
    // Check and create index on resources(title)
    $conn->exec("CREATE INDEX `idx_resource_title` ON `resources` (`title`)");
    // Fulltext on resources
    $conn->exec("CREATE FULLTEXT INDEX `idx_resource_ft` ON `resources` (`title`, `description`)");
    // Fulltext on comments
    $conn->exec("CREATE FULLTEXT INDEX `idx_comment_ft` ON `comments` (`body`)");
    
    echo "<p style='color: green;'>✓ Indexes created successfully.</p>";

    // 4. Seed admin account
    echo "<h3>Seeding admin account...</h3>";
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ? OR username = ?");
    $stmt->execute(['admin@hub.local', 'admin']);
    $admin = $stmt->fetch();
    
    if (!$admin) {
        $passwordHash = password_hash('Admin123!', PASSWORD_BCRYPT);
        $insertAdmin = $conn->prepare("INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'admin')");
        $insertAdmin->execute(['admin', 'admin@hub.local', $passwordHash]);
        echo "<p style='color: green;'>✓ Admin account seeded: <strong>admin@hub.local</strong> / <strong>Admin123!</strong></p>";
    } else {
        echo "<p style='color: blue;'>ℹ Admin account already exists. Skipping seed.</p>";
    }

    // 4b. Seed Freshman department
    echo "<h3>Seeding Fresh man department...</h3>";
    $stmtDept = $conn->prepare("SELECT id FROM departments WHERE name = 'Fresh man'");
    $stmtDept->execute();
    $freshmanDept = $stmtDept->fetch();
    
    // Get admin ID
    $stmtAdmin = $conn->prepare("SELECT id FROM users WHERE username = 'admin' LIMIT 1");
    $stmtAdmin->execute();
    $adminId = $stmtAdmin->fetchColumn() ?: null;
    
    if (!$freshmanDept) {
        $insertDept = $conn->prepare("
            INSERT INTO departments (name, slug, gradient_seed, description, created_by) 
            VALUES (?, ?, ?, ?, ?)
        ");
        $insertDept->execute(['Fresh man', 'fresh-man', substr(md5('Fresh man'), 0, 10), 'Fresh man general courses and foundational study materials.', $adminId]);
        $deptId = $conn->lastInsertId();
        
        // Under Freshman, we only have Year 1
        $insertYear = $conn->prepare("
            INSERT INTO years (department_id, name, gradient_seed, created_by) 
            VALUES (?, ?, ?, ?)
        ");
        $insertYear->execute([$deptId, 'Year 1', substr(md5('Year 1' . $deptId), 0, 10), $adminId]);
        $yearId = $conn->lastInsertId();
        
        // Under Year 1, we only have Semester 1
        $insertSemester = $conn->prepare("
            INSERT INTO semesters (year_id, name, created_by) 
            VALUES (?, ?, ?)
        ");
        $insertSemester->execute([$yearId, 'Semester 1', $adminId]);
        
        echo "<p style='color: green;'>✓ Seeding Fresh man department completed successfully.</p>";
    } else {
        echo "<p style='color: blue;'>ℹ Fresh man department already exists. Skipping seed.</p>";
    }

    // 5. Create directories
    echo "<h3>Creating upload directories...</h3>";
    $dirs = [
        __DIR__ . '/../../uploads',
        __DIR__ . '/../../uploads/resources',
        __DIR__ . '/../../uploads/covers',
        __DIR__ . '/../../uploads/avatars'
    ];
    foreach ($dirs as $dir) {
        if (!file_exists($dir)) {
            mkdir($dir, 0777, true);
            echo "<p style='color: green;'>✓ Directory created: $dir</p>";
        } else {
            echo "<p style='color: blue;'>ℹ Directory already exists: $dir</p>";
        }
    }

    echo "<h2 style='color: green;'>Database Setup Successful!</h2>";

} catch (PDOException $e) {
    echo "<h2 style='color: red;'>Setup Failed:</h2>";
    echo "<p style='color: red;'>" . $e->getMessage() . "</p>";
}
