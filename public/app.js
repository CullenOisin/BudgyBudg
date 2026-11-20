const $ = (id) => document.getElementById(id);
let transactions = [];
let editingTransactionId = null;
let isRegistering = false;

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong.');
  }
  return data;
}
//formats the number as $n
function money(amount) {
  return '$' + Number(amount).toFixed(2);
}
//Logging in the user
async function signIn(register) {
  const action = register ? 'register' : 'login';
  try {
    await api('/api/' + action, {
      method: 'POST',
      body: JSON.stringify({
        username: $('username').value,
        password: $('password').value
      })
    });
    await loadPage();
  } catch (error) {
    $('authMessage').textContent = error.message;
  }
}
//does the login form
$('startForm').addEventListener('submit', (event) => {
  event.preventDefault();
  signIn(isRegistering);
});
$('auth-switch').addEventListener('click', () => {
  isRegistering = !isRegistering;

  $('auth-description').textContent = isRegistering
    ? 'Sign up to start managing your money.'
    : 'Log in to manage your money and reach your goals.';

  $('auth-submit').textContent = isRegistering
    ? 'Create account'
    : 'Log in';

  $('auth-switch-text').textContent = isRegistering
    ? 'Already have an account?'
    : "Don't have an account?";

  $('auth-switch').textContent = isRegistering
    ? 'Log in'
    : 'Create account';

  $('password').value = '';
  $('authMessage').textContent = '';
});

$('toggle-password').addEventListener('click', () => {
  const password = $('password');
  const showing = password.type === 'text';
  password.type = showing ? 'password' : 'text';
  $('toggle-password').textContent = showing ? 'Show' : 'Hide';
});

//does logout
$('logout-button').addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST' });
  $('dashboard').hidden = true;
  $('start').hidden = false;
});
//After login loads user data and shows the hidden dashboard
async function loadPage() {
  const user = await api('/api/me');
  transactions = await api('/api/transactions');
  const totals = await api('/api/summary');

  $('current-user').textContent = user.username;
  $('income-total').textContent = money(totals.income);
  $('expense-total').textContent = money(totals.expenses);
  $('net-total').textContent = money(totals.net);
  $('start').hidden = true;
  $('dashboard').hidden = false;
  showTransactions();
}
//saves a transaction that was inputted
$('transaction-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const isEditing = editingTransactionId !== null;

  try {
    await api(
      isEditing
        ? '/api/transactions/' + editingTransactionId
        : '/api/transactions',
      {
        method: isEditing ? 'PUT' : 'POST',
        body: JSON.stringify({
          type: $('transaction-type').value,
          amount: $('transaction-amount').value,
          description: $('transaction-description').value,
          category: $('transaction-category').value,
          date: $('transaction-date').value
        })
      }
    );
    resetTransactionForm();
    await loadPage();
  } catch (error) {
    $('transaction-message').textContent = error.message;
  }
});

function resetTransactionForm() {
  editingTransactionId = null;
  $('transaction-save').textContent = 'Add transaction';
  $('cancel-edit').hidden = true;
  $('transaction-form').reset();
  $('transaction-date').value = new Date().toISOString().slice(0, 10);
}

function editTransaction(id) {
  const item = transactions.find((transaction) => transaction.id === id);
  if (!item) return;

  editingTransactionId = id;
  $('transaction-type').value = item.type;
  $('transaction-amount').value = item.amount;
  $('transaction-description').value = item.description;
  $('transaction-category').value = item.category;
  $('transaction-date').value = item.date;
  $('transaction-save').textContent = 'Save transaction';
  $('cancel-edit').hidden = false;
}

async function deleteTransaction(id) {
  try {
    await api('/api/transactions/' + id, { method: 'DELETE' });
    await loadPage();
  } catch (error) {
    $('transaction-message').textContent = error.message;
  }
}

$('cancel-edit').addEventListener('click', resetTransactionForm);
//displays transactions put in
function showTransactions() {
  const list = $('transaction-list');
  list.replaceChildren();

  transactions.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'transaction-row';

    const details = document.createElement('p');
    details.textContent =
      item.date + ' | ' +
      item.type + ' | ' +
      item.category + ' | ' +
      item.description + ' | ' +
      money(item.amount);

    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.type = 'button';
    editButton.addEventListener('click', () => editTransaction(item.id));

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.type = 'button';
    deleteButton.addEventListener('click', () => deleteTransaction(item.id));

    row.append(details, editButton, deleteButton);
    list.appendChild(row);
  });
}
//puts today as the default for inputting a new transaction
$('transaction-date').value = new Date().toISOString().slice(0, 10);
//Will show the dashboard if a user is already signed in
api('/api/me').then((user) => {
  if (user.username) loadPage();
});
