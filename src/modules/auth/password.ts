import argon2 from "argon2";

export const PASSWORD_MIN_LENGTH = 8;

const passwordHashOptions: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1
};

export function isPasswordLongEnough(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH;
}

export async function hashPassword(password: string): Promise<string> {
  if (!isPasswordLongEnough(password)) {
    throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);
  }

  return argon2.hash(password, passwordHashOptions);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}
