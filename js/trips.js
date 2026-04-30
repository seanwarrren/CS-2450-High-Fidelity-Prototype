document.addEventListener('DOMContentLoaded', function () {
  const trips = loadTrips();
  renderTrips(trips);

  document.getElementById('create-trip-btn').addEventListener('click', function () {
    openCreateTripModal(trips);
  });
});

function renderTrips(trips) {
  const grid = document.getElementById('trips-grid');
  grid.innerHTML = '';

  trips.forEach(function (trip, index) {
    const card = document.createElement('div');
    card.className = 'card trip-card';

    const color = CARD_COLORS[index % CARD_COLORS.length];
    const memberNames = getMemberNames(trip.memberIds);

    const avatarsHTML = trip.memberIds
      .slice(0, 5)
      .map(function () { return createAvatarHTML('xs'); })
      .join('');

    const tripDates = formatTripDates(trip);
    const datesHTML = tripDates
      ? '<div class="trip-card-dates">' + SVG_ICONS.calendar + ' ' + tripDates + '</div>'
      : '';

    card.innerHTML = `
      <div class="trip-card-top" style="background-color: ${color}">
        <svg viewBox="0 0 24 24" fill="#9ca3af"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>
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
      openDeleteTripModal(trips, trip);
    });

    card.addEventListener('click', function () {
      window.location.href = 'trip.html?id=' + trip.id;
    });

    grid.appendChild(card);
  });
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
