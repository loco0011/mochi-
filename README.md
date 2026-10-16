# Heilo - Eye & Water Buddy 🐱

A cute cartoon cat (default name: Mochi) slides into VS Code to remind you to:

- 👀 rest your eyes every **1 hour** (the 20-20-20 rule)
- 💧 drink water every **2 hours**, and tracks your daily goal (8 glasses)
- 🧘 stand up and stretch every **90 minutes**

## Features

- **Break timer.** Every reminder has `Snooze` and `Take a break`. Taking a break makes Snooze vanish and starts a stopwatch that counts up until you hit **Stop**. The ring fills toward a goal (20s for eyes, 60s for stretches) and turns green when you reach it
- **Moods.** Mochi is happy when you listen, sleepy during eye breaks, and **grumpy** if you snooze twice 😾
- **Water tracking.** Progress bar, a celebration when you hit your goal, and a daily streak 🔥
- **Report card.** "Heilo: Show My Stats" shows today's numbers and a 7-day water chart
- **Log water anytime.** "Heilo: I Drank Water" (or the status bar menu)
- **Polite mode.** Waits until you stop typing, aren't debugging, and VS Code is focused
- **Night owl mode.** Special messages after 11pm 🌙
- **Remembers timers** across VS Code restarts
- **Status bar.** Shows the next reminder and today's glasses: `🐱 👀 42m · 🥛 3/8`. Click it for the menu.

## Settings

Open Settings and search **heilo**.

| Setting | Default | What it does |
|---|---|---|
| `heilo.eyeBreakMinutes` | 60 | Minutes between eye breaks (0 = off) |
| `heilo.waterMinutes` | 120 | Minutes between water reminders (0 = off) |
| `heilo.stretchMinutes` | 90 | Minutes between stretch reminders (0 = off) |
| `heilo.waterGoal` | 8 | Glasses of water per day |
| `heilo.eyeRestSeconds` | 20 | Eye break goal in seconds (0 = no goal) |
| `heilo.snoozeMinutes` | 5 | Snooze length |
| `heilo.catName` | Mochi | Your cat's name |
| `heilo.catColor` | orange | orange, grey, black or white |
| `heilo.politeMode` | true | Don't interrupt while typing or debugging |
| `heilo.style` | overlay | `overlay` (cat + comic bubble right on your code), `cat` (side panel) or plain `notification` |

## Files

- `extension.js` - timers, commands, status bar, and all the funny messages
- `stats.js` - daily history (water, eye breaks, stretches, snoozes)
- `catPanel.js` - opens the cat side panel
- `overlay.js` - draws the cat and its comic speech bubble on top of your code
- `media/cat-art.svg`, `media/cat-art.css` - the cat drawing, shared by the panel and the overlay
- `media/cat.html` - the side panel page: card, buttons, break timer and stats
- `media/fonts/` - the Fredoka font (SIL Open Font License, see OFL.txt)

## Author

Made by **Sambit Maity** · [sambitmaity.com](https://sambitmaity.com)
