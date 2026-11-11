from twin_worker.contracts import Transforms


def test_transforms_parses_minimal() -> None:
    t = Transforms.model_validate(
        {
            "fl_x": 1,
            "fl_y": 1,
            "cx": 0,
            "cy": 0,
            "w": 10,
            "h": 10,
            "frames": [{"file_path": "a.png", "transform_matrix": [[1, 0, 0, 0]] * 4}],
        }
    )
    assert len(t.frames) == 1
