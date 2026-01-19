/* ============================================
   dragdrop.js - 드래그앤드롭 기능 담당
   ============================================
   
   이 파일은 마우스로 항목을 끌어서 이동하는 기능을 담당합니다.
   
   [기능]
   - 즐겨찾기 순서 변경
   - 사이트 순서 변경
   - 폴더 간 사이트 이동
   - 폴더 순서 변경 (v1.1.0 추가)
   
   [주요 함수]
   - initDragDrop(): 드래그앤드롭 초기화
   - initFavoritesDragDrop(): 즐겨찾기 드래그앤드롭
   - initSitesDragDrop(): 사이트 드래그앤드롭
   - initFoldersDragDrop(): 폴더 드래그앤드롭 (v1.1.0)
*/

// ===== 드래그 상태 저장 =====
let draggedElement = null;
let draggedData = null;

// ===== 드래그앤드롭 초기화 =====
// 각 영역에 드래그 이벤트를 설정합니다
function initDragDrop() {
  // 즐겨찾기 영역
  initFavoritesDragDrop();
  
  // 폴더 내 사이트 영역
  initSitesDragDrop();
  
  // 폴더 순서 변경 (v1.1.0)
  initFoldersDragDrop();
}

// ===== 즐겨찾기 드래그앤드롭 =====
function initFavoritesDragDrop() {
  const favoritesGrid = document.getElementById('favoritesGrid');
  if (!favoritesGrid) return;
  
  // 드래그 시작
  favoritesGrid.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.favorite-item:not(.favorite-add)');
    if (!item) return;
    
    draggedElement = item;
    draggedData = {
      type: 'favorite',
      id: item.dataset.id,
      index: getElementIndex(item)
    };
    
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ''); // Firefox 호환
  });
  
  // 드래그 중
  favoritesGrid.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!draggedData || draggedData.type !== 'favorite') return;
    
    const afterElement = getDragAfterElement(favoritesGrid, e.clientX, true);
    const draggable = document.querySelector('.favorite-item.dragging');
    if (!draggable) return;
    
    if (afterElement == null) {
      // 추가 버튼 앞에 삽입
      const addBtn = favoritesGrid.querySelector('.favorite-add');
      if (addBtn) {
        favoritesGrid.insertBefore(draggable, addBtn);
      } else {
        favoritesGrid.appendChild(draggable);
      }
    } else {
      favoritesGrid.insertBefore(draggable, afterElement);
    }
  });
  
  // 드래그 종료
  favoritesGrid.addEventListener('dragend', async (e) => {
    if (!draggedElement || draggedData?.type !== 'favorite') return;
    
    draggedElement.classList.remove('dragging');
    
    // 새 위치 계산 및 저장
    const newIndex = getElementIndex(draggedElement);
    if (draggedData && draggedData.index !== newIndex) {
      await reorderFavorites(draggedData.index, newIndex);
      // 화면 갱신
      if (typeof renderFavorites === 'function' && typeof appData !== 'undefined') {
        appData = await loadData();
        renderFavorites(appData);
      }
    }
    
    draggedElement = null;
    draggedData = null;
  });
}

// ===== 폴더 드래그앤드롭 (v1.1.0) =====
function initFoldersDragDrop() {
  const foldersGrid = document.getElementById('foldersGrid');
  if (!foldersGrid) return;
  
  // 폴더 헤더에서 드래그 시작
  foldersGrid.addEventListener('dragstart', (e) => {
    // 사이트 드래그가 아닌 경우만 처리
    if (e.target.closest('.site-item')) return;
    
    const folderCard = e.target.closest('.folder-card:not(.folder-add)');
    if (!folderCard) return;
    
    // 폴더 헤더에서만 드래그 허용
    const header = e.target.closest('.folder-header');
    if (!header) return;
    
    draggedElement = folderCard;
    draggedData = {
      type: 'folder',
      id: folderCard.dataset.id,
      index: getFolderIndex(folderCard)
    };
    
    folderCard.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
  });
  
  // 폴더 드래그 중
  foldersGrid.addEventListener('dragover', (e) => {
    if (!draggedData || draggedData.type !== 'folder') return;
    
    e.preventDefault();
    
    const afterElement = getFolderAfterElement(foldersGrid, e.clientX, e.clientY);
    const draggable = document.querySelector('.folder-card.dragging');
    if (!draggable) return;
    
    if (afterElement == null) {
      // 추가 버튼 앞에 삽입
      const addBtn = foldersGrid.querySelector('.folder-add');
      if (addBtn) {
        foldersGrid.insertBefore(draggable, addBtn);
      } else {
        foldersGrid.appendChild(draggable);
      }
    } else {
      foldersGrid.insertBefore(draggable, afterElement);
    }
  });
  
  // 폴더 드래그 종료
  foldersGrid.addEventListener('dragend', async (e) => {
    if (!draggedElement || draggedData?.type !== 'folder') return;
    
    draggedElement.classList.remove('dragging');
    
    // 새 위치 계산 및 저장
    const newIndex = getFolderIndex(draggedElement);
    if (draggedData && draggedData.index !== newIndex) {
      await reorderFolders(draggedData.index, newIndex);
      // 화면 갱신
      if (typeof renderFolders === 'function' && typeof appData !== 'undefined') {
        appData = await loadData();
        renderFolders(appData);
      }
      if (typeof showToast === 'function') {
        showToast('폴더 순서가 변경되었습니다');
      }
    }
    
    draggedElement = null;
    draggedData = null;
  });
}

// ===== 폴더 내 사이트 드래그앤드롭 =====
function initSitesDragDrop() {
  // 모든 폴더 영역에 이벤트 위임
  document.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.site-item:not(.site-add)');
    if (!item) return;
    
    const folderCard = item.closest('.folder-card');
    if (!folderCard) return;
    
    draggedElement = item;
    draggedData = {
      type: 'site',
      id: item.dataset.id,
      folderId: folderCard.dataset.id,
      index: getElementIndex(item, '.site-item:not(.site-add)')
    };
    
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
  });
  
  // 폴더 위로 드래그 시 (다른 폴더로 이동)
  document.addEventListener('dragover', (e) => {
    if (!draggedData || draggedData.type !== 'site') return;
    
    const folderSites = e.target.closest('.folder-sites');
    if (!folderSites) return;
    
    e.preventDefault();
    
    const afterElement = getDragAfterElement(folderSites, e.clientY, false);
    const draggable = document.querySelector('.site-item.dragging');
    if (!draggable) return;
    
    if (afterElement == null) {
      // 추가 버튼 앞에 삽입
      const addBtn = folderSites.querySelector('.site-add');
      if (addBtn) {
        folderSites.insertBefore(draggable, addBtn);
      } else {
        folderSites.appendChild(draggable);
      }
    } else {
      folderSites.insertBefore(draggable, afterElement);
    }
  });
  
  // 드롭 영역 표시
  document.addEventListener('dragenter', (e) => {
    if (!draggedData || draggedData.type !== 'site') return;
    
    const folderSites = e.target.closest('.folder-sites');
    if (folderSites) {
      folderSites.classList.add('drag-over');
    }
  });
  
  document.addEventListener('dragleave', (e) => {
    const folderSites = e.target.closest('.folder-sites');
    if (folderSites && !folderSites.contains(e.relatedTarget)) {
      folderSites.classList.remove('drag-over');
    }
  });
  
  // 사이트 드래그 종료
  document.addEventListener('dragend', async (e) => {
    // 드롭 영역 표시 제거
    document.querySelectorAll('.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });
    
    if (!draggedElement || draggedData?.type !== 'site') return;
    
    draggedElement.classList.remove('dragging');
    
    // 새 위치 계산
    const newFolderCard = draggedElement.closest('.folder-card');
    if (!newFolderCard) {
      draggedElement = null;
      draggedData = null;
      return;
    }
    
    const newFolderId = newFolderCard.dataset.id;
    const newIndex = getElementIndex(draggedElement, '.site-item:not(.site-add)');
    
    // 저장 처리
    if (draggedData.folderId !== newFolderId) {
      // 다른 폴더로 이동
      await moveSite(draggedData.folderId, newFolderId, draggedData.id, newIndex);
    } else if (draggedData.index !== newIndex) {
      // 같은 폴더 내 순서 변경
      await reorderSites(draggedData.folderId, draggedData.index, newIndex);
    }
    
    // 화면 갱신
    if (typeof renderFolders === 'function' && typeof appData !== 'undefined') {
      appData = await loadData();
      renderFolders(appData);
    }
    
    draggedElement = null;
    draggedData = null;
  });
}

// ===== 유틸리티 함수들 =====

// 요소의 인덱스 구하기
function getElementIndex(element, selector = null) {
  const parent = element.parentElement;
  let siblings;
  
  if (selector) {
    siblings = Array.from(parent.querySelectorAll(selector));
  } else {
    siblings = Array.from(parent.children).filter(
      child => !child.classList.contains('favorite-add') && 
               !child.classList.contains('site-add') &&
               !child.classList.contains('folder-add')
    );
  }
  
  return siblings.indexOf(element);
}

// 폴더의 인덱스 구하기
function getFolderIndex(folderCard) {
  const grid = folderCard.parentElement;
  const folders = Array.from(grid.querySelectorAll('.folder-card:not(.folder-add)'));
  return folders.indexOf(folderCard);
}

// 드래그 위치에 따라 삽입될 요소 찾기 (1차원)
function getDragAfterElement(container, position, horizontal = true) {
  const draggableElements = [
    ...container.querySelectorAll(
      horizontal 
        ? '.favorite-item:not(.dragging):not(.favorite-add)'
        : '.site-item:not(.dragging):not(.site-add)'
    )
  ];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = horizontal 
      ? position - box.left - box.width / 2
      : position - box.top - box.height / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// 폴더 그리드에서 삽입될 위치 찾기 (2차원 그리드)
function getFolderAfterElement(container, x, y) {
  const draggableElements = [
    ...container.querySelectorAll('.folder-card:not(.dragging):not(.folder-add)')
  ];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const centerX = box.left + box.width / 2;
    const centerY = box.top + box.height / 2;
    
    // 2차원 거리 계산
    const offsetX = x - centerX;
    const offsetY = y - centerY;
    
    // 같은 행에 있는 경우 X 기준, 다른 행이면 Y 기준
    const sameRow = Math.abs(offsetY) < box.height / 2;
    
    if (sameRow) {
      // 같은 행: 왼쪽에 있으면 이 요소 앞에 삽입
      if (offsetX < 0 && offsetX > closest.offset) {
        return { offset: offsetX, element: child };
      }
    } else if (offsetY < 0) {
      // 위쪽 행: 이 요소 앞에 삽입
      const combinedOffset = offsetY * 1000 + offsetX; // Y 우선
      if (combinedOffset > closest.offset) {
        return { offset: combinedOffset, element: child };
      }
    }
    
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ===== 드래그 가능 속성 설정 =====
// 새로 추가된 요소에 draggable 속성 부여
function makeDraggable(element) {
  element.setAttribute('draggable', 'true');
}
