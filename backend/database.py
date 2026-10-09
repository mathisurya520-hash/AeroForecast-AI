import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")

engine = None
if DATABASE_URL:
    try:
        logger.info("Attempting to connect to PostgreSQL database...")
        if DATABASE_URL.startswith("postgres://"):
            DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
        engine = create_engine(DATABASE_URL)
        with engine.connect() as conn:
            logger.info("Successfully connected to PostgreSQL database.")
    except Exception as e:
        logger.error(f"Failed to connect to PostgreSQL database: {e}. Falling back to SQLite.")
        engine = None

if engine is None:
    logger.info("Using SQLite database (air_quality.db) as fallback.")
    DATABASE_URL = "sqlite:///./air_quality.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
