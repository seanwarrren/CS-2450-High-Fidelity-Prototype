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
    all: document.getElementById('all-trips-grid'),
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
    all: document.getElementById('all-trips-grid'),
    current: document.getElementById('current-trips-grid'),
    upcoming: document.getElementById('upcoming-trips-grid'),
    previous: document.getElementById('previous-trips-grid'),
  };

  const grouped = { all: [], current: [], upcoming: [], previous: [] };

  trips.forEach(function (trip) {
    grouped.all.push(trip);
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
      <div class="friend-select-item" data-friend-id="${friend.id}">
        ${createAvatarHTML('sm')}
        <span class="friend-select-name">${friend.name}</span>
        <input type="checkbox" name="friends" value="${friend.id}">
      </div>
    `;
  }).join('');

  const bodyHTML = `
    <form id="create-trip-form">
      <div class="form-group">
        <label class="form-label">Trip Name <span class="required-star">*</span></label>
        <input type="text" class="form-input" id="trip-name-input" placeholder="e.g., Barcelona Trip" required>
        <span class="form-error" id="trip-name-error">Please enter a trip name</span>
      </div>
      <div class="form-group">
        <label class="form-label">Cover Image URL (optional)</label>
        <input type="url" class="form-input" id="trip-image-input" placeholder="https://example.com/photo.jpg">
        <div class="image-preview" id="image-preview"></div>
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
        <label class="form-label">Select Friends <span class="required-star">*</span></label>
        <div class="friend-select-list">${friendsListHTML}</div>
        <span class="form-error" id="trip-friends-error">Please select at least one friend</span>
      </div>
    </form>
  `;

  const footerHTML = `
    <button type="submit" class="btn btn-gradient-pink btn-full" id="submit-trip-btn">Create Trip</button>
  `;

  const modal = openModal('Create New Trip', bodyHTML, footerHTML);

  var imageInput = modal.querySelector('#trip-image-input');
  var imagePreview = modal.querySelector('#image-preview');
  var debounceTimer;

  imageInput.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    var url = imageInput.value.trim();
    if (!url) {
      imagePreview.innerHTML = '';
      imagePreview.classList.remove('has-image');
      return;
    }
    debounceTimer = setTimeout(function () {
      var img = document.createElement('img');
      img.src = url;
      img.alt = 'Cover preview';
      img.onload = function () {
        imagePreview.innerHTML = '';
        imagePreview.appendChild(img);
        imagePreview.classList.add('has-image');
      };
      img.onerror = function () {
        imagePreview.innerHTML = '<span class="image-preview-error">Could not load image</span>';
        imagePreview.classList.remove('has-image');
      };
    }, 400);
  });

  const items = modal.querySelectorAll('.friend-select-item');
  items.forEach(function (item) {
    item.addEventListener('click', function (e) {
      if (e.target.tagName === 'INPUT') return;
      const checkbox = item.querySelector('input[type="checkbox"]');
      checkbox.checked = !checkbox.checked;
      item.classList.toggle('selected', checkbox.checked);
      if (modal.querySelector('input[name="friends"]:checked')) {
        friendsError.classList.remove('visible');
      }
    });
  });

  var nameInput = modal.querySelector('#trip-name-input');
  var nameError = modal.querySelector('#trip-name-error');
  var friendsError = modal.querySelector('#trip-friends-error');

  nameInput.addEventListener('input', function () {
    if (nameInput.value.trim()) {
      nameError.classList.remove('visible');
      nameInput.classList.remove('form-input-error');
    }
  });

  modal.querySelector('#submit-trip-btn').addEventListener('click', function () {
    const name = nameInput.value.trim();
    const imageUrl = modal.querySelector('#trip-image-input').value.trim();
    const desc = modal.querySelector('#trip-desc-input').value.trim();
    const startDate = modal.querySelector('#trip-start-date').value;
    const endDate = modal.querySelector('#trip-end-date').value;

    const selectedFriends = [];
    modal.querySelectorAll('input[name="friends"]:checked').forEach(function (cb) {
      selectedFriends.push(parseInt(cb.value));
    });

    var hasError = false;

    if (!name) {
      nameError.classList.add('visible');
      nameInput.classList.add('form-input-error');
      nameInput.focus();
      hasError = true;
    } else {
      nameError.classList.remove('visible');
      nameInput.classList.remove('form-input-error');
    }

    if (selectedFriends.length === 0) {
      friendsError.classList.add('visible');
      hasError = true;
    } else {
      friendsError.classList.remove('visible');
    }

    if (hasError) return;

    if (startDate && endDate && startDate > endDate) {
      modal.querySelector('#trip-end-date').focus();
      return;
    }

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
