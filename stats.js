// Keeps a small daily history: how many glasses of water, eye breaks, stretches and snoozes.
// Stored in VS Code's globalState, so it survives restarts.

const KEY = 'heilo.history';
const KEEP_DAYS = 60;

function dayKey(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

class Stats {
  constructor(state) {
    this.state = state;
  }

  all() {
    return { ...this.state.get(KEY, {}) };
  }

  // Counts for one day, e.g. { water: 3, eye: 5, stretch: 1, snoozes: 2, breakSeconds: 340 }
  day(date = new Date()) {
    return { water: 0, eye: 0, stretch: 0, snoozes: 0, breakSeconds: 0, ...this.all()[dayKey(date)] };
  }

  add(field, amount = 1) {
    const history = this.all();
    const today = this.day();
    today[field] += amount;
    history[dayKey()] = today;

    // Forget anything older than KEEP_DAYS.
    const keys = Object.keys(history).sort();
    while (keys.length > KEEP_DAYS) delete history[keys.shift()];

    return this.state.update(KEY, history);
  }

  // The last n days, oldest first, with a short weekday label.
  lastDays(n) {
    const days = [];
    for (let i = n - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push({ label: date.toLocaleDateString(undefined, { weekday: 'short' }), ...this.day(date) });
    }
    return days;
  }

  // Days in a row the water goal was hit. Today only counts once it's reached.
  streak(goal) {
    let count = 0;
    const date = new Date();
    if (this.day(date).water < goal) date.setDate(date.getDate() - 1);
    while (this.day(date).water >= goal) {
      count++;
      date.setDate(date.getDate() - 1);
    }
    return count;
  }
}

module.exports = { Stats };
