from app.services.simulation.population import sample_population


def test_same_seed_same_population() -> None:
    assert sample_population(50, seed=7) == sample_population(50, seed=7)


def test_different_seed_differs() -> None:
    assert sample_population(50, seed=7) != sample_population(50, seed=8)
