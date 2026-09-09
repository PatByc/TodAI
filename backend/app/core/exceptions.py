"""Domain exceptions for TodAI entity operations."""


class EntityNotFoundError(Exception):
    """Raised when an entity is not found by ID."""

    def __init__(self, entity_type: str, entity_id: int) -> None:
        self.entity_type = entity_type
        self.entity_id = entity_id
        super().__init__(f"{entity_type} with id {entity_id} not found")


class DuplicateTagError(Exception):
    """Raised when attempting to create a tag that already exists."""

    def __init__(self, tag_name: str) -> None:
        self.tag_name = tag_name
        super().__init__(f"Tag '{tag_name}' already exists")


class ValidationError(Exception):
    """Raised for domain-level validation failures beyond Pydantic schema checks."""

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)
