from app.config.env import DATABASE_URL
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

engine = create_engine(DATABASE_URL)

session_factory = sessionmaker(bind=engine)
