"""
SM-2 Spaced Repetition Algorithm

quality: 0-5
  0 = complete blackout
  1 = incorrect, but upon seeing answer, remembered
  2 = incorrect, but answer seemed easy to recall
  3 = correct with serious difficulty
  4 = correct after hesitation
  5 = perfect response
"""


def sm2(quality: int, repetitions: int, ease_factor: float, interval: int) -> tuple[int, float, int]:
    """Returns (new_repetitions, new_ease_factor, new_interval)"""
    quality = max(0, min(5, quality))

    if quality >= 3:
        if repetitions == 0:
            new_interval = 1
        elif repetitions == 1:
            new_interval = 6
        else:
            new_interval = round(interval * ease_factor)
        new_repetitions = repetitions + 1
    else:
        new_repetitions = 0
        new_interval = 1

    new_ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    new_ease_factor = max(1.3, new_ease_factor)

    return new_repetitions, new_ease_factor, new_interval


def get_status(repetitions: int, interval: int) -> str:
    if repetitions == 0:
        return "new" if interval == 0 else "learning"
    elif interval >= 21:
        return "mastered"
    else:
        return "review"
