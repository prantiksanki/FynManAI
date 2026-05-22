import sys
import os
import uuid
from gtts import gTTS

def main():
    if len(sys.argv) < 3:
        print("Usage: tts_worker.py <text> <output_dir>", file=sys.stderr)
        sys.exit(1)

    text    = sys.argv[1]
    out_dir = sys.argv[2]

    os.makedirs(out_dir, exist_ok=True)

    filename = uuid.uuid4().hex + ".mp3"
    out_path = os.path.join(out_dir, filename)

    tts = gTTS(text=text, lang="en", slow=False)
    tts.save(out_path)

    # Print ONLY the filename to stdout so Node can read it cleanly
    print(filename)

if __name__ == "__main__":
    main()
