/* ============================================
   newtab.js - Marklog 메인 스크립트
   ============================================
   
   이 파일은 모든 기능을 연결하고 화면을 렌더링합니다.
   
   [주요 섹션]
   1. 전역 변수 및 상태
   2. 초기화 함수
   3. 렌더링 함수 (화면 그리기)
   4. 이벤트 핸들러
   5. 모달 관련 함수
   6. 설정 관련 함수
   7. 키보드 네비게이션
   8. 유틸리티 함수
*/

// ============================================
// 1. 전역 변수 및 상태
// ============================================

// 현재 앱 데이터
let appData = null;

// 페이지네이션 상태
let currentFavoritePage = 0;   // 현재 즐겨찾기 페이지 (0부터 시작)
let currentFolderPage = 0;     // 현재 폴더 페이지 (0부터 시작)
const FAVORITES_PER_PAGE = 8;  // 페이지당 즐겨찾기 수
const FOLDERS_PER_PAGE = 8;    // 페이지당 폴더 수 (4열 x 2행)

// 검색 상태
let searchResults = [];        // 검색 결과
let selectedSearchIndex = -1;  // 선택된 검색 결과 인덱스

// 모달 상태
let modalMode = null;          // 'add' 또는 'edit'
let modalType = null;          // 'favorite', 'folder', 'site'
let editingItem = null;        // 수정 중인 항목
let currentFolderId = null;    // 현재 작업 중인 폴더 ID

// ============================================
// 2. 초기화 함수
// ============================================

// 앱 시작점
document.addEventListener('DOMContentLoaded', async () => {
  // 데이터 로드
  appData = await loadData();
  
  // 테마 적용
  applyTheme(appData.settings.theme);
  
  // 화면 렌더링
  renderAll();
  
  // 이벤트 리스너 설정
  setupEventListeners();
  
  // 드래그앤드롭 초기화
  initDragDrop();
  
  console.log('Marklog 초기화 완료');
});

// 전체 화면 렌더링
function renderAll() {
  renderFavorites(appData);
  renderFolders(appData);
  updateFavoritesVisibility();
}

// ============================================
// 3. 렌더링 함수 (화면 그리기)
// ============================================

// ===== 즐겨찾기 렌더링 =====
function renderFavorites(data) {
  const grid = document.getElementById('favoritesGrid');
  const prevBtn = document.getElementById('favPrevBtn');
  const nextBtn = document.getElementById('favNextBtn');
  const pageIndicator = document.getElementById('favPageIndicator');
  
  if (!grid) return;
  
  grid.innerHTML = '';
  
  // 현재 페이지에 해당하는 즐겨찾기만 가져오기
  const startIndex = currentFavoritePage * FAVORITES_PER_PAGE;
  const endIndex = startIndex + FAVORITES_PER_PAGE;
  const pageItems = data.favorites.slice(startIndex, endIndex);
  
  // 즐겨찾기 아이템 렌더링
  pageItems.forEach((favorite, index) => {
    const item = createFavoriteElement(favorite);
    item.dataset.index = startIndex + index;
    grid.appendChild(item);
  });
  
  // 추가 버튼 (현재 페이지에 8개 미만일 때만)
  if (pageItems.length < FAVORITES_PER_PAGE) {
    const addBtn = document.createElement('div');
    addBtn.className = 'favorite-item favorite-add';
    addBtn.innerHTML = `
      <div class="favicon-container">
        <span class="add-icon">+</span>
      </div>
      <span class="name">추가</span>
    `;
    addBtn.addEventListener('click', () => openModal('add', 'favorite'));
    grid.appendChild(addBtn);
  }
  
  // 페이지네이션 버튼 표시/숨기기
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

// 즐겨찾기 요소 생성
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
  
  // 클릭 이벤트
  item.addEventListener('click', (e) => handleItemClick(e, favorite.url));
  
  // 길게 누르기 (수정/삭제)
  setupLongPress(item, () => openModal('edit', 'favorite', favorite));
  
  return item;
}

// ===== 폴더 렌더링 =====
function renderFolders(data) {
  const grid = document.getElementById('foldersGrid');
  const prevBtn = document.getElementById('folderPrevBtn');
  const nextBtn = document.getElementById('folderNextBtn');
  const pageIndicator = document.getElementById('folderPageIndicator');
  
  if (!grid) return;
  
  grid.innerHTML = '';
  
  // 폴더 줄 수에 따른 페이지당 개수 조정
  const foldersPerPage = data.settings.folderRows === 1 ? 4 : FOLDERS_PER_PAGE;
  
  // 그리드 클래스 업데이트
  grid.classList.toggle('single-row', data.settings.folderRows === 1);
  
  // 현재 페이지에 해당하는 폴더만 가져오기
  const startIndex = currentFolderPage * foldersPerPage;
  const endIndex = startIndex + foldersPerPage;
  const pageFolders = data.folders.slice(startIndex, endIndex);
  
  // 폴더 카드 렌더링
  pageFolders.forEach((folder, index) => {
    const card = createFolderElement(folder);
    card.dataset.index = startIndex + index;
    grid.appendChild(card);
  });
  
  // 폴더 추가 버튼
  if (pageFolders.length < foldersPerPage) {
    const addCard = document.createElement('div');
    addCard.className = 'folder-card folder-add';
    addCard.innerHTML = `
      <span class="add-icon">+</span>
      <span class="add-text">폴더 추가</span>
    `;
    addCard.addEventListener('click', () => openModal('add', 'folder'));
    grid.appendChild(addCard);
  }
  
  // 페이지네이션 버튼 표시/숨기기
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

// 폴더 요소 생성
function createFolderElement(folder) {
  const card = document.createElement('div');
  card.className = 'folder-card';
  card.dataset.id = folder.id;
  
  // 폴더 헤더
  const header = document.createElement('div');
  header.className = 'folder-header';
  header.innerHTML = `
    ${folder.emoji ? `<span class="folder-emoji">${folder.emoji}</span>` : ''}
    <span class="folder-name">${escapeHtml(folder.name)}</span>
    <div class="folder-actions">
      <button class="folder-action-btn edit-btn" title="수정">✏️</button>
      <button class="folder-action-btn delete-btn" title="삭제">🗑️</button>
    </div>
  `;
  
  // 폴더 헤더 이벤트
  header.querySelector('.edit-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openModal('edit', 'folder', folder);
  });
  
  header.querySelector('.delete-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    confirmDelete('folder', folder);
  });
  
  card.appendChild(header);
  
  // 사이트 목록
  const sitesContainer = document.createElement('div');
  sitesContainer.className = 'folder-sites';
  
  folder.sites.forEach((site, index) => {
    const siteItem = createSiteElement(site, folder.id);
    siteItem.dataset.index = index;
    sitesContainer.appendChild(siteItem);
  });
  
  // 사이트 추가 버튼
  const addSiteBtn = document.createElement('div');
  addSiteBtn.className = 'site-add';
  addSiteBtn.innerHTML = `<span>+ 사이트 추가</span>`;
  addSiteBtn.addEventListener('click', () => {
    currentFolderId = folder.id;
    openModal('add', 'site');
  });
  sitesContainer.appendChild(addSiteBtn);
  
  card.appendChild(sitesContainer);
  
  return card;
}

// 사이트 요소 생성
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
  
  // 클릭 이벤트
  item.addEventListener('click', (e) => {
    if (e.target.closest('.site-actions')) return;
    handleItemClick(e, site.url);
  });
  
  // 수정/삭제 버튼 이벤트
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

// ===== 검색 결과 렌더링 =====
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
    item.className = 'search-result-item';
    if (index === selectedSearchIndex) {
      item.classList.add('selected');
    }
    
    const faviconUrl = getFaviconUrl(result.item.url);
    
    item.innerHTML = `
      <img class="favicon" src="${faviconUrl}" alt="">
      <div class="info">
        <div class="name">${escapeHtml(result.item.name)}</div>
        <div class="url">${escapeHtml(result.item.url)}</div>
      </div>
      <span style="font-size: 11px; color: var(--text-muted);">${result.folderName}</span>
    `;
    
    item.addEventListener('click', () => {
      window.location.href = result.item.url;
    });
    
    item.addEventListener('mouseenter', () => {
      selectedSearchIndex = index;
      updateSearchSelection();
    });
    
    container.appendChild(item);
  });
}

// 검색 결과 선택 상태 업데이트
function updateSearchSelection() {
  const items = document.querySelectorAll('.search-result-item');
  items.forEach((item, index) => {
    item.classList.toggle('selected', index === selectedSearchIndex);
  });
}

// ============================================
// 4. 이벤트 핸들러
// ============================================

function setupEventListeners() {
  // ===== 검색 =====
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
  
  // 검색창 외부 클릭 시 결과 닫기
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      document.getElementById('searchResults').classList.add('hidden');
    }
  });
  
  // ===== 즐겨찾기 페이지네이션 =====
  document.getElementById('favPrevBtn').addEventListener('click', () => {
    if (currentFavoritePage > 0) {
      currentFavoritePage--;
      renderFavorites(appData);
    }
  });
  
  document.getElementById('favNextBtn').addEventListener('click', () => {
    const totalPages = Math.ceil(appData.favorites.length / FAVORITES_PER_PAGE);
    if (currentFavoritePage < totalPages - 1) {
      currentFavoritePage++;
      renderFavorites(appData);
    }
  });
  
  // ===== 폴더 페이지네이션 =====
  document.getElementById('folderPrevBtn').addEventListener('click', () => {
    if (currentFolderPage > 0) {
      currentFolderPage--;
      renderFolders(appData);
    }
  });
  
  document.getElementById('folderNextBtn').addEventListener('click', () => {
    const foldersPerPage = appData.settings.folderRows === 1 ? 4 : FOLDERS_PER_PAGE;
    const totalPages = Math.ceil(appData.folders.length / foldersPerPage);
    if (currentFolderPage < totalPages - 1) {
      currentFolderPage++;
      renderFolders(appData);
    }
  });
  
  // ===== 설정 버튼 =====
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  
  // ===== 키보드 단축키 =====
  document.addEventListener('keydown', handleGlobalKeyboard);
  
  // ===== 모달 이벤트 =====
  setupModalEvents();
  
  // ===== 설정 패널 이벤트 =====
  setupSettingsEvents();
}

// 아이템 클릭 처리 (일반/Ctrl/Shift)
function handleItemClick(e, url) {
  if (e.ctrlKey || e.metaKey) {
    // Ctrl+클릭: 새 탭에서 열기
    window.open(url, '_blank');
  } else if (e.shiftKey) {
    // Shift+클릭: 새 창에서 열기
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    // 일반 클릭: 현재 탭에서 열기
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
  
  // 배경 클릭으로 닫기
  backdrop.addEventListener('click', closeModal);
  
  // 취소 버튼
  cancelBtn.addEventListener('click', closeModal);
  
  // 삭제 버튼
  deleteBtn.addEventListener('click', async () => {
    if (modalType === 'favorite') {
      await deleteFavorite(editingItem.id);
    } else if (modalType === 'folder') {
      await deleteFolder(editingItem.id);
    } else if (modalType === 'site') {
      await deleteSite(currentFolderId, editingItem.id);
    }
    
    appData = await loadData();
    renderAll();
    closeModal();
    showToast('삭제되었습니다');
  });
  
  // 폼 제출
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveModalData();
  });
}

// 모달 열기
function openModal(mode, type, item = null) {
  modalMode = mode;
  modalType = type;
  editingItem = item;
  
  const modal = document.getElementById('modal');
  const title = document.getElementById('modalTitle');
  const emojiField = document.getElementById('emojiField');
  const urlField = document.getElementById('urlField');
  const memoField = document.getElementById('memoField');
  const deleteBtn = document.getElementById('modalDeleteBtn');
  const folderSelectField = document.getElementById('folderSelectField');
  
  // 모달 제목 설정
  if (mode === 'add') {
    title.textContent = type === 'favorite' ? '즐겨찾기 추가' : 
                        type === 'folder' ? '폴더 추가' : '사이트 추가';
  } else {
    title.textContent = type === 'favorite' ? '즐겨찾기 수정' : 
                        type === 'folder' ? '폴더 수정' : '사이트 수정';
  }
  
  // 필드 표시/숨기기
  emojiField.classList.toggle('hidden', type !== 'folder');
  urlField.classList.toggle('hidden', type === 'folder');
  memoField.classList.toggle('hidden', type === 'folder');
  deleteBtn.classList.toggle('hidden', mode !== 'edit');
  folderSelectField.classList.add('hidden'); // 폴더 선택은 일단 숨김
  
  // 폼 초기화
  document.getElementById('emojiInput').value = item?.emoji || '';
  document.getElementById('nameInput').value = item?.name || '';
  document.getElementById('urlInput').value = item?.url || '';
  document.getElementById('memoInput').value = item?.memo || '';
  
  // URL 필드 필수 여부
  document.getElementById('urlInput').required = type !== 'folder';
  
  modal.classList.remove('hidden');
  document.getElementById('nameInput').focus();
}

// 모달 닫기
function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  document.getElementById('modalForm').reset();
  modalMode = null;
  modalType = null;
  editingItem = null;
}

// 모달 데이터 저장
async function saveModalData() {
  const name = document.getElementById('nameInput').value.trim();
  const emoji = document.getElementById('emojiInput').value.trim();
  const url = document.getElementById('urlInput').value.trim();
  const memo = document.getElementById('memoInput').value.trim();
  
  if (!name) {
    showToast('이름을 입력해주세요');
    return;
  }
  
  if (modalType !== 'folder' && !url) {
    showToast('URL을 입력해주세요');
    return;
  }
  
  try {
    if (modalType === 'favorite') {
      if (modalMode === 'add') {
        await addFavorite({ name, url, memo });
      } else {
        await updateFavorite(editingItem.id, { name, url, memo });
      }
    } else if (modalType === 'folder') {
      if (modalMode === 'add') {
        await addFolder({ name, emoji });
      } else {
        await updateFolder(editingItem.id, { name, emoji });
      }
    } else if (modalType === 'site') {
      if (modalMode === 'add') {
        await addSite(currentFolderId, { name, url, memo });
      } else {
        await updateSite(currentFolderId, editingItem.id, { name, url, memo });
      }
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

// 삭제 확인
function confirmDelete(type, item) {
  const typeNames = { favorite: '즐겨찾기', folder: '폴더', site: '사이트' };
  const confirmed = confirm(`"${item.name}" ${typeNames[type]}를 삭제하시겠습니까?`);
  
  if (confirmed) {
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
  const themeSelect = document.getElementById('themeSelect');
  const showFavoritesSelect = document.getElementById('showFavoritesSelect');
  const folderRowsSelect = document.getElementById('folderRowsSelect');
  const syncBtn = document.getElementById('syncBtn');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');
  
  // 배경 클릭으로 닫기
  backdrop.addEventListener('click', closeSettings);
  closeBtn.addEventListener('click', closeSettings);
  
  // 테마 변경
  themeSelect.addEventListener('change', async (e) => {
    const theme = e.target.value;
    applyTheme(theme);
    appData = await saveSettings({ theme });
    showToast('테마가 변경되었습니다');
  });
  
  // 즐겨찾기 표시 여부
  showFavoritesSelect.addEventListener('change', async (e) => {
    const showFavorites = e.target.value === 'true';
    appData = await saveSettings({ showFavorites });
    updateFavoritesVisibility();
    showToast('설정이 변경되었습니다');
  });
  
  // 폴더 줄 수
  folderRowsSelect.addEventListener('change', async (e) => {
    const folderRows = parseInt(e.target.value);
    appData = await saveSettings({ folderRows });
    currentFolderPage = 0; // 페이지 초기화
    renderFolders(appData);
    showToast('설정이 변경되었습니다');
  });
  
  // 강제 동기화
  syncBtn.addEventListener('click', async () => {
    await forceSync();
    showToast('동기화 완료');
  });
  
  // 내보내기
  exportBtn.addEventListener('click', () => {
    exportData();
    showToast('백업 파일이 다운로드됩니다');
  });
  
  // 가져오기
  importBtn.addEventListener('click', () => {
    importFile.click();
  });
  
  importFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        appData = await importData(file);
        applyTheme(appData.settings.theme);
        renderAll();
        updateSettingsUI();
        showToast('데이터를 불러왔습니다');
      } catch (error) {
        showToast(error.message);
      }
    }
    importFile.value = '';
  });
}

// 설정 패널 열기
function openSettings() {
  updateSettingsUI();
  document.getElementById('settingsPanel').classList.remove('hidden');
}

// 설정 패널 닫기
function closeSettings() {
  document.getElementById('settingsPanel').classList.add('hidden');
}

// 설정 UI 업데이트
function updateSettingsUI() {
  document.getElementById('themeSelect').value = appData.settings.theme;
  document.getElementById('showFavoritesSelect').value = String(appData.settings.showFavorites);
  document.getElementById('folderRowsSelect').value = String(appData.settings.folderRows);
}

// 테마 적용
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

// 즐겨찾기 영역 표시/숨기기
function updateFavoritesVisibility() {
  const section = document.getElementById('favoritesSection');
  section.classList.toggle('hidden', !appData.settings.showFavorites);
}

// ============================================
// 7. 키보드 네비게이션
// ============================================

function handleGlobalKeyboard(e) {
  // "/" 키로 검색창 이동
  if (e.key === '/' && !isInputFocused()) {
    e.preventDefault();
    document.getElementById('searchInput').focus();
    return;
  }
  
  // Escape로 검색창 및 모달 닫기
  if (e.key === 'Escape') {
    if (!document.getElementById('modal').classList.contains('hidden')) {
      closeModal();
    } else if (!document.getElementById('settingsPanel').classList.contains('hidden')) {
      closeSettings();
    } else {
      document.getElementById('searchInput').blur();
      document.getElementById('searchResults').classList.add('hidden');
    }
  }
}

// 입력 필드에 포커스 중인지 확인
function isInputFocused() {
  const activeElement = document.activeElement;
  return activeElement.tagName === 'INPUT' || 
         activeElement.tagName === 'TEXTAREA' ||
         activeElement.tagName === 'SELECT';
}

// 검색 결과 스크롤
function scrollSearchResultIntoView() {
  const selected = document.querySelector('.search-result-item.selected');
  if (selected) {
    selected.scrollIntoView({ block: 'nearest' });
  }
}

// ============================================
// 8. 유틸리티 함수
// ============================================

// 파비콘 URL 생성
function getFaviconUrl(url) {
  try {
    const domain = new URL(url).hostname;
    // Google Favicon API 사용
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🔗</text></svg>';
  }
}

// 도메인 추출
function getDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

// HTML 이스케이프 (XSS 방지)
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 토스트 메시지 표시
function showToast(message, duration = 2000) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  
  setTimeout(() => {
    toast.classList.add('hidden');
  }, duration);
}

// 길게 누르기 이벤트 설정
function setupLongPress(element, callback, duration = 500) {
  let timer = null;
  let isLongPress = false;
  
  element.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // 왼쪽 클릭만
    
    isLongPress = false;
    timer = setTimeout(() => {
      isLongPress = true;
      callback();
    }, duration);
  });
  
  element.addEventListener('mouseup', () => {
    clearTimeout(timer);
  });
  
  element.addEventListener('mouseleave', () => {
    clearTimeout(timer);
  });
  
  // 일반 클릭과 길게 누르기 구분
  element.addEventListener('click', (e) => {
    if (isLongPress) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
}
