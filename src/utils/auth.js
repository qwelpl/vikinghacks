import { v4 as uuidv4 } from 'uuid';
import { getUsers, setUsers, setCurrentUser, clearCurrentUser } from './storage';
import { hashPassword } from './helpers';

export async function signup(username, password) {
  if (username.length < 3) throw new Error('Username must be at least 3 characters');
  if (password.length < 6) throw new Error('Password must be at least 6 characters');

  const users = (await getUsers()) || [];
  if (users.find((u) => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error('Username already taken');
  }

  const passwordHash = await hashPassword(password);
  const user = { id: uuidv4(), username, passwordHash, createdAt: Date.now() };
  await setUsers([...users, user]);

  const pub = { id: user.id, username: user.username, createdAt: user.createdAt };
  await setCurrentUser(pub);
  return pub;
}

export async function login(username, password) {
  const users = (await getUsers()) || [];
  const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (!user) throw new Error('User not found');

  const hash = await hashPassword(password);
  if (hash !== user.passwordHash) throw new Error('Incorrect password');

  const pub = { id: user.id, username: user.username, createdAt: user.createdAt };
  await setCurrentUser(pub);
  return pub;
}

export async function logout() {
  await clearCurrentUser();
}
