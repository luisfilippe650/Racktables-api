import os
from dotenv import load_dotenv

load_dotenv()


def get_env(name: str) -> str:
    value = os.getenv(name)

    if value is None:
        raise ValueError(f"Variável de ambiente {name} não encontrada")

    return value


DATABASE_URL = get_env("DATABASE_URL")