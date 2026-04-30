const STORAGE_KEY = 'trippinner_data';

const SVG_ICONS = {
  person: '<svg viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>',
  pin: '<svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>',
  people: '<svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  heartFilled: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  comment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
};

const CARD_COLORS = ['#fbcfe8', '#a7f3d0', '#fde68a', '#c4b5fd', '#bfdbfe', '#fecaca'];

const FRIENDS = [
  { id: 1, name: 'Jackie', status: 'online' },
  { id: 2, name: 'Alex', status: 'online' },
  { id: 3, name: 'Maria', status: 'offline' },
  { id: 4, name: 'Andy', status: 'online' },
  { id: 5, name: 'Chris', status: 'offline' },
];

const DEFAULT_TRIPS = [
  {
    id: 1,
    name: 'Barcelona Trip',
    description: 'Exploring the beautiful city of Barcelona',
    memberIds: [1, 2, 3, 4],
    pins: [
      { id: 1, name: 'Barcelona', type: 'City', comment: 'Amazing city!', votes: 3, voted: false, x: 40, y: 30 },
      { id: 2, name: 'Sagrada Familia', type: 'Landmark', comment: 'Must visit this masterpiece', votes: 4, voted: false, x: 45, y: 48 },
      { id: 3, name: 'La Rambla', type: 'Activity', comment: 'Great street for walking', votes: 2, voted: false, x: 42, y: 55 },
      { id: 4, name: 'Barcelona Beach', type: 'Activity', comment: 'Beautiful beach', votes: 2, voted: false, x: 58, y: 55 },
    ],
  },
  {
    id: 2,
    name: 'Tokyo Adventure',
    description: 'Discovering Japan',
    memberIds: [1, 5],
    pins: [
      { id: 1, name: 'Shibuya Crossing', type: 'Landmark', comment: 'Iconic spot', votes: 5, voted: false, x: 50, y: 40 },
      { id: 2, name: 'Tsukiji Market', type: 'Restaurant', comment: 'Fresh sushi', votes: 3, voted: false, x: 60, y: 55 },
    ],
  },
  {
    id: 3,
    name: 'Paris Weekend',
    description: 'A romantic getaway',
    memberIds: [2, 3],
    pins: [
      { id: 1, name: 'Eiffel Tower', type: 'Landmark', comment: 'Classic Paris', votes: 6, voted: false, x: 45, y: 35 },
      { id: 2, name: 'Louvre Museum', type: 'Activity', comment: 'Art lovers paradise', votes: 4, voted: false, x: 55, y: 50 },
    ],
  },
];

function loadTrips() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULT_TRIPS));
    }
  }
  return JSON.parse(JSON.stringify(DEFAULT_TRIPS));
}

function saveTrips(trips) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
}

function getFriendById(id) {
  return FRIENDS.find(f => f.id === id);
}

function getMemberNames(memberIds) {
  return memberIds.map(id => {
    const f = getFriendById(id);
    return f ? f.name : 'Unknown';
  });
}

function getNextId(arr) {
  if (arr.length === 0) return 1;
  return Math.max(...arr.map(item => item.id)) + 1;
}

function createAvatarHTML(size) {
  const cls = size === 'sm' ? 'avatar avatar-sm' : size === 'xs' ? 'avatar avatar-xs' : 'avatar';
  return `<div class="${cls}">${SVG_ICONS.person}</div>`;
}
