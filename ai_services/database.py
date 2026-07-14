import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base

# Reads from environment variables, or defaults to the local file
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ecoverse.db")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# FIX: Force SQLite to strictly enforce Foreign Key constraints
@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

# This creates database sessions for our API endpoints to use
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# This is the base class we will use to create our database tables
Base = declarative_base()