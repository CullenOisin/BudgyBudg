const express = require('express');
const session = require('express-session');
const fs = require('fs');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const file = path.join(__dirname, 'data', 'transactions.json');
const usersFile = path.join(__dirname, 'data', 'users.json');

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'budgybudg-development-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false
  }
}));
app.use(express.static('public'));

function read() {
  return JSON.parse(fs.readFileSync(file));
}

function save(data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
function readUsers() {
  return JSON.parse(fs.readFileSync(usersFile, 'utf8'));
}

function saveUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({
      error: 'Please log in to access this resource.'
    });
  }

  next();
}

// Register a new user
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required.'
      });
    }

    const cleanUsername = username.trim().toLowerCase();

    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      return res.status(400).json({
        error: 'Username must be between 3 and 30 characters.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters.'
      });
    }

    // Check whether username already exists
    const users = readUsers();

    const existingUser = users.find(
      user => user.username === cleanUsername
    );

    if (existingUser) {
      return res.status(409).json({
        error: 'This username is already taken.'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = {
      id: require('crypto').randomUUID(),
      username: cleanUsername,
      password: hashedPassword
    };

    users.push(newUser);
    saveUsers(users);

    // Create session
    req.session.regenerate((err) => {
      if (err) {
        return res.status(500).json({
          error: 'Could not create session.'
        });
      }

      req.session.userId = newUser.id;
      req.session.username = newUser.username;

      req.session.save((err) => {
        if (err) {
          return res.status(500).json({
            error: 'Could not save session.'
          });
        }

        res.status(201).json({
          username: newUser.username
        });
      });
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Registration failed.'
    });
  }
});


// Login an existing user
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required.'
      });
    }

    const cleanUsername = username.trim().toLowerCase();
    const users = readUsers();

    const user = users.find(
      user => user.username === cleanUsername
    );

    if (!user) {
      return res.status(401).json({
        error: 'Invalid username or password.'
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        error: 'Invalid username or password.'
      });
    }

    req.session.regenerate((err) => {
      if (err) {
        return res.status(500).json({
          error: 'Could not create session.'
        });
      }

      req.session.userId = user.id;
      req.session.username = user.username;

      req.session.save((err) => {
        if (err) {
          return res.status(500).json({
            error: 'Could not save session.'
          });
        }

        res.json({
          username: user.username
        });
      });
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Login failed.'
    });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        error: 'Logout failed.'
      });
    }

    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully.' });
  });
});

app.get('/api/me', (req, res) => {
  res.json({ username: req.session.username });
});

app.get('/api/transactions', requireAuth, (req, res) => {
  res.json(read().filter((item) => item.username === req.session.username));
});

app.post('/api/transactions', requireAuth, (req, res) => {
  const transactions = read();
  const item = {
  ...req.body,
  id: require('crypto').randomUUID(),
  username: req.session.username
};
app.put('/api/transactions/:id', requireAuth, (req, res) => {
  const transactions = read();

  const index = transactions.findIndex(
    (item) =>
      item.id === req.params.id &&
      item.username === req.session.username
  );

  if (index === -1) {
    return res.status(404).json({ error: 'Transaction not found.' });
  }

  const { type, amount, description, category, date } = req.body;

  if (
    !['income', 'expense'].includes(type) ||
    !Number.isFinite(Number(amount)) ||
    Number(amount) <= 0 ||
    !description?.trim() ||
    !category?.trim() ||
    !date
  ) {
    return res.status(400).json({ error: 'Please enter valid transaction details.' });
  }

  transactions[index] = {
    ...transactions[index],
    type,
    amount: Number(amount),
    description: description.trim(),
    category: category.trim(),
    date
  };

  save(transactions);
  res.json(transactions[index]);
});
app.delete('/api/transactions/:id', requireAuth, (req, res) => {
  const transactions = read();

  const index = transactions.findIndex(
    (item) =>
      item.id === req.params.id &&
      item.username === req.session.username
  );

  if (index === -1) {
    return res.status(404).json({ error: 'Transaction not found.' });
  }

  transactions.splice(index, 1);
  save(transactions);

  res.json({ message: 'Transaction deleted successfully.' });
});
transactions.push(item);
  save(transactions);
  res.json(item);
});

app.get('/api/summary', requireAuth, (req, res) => {
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
});
