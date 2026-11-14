"""ID opak (bukan urut), PRD 4.4.6: misal biz_3f9a1c2b7d10."""

import secrets


def new_id(prefix: str) -> str:
    return f"{prefix}_{secrets.token_hex(6)}"
