import bcrypt from 'bcrypt';
import { env } from '../config/env.js';

export const hashPassword = async (password: string) =>
  bcrypt.hash(password, env.BCRYPT_COST);

export const verifyPassword = async (password: string, passwordHash: string) =>
  bcrypt.compare(password, passwordHash);
