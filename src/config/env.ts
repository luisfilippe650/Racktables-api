import "dotenv/config.js";

const getEnv = (name: string): string => {
  const value = process.env[name];
  
  if (!value) {
    throw new Error(`Environment variable ${name} is not defined.`);
  }

  return value;
};

export const ENV = {
  DATABASE_URL: getEnv("DATABASE_URL"),
};
