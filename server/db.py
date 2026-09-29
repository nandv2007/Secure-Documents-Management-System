import os
import pymysql
import pymysql.cursors
from dotenv import load_dotenv
import random
import time

load_dotenv()

MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", 3306))
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "sipalms_db")


def get_raw_connection(db_name=None):
    """Creates a PyMySQL connection with dictionary cursor."""
    return pymysql.connect(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=db_name,
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
        charset='utf8mb4'
    )


class Database:
    def get_connection(self):
        return get_raw_connection(MYSQL_DATABASE)

    def query(self, sql: str, params=None):
        conn = self.get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(sql, params or ())
                result = cursor.fetchall()
                return result
        finally:
            conn.close()

    def execute(self, sql: str, params=None):
        conn = self.get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(sql, params or ())
                return cursor.lastrowid
        finally:
            conn.close()


db = Database()


def init_database():
    try:
        # 1. Create Database if missing
        root_conn = get_raw_connection(None)
        try:
            with root_conn.cursor() as cursor:
                cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{MYSQL_DATABASE}`;")
        finally:
            root_conn.close()

        # 2. Connect to MySQL Database
        conn = db.get_connection()
        try:
            with conn.cursor() as cursor:
                # Users table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        id VARCHAR(50) PRIMARY KEY,
                        password VARCHAR(255) NOT NULL,
                        name VARCHAR(255) NOT NULL,
                        rankTitle VARCHAR(255) NOT NULL,
                        role VARCHAR(50) NOT NULL,
                        prefix VARCHAR(10) NOT NULL,
                        department VARCHAR(255) NOT NULL,
                        station VARCHAR(255) NOT NULL,
                        badgeNumber VARCHAR(100) NOT NULL,
                        clearance VARCHAR(255) NOT NULL
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """)

                # Cases table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS cases (
                        caseId VARCHAR(50) PRIMARY KEY,
                        title VARCHAR(255) NOT NULL,
                        incidentLocation VARCHAR(255) NOT NULL,
                        status VARCHAR(50) NOT NULL,
                        assignedLawyerId VARCHAR(50) DEFAULT NULL,
                        assignedLawyerName VARCHAR(255) DEFAULT NULL
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """)

                # Case officers table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS case_officers (
                        caseId VARCHAR(50) NOT NULL,
                        officerId VARCHAR(50) NOT NULL,
                        PRIMARY KEY (caseId, officerId)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """)

                # User cases table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS user_cases (
                        userId VARCHAR(50) NOT NULL,
                        caseId VARCHAR(50) NOT NULL,
                        PRIMARY KEY (userId, caseId)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """)

                # Uploaded files table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS uploaded_files (
                        fileId VARCHAR(50) PRIMARY KEY,
                        caseId VARCHAR(50) NOT NULL,
                        fileName VARCHAR(255) NOT NULL,
                        fileSize VARCHAR(50),
                        fileType VARCHAR(100),
                        storagePath VARCHAR(255),
                        uploadedByOfficerId VARCHAR(50) NOT NULL,
                        uploadedByOfficerName VARCHAR(255) NOT NULL,
                        uploadedByRole VARCHAR(50) NOT NULL,
                        uploadTime VARCHAR(100) NOT NULL,
                        category VARCHAR(100) NOT NULL,
                        sha256Hash VARCHAR(64) NOT NULL,
                        description TEXT NOT NULL,
                        txHash VARCHAR(66) DEFAULT NULL,
                        blockNumber INT DEFAULT NULL,
                        digitalSignature TEXT DEFAULT NULL,
                        signerPublicKey TEXT DEFAULT NULL,
                        version VARCHAR(20) DEFAULT 'v1.0',
                        versionNumber DECIMAL(3,1) DEFAULT 1.0,
                        parentFileId VARCHAR(50) DEFAULT NULL,
                        changeSummary TEXT DEFAULT NULL,
                        isLatestVersion BOOLEAN DEFAULT TRUE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """)

                # Alter columns if pre-existing table lacks them
                alter_queries = [
                    'ALTER TABLE uploaded_files ADD COLUMN txHash VARCHAR(66) DEFAULT NULL;',
                    'ALTER TABLE uploaded_files ADD COLUMN blockNumber INT DEFAULT NULL;',
                    'ALTER TABLE uploaded_files ADD COLUMN digitalSignature TEXT DEFAULT NULL;',
                    'ALTER TABLE uploaded_files ADD COLUMN signerPublicKey TEXT DEFAULT NULL;',
                    "ALTER TABLE uploaded_files ADD COLUMN version VARCHAR(20) DEFAULT 'v1.0';",
                    "ALTER TABLE uploaded_files ADD COLUMN versionNumber DECIMAL(3,1) DEFAULT 1.0;",
                    'ALTER TABLE uploaded_files ADD COLUMN parentFileId VARCHAR(50) DEFAULT NULL;',
                    'ALTER TABLE uploaded_files ADD COLUMN changeSummary TEXT DEFAULT NULL;',
                    'ALTER TABLE uploaded_files ADD COLUMN isLatestVersion BOOLEAN DEFAULT TRUE;',
                    'ALTER TABLE audit_logs ADD COLUMN case_id VARCHAR(50) DEFAULT NULL;'
                ]
                for alter_sql in alter_queries:
                    try:
                        cursor.execute(alter_sql)
                    except Exception:
                        pass

                # Security logs table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS security_logs (
                        id VARCHAR(50) PRIMARY KEY,
                        timestamp VARCHAR(100) NOT NULL,
                        officerId VARCHAR(50) NOT NULL,
                        caseId VARCHAR(50) NOT NULL,
                        action VARCHAR(100) NOT NULL,
                        status VARCHAR(50) NOT NULL,
                        details TEXT NOT NULL
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """)

                # Audit logs table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS audit_logs (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        user_id VARCHAR(100) NOT NULL,
                        action VARCHAR(100) NOT NULL,
                        document_id VARCHAR(100) DEFAULT NULL,
                        case_id VARCHAR(50) DEFAULT NULL,
                        timestamp VARCHAR(100) NOT NULL
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """)

                # Blockchain ledger table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS blockchain_ledger (
                        txHash VARCHAR(66) PRIMARY KEY,
                        blockNumber INT NOT NULL,
                        blockHash VARCHAR(66) NOT NULL,
                        caseId VARCHAR(50) NOT NULL,
                        docId VARCHAR(50) NOT NULL,
                        sha256Hash VARCHAR(64) NOT NULL,
                        uploadedBy VARCHAR(255) NOT NULL,
                        timestamp VARCHAR(100) NOT NULL,
                        gasUsed INT NOT NULL,
                        status VARCHAR(20) NOT NULL,
                        signerAddress VARCHAR(66) NOT NULL
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """)

            print(f"[DB] Connected to MySQL database \"{MYSQL_DATABASE}\" at {MYSQL_HOST}:{MYSQL_PORT}")
        finally:
            conn.close()

        seed_initial_data()
    except Exception as error:
        print("[DB ERROR] MySQL initialization failed:", error)
        raise error


def seed_initial_data():
    conn = db.get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) as count FROM users")
            row = cursor.fetchone()
            user_count = row['count'] if row else 0

            if user_count == 0:
                print("[DB] Seeding initial MySQL users...")
                initial_users = [
                    {
                        'id': 'PO-1042',
                        'password': 'police1042',
                        'name': 'Inspector Rajesh Kumar',
                        'rankTitle': 'Station Officer & Case Registrar',
                        'role': 'POLICE_OFFICER',
                        'prefix': 'PO',
                        'department': 'Armoury & Case Operations',
                        'station': 'Central Precinct No. 4',
                        'badgeNumber': 'PO-IND-8821',
                        'clearance': 'Level 1 - Case Details Upload',
                        'assignedCaseIds': ['CASE-102', 'CASE-104']
                    },
                    {
                        'id': 'PO-2055',
                        'password': 'police2055',
                        'name': 'Officer Suresh Verma',
                        'rankTitle': 'Commercial Crime Officer',
                        'role': 'POLICE_OFFICER',
                        'prefix': 'PO',
                        'department': 'Financial Crime Taskforce',
                        'station': 'Metro Division #02',
                        'badgeNumber': 'PO-IND-2055',
                        'clearance': 'Level 1 - Case Details Upload',
                        'assignedCaseIds': ['CASE-103']
                    },
                    {
                        'id': 'IN-8805',
                        'password': 'invest8805',
                        'name': 'Senior Det. Anita Sharma',
                        'rankTitle': 'Lead Case Investigator',
                        'role': 'INVESTIGATOR',
                        'prefix': 'IN',
                        'department': 'Special Crime Branch',
                        'station': 'District HQ Command',
                        'badgeNumber': 'IN-IND-3042',
                        'clearance': 'Level 2 - Case Evidence Intelligence',
                        'assignedCaseIds': ['CASE-102', 'CASE-103', 'CASE-104']
                    },
                    {
                        'id': 'FO-4091',
                        'password': 'forensic4091',
                        'name': 'Dr. Vikramaditya Roy',
                        'rankTitle': 'Chief Forensic Specialist',
                        'role': 'FORENSIC_OFFICER',
                        'prefix': 'FO',
                        'department': 'Digital & Ballistics Forensic Lab',
                        'station': 'State Crime Lab Annex',
                        'badgeNumber': 'FO-IND-9102',
                        'clearance': 'Level 3 - Forensic Lab Upload',
                        'assignedCaseIds': ['CASE-102', 'CASE-103']
                    },
                    {
                        'id': 'LW-9120',
                        'password': 'lawyer9120',
                        'name': 'Advocate Meera Deshmukh',
                        'rankTitle': 'Public Prosecutor',
                        'role': 'LAWYER',
                        'prefix': 'LW',
                        'department': 'State Legal Cell',
                        'station': 'High Court Directorate',
                        'badgeNumber': 'LW-IND-5011',
                        'clearance': 'Level 4 - Read-Only Court Vault',
                        'assignedCaseIds': ['CASE-102', 'CASE-103', 'CASE-104']
                    }
                ]

                for u in initial_users:
                    cursor.execute(
                        """INSERT INTO users (id, password, name, rankTitle, role, prefix, department, station, badgeNumber, clearance)
                           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                        (u['id'], u['password'], u['name'], u['rankTitle'], u['role'], u['prefix'], u['department'], u['station'], u['badgeNumber'], u['clearance'])
                    )
                    for case_id in u['assignedCaseIds']:
                        cursor.execute("INSERT IGNORE INTO user_cases (userId, caseId) VALUES (%s, %s)", (u['id'], case_id))

            cursor.execute("SELECT COUNT(*) as count FROM cases")
            case_row = cursor.fetchone()
            case_count = case_row['count'] if case_row else 0

            if case_count == 0:
                print("[DB] Seeding initial MySQL cases...")
                initial_cases = [
                    {
                        'caseId': 'CASE-102',
                        'title': 'State vs. Sector 14 High-Value Robbery Incident',
                        'incidentLocation': 'Sector 14 Financial Quarter',
                        'status': 'OPEN_INVESTIGATION',
                        'assignedOfficerIds': ['PO-1042', 'IN-8805', 'FO-4091', 'LW-9120'],
                        'assignedLawyerId': 'LW-9120',
                        'assignedLawyerName': 'Advocate Meera Deshmukh'
                    },
                    {
                        'caseId': 'CASE-103',
                        'title': 'Downtown Commercial Financial Fraud',
                        'incidentLocation': 'Metro Bank Tower #02',
                        'status': 'FORENSIC_REVIEW',
                        'assignedOfficerIds': ['PO-2055', 'IN-8805', 'FO-4091'],
                        'assignedLawyerId': None,
                        'assignedLawyerName': None
                    },
                    {
                        'caseId': 'CASE-104',
                        'title': 'High-Tech Cyber Intrusion & Ransomware',
                        'incidentLocation': 'State Server Data Center',
                        'status': 'OPEN_INVESTIGATION',
                        'assignedOfficerIds': ['PO-1042', 'IN-8805'],
                        'assignedLawyerId': None,
                        'assignedLawyerName': None
                    }
                ]

                for c in initial_cases:
                    cursor.execute(
                        """INSERT INTO cases (caseId, title, incidentLocation, status, assignedLawyerId, assignedLawyerName)
                           VALUES (%s, %s, %s, %s, %s, %s)""",
                        (c['caseId'], c['title'], c['incidentLocation'], c['status'], c['assignedLawyerId'], c['assignedLawyerName'])
                    )
                    for off_id in c['assignedOfficerIds']:
                        cursor.execute("INSERT IGNORE INTO case_officers (caseId, officerId) VALUES (%s, %s)", (c['caseId'], off_id))
    finally:
        conn.close()


def add_security_log(officer_id: str, case_id: str, action: str, status: str, details: str):
    try:
        log_id = f"LOG-{int(time.time() * 1000)}-{random.randint(1000, 9999)}"
        timestamp = time.strftime("%Y-%m-%d, %I:%M:%S %p IST")
        db.execute(
            """INSERT INTO security_logs (id, timestamp, officerId, caseId, action, status, details)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (log_id, timestamp, officer_id, case_id, action, status, details)
        )
    except Exception as err:
        print("[DB LOG ERROR]", err)


def log_audit_event(user_id: str, action: str, document_id: str = None, case_id: str = None):
    try:
        timestamp = time.strftime("%Y-%m-%d, %I:%M:%S %p IST")
        db.execute(
            """INSERT INTO audit_logs (user_id, action, document_id, case_id, timestamp)
               VALUES (%s, %s, %s, %s, %s)""",
            (user_id, action, document_id, case_id, timestamp)
        )
    except Exception as err:
        print("[AUDIT LOG ERROR]", err)
