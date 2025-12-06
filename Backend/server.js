require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2');

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// MySQL pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'budget_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}).promise();

pool.getConnection()
  .then(conn => {
    console.log("📦 MySQL Connected!");
    conn.release();
  })
  .catch(err => console.error("❌ DB error:", err));


// ===================== EXPENSES CRUD =====================

// Create Expense
app.post('/expenses', async (req, res) => {
  try {
    const { category, amount, description, date } = req.body;
    if (!category || amount == null || !date)
      return res.status(400).json({ message: 'Missing fields' });

    await pool.execute(
      "INSERT INTO expenses (category, amount, description, date) VALUES (?, ?, ?, ?)",
      [category, parseFloat(amount), description || null, date]
    );

    res.json({ message: 'Expense added' });
  } catch (err) {
    res.status(500).json({ message: 'Error adding expense', error: err.message });
  }
});

// Fetch All Expenses
app.get('/expenses', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, category, amount, description, DATE_FORMAT(date, '%Y-%m-%d') AS date FROM expenses ORDER BY date DESC, id DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching expenses', error: err.message });
  }
});

// Fetch Expense by ID
app.get('/expenses/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const [rows] = await pool.execute(
      "SELECT id, category, amount, description, DATE_FORMAT(date, '%Y-%m-%d') AS date FROM expenses WHERE id = ?",
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching expense', error: err.message });
  }
});


// Update Expense
app.put('/expenses/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { category, amount, description, date } = req.body;

    await pool.execute(
      "UPDATE expenses SET category=?, amount=?, description=?, date=? WHERE id=?",
      [category, parseFloat(amount), description || null, date, id]
    );

    res.json({ message: 'Expense updated' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating expense', error: err.message });
  }
});

// Delete Expense
app.delete('/expenses/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await pool.execute("DELETE FROM expenses WHERE id = ?", [id]);
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting expense', error: err.message });
  }
});


// ===================== MONTHLY BUDGET =====================

app.post('/monthly-budget', async (req, res) => {
  try {
    const { month, budget } = req.body;
    if (!month || budget == null)
      return res.status(400).json({ message: 'Missing fields' });

    const q = `
      INSERT INTO monthly_budget (month, budget)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE budget = ?
    `;
    await pool.execute(q, [month, parseFloat(budget), parseFloat(budget)]);

    res.json({ message: 'Budget updated' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating budget', error: err.message });
  }
});

app.get('/monthly-budget/:month', async (req, res) => {
  try {
    const month = req.params.month;
    const [rows] = await pool.execute(
      "SELECT * FROM monthly_budget WHERE month = ?",
      [month]
    );

    res.json(rows.length ? rows[0] : { month, budget: 0 });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching budget', error: err.message });
  }
});


// ===================== HISTORY =====================

app.get('/history', async (req, res) => {
  try {
    const q = `
      SELECT months.month,
             COALESCE(m.budget, 0) AS budget,
             COALESCE(SUM(e.amount), 0) AS spent,
             COALESCE(m.budget, 0) - COALESCE(SUM(e.amount), 0) AS remaining
      FROM (
        SELECT DISTINCT DATE_FORMAT(date, '%Y-%m') AS month FROM expenses
        UNION
        SELECT month FROM monthly_budget
      ) months
      LEFT JOIN monthly_budget m ON m.month = months.month
      LEFT JOIN expenses e ON DATE_FORMAT(e.date, '%Y-%m') = months.month
      GROUP BY months.month
      ORDER BY months.month DESC
    `;
    const [rows] = await pool.query(q);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching history', error: err.message });
  }
});

// Catch-all route (SPA support)
app.use((req, res, next) => {
  return res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(port, () => {
  console.log(`🚀 Running at http://localhost:${port}`);
});
