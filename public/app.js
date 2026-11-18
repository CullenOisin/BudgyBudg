const $ = (id) => document.getElementById(id);
let transactions = [];
//sends request to server
async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  return response.json();
}
//formats the number as $n
function money(amount) {
  return '$' + Number(amount).toFixed(2);
}
//Logging in the user
async function signIn(register) {
  const action = register ? 'register' : 'login';
  await api('/api/' + action, {
    method: 'POST',
    body: JSON.stringify({ username: $('username').value })
  });
  loadPage();
}
//does the login form
$('startForm').addEventListener('submit', (event) => {
  event.preventDefault();
  signIn(false);
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
  await api('/api/transactions', {
    method: 'POST',
    body: JSON.stringify({
      type: $('transaction-type').value,
      amount: $('transaction-amount').value,
      description: $('transaction-description').value,
      category: $('transaction-category').value,
      date: $('transaction-date').value
    })
  });
  $('transaction-form').reset();
  $('transaction-date').value = new Date().toISOString().slice(0, 10);
  loadPage();
});
//displays transactions put in
function showTransactions() {
  const list = $('transaction-list');
  list.replaceChildren();
  transactions.forEach((item) => {
    const row = document.createElement('p');
    row.textContent = item.date + ' | ' + item.type + ' | ' + item.category + ' | ' + item.description + ' | ' + money(item.amount);
    list.appendChild(row);
  });
}
//puts today as the default for inputting a new transaction
$('transaction-date').value = new Date().toISOString().slice(0, 10);
//Will show the dashboard if a user is already signed in
api('/api/me').then((user) => {
  if (user.username) loadPage();
});
