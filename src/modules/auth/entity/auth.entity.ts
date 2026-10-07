/** Credenciais internas para autenticação; não devem ser retornadas pela API. */
export type AuthUserEntity = {
  user_id: number;
  user_name: string;
  user_password_hash: string | null;
};
