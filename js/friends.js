document.addEventListener('DOMContentLoaded', function () {
  renderFriends();
});

function renderFriends() {
  const container = document.getElementById('friends-list');
  container.innerHTML = '';

  FRIENDS.forEach(function (friend) {
    const row = document.createElement('div');
    row.className = 'friend-row';

    const dotClass = friend.status === 'online' ? 'online' : 'offline';
    const statusText = friend.status === 'online' ? 'Online' : 'Offline';

    row.innerHTML = `
      ${createAvatarHTML()}
      <div class="friend-info">
        <div class="friend-name">
          ${friend.name}
          <span class="status-dot ${dotClass}"></span>
        </div>
        <div class="friend-status-text">${statusText}</div>
      </div>
    `;

    container.appendChild(row);
  });
}
