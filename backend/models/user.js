const users = new Map([
  ["demo@example.com", { id: "user_1", email: "demo@example.com", password: "demo-password" }]
]);

export function findUserByEmail(email) {
  return users.get(email.toLowerCase());
}

export function findUserById(id) {
  for (const user of users.values()) {
    if (user.id === id) return user;
  }
  return undefined;
}

export function publicUser(user) {
  return { id: user.id, email: user.email };
}
