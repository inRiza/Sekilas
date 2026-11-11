"""F5: populasi agen sintetis, reproducible dengan seed."""

import numpy as np

from app.schemas.simulation import AgentTraits


def sample_population(n: int, seed: int) -> list[AgentTraits]:
    """TODO(M6): ganti distribusi placeholder dengan distribusi hasil kalibrasi (M14)."""
    rng = np.random.default_rng(seed)
    price = rng.beta(2, 2, n)
    patience = rng.beta(2, 3, n)
    lunch = rng.beta(3, 2, n)
    group = rng.choice([1, 2, 3, 4], size=n, p=[0.4, 0.3, 0.2, 0.1])
    return [
        AgentTraits(
            price_sensitivity=float(price[i]),
            patience=float(patience[i]),
            lunch_habit=float(lunch[i]),
            group_size=int(group[i]),
        )
        for i in range(n)
    ]
