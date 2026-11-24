# Local MP4 Video Assets

Drop your local `.mp4` reels into this folder (`assets/video/`). The site's Single-Active-Video Engine automatically detects each file, hides the procedural tactical visualizer fallback, and plays **only one video at a time** as you scroll through each career chapter.

## Expected Filenames

### Anduril Chapter
- `anduril-fury.mp4` — Fury autonomous air vehicle footage
- `anduril-rockets.mp4` — Solid rocket motor / propulsion footage
- `anduril-submarines.mp4` — Autonomous underwater vehicle (Dive-LD) footage

### Activision Chapter (through MW 2019 / Warzone 2020)
- `cod-mw2019.mp4` — Call of Duty: Modern Warfare (2019) trailer reel
- `cod-warzone-2020.mp4` — Call of Duty: Warzone (2020) trailer reel

## Recommended Compression for GitHub Pages
Keep each loop under ~10–15 MB (GitHub hard limit is 100 MB per file), muted, H.264, `faststart` enabled:

```bash
ffmpeg -i input.mp4 -an -c:v libx264 -crf 26 -preset slow -vf "scale=1280:-2" -movflags +faststart output.mp4
```
