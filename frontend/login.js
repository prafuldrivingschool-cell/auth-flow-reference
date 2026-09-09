export async function login(email, password) {
  const response = await fetch("/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) throw new Error("Login failed");
  return response.json();
}

// Demo only. Production browser apps should prefer a secure, HttpOnly cookie
// strategy for refresh/session credentials instead of persistent JS storage.
