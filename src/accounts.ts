import { createClient } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';

const node = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
type Player = { player_id: string; display_name: string; best_score: number };
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const client = url && key ? createClient(url, key) : null;
const emailCodesReady = import.meta.env.VITE_EMAIL_CODES_READY === 'true';
let session: Session | null = null;
let player: Player | null = null;
let runOwner: string | null = null;
let runNumber = 0;
let authVersion = 0;
let boardVersion = 0;
let email = '';
let busy = false;
let nextCodeAt = 0;

function message(text: string) { node('auth-message').textContent = text; }
function screen(id: string) {
  for (const part of ['email-form', 'code-form', 'name-form', 'profile-panel']) node(part).hidden = part !== id;
}
function busyForm(value: boolean) {
  busy = value;
  node('account-dialog').querySelectorAll<HTMLButtonElement>('button[type="submit"], #resend-code, #sign-out').forEach(button => {
    button.disabled = value || ((!client || !emailCodesReady) && Boolean(button.closest('#email-form, #code-form')));
  });
}
function renderAccount() {
  node('sign-out').hidden = !session;
  node('account-footnote').textContent = player ? 'Your name is permanent. Scores are saved when your game ends.' : 'You can close this window and play as a guest.';
  node('account-button').textContent = player ? player.display_name : session ? 'Choose a name' : 'Sign in';
  if (player) {
    screen('profile-panel');
    node('player-name').textContent = player.display_name;
    node('player-best').textContent = String(player.best_score);
  } else screen(session ? 'name-form' : 'email-form');
}
async function loadPlayer(current: Session | null) {
  const version = ++authVersion;
  session = current;
  player = null;
  renderAccount();
  if (!current || !client) { busyForm(false); return; }
  busyForm(true);
  message('Loading your player…');
  try {
    const { data, error } = await client.from('players').select('player_id,display_name,best_score').eq('player_id', current.user.id).maybeSingle();
    if (version !== authVersion) return;
    if (error) throw error;
    player = data;
    renderAccount();
    message('');
  } catch {
    if (version === authVersion) message('Could not load your player. Close and reopen this window to retry.');
  } finally { if (version === authVersion) busyForm(false); }
}
async function sendCode() {
  if (!emailCodesReady) { message('Email sign-in is being set up. You can still play as a guest.'); return; }
  if (!client || busy) return;
  if (Date.now() < nextCodeAt) { message('Please wait a minute before requesting another code.'); return; }
  busyForm(true);
  message('Sending your code…');
  try {
    const { error } = await client.auth.signInWithOtp({ email });
    if (error) throw error;
    nextCodeAt = Date.now() + 60000;
    screen('code-form');
    node('code-destination').textContent = email;
    message('Check your email for your sign-in code.');
    node<HTMLInputElement>('login-code').focus();
  } catch {
    message('Could not send a code. Check the address and try again shortly.');
  } finally { busyForm(false); }
}
async function openAccount() {
  node<HTMLDialogElement>('account-dialog').showModal();
  if (!client) { screen('email-form'); message('Sign-in is not configured yet. You can still play as a guest.'); return; }
  await loadPlayer(session);
  if (!emailCodesReady && !session) message('Email sign-in is being set up. You can still play as a guest.');
}
export const accounts = {
  isOpen: () => Boolean(document.querySelector('dialog[open]')),
  setScreen(visible: boolean) { node('account-actions').hidden = !visible; },
  startRun() {
    runNumber += 1;
    runOwner = player?.player_id ?? null;
    node('save-status').textContent = '';
  },
  async finishRun(score: number) {
    const finishedRun = runNumber;
    const owner = runOwner;
    runOwner = null; // Each completed run gets one submission attempt.
    if (!client || !owner) { node('save-status').textContent = 'Guest run · Sign in before your next game to save scores.'; return; }
    if (session?.user.id !== owner) { node('save-status').textContent = 'Your sign-in changed. This score was not saved.'; return; }
    node('save-status').textContent = 'Saving your score…';
    try {
      const { data, error } = await client.rpc('submit_score', { run_score: score });
      if (error) throw error;
      if (player?.player_id === owner) player.best_score = Math.max(player.best_score, Number(data));
      if (finishedRun === runNumber) node('save-status').textContent = `Saved · Your best: ${data}`;
    } catch {
      if (finishedRun === runNumber) node('save-status').textContent = 'Could not save this run. Check your connection before the next game.';
    }
  },
};
async function loadBoard() {
  const version = ++boardVersion;
  node('leaderboard-list').replaceChildren();
  node('leaderboard-message').textContent = 'Loading scores…';
  node('board-retry').hidden = true;
  try {
    if (!client) throw new Error('Not configured');
    const { data, error } = await client.rpc('top_players');
    if (error) throw error;
    if (version !== boardVersion) return;
    const rows = data as Pick<Player, 'display_name' | 'best_score'>[];
    node('leaderboard-message').textContent = rows.length ? '' : 'No players yet. Be the first to join.';
    for (const row of rows) {
      const item = document.createElement('li');
      const name = document.createElement('span');
      const score = document.createElement('strong');
      name.textContent = row.display_name;
      score.textContent = String(row.best_score);
      item.append(name, score);
      node('leaderboard-list').append(item);
    }
  } catch {
    if (version !== boardVersion) return;
    node('leaderboard-message').textContent = 'Could not load the leaderboard. Please try again.';
    node('board-retry').hidden = false;
  }
}

export function initAccounts() {
  busyForm(false);
  node('account-button').addEventListener('click', () => { void openAccount(); });
  document.querySelectorAll('[data-open-board]').forEach(button => button.addEventListener('click', () => {
    node<HTMLDialogElement>('leaderboard-dialog').showModal();
    void loadBoard();
  }));
  document.querySelectorAll<HTMLButtonElement>('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog')?.close()));
  node('board-retry').addEventListener('click', () => { void loadBoard(); });
  node('email-form').addEventListener('submit', event => {
    event.preventDefault();
    email = node<HTMLInputElement>('login-email').value.trim();
    void sendCode();
  });
  node('resend-code').addEventListener('click', () => { void sendCode(); });
  node('change-email').addEventListener('click', () => { if (!busy) {screen('email-form'); message('');} });
  node('code-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!client || busy) return;
    busyForm(true);
    message('Checking your code…');
    try {
      const { data, error } = await client.auth.verifyOtp({ email, token: node<HTMLInputElement>('login-code').value.trim(), type: 'email' });
      if (error || !data.session) throw error;
      node<HTMLInputElement>('login-code').value = '';
      await loadPlayer(data.session);
    } catch { message('That code is invalid or expired. Try again or request a new one.'); }
    finally { busyForm(false); }
  });
  node('name-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!client || !session || busy) return;
    const name = node<HTMLInputElement>('display-name').value.trim();
    if (!name) {message('Enter a display name.'); return;}
    busyForm(true);
    message('Saving your name…');
    const owner = session.user.id;
    try {
      const { data, error } = await client.rpc('register_player', { chosen_name: name });
      if (error) {
        if (error.code === '23505') { message('That name is taken, or you already chose a name. Reopen this window to check your account.'); return; }
        throw error;
      }
      if (session?.user.id !== owner) return;
      player = data as Player;
      renderAccount();
      message('You’re ready. Your next game will save your score.');
    } catch { message('Could not save your name. Please try again.'); }
    finally { busyForm(false); }
  });
  node('sign-out').addEventListener('click', async () => {
    if (!client || busy) return;
    busyForm(true);
    try {
      const {error} = await client.auth.signOut({scope:'local'});
      if (error) throw error;
      await loadPlayer(null);
      message('Signed out. You can keep playing as a guest.');
    } catch {message('Could not sign out. Please try again.');}
    finally {busyForm(false);}
  });
  if (client) {
    client.auth.onAuthStateChange((_event, current) => {
      // Database requests must run after Supabase releases its auth callback lock.
      setTimeout(() => { void loadPlayer(current); }, 0);
    });
  }
}
