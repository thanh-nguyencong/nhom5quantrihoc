import numpy as np


class MnistModel:
    def __init__(self):
        pass

    def load(self, path):
        return self

    def __call__(self, *args, **kwargs):
        return {
            "prediction": 7,
            "confidence": 0.95
        }
