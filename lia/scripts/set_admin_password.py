#!/usr/bin/env python3
"""Set admin password script

Usage:
  python scripts/set_admin_password.py NEWPASSWORD [--email admin@tre-go.jus.br]

This will hash the provided password using the same hasher as the app
and update or create the admin user in the database. Ensure environment
variables (DATABASE_URL, SECRET_KEY, etc.) or .env are set so the app
config can connect to the DB.
"""
import sys
import asyncio
import logging

from sqlalchemy import select

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.user import User

try:
    from pwdlib import PasswordHash
    from pwdlib.hashers.bcrypt import BcryptHasher
except Exception:
    raise SystemExit("Please install pwdlib (pip install pwdlib) to run this script")


def usage_and_exit():
    print("Usage: python scripts/set_admin_password.py NEWPASSWORD [--email admin@tre-go.jus.br]")
    sys.exit(1)


async def main():
    if len(sys.argv) < 2:
        usage_and_exit()

    new_password = sys.argv[1]
    email = "admin@tre-go.jus.br"
    if len(sys.argv) >= 3 and sys.argv[2].startswith("--email"):
        parts = sys.argv[2].split("=", 1)
        if len(parts) == 2:
            email = parts[1]

    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger("set_admin_password")

    pwd_context = PasswordHash((BcryptHasher(),))
    hashed = pwd_context.hash(new_password)

    async with AsyncSessionLocal() as session:
        # Try find existing user
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalars().first()

        if user:
            user.hashed_password = hashed
            user.is_active = True
            user.is_superuser = True
            user.is_verified = True
            session.add(user)
            await session.commit()
            logger.info(f"Updated password for user: {email}")
        else:
            # Create a new admin user
            new_user = User(
                nome="Administrador",
                email=email,
                hashed_password=hashed,
                cargo="Administrador",
                grupo="TIC",
                is_active=True,
                is_superuser=True,
                is_verified=True,
            )
            session.add(new_user)
            await session.commit()
            logger.info(f"Created admin user: {email}")


if __name__ == "__main__":
    asyncio.run(main())
