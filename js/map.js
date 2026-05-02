let currentTrip = null;
let allTrips = [];
let map = null;
let geocoder = null;
let autocompleteService = null;
let placesService = null;
let mapMarkers = [];
let activeInfoCard = null;

function loadGoogleMaps() {
  return new Promise(function (resolve, reject) {
    if (window.google && window.google.maps) {
      resolve();
      return;
    }

    var script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?key=' + GOOGLE_MAPS_API_KEY + '&libraries=geocoding,places';
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = function () {
      reject(new Error('Failed to load Google Maps API'));
    };
    document.head.appendChild(script);
  });
}

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
  initSearch();

  document.getElementById('add-pin-btn').addEventListener('click', function () {
    openAddPinModal();
  });

  document.getElementById('edit-trip-btn').innerHTML = SVG_ICONS.edit;
  document.getElementById('edit-trip-btn').addEventListener('click', function () {
    openEditTripModal();
  });

  loadGoogleMaps().then(function () {
    initMap();
  }).catch(function (err) {
    console.error(err);
    document.getElementById('map-area').innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#9ca3af;font-size:0.95rem;">Could not load Google Maps</div>';
  });
});

function initMap() {
  geocoder = new google.maps.Geocoder();
  autocompleteService = new google.maps.places.AutocompleteService();

  var mapOptions = {
    zoom: 3,
    center: { lat: 20, lng: 0 },
    mapTypeControl: true,
    streetViewControl: false,
    fullscreenControl: true,
    zoomControl: true,
    styles: [
      { featureType: 'poi', stylers: [{ visibility: 'simplified' }] },
    ],
  };

  map = new google.maps.Map(document.getElementById('map-area'), mapOptions);
  placesService = new google.maps.places.PlacesService(map);

  map.addListener('click', function () {
    closePinInfo();
  });

  renderMapPins();
}

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

  const datesEl = document.getElementById('trip-dates');
  const tripDates = formatTripDates(currentTrip);
  if (tripDates) {
    datesEl.innerHTML = SVG_ICONS.calendar + ' ' + tripDates;
  } else {
    datesEl.textContent = '';
  }
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

    const commentCount = (pin.comments || []).length;

    item.innerHTML = `
      <div class="pin-list-icon">
        ${SVG_ICONS.pin}
      </div>
      <div class="pin-list-info">
        <div class="pin-list-name">${pin.name}</div>
        <div class="pin-list-type">${pin.type}</div>
        <div class="pin-list-meta">
          <span>${SVG_ICONS.heart} ${pin.votes}</span>
          <span>${SVG_ICONS.comment} ${commentCount}</span>
        </div>
      </div>
      <button class="pin-delete-btn" title="Delete pin">
        ${SVG_ICONS.trash}
      </button>
    `;

    item.querySelector('.pin-delete-btn').addEventListener('click', function (e) {
      e.stopPropagation();
      deletePin(pin.id);
    });

    item.addEventListener('click', function () {
      highlightPin(pin.id);
    });

    list.appendChild(item);
  });
}

function renderMapPins() {
  mapMarkers.forEach(function (m) { m.setMap(null); });
  mapMarkers = [];

  if (!map) return;

  var bounds = new google.maps.LatLngBounds();
  var hasValidPins = false;

  currentTrip.pins.forEach(function (pin) {
    if (pin.lat == null || pin.lng == null) return;

    hasValidPins = true;
    var position = { lat: pin.lat, lng: pin.lng };
    bounds.extend(position);

    var marker = new google.maps.Marker({
      position: position,
      map: map,
      title: pin.name,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: '#ec4899',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      },
    });

    marker.pinId = pin.id;

    marker.addListener('click', function () {
      showPinInfo(pin, marker);
    });

    mapMarkers.push(marker);
  });

  if (hasValidPins) {
    if (currentTrip.pins.filter(function (p) { return p.lat != null; }).length === 1) {
      map.setCenter(bounds.getCenter());
      map.setZoom(12);
    } else {
      map.fitBounds(bounds, 60);
    }
  }
}

function deletePin(pinId) {
  const pin = currentTrip.pins.find(function (p) { return p.id === pinId; });
  if (!pin) return;

  openConfirmModal(
    'Delete Pin',
    'Are you sure you want to delete <strong>' + pin.name + '</strong>? This cannot be undone.',
    function () {
      currentTrip.pins = currentTrip.pins.filter(function (p) { return p.id !== pinId; });
      saveTrips(allTrips);
      closePinInfo();
      renderSidebarPins();
      renderMapPins();
    }
  );
}

function showPinInfo(pin, marker) {
  closePinInfo();

  if (!map || pin.lat == null) return;

  var card = document.createElement('div');
  card.className = 'pin-info-card';

  var votedClass = pin.voted ? ' btn-disabled' : '';
  var heartIcon = pin.voted ? SVG_ICONS.heartFilled : SVG_ICONS.heart;
  var commentCount = (pin.comments || []).length;

  card.innerHTML = `
    <div class="pin-info-card-header">
      <div>
        <div class="pin-info-card-name">${pin.name}</div>
        <div class="pin-info-card-type">${pin.type}</div>
      </div>
      <button class="pin-info-delete-btn" title="Delete pin">
        ${SVG_ICONS.trash}
      </button>
    </div>
    <div class="pin-info-card-actions">
      <button class="btn btn-gradient-pink vote-btn${votedClass}" id="vote-btn">
        ${heartIcon}
        <span id="vote-count">${pin.votes}</span>
      </button>
      <button class="btn btn-secondary comment-btn" id="comment-btn">
        ${SVG_ICONS.comment} Comments${commentCount ? ' (' + commentCount + ')' : ''}
      </button>
    </div>
  `;

  card.querySelector('.pin-info-delete-btn').addEventListener('click', function () {
    deletePin(pin.id);
  });

  var voteBtn = card.querySelector('#vote-btn');
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

  var commentBtn = card.querySelector('#comment-btn');
  commentBtn.addEventListener('click', function () {
    openCommentsModal(pin);
  });

  card.addEventListener('click', function (e) {
    e.stopPropagation();
  });

  var overlay = new google.maps.OverlayView();
  overlay.onAdd = function () {
    var panes = this.getPanes();
    panes.floatPane.appendChild(card);
  };
  overlay.draw = function () {
    var projection = this.getProjection();
    var pos = projection.fromLatLngToDivPixel(marker.getPosition());
    card.style.left = (pos.x + 16) + 'px';
    card.style.top = (pos.y - 80) + 'px';
  };
  overlay.onRemove = function () {
    if (card.parentNode) {
      card.parentNode.removeChild(card);
    }
  };
  overlay.setMap(map);
  activeInfoCard = overlay;

  map.panTo(marker.getPosition());
}

function openCommentsModal(pin) {
  if (!Array.isArray(pin.comments)) {
    pin.comments = [];
  }

  function buildCommentsHTML(comments) {
    if (comments.length === 0) {
      return '<div class="comments-empty">No comments yet. Be the first to comment!</div>';
    }
    return comments.map(function (c) {
      return `
        <div class="comment-item" data-comment-id="${c.id}">
          <div class="comment-avatar">${createAvatarHTML('xs')}</div>
          <div class="comment-content">
            <div class="comment-author">${c.author || 'You'}</div>
            <div class="comment-text">${c.text}</div>
          </div>
          <button class="comment-delete-btn" title="Delete comment" data-id="${c.id}">
            ${SVG_ICONS.trash}
          </button>
        </div>
      `;
    }).join('');
  }

  const bodyHTML = `
    <div class="comments-list" id="comments-list">
      ${buildCommentsHTML(pin.comments)}
    </div>
    <div class="comment-input-row">
      <input type="text" class="form-input" id="comment-text-input" placeholder="Write a comment...">
      <button type="button" class="btn btn-gradient-pink" id="submit-comment-btn">Post</button>
    </div>
  `;

  const modal = openModal('Comments — ' + pin.name, bodyHTML, '');

  function refreshComments() {
    const listEl = modal.querySelector('#comments-list');
    listEl.innerHTML = buildCommentsHTML(pin.comments);
    attachDeleteHandlers();
  }

  function attachDeleteHandlers() {
    modal.querySelectorAll('.comment-delete-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const commentId = parseInt(btn.dataset.id);
        pin.comments = pin.comments.filter(function (c) { return c.id !== commentId; });
        saveTrips(allTrips);
        renderSidebarPins();
        refreshComments();
      });
    });
  }

  attachDeleteHandlers();

  function submitComment() {
    const input = modal.querySelector('#comment-text-input');
    const text = input.value.trim();
    if (!text) return;

    pin.comments.push({
      id: getNextId(pin.comments),
      text: text,
      author: 'You',
    });

    saveTrips(allTrips);
    renderSidebarPins();
    input.value = '';
    refreshComments();

    var listEl = modal.querySelector('#comments-list');
    listEl.scrollTop = listEl.scrollHeight;
  }

  modal.querySelector('#submit-comment-btn').addEventListener('click', submitComment);

  modal.querySelector('#comment-text-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitComment();
    }
  });
}

function openConfirmModal(title, message, onConfirm) {
  const bodyHTML = `<p class="confirm-message">${message}</p>`;
  const footerHTML = `
    <div class="confirm-actions">
      <button type="button" class="btn btn-secondary" id="confirm-cancel-btn">Cancel</button>
      <button type="button" class="btn btn-danger" id="confirm-yes-btn">Delete</button>
    </div>
  `;

  const modal = openModal(title, bodyHTML, footerHTML);

  modal.querySelector('#confirm-cancel-btn').addEventListener('click', function () {
    closeModal();
  });

  modal.querySelector('#confirm-yes-btn').addEventListener('click', function () {
    closeModal();
    onConfirm();
  });
}

function closePinInfo() {
  if (activeInfoCard) {
    activeInfoCard.setMap(null);
    activeInfoCard = null;
  }
}

function highlightPin(pinId) {
  var pin = currentTrip.pins.find(function (p) { return p.id === pinId; });
  var marker = mapMarkers.find(function (m) { return m.pinId === pinId; });
  if (pin && marker) {
    showPinInfo(pin, marker);
  }
}

function openAddPinModal(prefillName, prefillLat, prefillLng) {
  const types = ['City', 'Restaurant', 'Landmark', 'Activity'];

  const typeButtonsHTML = types.map(function (type) {
    const activeClass = type === 'City' ? ' active' : '';
    return '<button type="button" class="type-toggle-btn' + activeClass + '" data-type="' + type + '">' + type + '</button>';
  }).join('');

  const bodyHTML = `
    <form id="add-pin-form">
      <div class="form-group">
        <label class="form-label">Location Name</label>
        <div class="modal-search-wrapper">
          <input type="text" class="form-input" id="pin-name-input" placeholder="e.g., San Jose, CA" value="${prefillName || ''}" required autocomplete="off">
          <div class="search-dropdown" id="pin-name-dropdown"></div>
        </div>
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
    <div id="pin-geocode-error" class="form-error" style="margin-bottom:12px"></div>
    <button type="button" class="btn btn-gradient-pink btn-full" id="submit-pin-btn">Add Pin to Map</button>
  `;

  const modal = openModal('Add New Pin', bodyHTML, footerHTML);

  let selectedType = 'City';
  let savedLat = prefillLat || null;
  let savedLng = prefillLng || null;

  const toggleBtns = modal.querySelectorAll('.type-toggle-btn');
  toggleBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      toggleBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      selectedType = btn.dataset.type;
    });
  });

  var pinNameInput = modal.querySelector('#pin-name-input');
  var pinNameDropdown = modal.querySelector('#pin-name-dropdown');
  var pinSearchTimer = null;

  pinNameInput.addEventListener('input', function () {
    var query = pinNameInput.value.trim();
    savedLat = null;
    savedLng = null;

    if (!query || query.length < 2) {
      pinNameDropdown.classList.remove('visible');
      return;
    }

    clearTimeout(pinSearchTimer);
    pinSearchTimer = setTimeout(function () {
      if (!autocompleteService) return;

      var pinRequestOpts = { input: query };
      if (map && map.getBounds()) {
        pinRequestOpts.locationBias = map.getBounds();
      }
      autocompleteService.getPlacePredictions(pinRequestOpts, function (predictions, status) {
        if (pinNameInput.value.trim() !== query) return;

        if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions || predictions.length === 0) {
          pinNameDropdown.classList.remove('visible');
          return;
        }

        pinNameDropdown.innerHTML = predictions.slice(0, 5).map(buildPlaceSuggestionHTML).join('');
        pinNameDropdown.classList.add('visible');

        pinNameDropdown.querySelectorAll('.search-suggestion').forEach(function (el) {
          el.addEventListener('mousedown', function (e) {
            e.preventDefault();
            var name = el.querySelector('.suggestion-name').textContent;
            var placeId = el.dataset.placeId;
            pinNameInput.value = name;
            pinNameDropdown.classList.remove('visible');
            getPlaceLatLng(placeId, function (lat, lng) {
              savedLat = lat;
              savedLng = lng;
            });
          });
        });
      });
    }, 300);
  });

  pinNameInput.addEventListener('blur', function () {
    setTimeout(function () {
      pinNameDropdown.classList.remove('visible');
    }, 200);
  });

  modal.querySelector('#submit-pin-btn').addEventListener('click', function () {
    const name = modal.querySelector('#pin-name-input').value.trim();
    const comment = modal.querySelector('#pin-comment-input').value.trim();
    const errorEl = modal.querySelector('#pin-geocode-error');

    if (!name) {
      modal.querySelector('#pin-name-input').focus();
      return;
    }

    var submitBtn = modal.querySelector('#submit-pin-btn');
    submitBtn.textContent = 'Locating...';
    submitBtn.classList.add('btn-disabled');
    errorEl.classList.remove('visible');

    function createPin(lat, lng) {
      var comments = [];
      if (comment) {
        comments.push({ id: 1, text: comment, author: 'You' });
      }

      var newPin = {
        id: getNextId(currentTrip.pins),
        name: name,
        type: selectedType,
        comment: comment,
        comments: comments,
        votes: 0,
        voted: false,
        lat: lat,
        lng: lng,
      };

      currentTrip.pins.push(newPin);
      saveTrips(allTrips);
      renderSidebarPins();
      renderMapPins();
      closeModal();
    }

    if (savedLat != null && savedLng != null) {
      createPin(savedLat, savedLng);
      return;
    }

    if (!geocoder) {
      errorEl.textContent = 'Maps not loaded yet. Please try again.';
      errorEl.classList.add('visible');
      submitBtn.textContent = 'Add Pin to Map';
      submitBtn.classList.remove('btn-disabled');
      return;
    }

    geocoder.geocode({ address: name }, function (results, status) {
      if (status === 'OK' && results[0]) {
        var loc = results[0].geometry.location;
        createPin(loc.lat(), loc.lng());
      } else {
        errorEl.textContent = 'Could not find that location. Try a more specific name.';
        errorEl.classList.add('visible');
        submitBtn.textContent = 'Add Pin to Map';
        submitBtn.classList.remove('btn-disabled');
      }
    });
  });
}

var searchDebounce = null;

function buildPlaceSuggestionHTML(prediction) {
  var mainText = prediction.structured_formatting.main_text;
  var secondaryText = prediction.structured_formatting.secondary_text || '';
  return '<div class="search-suggestion" data-place-id="' + prediction.place_id + '">'
    + '<span class="suggestion-icon">' + SVG_ICONS.pin + '</span>'
    + '<span class="suggestion-text">'
    + '<span class="suggestion-name">' + mainText + '</span>'
    + (secondaryText ? '<span class="suggestion-address">' + secondaryText + '</span>' : '')
    + '</span>'
    + '</div>';
}

function getPlaceLatLng(placeId, callback) {
  if (!placesService) return;
  placesService.getDetails({ placeId: placeId, fields: ['geometry'] }, function (place, status) {
    if (status === google.maps.places.PlacesServiceStatus.OK && place && place.geometry) {
      callback(place.geometry.location.lat(), place.geometry.location.lng());
    }
  });
}

function initSearch() {
  const input = document.getElementById('search-input');
  const dropdown = document.getElementById('search-dropdown');

  input.addEventListener('input', function () {
    const query = input.value.trim();

    if (!query) {
      dropdown.classList.remove('visible');
      return;
    }

    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(function () {
      if (!autocompleteService) return;

      var requestOpts = { input: query };
      if (map && map.getBounds()) {
        requestOpts.locationBias = map.getBounds();
      }
      autocompleteService.getPlacePredictions(requestOpts, function (predictions, status) {
        if (input.value.trim() !== query) return;

        if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions || predictions.length === 0) {
          dropdown.classList.remove('visible');
          return;
        }

        dropdown.innerHTML = predictions.slice(0, 5).map(buildPlaceSuggestionHTML).join('');
        dropdown.classList.add('visible');

        dropdown.querySelectorAll('.search-suggestion').forEach(function (el) {
          el.addEventListener('click', function () {
            var placeId = el.dataset.placeId;
            var name = el.querySelector('.suggestion-name').textContent;
            input.value = '';
            dropdown.classList.remove('visible');
            getPlaceLatLng(placeId, function (lat, lng) {
              openAddPinModal(name, lat, lng);
            });
          });
        });
      });
    }, 300);
  });

  input.addEventListener('blur', function () {
    setTimeout(function () {
      dropdown.classList.remove('visible');
    }, 200);
  });
}

function openEditTripModal() {
  const friendsListHTML = FRIENDS.map(function (friend) {
    const checked = currentTrip.memberIds.indexOf(friend.id) !== -1;
    return `
      <div class="friend-select-item${checked ? ' selected' : ''}" data-friend-id="${friend.id}">
        ${createAvatarHTML('sm')}
        <span class="friend-select-name">${friend.name}</span>
        <input type="checkbox" name="friends" value="${friend.id}"${checked ? ' checked' : ''}>
      </div>
    `;
  }).join('');

  const bodyHTML = `
    <form id="edit-trip-form">
      <div class="form-group">
        <label class="form-label">Trip Name <span class="required-star">*</span></label>
        <input type="text" class="form-input" id="edit-trip-name" value="${currentTrip.name}" required>
        <span class="form-error" id="edit-name-error">Please enter a trip name</span>
      </div>
      <div class="form-group">
        <label class="form-label">Cover Image URL (optional)</label>
        <input type="url" class="form-input" id="edit-trip-image" value="${currentTrip.image || ''}" placeholder="https://example.com/photo.jpg">
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-input" id="edit-trip-desc" rows="3">${currentTrip.description || ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Trip Dates</label>
        <div class="date-range-row">
          <div class="date-field">
            <label class="date-field-label">Start</label>
            <input type="date" class="form-input" id="edit-trip-start" value="${currentTrip.startDate || ''}">
          </div>
          <span class="date-range-sep">–</span>
          <div class="date-field">
            <label class="date-field-label">End</label>
            <input type="date" class="form-input" id="edit-trip-end" value="${currentTrip.endDate || ''}">
          </div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Friends <span class="required-star">*</span></label>
        <div class="friend-select-list">${friendsListHTML}</div>
        <span class="form-error" id="edit-friends-error">Please select at least one friend</span>
      </div>
    </form>
  `;

  const footerHTML = `
    <button type="button" class="btn btn-gradient-pink btn-full" id="save-trip-btn">Save Changes</button>
  `;

  const modal = openModal('Edit Trip', bodyHTML, footerHTML);

  var nameInput = modal.querySelector('#edit-trip-name');
  var nameError = modal.querySelector('#edit-name-error');
  var friendsError = modal.querySelector('#edit-friends-error');

  nameInput.addEventListener('input', function () {
    if (nameInput.value.trim()) {
      nameError.classList.remove('visible');
      nameInput.classList.remove('form-input-error');
    }
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

  modal.querySelector('#save-trip-btn').addEventListener('click', function () {
    const name = nameInput.value.trim();
    const image = modal.querySelector('#edit-trip-image').value.trim();
    const desc = modal.querySelector('#edit-trip-desc').value.trim();
    const startDate = modal.querySelector('#edit-trip-start').value;
    const endDate = modal.querySelector('#edit-trip-end').value;

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
      modal.querySelector('#edit-trip-end').focus();
      return;
    }

    currentTrip.name = name;
    currentTrip.image = image || '';
    currentTrip.description = desc;
    currentTrip.startDate = startDate || '';
    currentTrip.endDate = endDate || '';
    currentTrip.memberIds = selectedFriends;

    saveTrips(allTrips);
    renderTripHeader();
    closeModal();
  });
}
