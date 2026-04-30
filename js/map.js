let currentTrip = null;
let allTrips = [];

const SEARCH_SUGGESTIONS = [
  'Barcelona',
  'Barcelona Cathedral',
  'Barcelona Beach',
  'San Jose, CA',
];

document.addEventListener('DOMContentLoaded', function () {
  allTrips = loadTrips();

  const params = new URLSearchParams(window.location.search);
  const tripId = parseInt(params.get('id'));

  currentTrip = allTrips.find(function (t) { return t.id === tripId; });

  if (!currentTrip) {
    currentTrip = allTrips[0];
  }

  if (!currentTrip) return;

  renderTripHeader();
  renderSidebarPins();
  renderMapPins();
  initSearch();

  document.getElementById('add-pin-btn').addEventListener('click', function () {
    openAddPinModal();
  });

  document.getElementById('map-area').addEventListener('click', function (e) {
    if (!e.target.closest('.map-pin') && !e.target.closest('.pin-info-card')) {
      closePinInfo();
    }
  });
});

function renderTripHeader() {
  document.getElementById('trip-name').textContent = currentTrip.name;
  document.title = currentTrip.name + ' - TripPinner';

  const avatarsContainer = document.getElementById('trip-member-avatars');
  avatarsContainer.innerHTML = currentTrip.memberIds
    .slice(0, 5)
    .map(function () { return createAvatarHTML('xs'); })
    .join('');

  const names = getMemberNames(currentTrip.memberIds);
  document.getElementById('trip-member-names').textContent = names.join(', ');
}

function renderSidebarPins() {
  const list = document.getElementById('pin-list');
  list.innerHTML = '';

  document.getElementById('pinned-count').textContent =
    'Pinned Locations (' + currentTrip.pins.length + ')';

  currentTrip.pins.forEach(function (pin) {
    const item = document.createElement('div');
    item.className = 'pin-list-item';
    item.dataset.pinId = pin.id;

    item.innerHTML = `
      <div class="pin-list-icon">
        ${SVG_ICONS.pin}
      </div>
      <div class="pin-list-info">
        <div class="pin-list-name">${pin.name}</div>
        <div class="pin-list-type">${pin.type}</div>
        <div class="pin-list-meta">
          <span>${SVG_ICONS.heart} ${pin.votes}</span>
          <span>${SVG_ICONS.comment}</span>
        </div>
      </div>
    `;

    item.addEventListener('click', function () {
      highlightPin(pin.id);
    });

    list.appendChild(item);
  });
}

function renderMapPins() {
  const mapArea = document.getElementById('map-area');

  mapArea.querySelectorAll('.map-pin').forEach(function (el) { el.remove(); });

  currentTrip.pins.forEach(function (pin) {
    const marker = document.createElement('div');
    marker.className = 'map-pin';
    marker.dataset.pinId = pin.id;
    marker.style.left = pin.x + '%';
    marker.style.top = pin.y + '%';

    marker.innerHTML = `
      <div class="map-pin-marker">
        ${SVG_ICONS.pin}
      </div>
    `;

    marker.addEventListener('click', function (e) {
      e.stopPropagation();
      showPinInfo(pin, marker);
    });

    mapArea.appendChild(marker);
  });
}

function showPinInfo(pin, markerEl) {
  closePinInfo();

  const card = document.createElement('div');
  card.className = 'pin-info-card';

  const pinX = parseFloat(markerEl.style.left);
  const pinY = parseFloat(markerEl.style.top);

  if (pinX > 60) {
    card.style.right = (100 - pinX + 4) + '%';
  } else {
    card.style.left = (pinX + 4) + '%';
  }

  if (pinY > 60) {
    card.style.bottom = (100 - pinY + 4) + '%';
  } else {
    card.style.top = (pinY + 4) + '%';
  }

  const votedClass = pin.voted ? ' btn-disabled' : '';
  const heartIcon = pin.voted ? SVG_ICONS.heartFilled : SVG_ICONS.heart;

  card.innerHTML = `
    <div class="pin-info-card-name">${pin.name}</div>
    <div class="pin-info-card-type">${pin.type}</div>
    <div class="pin-info-card-comment">${pin.comment || 'No comment yet'}</div>
    <div class="pin-info-card-actions">
      <button class="btn btn-gradient-pink vote-btn${votedClass}" id="vote-btn">
        ${heartIcon}
        <span id="vote-count">${pin.votes}</span>
      </button>
      <button class="btn btn-secondary comment-btn" id="comment-btn">
        ${SVG_ICONS.comment} Comment
      </button>
    </div>
  `;

  const voteBtn = card.querySelector('#vote-btn');
  voteBtn.addEventListener('click', function () {
    if (pin.voted) return;
    pin.voted = true;
    pin.votes++;
    voteBtn.classList.add('btn-disabled');
    card.querySelector('#vote-count').textContent = pin.votes;
    voteBtn.querySelector('svg').outerHTML = SVG_ICONS.heartFilled;
    saveTrips(allTrips);
    renderSidebarPins();
  });

  const commentBtn = card.querySelector('#comment-btn');
  commentBtn.addEventListener('click', function () {
    const newComment = prompt('Add a comment:', pin.comment || '');
    if (newComment !== null) {
      pin.comment = newComment;
      card.querySelector('.pin-info-card-comment').textContent = newComment || 'No comment yet';
      saveTrips(allTrips);
    }
  });

  document.getElementById('map-area').appendChild(card);
}

function closePinInfo() {
  const existing = document.querySelector('.pin-info-card');
  if (existing) existing.remove();
}

function highlightPin(pinId) {
  const marker = document.querySelector('.map-pin[data-pin-id="' + pinId + '"]');
  if (marker) {
    const pin = currentTrip.pins.find(function (p) { return p.id === pinId; });
    if (pin) {
      showPinInfo(pin, marker);
    }
  }
}

function openAddPinModal(prefillName) {
  const types = ['City', 'Restaurant', 'Landmark', 'Activity'];

  const typeButtonsHTML = types.map(function (type) {
    const activeClass = type === 'City' ? ' active' : '';
    return '<button type="button" class="type-toggle-btn' + activeClass + '" data-type="' + type + '">' + type + '</button>';
  }).join('');

  const bodyHTML = `
    <form id="add-pin-form">
      <div class="form-group">
        <label class="form-label">Location Name</label>
        <input type="text" class="form-input" id="pin-name-input" placeholder="e.g., San Jose, CA" value="${prefillName || ''}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Location Type</label>
        <div class="type-toggle-grid">${typeButtonsHTML}</div>
      </div>
      <div class="form-group">
        <label class="form-label">Comment (Optional)</label>
        <textarea class="form-input" id="pin-comment-input" placeholder="Add a note about this location..." rows="3"></textarea>
      </div>
    </form>
  `;

  const footerHTML = `
    <button type="button" class="btn btn-gradient-pink btn-full" id="submit-pin-btn">Add Pin to Map</button>
  `;

  const modal = openModal('Add New Pin', bodyHTML, footerHTML);

  let selectedType = 'City';

  const toggleBtns = modal.querySelectorAll('.type-toggle-btn');
  toggleBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      toggleBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      selectedType = btn.dataset.type;
    });
  });

  modal.querySelector('#submit-pin-btn').addEventListener('click', function () {
    const name = modal.querySelector('#pin-name-input').value.trim();
    const comment = modal.querySelector('#pin-comment-input').value.trim();

    if (!name) {
      modal.querySelector('#pin-name-input').focus();
      return;
    }

    const newPin = {
      id: getNextId(currentTrip.pins),
      name: name,
      type: selectedType,
      comment: comment,
      votes: 0,
      voted: false,
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 60,
    };

    currentTrip.pins.push(newPin);
    saveTrips(allTrips);
    renderSidebarPins();
    renderMapPins();
    closeModal();
  });
}

function initSearch() {
  const input = document.getElementById('search-input');
  const dropdown = document.getElementById('search-dropdown');

  input.addEventListener('input', function () {
    const query = input.value.trim().toLowerCase();

    if (!query) {
      dropdown.classList.remove('visible');
      return;
    }

    const matches = SEARCH_SUGGESTIONS.filter(function (s) {
      return s.toLowerCase().includes(query);
    });

    if (matches.length === 0) {
      dropdown.classList.remove('visible');
      return;
    }

    dropdown.innerHTML = matches.map(function (s) {
      return '<div class="search-suggestion">' + s + '</div>';
    }).join('');

    dropdown.classList.add('visible');

    dropdown.querySelectorAll('.search-suggestion').forEach(function (el) {
      el.addEventListener('click', function () {
        input.value = '';
        dropdown.classList.remove('visible');
        openAddPinModal(el.textContent);
      });
    });
  });

  input.addEventListener('blur', function () {
    setTimeout(function () {
      dropdown.classList.remove('visible');
    }, 200);
  });
}
