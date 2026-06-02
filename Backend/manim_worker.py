import sys
import os
import uuid
import shutil
import subprocess


# Mirrors tts_worker.py's contract:
#   argv = [scene_code_path, out_dir, job_tmp_dir]
#   - reads a generated Manim scene (a single `class GeneratedScene(Scene)`)
#     from scene_code_path
#   - renders it to an MP4 inside an isolated job_tmp_dir
#   - copies the MP4 to out_dir as <uuid>.mp4
#   - prints ONLY that filename to stdout so Node can read it cleanly
#
# All diagnostics go to stderr; a non-zero exit (or empty stdout) signals
# failure to the Node controller, exactly like the TTS worker.

SCENE_CLASS = "GeneratedScene"
RENDER_TIMEOUT_SECONDS = 90


def find_rendered_mp4(media_dir):
    """Manim writes to <media_dir>/videos/<scene>/<quality>/GeneratedScene.mp4.
    Walk the media dir and return the newest .mp4 we can find."""
    newest = None
    newest_mtime = -1.0
    for root, _dirs, files in os.walk(media_dir):
        for f in files:
            if not f.endswith(".mp4"):
                continue
            full = os.path.join(root, f)
            try:
                mtime = os.path.getmtime(full)
            except OSError:
                continue
            if mtime > newest_mtime:
                newest_mtime = mtime
                newest = full
    return newest


def main():
    if len(sys.argv) < 4:
        print("Usage: manim_worker.py <scene_code_path> <out_dir> <job_tmp_dir>",
              file=sys.stderr)
        sys.exit(1)

    scene_path  = sys.argv[1]
    out_dir     = sys.argv[2]
    job_tmp_dir = sys.argv[3]

    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(job_tmp_dir, exist_ok=True)

    media_dir = os.path.join(job_tmp_dir, "media")

    # Render in a separate process. We never import/exec the generated code in
    # this parent process — Manim imports it inside its own `render` invocation,
    # which we run with a restricted cwd, a hard timeout, and a minimal env.
    cmd = [
        sys.executable, "-m", "manim", "render",
        "-ql",                       # 480p15 — fast
        "--disable_caching",
        "--media_dir", media_dir,
        scene_path, SCENE_CLASS,
    ]

    env = {
        "PATH": os.environ.get("PATH", ""),
        "SYSTEMROOT": os.environ.get("SYSTEMROOT", ""),   # Windows needs this
        "TEMP": job_tmp_dir,
        "TMP": job_tmp_dir,
        "HOME": job_tmp_dir,
    }

    try:
        proc = subprocess.run(
            cmd,
            cwd=job_tmp_dir,
            env=env,
            timeout=RENDER_TIMEOUT_SECONDS,
            capture_output=True,
            text=True,
        )
    except subprocess.TimeoutExpired:
        print("Manim render timed out", file=sys.stderr)
        sys.exit(1)

    if proc.returncode != 0:
        # Surface Manim's own error output for the controller's logs.
        sys.stderr.write(proc.stdout or "")
        sys.stderr.write(proc.stderr or "")
        sys.exit(1)

    mp4 = find_rendered_mp4(media_dir)
    if not mp4 or not os.path.exists(mp4):
        sys.stderr.write(proc.stdout or "")
        sys.stderr.write(proc.stderr or "")
        print("No MP4 produced by Manim", file=sys.stderr)
        sys.exit(1)

    filename = uuid.uuid4().hex + ".mp4"
    dest = os.path.join(out_dir, filename)
    shutil.copyfile(mp4, dest)

    # Print ONLY the filename to stdout so Node can read it cleanly.
    print(filename)


if __name__ == "__main__":
    main()
