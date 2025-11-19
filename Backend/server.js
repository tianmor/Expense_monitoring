var express = require('express');
var bodyParser = require('body-parser');
var mysql = require('mysql2');
var cors = require('cors');
var app = express();
var port = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.json());
app.use(cors()); // allows requests from your frontend

// MySQL Connection
var db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'T1red0fENwalK1ng', // change to your MySQL password
  database: 'budget_db'
});

db.connect(function(err) {
  if (err) throw err;
  console.log("✅ Connected to MySQL database (budget_db)");
});

// ---------- CRUD Operations ----------

// CREATE - Add a new expense
app.post('/expenses', function(req, res) {
  var { category, amount, description, date } = req.body;

  db.query(
    "INSERT INTO expenses (category, amount, description, date) VALUES (?, ?, ?, ?)",
    [category, amount, description, date],
    function(err, result) {
      if (err) return res.status(500).json({ message: "Error adding expense", error: err });
      res.json({ message: "Expense added successfully" });
    }
  );
});

// READ - Get all expenses
app.get('/expenses', function(req, res) {
  db.query("SELECT * FROM expenses ORDER BY date DESC", function(err, results) {
    if (err) return res.status(500).json({ message: "Error fetching expenses", error: err });
    res.json(results);
  });
});

// UPDATE - Edit an expense
app.put('/expenses/:id', function(req, res) {
  var id = req.params.id;
  var { category, amount, description, date } = req.body;

  db.query(
    "UPDATE expenses SET category=?, amount=?, description=?, date=? WHERE id=?",
    [category, amount, description, date, id],
    function(err, result) {
      if (err) return res.status(500).json({ message: "Error updating expense", error: err });
      res.json({ message: "Expense updated successfully" });
    }
  );
});

// DELETE - Remove an expense
app.delete('/expenses/:id', function(req, res) {
  var id = req.params.id;
  db.query("DELETE FROM expenses WHERE id=?", [id], function(err, result) {
    if (err) return res.status(500).json({ message: "Error deleting expense", error: err });
    res.json({ message: "Expense deleted successfully" });
  });
});

// Start server
app.listen(port, function() {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
