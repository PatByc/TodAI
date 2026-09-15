"""Text extraction utilities for Tiptap JSON content."""


def extract_plain_text(node: dict) -> str:
    """Recursively extract plain text from Tiptap JSON content.

    Walks the JSON node tree and concatenates all text content,
    inserting newlines between block-level nodes.

    Args:
        node: A Tiptap JSON node (typically the root document node).

    Returns:
        Plain text representation of the content.
    """
    parts: list[str] = []

    if isinstance(node.get("text"), str):
        parts.append(node["text"])

    if isinstance(node.get("content"), list):
        for child in node["content"]:
            if isinstance(child, dict):
                parts.append(extract_plain_text(child))

    # Add newline between block-level nodes
    node_type = node.get("type")
    if node_type in (
        "paragraph",
        "heading",
        "codeBlock",
        "blockquote",
        "listItem",
        "taskItem",
    ):
        parts.append("\n")

    return "".join(parts)


def extract_title_from_tiptap(content: dict, max_length: int = 100) -> str:
    """Extract a title from Tiptap JSON content.

    Takes the first text content found (up to max_length chars),
    defaulting to "Untitled" if no text is found.

    Args:
        content: A Tiptap JSON document node.
        max_length: Maximum character length for the title.

    Returns:
        Extracted title string or "Untitled".
    """
    text = extract_plain_text(content).strip()
    if not text:
        return "Untitled"

    # Take first line only
    first_line = text.split("\n")[0].strip()
    if not first_line:
        return "Untitled"

    if len(first_line) > max_length:
        return first_line[:max_length].rstrip() + "..."

    return first_line
