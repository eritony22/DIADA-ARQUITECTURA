// Genera el hash bcrypt para ADMIN_PASSWORD_HASH.
//   npm run hash-password -- "TU_CONTRASEÑA"
import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error('Uso: npm run hash-password -- "TU_CONTRASEÑA"');
  process.exit(1);
}
console.log(bcrypt.hashSync(password, 10));
