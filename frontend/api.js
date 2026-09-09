export async function getCurrentUser(accessToken) {
  const response = await fetch("/auth/me", {
    headers: { authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) throw new Error("Unauthorized");
  return response.json();
}

export async function refreshSession(refreshToken) {
  const response = await fetch("/auth/refresh", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken })
  });

  if (!response.ok) throw new Error("Refresh failed");
  return response.json();
}
