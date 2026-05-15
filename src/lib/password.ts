import bcrypt from 'bcrypt';

import { env } from '../config/env';

/** Hash bcrypt (paquete `bcrypt`) para almacenar contraseñas; coste vía `BCRYPT_ROUNDS`. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.bcryptRounds);
}
