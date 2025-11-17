export const requestNotificationPermission = () => {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
};

const createTone = () => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = 880;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
  oscillator.stop(ctx.currentTime + 0.4);
};

export const playNotificationSound = () => {
  try {
    createTone();
  } catch (error) {
    console.warn('Audio playback skipped', error);
  }
};

export const showDesktopNotification = ({ title, body }) => {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'denied') return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
  if (Notification.permission === 'granted') {
    new Notification(title, { body });
  }
};



