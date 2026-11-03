// Writes deploy/listing/<slug>/{itch.md,playgama.md} and copies the screenshot, from games/<slug>/game.json.
import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
for (const slug of fs.readdirSync(path.join(root, 'games')).filter(d => fs.existsSync(path.join(root, 'games', d, 'game.json')))) {
  const m = JSON.parse(fs.readFileSync(path.join(root, 'games', slug, 'game.json'), 'utf8'));
  const dir = path.join(root, 'deploy/listing', slug); fs.mkdirSync(dir, { recursive: true });
  const shot = path.join(root, 'design/games', slug + '.png');
  if (fs.existsSync(shot)) fs.copyFileSync(shot, path.join(dir, 'screenshot-480x640.png'));
  const [w, h] = m.viewport.split('x');
  fs.writeFileSync(path.join(dir, 'itch.md'), `# itch.io listing: ${m.title}

**Title:** ${m.title}
**Short description (tagline):** ${m.tagline}
**Classification:** Games · **Kind of project:** HTML · **Pricing:** Free (no payments)
**Genre:** ${m.genre} · **Tags:** ${m.tags}
**Embed:** viewport **${w} x ${h}**, enable "Mobile friendly" and "Fullscreen button", "Automatically start on page load" off.
**Upload:** \`deploy/builds/${slug}-v${m.version}-*.zip\`, tick "This file will be played in the browser".
**Screenshot:** \`screenshot-480x640.png\`

## Description

${m.tagline}

How to play: ${m.hint}

- Short sessions, plays well one-handed on a phone and with keyboard or mouse on desktop
- Your best score saves on your device
- Pause and mute buttons
- No sign-up, nothing to install
`);
  fs.writeFileSync(path.join(dir, 'playgama.md'), `# Playgama submission: ${m.title}

**Title:** ${m.title}
**Genre:** ${m.genre} / Casual
**Languages:** English
**Platforms:** Mobile and desktop browsers, portrait and landscape
**Build:** \`deploy/builds/${slug}-v${m.version}-*.zip\` (index.html at root, ~14 KB, no external requests)
**Ads/SDK:** ships with a no-op platform adapter (\`platform.js\`: init, gameplayStart/Stop, showRewarded, showInterstitial). Playgama Bridge is added only after account approval, as a separate commit.
**Monetization:** none at launch.

**Short description:** ${m.tagline}
**Controls:** ${m.hint}
**Tags:** ${m.tags}
`);
}
console.log('listings written');
