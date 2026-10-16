// Heilo - a cute cat that reminds you to rest your eyes, drink water and stretch.
const vscode = require('vscode');
const { Stats } = require('./stats');
const { showCatPanel } = require('./catPanel');
const { showOverlay, overlayMenu } = require('./overlay');

// ---------- The funny bits (add your own!) ----------
const MESSAGES = {
  eye: [
    "👀 Your eyes have filed a complaint with HR. Look at something 20 feet away for 20 seconds.",
    "👀 Blink. No, really. Blink. Your eyeballs are turning into raisins.",
    "👀 The code will still be buggy in a minute. Go stare out a window like a Victorian poet.",
    "👀 Your monitor called. It says it needs some space. Look away for a bit.",
    "👀 Fun fact: walls have zero syntax errors. Go look at one.",
    "👀 Eye break! Pretend you're a cat and stare at a random spot across the room.",
    "👀 Your retinas are sending an SOS in Morse code. Give them 20 seconds off.",
  ],
  water: [
    "💧 You are basically a houseplant with anxiety. Water yourself.",
    "💧 Hydration check! If you were a phone, you'd be at 2% battery.",
    "💧 Even your code has more flow than your bloodstream right now. Drink water!",
    "💧 Your brain is 75% water. Currently running on 40%. Refill pls.",
    "💧 Water break! Coffee does NOT count. Nice try.",
    "💧 Drink some water before you turn into a raisin. A raisin who writes code.",
    "💧 Achievement unlocked: Dehydrated Developer. Drink a glass of water to remove it.",
  ],
  stretch: [
    "🧘 Stand up and stretch like a cat waking from a 14-hour nap. I'll demonstrate... *yawns*",
    "🧘 Your spine is slowly turning into a question mark. Stand up and reach for the sky!",
    "🧘 Roll your shoulders. Roll your neck. Do NOT roll your eyes, I saw that.",
    "🧘 You've been glued to that chair for ages. Stand up and shake it off!",
    "🧘 Stretch time! Pretend there's a treat on the top shelf and reach for it.",
  ],
};

// Shown after you've snoozed the same reminder twice in a row.
const GRUMPY = {
  eye: [
    "😾 You snoozed me twice. I'm not angry, just disappointed. Rest. Your. Eyes.",
    "😾 I will sit on your keyboard if you don't look away from the screen RIGHT NOW.",
    "😾 Fine. Ignore me. Your eyeballs will remember this.",
  ],
  water: [
    "😾 I knocked your glass off the table on purpose. Now get a new one and DRINK it.",
    "😾 Even I drink water, and I'm a cat. Cats HATE water!",
    "😾 Snoozing water? Bold move for someone who is 60% water.",
  ],
  stretch: [
    "😾 I stretch 40 times a day. You've stretched zero times. Explain yourself.",
    "😾 Your spine called. It's shaped like a pretzel now. Stand UP.",
    "😾 One more snooze and I'm taking your chair. Then you HAVE to stand.",
  ],
};

// Sometimes shown after 11pm.
const NIGHT = [
  "🌙 It's late! Even nocturnal me thinks you should sleep soon. The bug will still be there tomorrow.",
  "🌙 Psst... it's past bedtime. Your future self is begging you to save and sleep.",
  "🌙 Night owl alert 🦉. Rest your eyes, have some water, and maybe go to bed?",
];

const BREAK_LABELS = {
  eye: ['Take a break', 'Rest my eyes', "OK, I'll look away"],
  water: ['Get some water', 'Going to drink', 'Fine, water time'],
  stretch: ['Start stretching', "Let's stretch", 'Stand up'],
};

// Card headline for each kind of reminder.
const TITLES = { eye: 'Rest your eyes', water: 'Time to hydrate', stretch: 'Stretch it out' };

// Shown while the break stopwatch is running.
const BREAK_MESSAGES = {
  eye: [
    "Look at something far away 🌳 and blink slowly. Hit stop when you're back!",
    "Close your eyes, relax your face, and pretend you're a sleepy cat 😴",
  ],
  water: [
    "Go get that water! 🥤 I'll keep the time. Hit stop when you're back.",
    "Fill a glass, drink it all, and come back. I'm counting 💧",
  ],
  stretch: [
    "Reach for the sky, roll your shoulders, touch your toes 🧘. I'm timing you!",
    "Stand up and stretch like you just woke up from a 14-hour nap 🐈",
  ],
};

// How long a break should be (seconds). The ring fills up to this; 0 means no goal.
// The eye goal comes from the "heilo.eyeRestSeconds" setting.
const BREAK_GOALS = { water: 0, stretch: 60 };

const CELEBRATE = {
  eye: ['Eyes refreshed! ✨', 'So sparkly now ✨👀', 'Good job! Your eyes say thanks 💕'],
  water: ['Good human! 💧', 'Purrfect hydration 💧', 'Your cells are dancing 💃'],
  stretch: ['Look at you, so bendy! 🧘', 'Purrfect stretch 🐈', 'Taller already! 📏'],
};

// Colours for the "heilo.catColor" setting. Keys match the CSS variables in media/cat.html.
const CAT_COLORS = {
// 'eye' is the pupil, 'iris' / 'iris-dark' the eye colour.
  orange: { 'fur': '#eba35f', 'fur-dark': '#b9692d', 'cream': '#fbeedd', 'line': '#4a2f22', 'eye': '#120d0b', 'iris': '#c4d153', 'iris-dark': '#6f8a2a', 'nose': '#d98a92' },
  grey:   { 'fur': '#a9adb8', 'fur-dark': '#6d7280', 'cream': '#eceef2', 'line': '#33363f', 'eye': '#0f1013', 'iris': '#e3c45a', 'iris-dark': '#a07a1f', 'nose': '#b88a92' },
  black:  { 'fur': '#3a3540', 'fur-dark': '#1f1b24', 'cream': '#e9e5ee', 'line': '#141117', 'eye': '#0b090d', 'iris': '#f2c43a', 'iris-dark': '#b07a12', 'nose': '#4a3f48' },
  white:  { 'fur': '#fbf8f4', 'fur-dark': '#d9cfc4', 'cream': '#ffffff', 'line': '#6b5a50', 'eye': '#121417', 'iris': '#8cc4ef', 'iris-dark': '#3c7fbf', 'nose': '#e8a5ac' },
};

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// ---------- State ----------
let context;
let stats;
let statusBar;
let paused = false;
let pausedAt = 0;
let busy = false; // only one reminder on screen at a time
let lastTypedAt = 0;

const reminders = {
  eye:     { kind: 'eye',     name: 'Eye break', setting: 'eyeBreakMinutes', icon: '👀', prop: '👓', dueAt: 0, snoozes: 0 },
  water:   { kind: 'water',   name: 'Water',     setting: 'waterMinutes',    icon: '💧', prop: '🥛', dueAt: 0, snoozes: 0 },
  stretch: { kind: 'stretch', name: 'Stretch',   setting: 'stretchMinutes',  icon: '🧘', prop: '🧶', dueAt: 0, snoozes: 0 },
};
const allReminders = () => Object.values(reminders);

function config(key) {
  return vscode.workspace.getConfiguration('heilo').get(key);
}

function minutes(n) {
  return n * 60 * 1000;
}

function enabled(reminder) {
  return config(reminder.setting) > 0;
}

function catName() {
  return config('catName') || 'Mochi';
}

function catColors() {
  return CAT_COLORS[config('catColor')] || CAT_COLORS.orange;
}

function isNight() {
  const hour = new Date().getHours();
  return hour >= 23 || hour < 5;
}

function formatLeft(ms) {
  if (ms <= 0) return 'now';
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ---------- Timers ----------
function restart(reminder) {
  reminder.dueAt = enabled(reminder) ? Date.now() + minutes(config(reminder.setting)) : Infinity;
}

// Timers are saved so reopening VS Code doesn't reset them,
// and so several VS Code windows share one set of timers.
function saveTimers() {
  const due = {};
  for (const r of allReminders()) due[r.kind] = r.dueAt;
  context.globalState.update('heilo.dueAt', due);
}

function loadTimers() {
  const saved = context.globalState.get('heilo.dueAt', {});
  const now = Date.now();
  for (const r of allReminders()) {
    const due = saved[r.kind];
    const stillValid = typeof due === 'number' && due > now && due <= now + minutes(config(r.setting));
    if (enabled(r) && stillValid) r.dueAt = due;
    else restart(r);
  }
  saveTimers();
}

function syncTimers() {
  const saved = context.globalState.get('heilo.dueAt', {});
  for (const r of allReminders()) {
    if (typeof saved[r.kind] === 'number') r.dueAt = saved[r.kind];
  }
}

// Polite mode: don't pop up while you're typing, debugging, or in another app.
function canInterrupt() {
  if (!vscode.window.state.focused) return false;
  if (!config('politeMode')) return true;
  if (Date.now() - lastTypedAt < 4000) return false;
  if (vscode.debug.activeDebugSession) return false;
  return true;
}

function tick() {
  syncTimers();
  if (!paused && !busy && canInterrupt()) {
    const now = Date.now();
    const due = allReminders()
      .filter((r) => now >= r.dueAt)
      .sort((a, b) => a.dueAt - b.dueAt)[0];
    if (due) showReminder(due);
  }
  updateStatusBar();
}

// ---------- Showing a reminder ----------
function reminderData(reminder) {
  const name = catName();
  const grumpy = reminder.snoozes >= 2;
  const night = !grumpy && isNight() && Math.random() < 0.5;

  const data = {
    mode: 'reminder',
    kind: reminder.kind,
    catName: name,
    colors: catColors(),
    prop: reminder.prop,
    mood: grumpy ? 'grumpy' : '',
    greeting: grumpy ? `${name} is not amused` : night ? 'Late night check-in' : TITLES[reminder.kind],
    message: pick(grumpy ? GRUMPY[reminder.kind] : night ? NIGHT : MESSAGES[reminder.kind]),
    snoozeLabel: grumpy ? 'Snooze AGAIN' : `Snooze ${config('snoozeMinutes')} min`,
    breakLabel: pick(BREAK_LABELS[reminder.kind]),
    stopLabel: "I'm back",
    breakGreeting: grumpy ? 'Finally. Hmph.' : 'Break time',
    breakMessage: pick(BREAK_MESSAGES[reminder.kind]),
    goalGreeting: 'Goal reached',
    breakGoal: reminder.kind === 'eye' ? config('eyeRestSeconds') : BREAK_GOALS[reminder.kind],
    celebrate: pick(CELEBRATE[reminder.kind]),
  };

  if (reminder.kind === 'water') {
    const goal = config('waterGoal');
    const glasses = stats.day().water;
    data.progress = { label: `🥛 ${glasses} / ${goal} glasses today`, value: glasses, max: goal };
    data.celebrate = glasses + 1 === goal
      ? `🎉 Goal reached! ${goal} glasses today. Hydration legend!`
      : `Glass #${glasses + 1} today! ${data.celebrate}`;
  }
  return data;
}

// Old-style popup for the "notification" style setting.
async function showNotification(data) {
  const choice = await vscode.window.showWarningMessage(`${data.greeting} ${data.message}`, data.snoozeLabel, data.breakLabel);
  if (choice === data.breakLabel) {
    vscode.window.setStatusBarMessage(data.celebrate, 4000);
    return { choice: 'done' };
  }
  if (choice === data.snoozeLabel) return { choice: 'snooze' };
  return {};
}

async function showReminder(reminder) {
  if (busy) return;
  busy = true;

  try {
    const data = reminderData(reminder);
    const style = config('style');
    let result = null;
    if (style === 'overlay') {
      // No code editor on screen: use a plain popup rather than opening a new tab.
      result = (await showOverlay(context.extensionPath, data)) || (await showNotification(data));
    } else if (style === 'notification') {
      result = await showNotification(data);
    } else {
      result = await showCatPanel(context.extensionPath, data);
    }
    const { choice, seconds } = result;

    if (choice === 'snooze') {
      reminder.snoozes++;
      reminder.dueAt = Date.now() + minutes(config('snoozeMinutes'));
      await stats.add('snoozes');
    } else {
      if (choice === 'done') {
        reminder.snoozes = 0;
        await stats.add(reminder.kind);
        if (seconds) await stats.add('breakSeconds', seconds);
      }
      // Closing the tab without answering also starts a fresh countdown.
      restart(reminder);
    }
    saveTimers();
  } finally {
    busy = false;
    updateStatusBar();
  }
}

// ---------- Commands ----------
async function logWater() {
  await stats.add('water');
  restart(reminders.water);
  saveTimers();
  updateStatusBar();

  const goal = config('waterGoal');
  const glasses = stats.day().water;
  vscode.window.showInformationMessage(glasses >= goal
    ? `🎉 ${glasses}/${goal} glasses today! ${catName()} is so proud of you.`
    : `💧 Logged! ${glasses}/${goal} glasses today. ${catName()} approves 🐾`);
}

function showStats() {
  const goal = config('waterGoal');
  const today = stats.day();
  let verdict;
  if (today.water >= goal) verdict = 'Hydration goal smashed today! I am so proud 🥹';
  else if (today.water === 0) verdict = 'Zero glasses of water today?! 😿 Let\'s fix that.';
  else verdict = `${goal - today.water} more glasses to go. You got this! 💪`;

  showCatPanel(context.extensionPath, {
    mode: 'stats',
    catName: catName(),
    colors: catColors(),
    prop: '📊',
    mood: today.water >= goal ? 'happy' : '',
    today,
    goal,
    verdict,
    streak: stats.streak(goal),
    week: stats.lastDays(7),
  });
}

function togglePause() {
  if (paused) {
    // Push due times forward by however long we were paused.
    const pausedFor = Date.now() - pausedAt;
    for (const r of allReminders()) r.dueAt += pausedFor;
    saveTimers();
    paused = false;
    vscode.window.showInformationMessage(`${catName()} is back on duty 🫡`);
  } else {
    paused = true;
    pausedAt = Date.now();
    vscode.window.showInformationMessage(`${catName()} is taking a nap. Your eyes and kidneys are on their own now 😬`);
  }
  updateStatusBar();
}

function resetTimers() {
  for (const r of allReminders()) {
    restart(r);
    r.snoozes = 0;
  }
  saveTimers();
  updateStatusBar();
  vscode.window.showInformationMessage('Heilo timers reset ⏱️');
}

async function openMenu() {
  const separator = (label) => ({ label, kind: vscode.QuickPickItemKind.Separator });
  const items = [
    { label: '💧 I drank water', description: 'log a glass', run: logWater },
    { label: '📊 Show my stats', run: showStats },
    separator('Timers'),
    { label: paused ? '$(play) Resume reminders' : '$(debug-pause) Pause reminders', run: togglePause },
    { label: '$(refresh) Reset timers', run: resetTimers },
    separator('Try it'),
    { label: '👀 Eye break now', run: () => showReminder(reminders.eye) },
    { label: '💧 Water reminder now', run: () => showReminder(reminders.water) },
    { label: '🧘 Stretch reminder now', run: () => showReminder(reminders.stretch) },
    separator(''),
    { label: '$(gear) Settings', description: 'intervals, cat name, fur colour...', run: () => vscode.commands.executeCommand('workbench.action.openSettings', 'heilo') },
  ];
  const picked = await vscode.window.showQuickPick(items, { placeHolder: `${catName()} 🐱 what do you need?` });
  if (picked) picked.run();
}

// ---------- Status bar ----------
function updateStatusBar() {
  const goal = config('waterGoal');
  const glasses = stats.day().water;

  if (paused) {
    statusBar.text = `😴 ${catName()} is napping`;
    statusBar.tooltip = 'Reminders paused. Click to open the menu.';
    return;
  }

  const now = Date.now();
  const active = allReminders().filter(enabled);
  const next = [...active].sort((a, b) => a.dueAt - b.dueAt)[0];
  statusBar.text = next
    ? `🐱 ${next.icon} ${formatLeft(next.dueAt - now)} · 🥛 ${glasses}/${goal}`
    : `🐱 🥛 ${glasses}/${goal}`;

  const tooltip = new vscode.MarkdownString(`**${catName()} 🐱**\n\n`);
  for (const r of active) tooltip.appendMarkdown(`${r.icon} ${r.name}: ${formatLeft(r.dueAt - now)}  \n`);
  tooltip.appendMarkdown(`🥛 ${glasses} / ${goal} glasses today  \n`);
  tooltip.appendMarkdown(`🔥 ${stats.streak(goal)}-day water streak\n\n`);
  tooltip.appendMarkdown('_Click for menu_');
  statusBar.tooltip = tooltip;
}

// ---------- VS Code entry points ----------
function activate(ctx) {
  context = ctx;
  stats = new Stats(ctx.globalState);

  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.command = 'heilo.menu';
  statusBar.show();

  loadTimers();
  updateStatusBar();
  const ticker = setInterval(tick, 5 * 1000);

  ctx.subscriptions.push(
    statusBar,
    { dispose: () => clearInterval(ticker) },
    vscode.commands.registerCommand('heilo.menu', openMenu),
    vscode.commands.registerCommand('heilo.logWater', logWater),
    vscode.commands.registerCommand('heilo.showStats', showStats),
    vscode.commands.registerCommand('heilo.togglePause', togglePause),
    vscode.commands.registerCommand('heilo.resetTimers', resetTimers),
    vscode.commands.registerCommand('heilo.testEye', () => showReminder(reminders.eye)),
    vscode.commands.registerCommand('heilo.testWater', () => showReminder(reminders.water)),
    vscode.commands.registerCommand('heilo.testStretch', () => showReminder(reminders.stretch)),
    vscode.commands.registerCommand('heilo.overlayActions', overlayMenu),

    // Remember when you last typed, for polite mode.
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.scheme === 'file' || e.document.uri.scheme === 'untitled') lastTypedAt = Date.now();
    }),

    // If you change an interval in Settings, restart that countdown.
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration('heilo')) return;
      for (const r of allReminders()) {
        if (e.affectsConfiguration(`heilo.${r.setting}`)) restart(r);
      }
      saveTimers();
      updateStatusBar();
    })
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
