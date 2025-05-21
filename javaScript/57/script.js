document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const yearSpan = document.getElementById('year');
  yearSpan.textContent = new Date().getFullYear();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = form.username.value.trim();
    const password = form.password.value;

    const res = await fetch('/.netlify/functions/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.success) {
      alert(data.message);
      localStorage.setItem('triggerUser', JSON.stringify({ username }));
    } else {
      alert(data.message);
    }
  });
});
