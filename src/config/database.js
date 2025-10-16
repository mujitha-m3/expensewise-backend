const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    this.db = null;
    this.dbPath = process.env.DB_PATH || './database/expensewise.db';
  }

  init() {
    return new Promise((resolve, reject) => {
      try {
        // Ensure database directory exists
        const dbDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dbDir)) {
          fs.mkdirSync(dbDir, { recursive: true });
        }

        // Connect to SQLite database
        this.db = new sqlite3.Database(this.dbPath, (err) => {
          if (err) {
            console.error('Error opening database:', err.message);
            reject(err);
          } else {
            console.log('Connected to SQLite database');
            this.createTables()
              .then(() => {
                console.log('Database tables initialized');
                resolve();
              })
              .catch(reject);
          }
        });

        // Enable foreign keys
        this.db.run('PRAGMA foreign_keys = ON');
      } catch (error) {
        console.error('Database initialization error:', error);
        reject(error);
      }
    });
  }

  async createTables() {
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        currency TEXT DEFAULT 'LKR',
        is_active BOOLEAN DEFAULT 1,
        email_verified BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Refresh tokens table
      `CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`,

      // Categories table
      `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#2196F3',
        icon TEXT DEFAULT 'category',
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`,

      // Income table
      `CREATE TABLE IF NOT EXISTS income (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        source TEXT,
        description TEXT,
        start_date DATE,
        end_date DATE,
        is_active BOOLEAN DEFAULT 1,
        is_archived BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`,

      // Expenses table
      `CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        due_date DATE,
        status TEXT DEFAULT 'Pending',
        type TEXT DEFAULT 'Regular',
        is_archived BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories (id)
      )`,

      // Allocation templates table
      `CREATE TABLE IF NOT EXISTS allocation_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`,

      // Allocation buckets table
      `CREATE TABLE IF NOT EXISTS allocation_buckets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        percentage REAL NOT NULL,
        target_amount REAL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (template_id) REFERENCES allocation_templates (id) ON DELETE CASCADE
      )`,

      // Distribution records table
      `CREATE TABLE IF NOT EXISTS distributions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        income_id INTEGER NOT NULL,
        bucket_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (income_id) REFERENCES income (id) ON DELETE CASCADE,
        FOREIGN KEY (bucket_id) REFERENCES allocation_buckets (id) ON DELETE CASCADE
      )`,

      // User preferences table
      `CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        notification_due_reminder BOOLEAN DEFAULT 1,
        notification_allocation_reminder BOOLEAN DEFAULT 1,
        notification_summary BOOLEAN DEFAULT 1,
        notification_frequency TEXT DEFAULT 'weekly',
        theme TEXT DEFAULT 'light',
        language TEXT DEFAULT 'en',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`,

      // Create indexes for better performance
      `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
      `CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id)`,
      `CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(due_date)`,
      `CREATE INDEX IF NOT EXISTS idx_income_user_id ON income(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token)`
    ];

    for (const table of tables) {
      await this.run(table);
    }

    // Insert default categories for new users (will be used in user creation)
    await this.insertDefaultCategories();
  }

  async insertDefaultCategories() {
    // Check if default categories exist
    const existing = await this.get('SELECT COUNT(*) as count FROM categories WHERE user_id = 0');
    
    if (existing && existing.count === 0) {
      const defaultCategories = [
        { name: 'Food & Dining', color: '#FF6384', icon: 'restaurant' },
        { name: 'Transportation', color: '#36A2EB', icon: 'directions-car' },
        { name: 'Shopping', color: '#FFCE56', icon: 'shopping-cart' },
        { name: 'Entertainment', color: '#4BC0C0', icon: 'movie' },
        { name: 'Bills & Utilities', color: '#9966FF', icon: 'receipt' },
        { name: 'Healthcare', color: '#FF9F40', icon: 'local-hospital' },
        { name: 'Education', color: '#FF6B6B', icon: 'school' },
        { name: 'Other', color: '#95A5A6', icon: 'category' }
      ];

      // Insert as templates (user_id = 0)
      for (const category of defaultCategories) {
        await this.run(
          'INSERT OR IGNORE INTO categories (user_id, name, color, icon) VALUES (?, ?, ?, ?)',
          [0, category.name, category.color, category.icon]
        );
      }
    }
  }

  // Promisify database operations
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('Database run error:', err.message);
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('Database get error:', err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('Database all error:', err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing database:', err.message);
            reject(err);
          } else {
            console.log('📦 Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

// Create singleton instance
const database = new Database();

module.exports = database;