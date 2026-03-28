from __future__ import annotations

from copy import deepcopy
from typing import Any, Dict, Optional


_pending_conversations: Dict[str, Dict[str, Any]] = {}


def get_pending_conversation(user_id: str) -> Optional[Dict[str, Any]]:
    conversation = _pending_conversations.get(user_id.strip())
    if not conversation:
        return None
    return deepcopy(conversation)


def set_pending_conversation(user_id: str, payload: Dict[str, Any]) -> None:
    _pending_conversations[user_id.strip()] = deepcopy(payload)


def clear_pending_conversation(user_id: str) -> None:
    _pending_conversations.pop(user_id.strip(), None)
