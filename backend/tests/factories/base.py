import asyncio
from faker import Faker

fake = Faker()

class BaseFactory:
    """Base factory for generating deterministic test data."""
    model = None

    @classmethod
    def build(cls, **kwargs):
        """Builds a model instance without saving to database."""
        if not cls.model:
            raise NotImplementedError("Model not defined in factory")
        
        attributes = cls.get_default_attributes()
        attributes.update(kwargs)
        return cls.model(**attributes)

    @classmethod
    async def create(cls, db_session, **kwargs):
        """Creates and saves a model instance to the database."""
        instance = cls.build(**kwargs)
        db_session.add(instance)
        await db_session.commit()
        await db_session.refresh(instance)
        return instance

    @classmethod
    def get_default_attributes(cls) -> dict:
        """Override to provide default generation logic."""
        raise NotImplementedError
