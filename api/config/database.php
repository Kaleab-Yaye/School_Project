<?php
// api/config/database.php

class Database {
    private static $instance = null;
    private $conn;

    private $host = 'localhost';
    private $db_name = 'student_resource_hub';
    private $username = 'root';
    private $password = ''; // Default WAMP password is empty

    private function __construct() {
        try {
            // Establish PDO connection
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";charset=utf8mb4",
                $this->username,
                $this->password
            );
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            header('Content-Type: application/json', true, 500);
            echo json_encode([
                'success' => false,
                'message' => 'Database connection error: ' . $e->getMessage()
            ]);
            exit;
        }
    }

    public static function getInstance() {
        if (self::$instance == null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->conn;
    }

    // Connect to the specific database
    public function selectDatabase() {
        try {
            $this->conn->exec("USE `" . $this->db_name . "`");
        } catch (PDOException $e) {
            // Database might not exist yet (before install.php is run)
            // We ignore it or handle it at the caller level
        }
    }
}
