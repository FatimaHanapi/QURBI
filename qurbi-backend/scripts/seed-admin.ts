import 'reflect-metadata';
import 'dotenv/config';
import * as argon2 from 'argon2';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES, User, UserRole, UserStatus } from '../src/entities';

// Bootstraps the very first admin account. There is deliberately no way to
// reach UserRole.ADMIN through POST /auth/register (admin must never be
// self-assignable) and POST /users (the other way to create an admin) is
// itself admin-only — so on a fresh database nobody can ever log in as
// admin. This script is the one-time escape hatch out of that chicken-and-egg
// problem, run directly against the database rather than through the API.
//
// Usage: npm run seed:admin -- <email> <password> ["Full Name"]
// Defaults: admin@qurbi.local / ChangeMe123! / "QURBI Admin"
// Safe to re-run: if the email already exists, its role/status are promoted
// to admin/active instead of creating a duplicate row.

const [, , emailArg, passwordArg, fullNameArg] = process.argv;
const email = (emailArg || 'admin@qurbi.local').toLowerCase();
const password = passwordArg || 'ChangeMe123!';
const fullName = fullNameArg || 'QURBI Admin';

const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  charset: 'utf8mb4',
  synchronize: false,
  entities: ALL_ENTITIES,
});

async function main(): Promise<void> {
  await dataSource.initialize();
  const userRepository = dataSource.getRepository(User);

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const existing = await userRepository.findOne({ where: { email } });

  if (existing) {
    existing.role = UserRole.ADMIN;
    existing.status = UserStatus.ACTIVE;
    existing.passwordHash = passwordHash;
    await userRepository.save(existing);
    console.log(`Promoted existing user to admin: ${email}`);
  } else {
    await userRepository.save(
      userRepository.create({
        email,
        passwordHash,
        fullName,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      }),
    );
    console.log(`Created admin account: ${email}`);
  }

  console.log(`Login with: email=${email} password=${password}`);
  await dataSource.destroy();
}

main().catch(async (error: unknown) => {
  console.error('Admin seed failed:', error);
  if (dataSource.isInitialized) await dataSource.destroy();
  process.exit(1);
});
