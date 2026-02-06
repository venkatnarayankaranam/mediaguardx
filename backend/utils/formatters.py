"""Response formatting utilities."""
from typing import Literal


def label_to_status(label: Literal["Authentic", "Suspicious", "Deepfake"]) -> Literal["authentic", "suspected", "deepfake"]:
    """Convert backend label to frontend status format."""
    mapping = {
        "Authentic": "authentic",
        "Suspicious": "suspected",
        "Deepfake": "deepfake"
    }
    return mapping.get(label, "suspected")

