document.addEventListener('DOMContentLoaded', function () {
  const trips = loadTrips();
  renderTrips(trips);
  initTabs();

  document.getElementById('create-trip-btn').addEventListener('click', function () {
    openCreateTripModal(trips);
  });
});

function initTabs() {
  const tabBar = document.getElementById('trips-tab-bar');
  const tabs = tabBar.querySelectorAll('.trips-tab');
  const grids = {
    previous: document.getElementById('previous-trips-grid'),
    current: document.getElementById('current-trips-grid'),
    upcoming: document.getElementById('upcoming-trips-grid'),
  };

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');

      var selected = tab.getAttribute('data-tab');
      Object.keys(grids).forEach(function (key) {
        grids[key].style.display = key === selected ? '' : 'none';
      });
    });
  });
}

function fetchUnsplashImage(trip, cardElement, allTrips) {
  if (typeof UNSPLASH_ACCESS_KEY === 'undefined' || UNSPLASH_ACCESS_KEY === 'YOUR_UNSPLASH_ACCESS_KEY_HERE') {
    return;
  }
  var query = encodeURIComponent(trip.name);
  fetch('https://api.unsplash.com/search/photos?query=' + query + '&per_page=1&orientation=landscape', {
    headers: { 'Authorization': 'Client-ID ' + UNSPLASH_ACCESS_KEY }
  })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.results && data.results.length > 0) {
        var url = data.results[0].urls.small;
        trip.image = url;
        saveTrips(allTrips);
        var topDiv = cardElement.querySelector('.trip-card-top');
        topDiv.style.backgroundColor = '';
        topDiv.innerHTML = '<img src="' + url + '" alt="' + trip.name + '">' +
          '<button class="trip-delete-btn" title="Delete trip">' + SVG_ICONS.trash + '</button>';
        topDiv.querySelector('.trip-delete-btn').addEventListener('click', function (e) {
          e.stopPropagation();
          openDeleteTripModal(allTrips, trip);
        });
      }
    })
    .catch(function () {});
}

function categorizeTripByDate(trip) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!trip.startDate && !trip.endDate) return 'upcoming';

  const start = trip.startDate ? new Date(trip.startDate + 'T00:00:00') : null;
  const end = trip.endDate ? new Date(trip.endDate + 'T00:00:00') : null;

  if (end && end < today) return 'previous';
  if (start && start > today) return 'upcoming';
  return 'current';
}

function renderTrips(trips) {
  const grids = {
    current: document.getElementById('current-trips-grid'),
    upcoming: document.getElementById('upcoming-trips-grid'),
    previous: document.getElementById('previous-trips-grid'),
  };

  const grouped = { current: [], upcoming: [], previous: [] };

  trips.forEach(function (trip) {
    const category = categorizeTripByDate(trip);
    grouped[category].push(trip);
  });

  Object.keys(grids).forEach(function (key) {
    grids[key].innerHTML = '';
    grouped[key].forEach(function (trip, index) {
      grids[key].appendChild(createTripCard(trip, index, trips));
    });
  });
}

function createTripCard(trip, index, allTrips) {
  const card = document.createElement('div');
  card.className = 'card trip-card';

  const memberNames = getMemberNames(trip.memberIds);

  const avatarsHTML = trip.memberIds
    .slice(0, 5)
    .map(function () { return createAvatarHTML('xs'); })
    .join('');

  const tripDates = formatTripDates(trip);
  const datesHTML = tripDates
    ? '<div class="trip-card-dates">' + SVG_ICONS.calendar + ' ' + tripDates + '</div>'
    : '';

  const fallbackColor = CARD_COLORS[index % CARD_COLORS.length];
  const imageURL = trip.image || '';

  card.innerHTML = `
    <div class="trip-card-top" style="${!imageURL ? 'background-color:' + fallbackColor : ''}">
      ${imageURL ? '<img src="' + imageURL + '" alt="' + trip.name + '">' : '<svg class="trip-card-placeholder" viewBox="0 0 24 24" fill="#9ca3af"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>'}
      <button class="trip-delete-btn" title="Delete trip">
        ${SVG_ICONS.trash}
      </button>
    </div>
    <div class="trip-card-body">
      <div class="trip-card-title">${trip.name}</div>
      <div class="trip-card-members">
        <div class="avatar-group">${avatarsHTML}</div>
        <span class="trip-card-members-names">${memberNames.join(', ')}</span>
      </div>
      ${datesHTML}
      <div class="trip-card-pins">
        <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>
        ${trip.pins.length} locations pinned
      </div>
    </div>
  `;

  if (!trip.image) {
    fetchUnsplashImage(trip, card, allTrips);
  }

  card.querySelector('.trip-delete-btn').addEventListener('click', function (e) {
    e.stopPropagation();
    openDeleteTripModal(allTrips, trip);
  });

  card.addEventListener('click', function () {
    window.location.href = 'trip.html?id=' + trip.id;
  });

  return card;
}

function openDeleteTripModal(trips, trip) {
  const bodyHTML = '<p class="confirm-message">Are you sure you want to delete <strong>' + trip.name + '</strong>? All pins and comments will be permanently removed.</p>';
  const footerHTML = `
    <div class="confirm-actions">
      <button type="button" class="btn btn-secondary" id="confirm-cancel-btn">Cancel</button>
      <button type="button" class="btn btn-danger" id="confirm-yes-btn">Delete</button>
    </div>
  `;

  const modal = openModal('Delete Trip', bodyHTML, footerHTML);

  modal.querySelector('#confirm-cancel-btn').addEventListener('click', function () {
    closeModal();
  });

  modal.querySelector('#confirm-yes-btn').addEventListener('click', function () {
    const idx = trips.findIndex(function (t) { return t.id === trip.id; });
    if (idx !== -1) {
      trips.splice(idx, 1);
      saveTrips(trips);
      renderTrips(trips);
    }
    closeModal();
  });
}

function openCreateTripModal(trips) {
  const friendsListHTML = FRIENDS.map(function (friend) {
    return `
      <label class="friend-select-item" data-friend-id="${friend.id}">
        ${createAvatarHTML('sm')}
        <span class="friend-select-name">${friend.name}</span>
        <input type="checkbox" name="friends" value="${friend.id}">
      </label>
    `;
  }).join('');

  const bodyHTML = `
    <form id="create-trip-form">
      <div class="form-group">
        <label class="form-label">Trip Name</label>
        <input type="text" class="form-input" id="trip-name-input" placeholder="e.g., Barcelona Trip" required>
      </div>
      <div class="form-group">
        <label class="form-label">Cover Image URL</label>
        <input type="url" class="form-input" id="trip-image-input" placeholder="Paste an image URL (optional)">
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-input" id="trip-desc-input" placeholder="Optional description" rows="3"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Trip Dates</label>
        <div class="date-range-row">
          <div class="date-field">
            <label class="date-field-label">Start</label>
            <input type="date" class="form-input" id="trip-start-date">
          </div>
          <span class="date-range-sep">–</span>
          <div class="date-field">
            <label class="date-field-label">End</label>
            <input type="date" class="form-input" id="trip-end-date">
          </div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Select Friends</label>
        <div class="friend-select-list">${friendsListHTML}</div>
      </div>
    </form>
  `;

  const footerHTML = `
    <button type="submit" class="btn btn-gradient-pink btn-full" id="submit-trip-btn">Create Trip</button>
  `;

  const modal = openModal('Create New Trip', bodyHTML, footerHTML);

  const items = modal.querySelectorAll('.friend-select-item');
  items.forEach(function (item) {
    item.addEventListener('click', function (e) {
      if (e.target.tagName === 'INPUT') return;
      const checkbox = item.querySelector('input[type="checkbox"]');
      checkbox.checked = !checkbox.checked;
      item.classList.toggle('selected', checkbox.checked);
    });
  });

  modal.querySelector('#submit-trip-btn').addEventListener('click', function () {
    const name = modal.querySelector('#trip-name-input').value.trim();
    const imageUrl = modal.querySelector('#trip-image-input').value.trim();
    const desc = modal.querySelector('#trip-desc-input').value.trim();
    const startDate = modal.querySelector('#trip-start-date').value;
    const endDate = modal.querySelector('#trip-end-date').value;

    if (!name) {
      modal.querySelector('#trip-name-input').focus();
      return;
    }

    if (startDate && endDate && startDate > endDate) {
      modal.querySelector('#trip-end-date').focus();
      return;
    }

    const selectedFriends = [];
    modal.querySelectorAll('input[name="friends"]:checked').forEach(function (cb) {
      selectedFriends.push(parseInt(cb.value));
    });

    const newTrip = {
      id: getNextId(trips),
      name: name,
      image: imageUrl || '',
      description: desc,
      startDate: startDate || '',
      endDate: endDate || '',
      memberIds: selectedFriends,
      pins: [],
    };

    trips.push(newTrip);
    saveTrips(trips);
    renderTrips(trips);
    closeModal();
  });
}
