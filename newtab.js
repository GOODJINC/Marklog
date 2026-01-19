/* ============================================
   newtab.js - Marklog 메인 스크립트 v1.1.0
   ============================================
   
   [v1.1.0 추가 기능]
   - 방향키 네비게이션 (즐겨찾기/폴더/사이트 간 이동)
   - 배경 설정 (색상/그라데이션/이미지)
   - 폴더 색상 설정
   - 폴더 드래그앤드롭 순서 변경
*/

// ============================================
// 1. 전역 변수 및 상태
// ============================================

let appData = null;
let currentFavoritePage = 0;
let currentFolderPage = 0;
const FAVORITES_PER_PAGE = 8;
const FOLDERS_PER_PAGE = 8;

let searchResults = [];
let selectedSearchIndex = -1;

let modalMode = null;
let modalType = null;
let editingItem = null;
let currentFolderId = null;

// 키보드 네비게이션 상태 (v1.1.0)
let keyboardNavActive = false;
let keyboardArea = null;      // 'favorites', 'folders', 'sites'
let keyboardFavIndex = 0;
let keyboardFolderIndex = 0;
let keyboardSiteIndex = 0;
let keyboardCurrentFolderId = null;

// ============================================
// 2. 초기화 함수
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  appData = await loadData();
  applyTheme(appData.settings.theme);
  applyBackground(appData.settings.background);
  renderAll();
  setupEventListeners();
  initDragDrop();
  console.log('Marklog v1.1.0 초기화 완료');
});

function renderAll() {
  renderFavorites(appData);
  renderFolders(appData);
  updateFavoritesVisibility();
}

// ============================================
// 3. 렌더링 함수
// ============================================

function renderFavorites(data) {
  const grid = document.getElementById('favoritesGrid');
  const prevBtn = document.getElementById('favPrevBtn');
  const nextBtn = document.getElementById('favNextBtn');
  const pageIndicator = document.getElementById('favPageIndicator');
  
  if (!grid) return;
  grid.innerHTML = '';
  
  const startIndex = currentFavoritePage * FAVORITES_PER_PAGE;
  const endIndex = startIndex + FAVORITES_PER_PAGE;
  const pageItems = data.favorites.slice(startIndex, endIndex);
  
  pageItems.forEach((favorite, index) => {
    const item = createFavoriteElement(favorite);
    item.dataset.index = startIndex + index;
    grid.appendChild(item);
  });
  
  if (pageItems.length < FAVORITES_PER_PAGE) {
    const addBtn = document.createElement('div');
    addBtn.className = 'favorite-item favorite-add';
    addBtn.innerHTML = '<div class="favicon-container"><span class="add-icon">+</span></div><span class="name">추가</span>';
    addBtn.addEventListener('click', () => openModal('add', 'favorite'));
    grid.appendChild(addBtn);
  }
  
  const totalPages = Math.ceil(data.favorites.length / FAVORITES_PER_PAGE);
  const needsPagination = data.favorites.length > FAVORITES_PER_PAGE;
  
  prevBtn.classList.toggle('hidden', !needsPagination);
  nextBtn.classList.toggle('hidden', !needsPagination);
  pageIndicator.classList.toggle('hidden', !needsPagination);
  
  if (needsPagination) {
    prevBtn.disabled = currentFavoritePage === 0;
    nextBtn.disabled = currentFavoritePage >= totalPages - 1;
    pageIndicator.textContent = `${currentFavoritePage + 1} / ${totalPages}`;
  }
}

function createFavoriteElement(favorite) {
  const item = document.createElement('div');
  item.className = 'favorite-item';
  item.dataset.id = favorite.id;
  item.setAttribute('draggable', 'true');
  
  const faviconUrl = getFaviconUrl(favorite.url);
  item.innerHTML = `
    <div class="favicon-container">
      <img class="favicon" src="${faviconUrl}" alt="" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🔗</text></svg>'">
    </div>
    <span class="name">${escapeHtml(favorite.name)}</span>
  `;
  
  item.addEventListener('click', (e) => handleItemClick(e, favorite.url));
  setupLongPress(item, () => openModal('edit', 'favorite', favorite));
  
  return item;
}

function renderFolders(data) {
  const grid = document.getElementById('foldersGrid');
  const prevBtn = document.getElementById('folderPrevBtn');
  const nextBtn = document.getElementById('folderNextBtn');
  const pageIndicator = document.getElementById('folderPageIndicator');
  
  if (!grid) return;
  grid.innerHTML = '';
  
  const foldersPerPage = data.settings.folderRows === 1 ? 4 : FOLDERS_PER_PAGE;
  grid.classList.toggle('single-row', data.settings.folderRows === 1);
  
  const startIndex = currentFolderPage * foldersPerPage;
  const endIndex = startIndex + foldersPerPage;
  const pageFolders = data.folders.slice(startIndex, endIndex);
  
  pageFolders.forEach((folder, index) => {
    const card = createFolderElement(folder);
    card.dataset.index = startIndex + index;
    grid.appendChild(card);
  });
  
  if (pageFolders.length < foldersPerPage) {
    const addCard = document.createElement('div');
    addCard.className = 'folder-card folder-add';
    addCard.innerHTML = '<span class="add-icon">+</span><span class="add-text">폴더 추가</span>';
    addCard.addEventListener('click', () => openModal('add', 'folder'));
    grid.appendChild(addCard);
  }
  
  const totalPages = Math.ceil(data.folders.length / foldersPerPage);
  const needsPagination = data.folders.length > foldersPerPage;
  
  prevBtn.classList.toggle('hidden', !needsPagination);
  nextBtn.classList.toggle('hidden', !needsPagination);
  pageIndicator.classList.toggle('hidden', !needsPagination);
  
  if (needsPagination) {
    prevBtn.disabled = currentFolderPage === 0;
    nextBtn.disabled = currentFolderPage >= totalPages - 1;
    pageIndicator.textContent = `${currentFolderPage + 1} / ${totalPages}`;
  }
}

function createFolderElement(folder) {
  const card = document.createElement('div');
  card.className = 'folder-card';
  card.dataset.id = folder.id;
  
  // 폴더 색상 적용 (v1.1.0)
  if (folder.color) {
    card.style.setProperty('--folder-color', folder.color);
  }
  
  const header = document.createElement('div');
  header.className = 'folder-header';
  header.setAttribute('draggable', 'true');
  
  // 폴더 색상이 있으면 헤더 배경에 적용
  if (folder.color) {
    header.style.backgroundColor = folder.color;
    header.style.borderBottom = `1px solid ${folder.color}`;
  }
  
  header.innerHTML = `
    ${folder.emoji ? `<span class="folder-emoji">${folder.emoji}</span>` : ''}
    <span class="folder-name">${escapeHtml(folder.name)}</span>
    <div class="folder-actions">
      <button class="folder-action-btn edit-btn" title="수정">✏️</button>
      <button class="folder-action-btn delete-btn" title="삭제">🗑️</button>
    </div>
  `;
  
  header.querySelector('.edit-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openModal('edit', 'folder', folder);
  });
  
  header.querySelector('.delete-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    confirmDelete('folder', folder);
  });
  
  card.appendChild(header);
  
  const sitesContainer = document.createElement('div');
  sitesContainer.className = 'folder-sites';
  
  folder.sites.forEach((site, index) => {
    const siteItem = createSiteElement(site, folder.id);
    siteItem.dataset.index = index;
    sitesContainer.appendChild(siteItem);
  });
  
  const addSiteBtn = document.createElement('div');
  addSiteBtn.className = 'site-add';
  addSiteBtn.innerHTML = '<span>+ 사이트 추가</span>';
  addSiteBtn.addEventListener('click', () => {
    currentFolderId = folder.id;
    openModal('add', 'site');
  });
  sitesContainer.appendChild(addSiteBtn);
  
  card.appendChild(sitesContainer);
  return card;
}

function createSiteElement(site, folderId) {
  const item = document.createElement('div');
  item.className = 'site-item';
  item.dataset.id = site.id;
  item.setAttribute('draggable', 'true');
  
  const faviconUrl = getFaviconUrl(site.url);
  item.innerHTML = `
    <img class="favicon" src="${faviconUrl}" alt="" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🔗</text></svg>'">
    <span class="site-name">${escapeHtml(site.name)}</span>
    <span class="site-url">${getDomain(site.url)}</span>
    <div class="site-actions">
      <button class="site-action-btn edit-btn" title="수정">✏️</button>
      <button class="site-action-btn delete-btn" title="삭제">🗑️</button>
    </div>
  `;
  
  item.addEventListener('click', (e) => {
    if (e.target.closest('.site-actions')) return;
    handleItemClick(e, site.url);
  });
  
  item.querySelector('.edit-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    currentFolderId = folderId;
    openModal('edit', 'site', site);
  });
  
  item.querySelector('.delete-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    currentFolderId = folderId;
    confirmDelete('site', site);
  });
  
  return item;
}

function renderSearchResults(results) {
  const container = document.getElementById('searchResults');
  if (results.length === 0) {
    container.classList.add('hidden');
    return;
  }
  
  container.classList.remove('hidden');
  container.innerHTML = '';
  
  results.forEach((result, index) => {
    const item = document.createElement('div');
    item.className = 'search-result-item' + (index === selectedSearchIndex ? ' selected' : '');
    const faviconUrl = getFaviconUrl(result.item.url);
    item.innerHTML = `
      <img class="favicon" src="${faviconUrl}" alt="">
      <div class="info">
        <div class="name">${escapeHtml(result.item.name)}</div>
        <div class="url">${escapeHtml(result.item.url)}</div>
      </div>
      <span style="font-size: 11px; color: var(--text-muted);">${result.folderName}</span>
    `;
    item.addEventListener('click', () => window.location.href = result.item.url);
    item.addEventListener('mouseenter', () => { selectedSearchIndex = index; updateSearchSelection(); });
    container.appendChild(item);
  });
}

function updateSearchSelection() {
  document.querySelectorAll('.search-result-item').forEach((item, index) => {
    item.classList.toggle('selected', index === selectedSearchIndex);
  });
}

// ============================================
// 4. 이벤트 핸들러
// ============================================

function setupEventListeners() {
  const searchInput = document.getElementById('searchInput');
  
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (query) {
      searchResults = searchItems(appData, query);
      selectedSearchIndex = searchResults.length > 0 ? 0 : -1;
      renderSearchResults(searchResults);
    } else {
      searchResults = [];
      selectedSearchIndex = -1;
      document.getElementById('searchResults').classList.add('hidden');
    }
  });
  
  searchInput.addEventListener('keydown', (e) => {
    if (searchResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedSearchIndex = Math.min(selectedSearchIndex + 1, searchResults.length - 1);
      updateSearchSelection();
      scrollSearchResultIntoView();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedSearchIndex = Math.max(selectedSearchIndex - 1, 0);
      updateSearchSelection();
      scrollSearchResultIntoView();
    } else if (e.key === 'Enter' && selectedSearchIndex >= 0) {
      e.preventDefault();
      window.location.href = searchResults[selectedSearchIndex].item.url;
    } else if (e.key === 'Escape') {
      searchInput.value = '';
      searchResults = [];
      document.getElementById('searchResults').classList.add('hidden');
      searchInput.blur();
    }
  });
  
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      document.getElementById('searchResults').classList.add('hidden');
    }
  });
  
  document.getElementById('favPrevBtn').addEventListener('click', () => {
    if (currentFavoritePage > 0) { currentFavoritePage--; renderFavorites(appData); }
  });
  
  document.getElementById('favNextBtn').addEventListener('click', () => {
    const totalPages = Math.ceil(appData.favorites.length / FAVORITES_PER_PAGE);
    if (currentFavoritePage < totalPages - 1) { currentFavoritePage++; renderFavorites(appData); }
  });
  
  document.getElementById('folderPrevBtn').addEventListener('click', () => {
    if (currentFolderPage > 0) { currentFolderPage--; renderFolders(appData); }
  });
  
  document.getElementById('folderNextBtn').addEventListener('click', () => {
    const foldersPerPage = appData.settings.folderRows === 1 ? 4 : FOLDERS_PER_PAGE;
    const totalPages = Math.ceil(appData.folders.length / foldersPerPage);
    if (currentFolderPage < totalPages - 1) { currentFolderPage++; renderFolders(appData); }
  });
  
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  document.addEventListener('keydown', handleGlobalKeyboard);
  setupModalEvents();
  setupSettingsEvents();
}

function handleItemClick(e, url) {
  if (e.ctrlKey || e.metaKey) {
    window.open(url, '_blank');
  } else if (e.shiftKey) {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    window.location.href = url;
  }
}

// ============================================
// 5. 모달 관련 함수
// ============================================

function setupModalEvents() {
  const modal = document.getElementById('modal');
  const backdrop = modal.querySelector('.modal-backdrop');
  const form = document.getElementById('modalForm');
  const cancelBtn = document.getElementById('modalCancelBtn');
  const deleteBtn = document.getElementById('modalDeleteBtn');
  
  backdrop.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  
  deleteBtn.addEventListener('click', async () => {
    if (modalType === 'favorite') await deleteFavorite(editingItem.id);
    else if (modalType === 'folder') await deleteFolder(editingItem.id);
    else if (modalType === 'site') await deleteSite(currentFolderId, editingItem.id);
    appData = await loadData();
    renderAll();
    closeModal();
    showToast('삭제되었습니다');
  });
  
  form.addEventListener('submit', async (e) => { e.preventDefault(); await saveModalData(); });
  
  // 폴더 색상 초기화 버튼 (v1.1.0)
  document.getElementById('colorClearBtn')?.addEventListener('click', () => {
    document.getElementById('colorInput').value = '#4f46e5';
    document.getElementById('colorTextInput').value = '';
  });
  
  // 색상 피커 동기화
  document.getElementById('colorInput')?.addEventListener('input', (e) => {
    document.getElementById('colorTextInput').value = e.target.value;
  });
  
  document.getElementById('colorTextInput')?.addEventListener('input', (e) => {
    const val = e.target.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      document.getElementById('colorInput').value = val;
    }
  });
}

function openModal(mode, type, item = null) {
  modalMode = mode;
  modalType = type;
  editingItem = item;
  
  const modal = document.getElementById('modal');
  const title = document.getElementById('modalTitle');
  const emojiField = document.getElementById('emojiField');
  const urlField = document.getElementById('urlField');
  const memoField = document.getElementById('memoField');
  const colorField = document.getElementById('colorField');
  const deleteBtn = document.getElementById('modalDeleteBtn');
  const folderSelectField = document.getElementById('folderSelectField');
  
  title.textContent = mode === 'add' 
    ? (type === 'favorite' ? '즐겨찾기 추가' : type === 'folder' ? '폴더 추가' : '사이트 추가')
    : (type === 'favorite' ? '즐겨찾기 수정' : type === 'folder' ? '폴더 수정' : '사이트 수정');
  
  emojiField.classList.toggle('hidden', type !== 'folder');
  colorField.classList.toggle('hidden', type !== 'folder');
  urlField.classList.toggle('hidden', type === 'folder');
  memoField.classList.toggle('hidden', type === 'folder');
  deleteBtn.classList.toggle('hidden', mode !== 'edit');
  folderSelectField.classList.add('hidden');
  
  document.getElementById('emojiInput').value = item?.emoji || '';
  document.getElementById('nameInput').value = item?.name || '';
  document.getElementById('urlInput').value = item?.url || '';
  document.getElementById('memoInput').value = item?.memo || '';
  document.getElementById('colorTextInput').value = item?.color || '';
  document.getElementById('colorInput').value = item?.color || '#4f46e5';
  document.getElementById('urlInput').required = type !== 'folder';
  
  modal.classList.remove('hidden');
  document.getElementById('nameInput').focus();
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  document.getElementById('modalForm').reset();
  modalMode = null;
  modalType = null;
  editingItem = null;
}

async function saveModalData() {
  const name = document.getElementById('nameInput').value.trim();
  const emoji = document.getElementById('emojiInput').value.trim();
  const url = document.getElementById('urlInput').value.trim();
  const memo = document.getElementById('memoInput').value.trim();
  const color = document.getElementById('colorTextInput').value.trim();
  
  if (!name) { showToast('이름을 입력해주세요'); return; }
  if (modalType !== 'folder' && !url) { showToast('URL을 입력해주세요'); return; }
  
  try {
    if (modalType === 'favorite') {
      if (modalMode === 'add') await addFavorite({ name, url, memo });
      else await updateFavorite(editingItem.id, { name, url, memo });
    } else if (modalType === 'folder') {
      if (modalMode === 'add') await addFolder({ name, emoji, color });
      else await updateFolder(editingItem.id, { name, emoji, color });
    } else if (modalType === 'site') {
      if (modalMode === 'add') await addSite(currentFolderId, { name, url, memo });
      else await updateSite(currentFolderId, editingItem.id, { name, url, memo });
    }
    appData = await loadData();
    renderAll();
    closeModal();
    showToast(modalMode === 'add' ? '추가되었습니다' : '수정되었습니다');
  } catch (error) {
    showToast('저장 중 오류가 발생했습니다');
    console.error(error);
  }
}

function confirmDelete(type, item) {
  const typeNames = { favorite: '즐겨찾기', folder: '폴더', site: '사이트' };
  if (confirm(`"${item.name}" ${typeNames[type]}를 삭제하시겠습니까?`)) {
    modalType = type;
    editingItem = item;
    document.getElementById('modalDeleteBtn').click();
  }
}

// ============================================
// 6. 설정 관련 함수
// ============================================

function setupSettingsEvents() {
  const panel = document.getElementById('settingsPanel');
  const backdrop = panel.querySelector('.settings-backdrop');
  const closeBtn = document.getElementById('settingsCloseBtn');
  
  backdrop.addEventListener('click', closeSettings);
  closeBtn.addEventListener('click', closeSettings);
  
  document.getElementById('themeSelect').addEventListener('change', async (e) => {
    const theme = e.target.value;
    applyTheme(theme);
    appData = await saveSettings({ theme });
    showToast('테마가 변경되었습니다');
  });
  
  // 배경 설정 이벤트 (v1.1.0)
  document.getElementById('bgTypeSelect').addEventListener('change', (e) => {
    updateBgFieldsVisibility(e.target.value);
  });
  
  document.getElementById('bgColorPicker').addEventListener('input', async (e) => {
    document.getElementById('bgColorText').value = e.target.value;
    await applyAndSaveBackground();
  });
  
  document.getElementById('bgColorText').addEventListener('change', async (e) => {
    const val = e.target.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      document.getElementById('bgColorPicker').value = val;
    }
    await applyAndSaveBackground();
  });
  
  document.getElementById('bgGradientInput').addEventListener('change', async () => {
    await applyAndSaveBackground();
  });
  
  document.getElementById('bgImageInput').addEventListener('change', async () => {
    await applyAndSaveBackground();
  });
  
  document.getElementById('bgOpacitySlider').addEventListener('input', async (e) => {
    document.getElementById('opacityValue').textContent = Math.round(e.target.value * 100) + '%';
    await applyAndSaveBackground();
  });
  
  // 그라데이션 프리셋 (v1.1.0)
  document.querySelectorAll('.gradient-preset').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.getElementById('bgGradientInput').value = btn.dataset.gradient;
      await applyAndSaveBackground();
    });
  });
  
  document.getElementById('showFavoritesSelect').addEventListener('change', async (e) => {
    const showFavorites = e.target.value === 'true';
    appData = await saveSettings({ showFavorites });
    updateFavoritesVisibility();
    showToast('설정이 변경되었습니다');
  });
  
  document.getElementById('folderRowsSelect').addEventListener('change', async (e) => {
    const folderRows = parseInt(e.target.value);
    appData = await saveSettings({ folderRows });
    currentFolderPage = 0;
    renderFolders(appData);
    showToast('설정이 변경되었습니다');
  });
  
  document.getElementById('syncBtn').addEventListener('click', async () => {
    await forceSync();
    showToast('동기화 완료');
  });
  
  document.getElementById('exportBtn').addEventListener('click', () => {
    exportData();
    showToast('백업 파일이 다운로드됩니다');
  });
  
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });
  
  document.getElementById('importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        appData = await importData(file);
        applyTheme(appData.settings.theme);
        applyBackground(appData.settings.background);
        renderAll();
        updateSettingsUI();
        showToast('데이터를 불러왔습니다');
      } catch (error) {
        showToast(error.message);
      }
    }
    e.target.value = '';
  });
}

function updateBgFieldsVisibility(type) {
  document.getElementById('bgColorField').classList.toggle('hidden', type !== 'color');
  document.getElementById('bgGradientField').classList.toggle('hidden', type !== 'gradient');
  document.getElementById('bgImageField').classList.toggle('hidden', type !== 'image');
}

async function applyAndSaveBackground() {
  const type = document.getElementById('bgTypeSelect').value;
  const color = document.getElementById('bgColorText').value;
  const gradient = document.getElementById('bgGradientInput').value;
  const imageUrl = document.getElementById('bgImageInput').value;
  const opacity = parseFloat(document.getElementById('bgOpacitySlider').value);
  
  const background = { type, color, gradient, imageUrl, opacity };
  applyBackground(background);
  appData = await saveBackground(background);
}

function openSettings() {
  updateSettingsUI();
  document.getElementById('settingsPanel').classList.remove('hidden');
}

function closeSettings() {
  document.getElementById('settingsPanel').classList.add('hidden');
}

function updateSettingsUI() {
  document.getElementById('themeSelect').value = appData.settings.theme;
  document.getElementById('showFavoritesSelect').value = String(appData.settings.showFavorites);
  document.getElementById('folderRowsSelect').value = String(appData.settings.folderRows);
  
  // 배경 설정 UI (v1.1.0)
  const bg = appData.settings.background || {};
  document.getElementById('bgTypeSelect').value = bg.type || 'color';
  document.getElementById('bgColorText').value = bg.color || '';
  document.getElementById('bgColorPicker').value = bg.color || '#f5f7fa';
  document.getElementById('bgGradientInput').value = bg.gradient || '';
  document.getElementById('bgImageInput').value = bg.imageUrl || '';
  document.getElementById('bgOpacitySlider').value = bg.opacity ?? 1;
  document.getElementById('opacityValue').textContent = Math.round((bg.opacity ?? 1) * 100) + '%';
  updateBgFieldsVisibility(bg.type || 'color');
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function applyBackground(bg) {
  if (!bg) return;
  const layer = document.getElementById('backgroundLayer');
  const root = document.documentElement;
  
  layer.style.background = '';
  layer.style.backgroundImage = '';
  
  if (bg.type === 'color' && bg.color) {
    layer.style.backgroundColor = bg.color;
  } else if (bg.type === 'gradient' && bg.gradient) {
    layer.style.background = bg.gradient;
  } else if (bg.type === 'image' && bg.imageUrl) {
    layer.style.backgroundImage = `url(${bg.imageUrl})`;
    layer.style.backgroundSize = 'cover';
    layer.style.backgroundPosition = 'center';
  }
  
  root.style.setProperty('--card-opacity', bg.opacity ?? 1);
}

function updateFavoritesVisibility() {
  document.getElementById('favoritesSection').classList.toggle('hidden', !appData.settings.showFavorites);
}

// ============================================
// 7. 키보드 네비게이션 (v1.1.0)
// ============================================

function handleGlobalKeyboard(e) {
  // "/" 검색창 이동
  if (e.key === '/' && !isInputFocused()) {
    e.preventDefault();
    clearKeyboardFocus();
    document.getElementById('searchInput').focus();
    return;
  }
  
  // Escape
  if (e.key === 'Escape') {
    if (!document.getElementById('modal').classList.contains('hidden')) {
      closeModal();
    } else if (!document.getElementById('settingsPanel').classList.contains('hidden')) {
      closeSettings();
    } else {
      clearKeyboardFocus();
      document.getElementById('searchInput').blur();
      document.getElementById('searchResults').classList.add('hidden');
    }
    return;
  }
  
  // 방향키 네비게이션 (검색창 외)
  if (!isInputFocused() && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault();
    handleArrowNavigation(e.key);
    return;
  }
  
  // Enter로 선택된 항목 열기
  if (e.key === 'Enter' && keyboardNavActive && !isInputFocused()) {
    e.preventDefault();
    openFocusedItem();
  }
}

function handleArrowNavigation(key) {
  if (!keyboardNavActive) {
    // 첫 네비게이션 시작
    keyboardNavActive = true;
    document.getElementById('keyboardHint').classList.remove('hidden');
    
    if (appData.settings.showFavorites && appData.favorites.length > 0) {
      keyboardArea = 'favorites';
      keyboardFavIndex = 0;
    } else if (appData.folders.length > 0) {
      keyboardArea = 'folders';
      keyboardFolderIndex = 0;
    }
    updateKeyboardFocus();
    return;
  }
  
  // 현재 영역에서 네비게이션
  if (keyboardArea === 'favorites') {
    navigateFavorites(key);
  } else if (keyboardArea === 'folders') {
    navigateFolders(key);
  } else if (keyboardArea === 'sites') {
    navigateSites(key);
  }
}

function navigateFavorites(key) {
  const items = document.querySelectorAll('#favoritesGrid .favorite-item:not(.favorite-add)');
  const count = items.length;
  
  if (key === 'ArrowLeft') {
    keyboardFavIndex = Math.max(0, keyboardFavIndex - 1);
  } else if (key === 'ArrowRight') {
    keyboardFavIndex = Math.min(count - 1, keyboardFavIndex + 1);
  } else if (key === 'ArrowDown') {
    // 폴더 영역으로 이동
    if (appData.folders.length > 0) {
      keyboardArea = 'folders';
      keyboardFolderIndex = 0;
    }
  }
  updateKeyboardFocus();
}

function navigateFolders(key) {
  const foldersPerPage = appData.settings.folderRows === 1 ? 4 : FOLDERS_PER_PAGE;
  const folders = document.querySelectorAll('#foldersGrid .folder-card:not(.folder-add)');
  const count = folders.length;
  const cols = 4;
  
  if (key === 'ArrowLeft') {
    keyboardFolderIndex = Math.max(0, keyboardFolderIndex - 1);
  } else if (key === 'ArrowRight') {
    keyboardFolderIndex = Math.min(count - 1, keyboardFolderIndex + 1);
  } else if (key === 'ArrowUp') {
    if (keyboardFolderIndex >= cols) {
      keyboardFolderIndex -= cols;
    } else if (appData.settings.showFavorites && appData.favorites.length > 0) {
      keyboardArea = 'favorites';
      keyboardFavIndex = Math.min(keyboardFolderIndex, appData.favorites.length - 1);
    }
  } else if (key === 'ArrowDown') {
    if (keyboardFolderIndex + cols < count) {
      keyboardFolderIndex += cols;
    } else {
      // 현재 폴더의 사이트로 이동
      const currentFolder = appData.folders[keyboardFolderIndex];
      if (currentFolder && currentFolder.sites.length > 0) {
        keyboardArea = 'sites';
        keyboardCurrentFolderId = currentFolder.id;
        keyboardSiteIndex = 0;
      }
    }
  }
  updateKeyboardFocus();
}

function navigateSites(key) {
  const folder = appData.folders.find(f => f.id === keyboardCurrentFolderId);
  if (!folder) return;
  const count = folder.sites.length;
  
  if (key === 'ArrowUp') {
    if (keyboardSiteIndex > 0) {
      keyboardSiteIndex--;
    } else {
      keyboardArea = 'folders';
    }
  } else if (key === 'ArrowDown') {
    keyboardSiteIndex = Math.min(count - 1, keyboardSiteIndex + 1);
  } else if (key === 'ArrowLeft' || key === 'ArrowRight') {
    keyboardArea = 'folders';
  }
  updateKeyboardFocus();
}

function updateKeyboardFocus() {
  clearKeyboardFocus();
  
  if (keyboardArea === 'favorites') {
    const items = document.querySelectorAll('#favoritesGrid .favorite-item:not(.favorite-add)');
    if (items[keyboardFavIndex]) {
      items[keyboardFavIndex].classList.add('keyboard-focus');
      items[keyboardFavIndex].scrollIntoView({ block: 'nearest' });
    }
  } else if (keyboardArea === 'folders') {
    const folders = document.querySelectorAll('#foldersGrid .folder-card:not(.folder-add)');
    if (folders[keyboardFolderIndex]) {
      folders[keyboardFolderIndex].classList.add('keyboard-focus');
      folders[keyboardFolderIndex].scrollIntoView({ block: 'nearest' });
    }
  } else if (keyboardArea === 'sites') {
    const folderCard = document.querySelector(`.folder-card[data-id="${keyboardCurrentFolderId}"]`);
    if (folderCard) {
      const sites = folderCard.querySelectorAll('.site-item');
      if (sites[keyboardSiteIndex]) {
        sites[keyboardSiteIndex].classList.add('keyboard-focus');
        sites[keyboardSiteIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }
}

function clearKeyboardFocus() {
  document.querySelectorAll('.keyboard-focus').forEach(el => el.classList.remove('keyboard-focus'));
  keyboardNavActive = false;
  document.getElementById('keyboardHint')?.classList.add('hidden');
}

function openFocusedItem() {
  if (keyboardArea === 'favorites') {
    const fav = appData.favorites[keyboardFavIndex];
    if (fav) window.location.href = fav.url;
  } else if (keyboardArea === 'folders') {
    // 폴더 선택 시 첫 번째 사이트로 포커스 이동
    const folder = appData.folders[keyboardFolderIndex];
    if (folder && folder.sites.length > 0) {
      keyboardArea = 'sites';
      keyboardCurrentFolderId = folder.id;
      keyboardSiteIndex = 0;
      updateKeyboardFocus();
    }
  } else if (keyboardArea === 'sites') {
    const folder = appData.folders.find(f => f.id === keyboardCurrentFolderId);
    if (folder && folder.sites[keyboardSiteIndex]) {
      window.location.href = folder.sites[keyboardSiteIndex].url;
    }
  }
}

function isInputFocused() {
  const el = document.activeElement;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT';
}

function scrollSearchResultIntoView() {
  document.querySelector('.search-result-item.selected')?.scrollIntoView({ block: 'nearest' });
}

// ============================================
// 8. 유틸리티 함수
// ============================================

function getFaviconUrl(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🔗</text></svg>';
  }
}

function getDomain(url) {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return url; }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, duration = 2000) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), duration);
}

function setupLongPress(element, callback, duration = 500) {
  let timer = null;
  let isLongPress = false;
  
  element.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isLongPress = false;
    timer = setTimeout(() => { isLongPress = true; callback(); }, duration);
  });
  
  element.addEventListener('mouseup', () => clearTimeout(timer));
  element.addEventListener('mouseleave', () => clearTimeout(timer));
  element.addEventListener('click', (e) => {
    if (isLongPress) { e.preventDefault(); e.stopPropagation(); }
  }, true);
}
