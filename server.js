const express = require('express');
const session = require('express-session');
const fs = require('fs');

const app = express();
const file = 'data/transactions.json';

app.use(express.json());
app.use(session({ secret: 'demo', resave: false, saveUninitialized: false }));
app.use(express.static('public'));

function read() {
  return JSON.parse(fs.readFileSync(file));
}

function save(data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

app.post(['/api/login', '/api/register'], (req, res) => {
  req.session.username = req.body.username;
  res.json({ username: req.body.username });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({}));
});

app.get('/api/me', (req, res) => {
  res.json({ username: req.session.username });
});

app.get('/api/transactions', (req, res) => {
  res.json(read().filter((item) => item.username === req.session.username));
});

app.post('/api/transactions', (req, res) => {
  const transactions = read();
  const item = req.body;
  item.username = req.session.username;
  transactions.push(item);
  save(transactions);
  res.json(item);
});

app.get('/api/summary', (req, res) => {
  const month = new Date().toISOString().slice(0, 7);
  const items = read().filter((item) => item.username === req.session.username && item.date.startsWith(month));
  const income = items.filter((item) => item.type === 'income').reduce((sum, item) => sum + Number(item.amount), 0);
  const expenses = items.filter((item) => item.type === 'expense').reduce((sum, item) => sum + Number(item.amount), 0);
  res.json({ income, expenses, net: income - expenses });
});

//taken straight from github repo in README
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server is live at http://localhost:${PORT}`);
  console.log(`ℹ️ Frontend: http://localhost:${PORT}`);
  console.log(`ℹ️ Database: Local JSON file (No MongoDB needed!)`);
