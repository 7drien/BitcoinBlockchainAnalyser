import pytest

from packages.domain.database import engine


@pytest.fixture(autouse=True)
async def dispose_db_pool():
    yield
    await engine.dispose()
