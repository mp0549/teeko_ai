# Teeko

A browser implementation of Teeko — a 1950s abstract strategy game by John Scarne. Play against a minimax AI with alpha-beta pruning, or pass-and-play with a friend.

**[Play it here](https://mp0549.github.io/teeko_ai)** <!-- update link if needed -->

---

## Background

I originally built this as a Python AI project — implementing `TeekoPlayer` with minimax, alpha-beta pruning, and a heuristic eval function. That version lives in [`python/`](python/) and includes a tkinter GUI for local play.

After getting the logic solid in Python, I wanted to make something actually shareable, so I ported the whole thing to vanilla JS and built a proper browser frontend around it. The JS engine is a faithful port of the Python AI with a few additions: a real-time visualizer, influence heatmap, threefold repetition, and adjustable search depth.

---

## How it works

**Game rules:** Two players alternate placing pieces on a 5×5 grid (drop phase), then sliding them one step in any of 8 directions (move phase). First to align 4 pieces in a row, column, diagonal, or 2×2 box wins. Repeating the same board position 3 times is a draw.

**AI:**
- Minimax with alpha-beta pruning
- Custom heuristic that scores partial threats across all rows, columns, diagonals, and 2×2 windows — normalized to `(-1, 1)`
- Adjustable search depth (easy = 2, medium = 4, hard = 6, or any depth via slider)
- Draw-seeking: if the AI evaluates its position as losing, it will prefer a move that triggers threefold repetition over continuing to lose

**Visualizer (right panel):**
- **Territorial influence map** — heatmap showing which cells the AI vs. player control based on the heuristic, updated after every AI move
- **Search pathfinder** — live animation of minimax branches sampled during the AI's computation
- **Stats** — nodes evaluated, branches pruned, search depth, best score

---

## Running locally

**Browser version:** just open `index.html` — no build step, no dependencies.

**Python version:**
```bash
cd python
python testing.py   # tkinter GUI
python game.py      # terminal gameplay
```
Requires Python 3 and tkinter (included in most standard installs).

---

## Project structure

```
index.html
css/style.css
js/
  gameState.js     # pure game logic (board, moves, win detection)
  ai.js            # minimax engine with alpha-beta pruning
  aiHeuristic.js   # heuristic evaluation + cell influence
  board.js         # board rendering and interaction
  heatmap.js       # influence heatmap canvas
  pathfinder.js    # search path animation canvas
  visualizer.js    # stats panel and game log
  main.js          # game loop and orchestration
python/
  game.py          # original Python AI (TeekoPlayer class)
  testing.py       # tkinter GUI for the Python version
```
