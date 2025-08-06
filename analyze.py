import librosa
import numpy as np
import json

def analyze_drums(file_path, output_path="hope.json"):
    
    y, sr = librosa.load(file_path, sr=None)
    _, y_percussive = librosa.effects.hpss(y)

    # Focus on drum-relevant frequency ranges
    # Kick drums: ~20 Hz to 150 Hz | Snares: ~200 Hz to 2 kHz
    mel_spectrogram = librosa.feature.melspectrogram(
        y=y_percussive, sr=sr, fmin=20, fmax=2000, n_mels=128
    )

    onset_env = librosa.onset.onset_strength(S=mel_spectrogram, sr=sr, aggregate=np.max)

    onsets = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr, units='time', backtrack=True)

    processed_onsets = post_process_beats(onsets)

    save_beats_to_json(processed_onsets, output_path)
    print(f"Saved {len(processed_onsets)} drum beats to {output_path}")


def post_process_beats(events, min_interval=0.2):
    """
    Deduplicate and filter events to ensure they are spaced reasonably apart.
    """
    processed = []
    last_event = -min_interval
    for event in events:
        if event - last_event >= min_interval:
            processed.append(event)
            last_event = event
    return processed


def save_beats_to_json(beats, output_path):
    """
    Save the processed beats to a JSON file.
    """
    beats_ms = [int(b * 1000) for b in beats]
    with open(output_path, "w") as f:
        json.dump(beats_ms, f, indent=4)


if __name__ == "__main__":
    analyze_drums("music/worstinme.mp3")



