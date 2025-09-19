// グローバル変数
let currentData = [];
let originalData = [];
let filteredData = [];
let currentDataType = null; // 'job' or 'school'
let currentPage = 1;
let itemsPerPage = 20;
let sortField = '';
let sortOrder = 'asc';
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
let currentFilters = {};

const AUTH_PASSWORD = 'visionwell1001';
let isAuthenticated = false;

// DOM要素
const elements = {
    uploadSection: document.getElementById('uploadSection'),
    dataSection: document.getElementById('dataSection'),
    favoritesSection: document.getElementById('favoritesSection'),
    fileInput: document.getElementById('fileInput'),
    uploadArea: document.getElementById('uploadArea'),
    uploadStatus: document.getElementById('uploadStatus'),
    filterContent: document.getElementById('filterContent'),
    activeFilterTags: document.getElementById('activeFilterTags'),
    searchInput: document.getElementById('searchInput'),
    sortSelect: document.getElementById('sortSelect'),
    sortOrder: document.getElementById('sortOrder'),
    resultCount: document.getElementById('resultCount'),
    cardsContainer: document.getElementById('cardsContainer'),
    pagination: document.getElementById('pagination'),
    detailModal: document.getElementById('detailModal'),
    modalContent: document.getElementById('modalContent'),
    themeToggle: document.getElementById('themeToggle')
};

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    enforceAuthentication();
});

function initializeApp() {
    setupEventListeners();
    loadTheme();
    checkForSampleData();
}

function enforceAuthentication() {
    while (!isAuthenticated) {
        const input = prompt('このアプリを利用するにはパスワードが必要です。パスワードを入力してください。');

        if (input === null) {
            alert('パスワードが入力されるまでアプリを利用できません。');
        } else if (input === AUTH_PASSWORD) {
            isAuthenticated = true;
            document.body.classList.remove('auth-locked');
            initializeApp();
            break;
        } else {
            alert('パスワードが違います。');
        }
    }
}

// イベントリスナー設定
function setupEventListeners() {
    // ファイルアップロード
    elements.fileInput.addEventListener('change', handleFileSelect);
    elements.uploadArea.addEventListener('dragover', handleDragOver);
    elements.uploadArea.addEventListener('drop', handleFileDrop);
    elements.uploadArea.addEventListener('dragenter', handleDragEnter);
    elements.uploadArea.addEventListener('dragleave', handleDragLeave);
    
    // 検索
    elements.searchInput.addEventListener('input', debounce(performSearch, 300));
    
    // テーマトグル
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // モーダルクリックアウトサイド
    elements.detailModal.addEventListener('click', function(e) {
        if (e.target === elements.detailModal) {
            closeModal();
        }
    });
    
    // キーボードショートカット
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// ファイル処理
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processFile(file);
    }
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDragEnter(e) {
    e.preventDefault();
    elements.uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('dragover');
}

function handleFileDrop(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

async function processFile(file) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
        showUploadStatus('CSVファイルを選択してください。', 'error');
        return;
    }
    
    showUploadStatus('ファイルを処理中...', 'info');
    
    try {
        const text = await readFileAsText(file);
        const data = parseCSV(text);
        
        if (data.length === 0) {
            throw new Error('データが見つかりません。');
        }
        
        // データタイプを判定
        const dataType = detectDataType(data[0]);
        
        if (!dataType) {
            throw new Error('サポートされていないCSV形式です。');
        }
        
        originalData = data;
        currentData = data;
        currentDataType = dataType;
        
        showUploadStatus(`${dataType === 'job' ? '就職' : '進学'}データを${data.length}件読み込みました。`, 'success');
        
        // UI更新
        setupDataView();
        showSection('data');
        
    } catch (error) {
        showUploadStatus(`エラー: ${error.message}`, 'error');
    }
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            let text = e.target.result;
            
            // 文字エンコード検出・変換（簡易版）
            if (text.includes('\ufffd') || /[^\x00-\x7F]/.test(text.slice(0, 100))) {
                // Shift_JISの可能性が高い場合の処理
                const reader2 = new FileReader();
                reader2.onload = function(e2) {
                    resolve(e2.target.result);
                };
                reader2.onerror = reject;
                reader2.readAsText(file, 'Shift_JIS');
            } else {
                resolve(text);
            }
        };
        
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8');
    });
}

function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    const headers = lines[0].split(',').map(h => h.trim().replace(/["\s]/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === headers.length) {
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] ? values[index].trim().replace(/^"|"$/g, '') : '';
            });
            data.push(row);
        }
    }
    
    return data;
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"' && inQuotes && nextChar === '"') {
            current += '"';
            i++; // Skip next quote
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current);
    return result;
}

function detectDataType(sampleRow) {
    const headers = Object.keys(sampleRow).map(h => h.toLowerCase());
    
    // 就職データの判定
    const jobKeywords = ['事業所', '職種', '給与', '賃金', '求人', '従業員'];
    const schoolKeywords = ['学校', '学部', '学科', '入試', '受験', '偏差値'];
    
    const jobMatches = jobKeywords.filter(keyword => 
        headers.some(header => header.includes(keyword))
    ).length;
    
    const schoolMatches = schoolKeywords.filter(keyword => 
        headers.some(header => header.includes(keyword))
    ).length;
    
    if (jobMatches > schoolMatches) {
        return 'job';
    } else if (schoolMatches > jobMatches) {
        return 'school';
    }
    
    return null;
}

function showUploadStatus(message, type) {
    elements.uploadStatus.textContent = message;
    elements.uploadStatus.className = `upload-status ${type}`;
}

// データ表示設定
function setupDataView() {
    setupFilters();
    setupSortOptions();
    applyFiltersAndSearch();
}

function setupFilters() {
    const filterConfig = getFilterConfig(currentDataType);
    
    // 優先度でソート
    const sortedFilters = filterConfig.sort((a, b) => a.priority - b.priority);
    
    let filterHTML = '';
    let currentPriority = 0;
    
    sortedFilters.forEach(filter => {
        // 優先度グループの区切り
        if (filter.priority !== currentPriority) {
            if (currentPriority > 0) {
                filterHTML += '</div>'; // 前のグループを閉じる
            }
            filterHTML += `<div class="filter-priority-group priority-${filter.priority}">`;
            if (filter.priority === 1) {
                filterHTML += '<h3 class="filter-group-title">基本条件</h3>';
            } else if (filter.priority === 2) {
                filterHTML += '<h3 class="filter-group-title">詳細条件</h3>';
            } else if (filter.priority === 3) {
                filterHTML += '<h3 class="filter-group-title">その他の条件</h3>';
            }
            currentPriority = filter.priority;
        }
        
        filterHTML += createFilterHTML(filter);
    });
    
    if (currentPriority > 0) {
        filterHTML += '</div>'; // 最後のグループを閉じる
    }
    
    elements.filterContent.innerHTML = filterHTML;
    
    // イベントリスナーを設定
    setupFilterEventListeners();
}

function createFilterHTML(filter) {
    const fieldId = filter.field.replace(/[()]/g, '').replace(/\s+/g, '_');
    
    let html = `
        <div class="filter-group" data-field="${filter.field}">
            <div class="filter-header">
                <h4>${filter.label}</h4>
                <span class="filter-description">${filter.description}</span>
            </div>
    `;
    
    switch (filter.type) {
        case 'select':
            const options = getUniqueValues(filter.field);
            html += `
                <select id="filter_${fieldId}" onchange="updateFilter('${filter.field}', this.value)">
                    <option value="">選択してください</option>
                    ${options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                </select>
            `;
            break;
            
        case 'select_searchable':
            const searchableOptions = getUniqueValues(filter.field);
            html += `
                <div class="searchable-select">
                    <input type="text" id="filter_search_${fieldId}" placeholder="検索して選択..." 
                           oninput="filterSelectOptions('${filter.field}', this.value)">
                    <select id="filter_${fieldId}" onchange="updateFilter('${filter.field}', this.value)" size="5" style="display:none;">
                        <option value="">選択してください</option>
                        ${searchableOptions.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                    </select>
                </div>
            `;
            break;
            
        case 'range':
            const min = filter.min || 0;
            const max = filter.max || 100;
            const step = filter.step || 1;
            html += `
                <div class="range-filter">
                    <div class="range-inputs">
                        <input type="number" id="filter_${fieldId}_min" placeholder="最小" 
                               min="${min}" max="${max}" step="${step}"
                               onchange="updateRangeFilter('${filter.field}', 'min', this.value)">
                        <span>〜</span>
                        <input type="number" id="filter_${fieldId}_max" placeholder="最大"
                               min="${min}" max="${max}" step="${step}"
                               onchange="updateRangeFilter('${filter.field}', 'max', this.value)">
                    </div>
                </div>
            `;
            break;
            
        case 'salary_range':
            html += `
                <div class="salary-range-filter">
                    <div class="salary-buttons">
                        <button type="button" class="salary-btn" onclick="setSalaryRange('${filter.field}', 150000, 200000)">15万〜20万</button>
                        <button type="button" class="salary-btn" onclick="setSalaryRange('${filter.field}', 200000, 250000)">20万〜25万</button>
                        <button type="button" class="salary-btn" onclick="setSalaryRange('${filter.field}', 250000, 300000)">25万〜30万</button>
                        <button type="button" class="salary-btn" onclick="setSalaryRange('${filter.field}', 300000, 500000)">30万以上</button>
                    </div>
                    <div class="salary-custom-range">
                        <input type="number" id="filter_${fieldId}_min" placeholder="最低月給" 
                               min="150000" max="500000" step="10000"
                               onchange="updateRangeFilter('${filter.field}', 'min', this.value)">
                        <span>円 〜</span>
                        <input type="number" id="filter_${fieldId}_max" placeholder="最高月給"
                               min="150000" max="500000" step="10000"
                               onchange="updateRangeFilter('${filter.field}', 'max', this.value)">
                        <span>円</span>
                    </div>
                </div>
            `;
            break;
            
        case 'company_size':
            html += `
                <div class="company-size-filter">
                    <div class="size-buttons">
                        <button type="button" class="size-btn" onclick="setCompanySize('${filter.field}', 1, 50)">小企業<br>(〜50人)</button>
                        <button type="button" class="size-btn" onclick="setCompanySize('${filter.field}', 51, 300)">中企業<br>(51〜300人)</button>
                        <button type="button" class="size-btn" onclick="setCompanySize('${filter.field}', 301, 999999)">大企業<br>(301人〜)</button>
                    </div>
                </div>
            `;
            break;
    }
    
    html += '</div>';
    return html;
}

function setupFilterEventListeners() {
    // 検索可能セレクトのイベントリスナー
    document.querySelectorAll('.searchable-select input').forEach(input => {
        input.addEventListener('focus', function() {
            const select = this.nextElementSibling;
            select.style.display = 'block';
        });
        
        input.addEventListener('blur', function() {
            // 少し遅延してからhideする（選択できるように）
            setTimeout(() => {
                const select = this.nextElementSibling;
                select.style.display = 'none';
            }, 200);
        });
    });
}

function filterSelectOptions(field, searchTerm) {
    const fieldId = field.replace(/[()]/g, '').replace(/\s+/g, '_');
    const select = document.getElementById(`filter_${fieldId}`);
    const options = select.querySelectorAll('option');
    
    options.forEach(option => {
        if (option.value === '') {
            option.style.display = 'block';
            return;
        }
        
        const matches = option.textContent.toLowerCase().includes(searchTerm.toLowerCase());
        option.style.display = matches ? 'block' : 'none';
    });
    
    select.style.display = 'block';
}

function setSalaryRange(field, min, max) {
    const fieldId = field.replace(/[()]/g, '').replace(/\s+/g, '_');
    const minInput = document.getElementById(`filter_${fieldId}_min`);
    const maxInput = document.getElementById(`filter_${fieldId}_max`);
    
    minInput.value = min;
    maxInput.value = max;
    
    updateRangeFilter(field, 'min', min);
    updateRangeFilter(field, 'max', max);
    
    // ボタンのアクティブ状態を更新
    document.querySelectorAll('.salary-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

function setCompanySize(field, min, max) {
    updateRangeFilter(field, 'min', min);
    updateRangeFilter(field, 'max', max);
    
    // ボタンのアクティブ状態を更新
    document.querySelectorAll('.size-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

function getFilterConfig(dataType) {
    if (dataType === 'job') {
        return [
            { 
                field: '都道府県', 
                label: '🗾 勤務地', 
                type: 'select',
                priority: 1,
                description: 'どの都道府県で働きたいか選択'
            },
            { 
                field: '職種', 
                label: '💼 職種', 
                type: 'select',
                priority: 1,
                description: 'どんな仕事をしたいか選択'
            },
            { 
                field: '給与(円)', 
                label: '💰 給与', 
                type: 'salary_range',
                priority: 1,
                description: '希望する月給の範囲を指定',
                min: 150000,
                max: 500000,
                step: 10000
            },
            { 
                field: '職種分類', 
                label: '🏭 業界', 
                type: 'select',
                priority: 2,
                description: '働きたい業界を選択'
            },
            { 
                field: '最寄駅', 
                label: '🚃 最寄駅', 
                type: 'select_searchable',
                priority: 2,
                description: '通勤しやすい駅を選択'
            },
            { 
                field: '従業員数(全体)', 
                label: '👥 会社規模', 
                type: 'company_size',
                priority: 2,
                description: '働きたい会社の規模を選択'
            },
            { 
                field: '交代制', 
                label: '⏰ 勤務時間', 
                type: 'select',
                priority: 3,
                description: 'シフト制かどうかを選択'
            },
            { 
                field: '休日日数', 
                label: '📅 休日数', 
                type: 'range',
                priority: 3,
                description: '年間休日数の希望を指定',
                min: 80,
                max: 130
            }
        ];
    } else {
        return [
            { 
                field: '都道府県', 
                label: '🗾 所在地', 
                type: 'select',
                priority: 1,
                description: 'どの都道府県の学校か選択'
            },
            { 
                field: '校種', 
                label: '🎓 学校種別', 
                type: 'select',
                priority: 1,
                description: '大学・短大・専門学校など'
            },
            { 
                field: '国公私', 
                label: '🏛️ 設置区分', 
                type: 'select',
                priority: 1,
                description: '国立・公立・私立を選択'
            },
            { 
                field: '学部名', 
                label: '📚 学部', 
                type: 'select_searchable',
                priority: 2,
                description: '興味のある学部を選択'
            },
            { 
                field: '学科名', 
                label: '🔬 学科', 
                type: 'select_searchable',
                priority: 2,
                description: '学びたい学科を選択'
            },
            { 
                field: '分野', 
                label: '📖 分野', 
                type: 'select',
                priority: 2,
                description: '学習分野を選択'
            },
            { 
                field: '選考方法', 
                label: '📝 入試方式', 
                type: 'select',
                priority: 3,
                description: '受験方法を選択'
            },
            { 
                field: '評定', 
                label: '📊 評定基準', 
                type: 'range',
                priority: 3,
                description: '必要な評定平均値',
                min: 2.5,
                max: 5.0,
                step: 0.1
            }
        ];
    }
}

function getUniqueValues(field) {
    const values = currentData
        .map(row => row[field])
        .filter(val => val && val.toString().trim())
        .filter((value, index, self) => self.indexOf(value) === index)
        .sort();
    
    return values.slice(0, 100); // 最大100個まで
}

function setupSortOptions() {
    const sortConfig = getSortConfig(currentDataType);
    let optionsHTML = '<option value="">並び替え</option>';
    
    sortConfig.forEach(option => {
        optionsHTML += `<option value="${option.field}">${option.label}</option>`;
    });
    
    elements.sortSelect.innerHTML = optionsHTML;
    elements.sortSelect.onchange = () => {
        sortField = elements.sortSelect.value;
        applyFiltersAndSearch();
    };
}

function getSortConfig(dataType) {
    if (dataType === 'job') {
        return [
            { field: '事業所名', label: '事業所名' },
            { field: '給与(円)', label: '給与' },
            { field: '従業員数(全体)', label: '従業員数' }
        ];
    } else {
        return [
            { field: '学校名', label: '学校名' },
            { field: '学部名', label: '学部名' },
            { field: '学科名', label: '学科名' }
        ];
    }
}

// フィルタ・検索・ソート処理
function updateFilter(field, value) {
    if (value) {
        currentFilters[field] = value;
    } else {
        delete currentFilters[field];
    }
    updateActiveFilterTags();
    applyFiltersAndSearch();
}

function updateRangeFilter(field, type, value) {
    if (!currentFilters[field]) {
        currentFilters[field] = {};
    }
    
    if (value) {
        currentFilters[field][type] = parseFloat(value);
    } else {
        delete currentFilters[field][type];
        if (Object.keys(currentFilters[field]).length === 0) {
            delete currentFilters[field];
        }
    }
    
    updateActiveFilterTags();
    applyFiltersAndSearch();
}

function updateActiveFilterTags() {
    let tagsHTML = '';
    
    Object.entries(currentFilters).forEach(([field, value]) => {
        if (typeof value === 'object') {
            if (value.min !== undefined || value.max !== undefined) {
                const range = `${value.min || ''}〜${value.max || ''}`;
                tagsHTML += `<span class="filter-tag" onclick="removeFilter('${field}')">${field}: ${range} ×</span>`;
            }
        } else {
            tagsHTML += `<span class="filter-tag" onclick="removeFilter('${field}')">${field}: ${value} ×</span>`;
        }
    });
    
    elements.activeFilterTags.innerHTML = tagsHTML;
}

function removeFilter(field) {
    delete currentFilters[field];
    updateActiveFilterTags();
    setupFilters(); // フィルタUIをリセット
    applyFiltersAndSearch();
}

function clearAllFilters() {
    currentFilters = {};
    updateActiveFilterTags();
    setupFilters();
    applyFiltersAndSearch();
}

function performSearch() {
    applyFiltersAndSearch();
}

function applyFiltersAndSearch() {
    let data = [...originalData];
    
    // フィルタ適用
    Object.entries(currentFilters).forEach(([field, value]) => {
        if (typeof value === 'object') {
            // 範囲フィルタ
            data = data.filter(row => {
                const val = parseFloat(row[field]);
                if (isNaN(val)) return false;
                
                if (value.min !== undefined && val < value.min) return false;
                if (value.max !== undefined && val > value.max) return false;
                return true;
            });
        } else {
            // 選択フィルタ
            data = data.filter(row => row[field] === value);
        }
    });
    
    // 検索適用
    const searchTerm = elements.searchInput.value.toLowerCase().trim();
    if (searchTerm) {
        data = data.filter(row => {
            return Object.values(row).some(value => 
                value.toString().toLowerCase().includes(searchTerm)
            );
        });
    }
    
    // ソート適用
    if (sortField) {
        data.sort((a, b) => {
            let aVal = a[sortField];
            let bVal = b[sortField];
            
            // 数値の場合
            const aNum = parseFloat(aVal);
            const bNum = parseFloat(bVal);
            if (!isNaN(aNum) && !isNaN(bNum)) {
                return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
            }
            
            // 文字列の場合
            aVal = aVal.toString().toLowerCase();
            bVal = bVal.toString().toLowerCase();
            
            if (sortOrder === 'asc') {
                return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            } else {
                return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
            }
        });
    }
    
    filteredData = data;
    currentPage = 1;
    updateDisplay();
}

function toggleSortOrder() {
    sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    elements.sortOrder.textContent = sortOrder === 'asc' ? '⬆️' : '⬇️';
    applyFiltersAndSearch();
}

// 表示更新
function updateDisplay() {
    updateResultCount();
    updateCards();
    updatePagination();
}

function updateResultCount() {
    elements.resultCount.textContent = `${filteredData.length}件の結果`;
}

function updateCards() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);
    
    elements.cardsContainer.innerHTML = '';
    
    pageData.forEach((item, index) => {
        const cardElement = createCard(item, startIndex + index);
        elements.cardsContainer.appendChild(cardElement);
    });
    
    // アニメーション
    elements.cardsContainer.classList.add('fade-in');
    setTimeout(() => elements.cardsContainer.classList.remove('fade-in'), 500);
}

function createCard(item, index) {
    const card = document.createElement('div');
    card.className = 'card';
    
    const isFavorite = favorites.some(fav => JSON.stringify(fav) === JSON.stringify(item));
    const cardData = getCardDisplayData(item, currentDataType);
    
    card.innerHTML = `
        <div class="card-header">
            <h3 class="card-title">${cardData.title}</h3>
            <button class="card-favorite ${isFavorite ? 'active' : ''}" data-index="${index}">
                ${isFavorite ? '★' : '☆'}
            </button>
        </div>
        <div class="card-content">
            ${cardData.fields.map(field => `
                <div class="card-field">
                    <span class="card-field-label">${field.label}:</span>
                    <span class="card-field-value">${field.value}</span>
                </div>
            `).join('')}
        </div>
        ${cardData.tags.length > 0 ? `
            <div class="card-tags">
                ${cardData.tags.map(tag => `<span class="card-tag">${tag}</span>`).join('')}
            </div>
        ` : ''}
    `;
    
    // カードクリックイベント
    card.addEventListener('click', (e) => {
        // お気に入りボタンクリックの場合は詳細表示しない
        if (e.target.classList.contains('card-favorite')) {
            return;
        }
        showDetail(item);
    });
    
    // お気に入りボタンクリックイベント
    const favoriteBtn = card.querySelector('.card-favorite');
    favoriteBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // カードクリックイベントを防ぐ
        toggleFavorite(index, favoriteBtn, e);
    });
    
    return card;
}

function getCardDisplayData(item, dataType) {
    if (dataType === 'job') {
        return {
            title: item['事業所名'] || '不明',
            fields: [
                { label: '職種', value: item['職種'] || '-' },
                { label: '給与', value: formatSalary(item['給与(円)']) },
                { label: '所在地', value: item['所在地'] || '-' },
                { label: '最寄駅', value: item['最寄駅'] || '-' }
            ],
            tags: [
                item['都道府県'],
                item['職種分類']
            ].filter(tag => tag)
        };
    } else {
        return {
            title: item['学校名'] || '不明',
            fields: [
                { label: '学部', value: item['学部名'] || '-' },
                { label: '学科', value: item['学科名'] || '-' },
                { label: '国公私', value: item['国公私'] || '-' },
                { label: '校種', value: item['校種'] || '-' }
            ],
            tags: [
                item['都道府県'],
                item['校種'],
                item['国公私']
            ].filter(tag => tag)
        };
    }
}

function formatSalary(salary) {
    if (!salary || isNaN(salary)) return '-';
    const num = parseInt(salary);
    if (num >= 10000) {
        return `${(num / 10000).toFixed(0)}万円`;
    }
    return `${num.toLocaleString()}円`;
}

function updatePagination() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    let paginationHTML = '';
    
    // 前のページボタン
    paginationHTML += `
        <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            &#8249;
        </button>
    `;
    
    // ページ番号ボタン
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        paginationHTML += `<button onclick="changePage(1)">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span>...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button onclick="changePage(${i})" ${i === currentPage ? 'class="active"' : ''}>
                ${i}
            </button>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span>...</span>`;
        }
        paginationHTML += `<button onclick="changePage(${totalPages})">${totalPages}</button>`;
    }
    
    // 次のページボタン
    paginationHTML += `
        <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
            &#8250;
        </button>
    `;
    
    elements.pagination.innerHTML = paginationHTML;
}

function changePage(page) {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        updateCards();
        updatePagination();
        
        // ページトップにスクロール
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// お気に入り機能
function toggleFavorite(index, button, event) {
    event.stopPropagation();
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const item = filteredData[startIndex + index];
    const itemString = JSON.stringify(item);
    
    const existingIndex = favorites.findIndex(fav => JSON.stringify(fav) === itemString);
    
    if (existingIndex >= 0) {
        favorites.splice(existingIndex, 1);
        button.textContent = '☆';
        button.classList.remove('active');
    } else {
        favorites.push(item);
        button.textContent = '★';
        button.classList.add('active');
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

// 詳細表示
function showDetail(item) {
    try {
        const detailData = getDetailDisplayData(item, currentDataType);
        const isFavorite = favorites.some(fav => JSON.stringify(fav) === JSON.stringify(item));
    
        elements.modalContent.innerHTML = `
        <div class="detail-header">
            <div class="detail-title-section">
                <h2 class="detail-title">${detailData.title}</h2>
                ${detailData.subtitle ? `<p class="detail-subtitle">${detailData.subtitle}</p>` : ''}
            </div>
            <div class="detail-actions">
                <button class="detail-favorite-btn ${isFavorite ? 'active' : ''}" 
                        onclick="toggleDetailFavorite(this)" data-item='${JSON.stringify(item).replace(/'/g, '&apos;').replace(/"/g, '&quot;')}'>
                    ${isFavorite ? '★' : '☆'} お気に入り
                </button>
                <button class="detail-share-btn" onclick="shareItem('${detailData.title.replace(/'/g, '&apos;')}')">
                    📤 共有
                </button>
            </div>
        </div>

        ${detailData.keyInfo.length > 0 ? `
            <div class="detail-key-info">
                ${detailData.keyInfo.map(info => `
                    <div class="key-info-item">
                        <span class="key-info-icon">${info.icon}</span>
                        <div class="key-info-content">
                            <span class="key-info-label">${info.label}</span>
                            <span class="key-info-value">${info.value}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : ''}

        <div class="detail-content">
            ${detailData.sections.map(section => `
                <div class="detail-section">
                    <h3 class="section-title">
                        <span class="section-icon">${section.icon}</span>
                        ${section.title}
                    </h3>
                    <div class="section-content">
                        ${section.fields.map(field => {
                            if (field.value === '-' || !field.value) return '';
                            
                            const fieldClass = [
                                'detail-field',
                                field.important ? 'important' : '',
                                field.highlight ? 'highlight' : '',
                                field.multiline ? 'multiline' : ''
                            ].filter(c => c).join(' ');
                            
                            return `
                                <div class="${fieldClass}">
                                    <span class="field-label">${field.label}</span>
                                    <span class="field-value">${field.value}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `).join('')}
        </div>

        ${detailData.additionalInfo ? `
            <div class="detail-additional-info">
                <h4>📋 備考・その他情報</h4>
                <p>${detailData.additionalInfo}</p>
            </div>
        ` : ''}

        <div class="detail-memo-section">
            <h4>📝 メモ</h4>
            <textarea class="memo-textarea" placeholder="この求人/進学先について気になることをメモできます..."
                      onchange="saveMemo('${btoa(encodeURIComponent(JSON.stringify(item)))}', this.value)">${getMemo(item)}</textarea>
        </div>

        <div class="detail-footer">
            <div class="detail-timestamps">
                <small>データ更新: ${new Date().toLocaleDateString()}</small>
            </div>
        </div>
    `;
    
        elements.detailModal.style.display = 'flex';
        
        // モーダルアニメーション（正しい要素にクラス付与）
        const modalContentEl = elements.detailModal.querySelector('.modal-content');
        requestAnimationFrame(() => {
            modalContentEl.classList.add('modal-enter');
        });
        
    } catch (error) {
        console.error('Error in showDetail:', error);
        showUploadStatus('詳細表示でエラーが発生しました。データを再読み込みしてください。', 'error');
    }
}

function toggleDetailFavorite(button) {
    const item = JSON.parse(button.getAttribute('data-item').replace(/&apos;/g, "'").replace(/&quot;/g, '"'));
    const itemString = JSON.stringify(item);
    const existingIndex = favorites.findIndex(fav => JSON.stringify(fav) === itemString);
    
    if (existingIndex >= 0) {
        favorites.splice(existingIndex, 1);
        button.textContent = '☆ お気に入り';
        button.classList.remove('active');
    } else {
        favorites.push(item);
        button.textContent = '★ お気に入り';
        button.classList.add('active');
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
    
    // カード表示も更新
    updateCards();
}

function shareItem(title) {
    if (navigator.share) {
        navigator.share({
            title: `求人情報: ${title}`,
            text: `${title}の詳細情報をチェック！`,
            url: window.location.href
        });
    } else {
        // フォールバック: クリップボードにコピー
        navigator.clipboard.writeText(`${title} - ${window.location.href}`).then(() => {
            alert('リンクをクリップボードにコピーしました！');
        });
    }
}

function getMemo(item) {
    const itemKey = btoa(encodeURIComponent(JSON.stringify(item)));
    return localStorage.getItem(`memo_${itemKey}`) || '';
}

function saveMemo(itemKey, memo) {
    localStorage.setItem(`memo_${itemKey}`, memo);
}

function getDetailDisplayData(item, dataType) {
    if (dataType === 'job') {
        // 重要な情報を先に表示
        const keyInfo = [];
        if (item['給与(円)']) keyInfo.push({ icon: '💰', label: '月給', value: formatSalary(item['給与(円)']) });
        if (item['休日日数']) keyInfo.push({ icon: '📅', label: '年間休日', value: `${item['休日日数']}日` });
        if (item['従業員数(全体)']) keyInfo.push({ icon: '👥', label: '従業員数', value: `${item['従業員数(全体)']}名` });
        if (item['最寄駅']) keyInfo.push({ icon: '🚃', label: '最寄駅', value: item['最寄駅'] });

        return {
            title: item['事業所名'] || '不明',
            subtitle: item['職種'] || '',
            keyInfo: keyInfo,
            sections: [
                {
                    title: '🏢 企業基本情報',
                    icon: '🏢',
                    fields: [
                        { label: '企業名', value: item['事業所名'] || '-', important: true },
                        { label: 'フリガナ', value: item['事業所名フリガナ'] || '-' },
                        { label: '事業内容', value: item['事業内容'] || '-', multiline: true },
                        { label: '資本金', value: item['資本金(億円)'] ? `${item['資本金(億円)']}億円` : '-' }
                    ]
                },
                {
                    title: '📍 勤務地・アクセス',
                    icon: '📍',
                    fields: [
                        { label: '勤務地', value: item['所在地'] || item['就業場所'] || '-', important: true },
                        { label: '郵便番号', value: item['郵便番号'] || '-' },
                        { label: '鉄道路線', value: item['鉄道路線'] || '-' },
                        { label: '最寄駅', value: item['最寄駅'] || '-', important: true }
                    ]
                },
                {
                    title: '💼 職種・待遇',
                    icon: '💼',
                    fields: [
                        { label: '職種', value: item['職種'] || '-', important: true },
                        { label: '職種分類', value: item['職種分類'] || '-' },
                        { label: '月給', value: formatSalary(item['給与(円)']), important: true, highlight: true },
                        { label: '賞与（基本給）', value: item['賞与(基本給、円)'] ? `${item['賞与(基本給、円)']}円` : '-' },
                        { label: '賞与（平均）', value: item['賞与(平均、万円)'] ? `${item['賞与(平均、万円)']}万円` : '-' },
                        { label: '交代制', value: item['交代制'] || '-' },
                        { label: '年間休日', value: item['休日日数'] ? `${item['休日日数']}日` : '-', important: true }
                    ]
                },
                {
                    title: '👥 職場環境',
                    icon: '👥',
                    fields: [
                        { label: '従業員数（全体）', value: item['従業員数(全体)'] ? `${item['従業員数(全体)']}名` : '-' },
                        { label: '従業員数（就業場所）', value: item['従業員数(就業場所)'] ? `${item['従業員数(就業場所)']}名` : '-' },
                        { label: '男性従業員', value: item['従業員数(男性)'] ? `${item['従業員数(男性)']}名` : '-' },
                        { label: '女性従業員', value: item['従業員数(女性)'] ? `${item['従業員数(女性)']}名` : '-' },
                        { label: '募集対象', value: getMentionTarget(item) }
                    ]
                },
                {
                    title: '📞 応募・連絡先',
                    icon: '📞',
                    fields: [
                        { label: '採用担当部署', value: item['採用担当部署'] || '-' },
                        { label: '採用担当者', value: item['採用担当者'] || '-' },
                        { label: '電話番号', value: item['採用担当TEL'] || '-', important: true },
                        { label: 'FAX', value: item['採用担当FAX'] || '-' },
                        { label: '応募先住所', value: item['応募先'] || '-' }
                    ]
                }
            ],
            memo: '', // メモ機能用
            additionalInfo: item['備考'] || ''
        };
    } else {
        // 進学データの重要情報
        const keyInfo = [];
        if (item['校種']) keyInfo.push({ icon: '🎓', label: '校種', value: item['校種'] });
        if (item['国公私']) keyInfo.push({ icon: '🏛️', label: '設置', value: item['国公私'] });
        if (item['選考方法']) keyInfo.push({ icon: '📝', label: '選考', value: item['選考方法'] });
        if (item['人数枠']) keyInfo.push({ icon: '👥', label: '募集人数', value: `${item['人数枠']}名` });

        return {
            title: item['学校名'] || '不明',
            subtitle: `${item['学部名'] || ''}${item['学科名'] ? ' ' + item['学科名'] : ''}`,
            keyInfo: keyInfo,
            sections: [
                {
                    title: '🎓 学校基本情報',
                    icon: '🎓',
                    fields: [
                        { label: '学校名', value: item['学校名'] || '-', important: true },
                        { label: 'フリガナ', value: item['学校名ふりがな'] || '-' },
                        { label: '校種', value: item['校種'] || '-', important: true },
                        { label: '国公私立', value: item['国公私'] || '-', important: true },
                        { label: '所在地', value: item['要録用所在地'] || '-' }
                    ]
                },
                {
                    title: '📚 学部・学科情報',
                    icon: '📚',
                    fields: [
                        { label: '学部名', value: item['学部名'] || '-', important: true },
                        { label: '学科名', value: item['学科名'] || '-', important: true },
                        { label: 'コース', value: item['コース'] || '-' },
                        { label: '専攻', value: item['専攻'] || '-' },
                        { label: '分野', value: item['分野'] || '-' }
                    ]
                },
                {
                    title: '📝 入試情報',
                    icon: '📝',
                    fields: [
                        { label: '選考方法', value: item['選考方法'] || '-', important: true },
                        { label: '募集人数', value: item['人数枠'] ? `${item['人数枠']}名` : '-', important: true },
                        { label: '指定校推薦', value: item['指定校有無'] || '-' },
                        { label: '試験日', value: formatExamDate(item) },
                        { label: '受付期間', value: item['受付期間'] || '-' }
                    ]
                },
                {
                    title: '📊 出願条件・基準',
                    icon: '📊',
                    fields: [
                        { label: '出願条件', value: item['出願条件'] || '-', multiline: true },
                        { label: '資格条件', value: item['出願条件(資格)'] || '-', multiline: true },
                        { label: '評定平均', value: item['評定'] || '-', important: true },
                        { label: '欠席基準', value: item['欠席'] || '-' }
                    ]
                },
                {
                    title: '🔍 入試詳細',
                    icon: '🔍',
                    fields: [
                        { label: '学力試験', value: item['学力'] || '-' },
                        { label: '小論文', value: item['小論文'] || '-' },
                        { label: '面接', value: item['面接'] || '-' }
                    ]
                }
            ],
            memo: '', // メモ機能用
            additionalInfo: item['備考'] || ''
        };
    }
}

function getMentionTarget(item) {
    const targets = [];
    if (item['求人Ｍ'] && item['求人Ｍ'] !== '0') targets.push('男性');
    if (item['求人Ｆ'] && item['求人Ｆ'] !== '0') targets.push('女性');
    if (item['求人ＭＫ'] && item['求人ＭＦ'] !== '0') targets.push('男女問わず');
    
    return targets.length > 0 ? targets.join('・') : '-';
}

function formatExamDate(item) {
    const dates = [];
    if (item['試験日']) dates.push(item['試験日']);
    if (item['試験日2']) dates.push(item['試験日2']);
    return dates.length > 0 ? dates.join('、') : '-';
}

function closeModal() {
    const modalContentEl = elements.detailModal.querySelector('.modal-content');
    modalContentEl.classList.remove('modal-enter');
    
    setTimeout(() => {
        elements.detailModal.style.display = 'none';
    }, 300);
}

// エクスポート機能
function exportData(format) {
    const dataToExport = filteredData;
    
    if (format === 'csv') {
        exportAsCSV(dataToExport);
    } else if (format === 'json') {
        exportAsJSON(dataToExport);
    }
}

function exportAsCSV(data) {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');
    
    downloadFile(csvContent, 'search_results.csv', 'text/csv');
}

function exportAsJSON(data) {
    const jsonContent = JSON.stringify(data, null, 2);
    downloadFile(jsonContent, 'search_results.json', 'application/json');
}

function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
}

// サンプルデータロード
async function loadSampleData(type) {
    try {
        const filename = type === 'job' ? '就職.csv' : '進学.csv';
        const response = await fetch(`data/${filename}`);
        
        if (!response.ok) {
            throw new Error('サンプルデータの読み込みに失敗しました。');
        }
        
        const text = await response.text();
        const data = parseCSV(text);
        
        if (data.length === 0) {
            throw new Error('サンプルデータが空です。');
        }
        
        originalData = data;
        currentData = data;
        currentDataType = type;
        
        showUploadStatus(`${type === 'job' ? '就職' : '進学'}サンプルデータを${data.length}件読み込みました。`, 'success');
        
        setupDataView();
        showSection('data');
        
    } catch (error) {
        showUploadStatus(`エラー: ${error.message}`, 'error');
    }
}

function checkForSampleData() {
    // ページ読み込み時にサンプルデータの存在をチェック
    fetch('data/就職.csv')
        .then(response => {
            if (response.ok) {
                document.querySelector('.sample-links').style.display = 'block';
            }
        })
        .catch(() => {
            document.querySelector('.sample-links').style.display = 'none';
        });
}

// セクション切り替え
function showSection(section) {
    // すべてのセクションを非表示
    elements.uploadSection.style.display = 'none';
    elements.dataSection.style.display = 'none';
    elements.favoritesSection.style.display = 'none';
    
    // ナビゲーションの更新
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // 指定されたセクションを表示
    if (section === 'upload') {
        elements.uploadSection.style.display = 'block';
        document.querySelector('.nav-item[onclick="showSection(\'upload\')"]').classList.add('active');
    } else if (section === 'data') {
        if (currentData.length > 0) {
            elements.dataSection.style.display = 'block';
            document.querySelector('.nav-item[onclick="showSection(\'data\')"]').classList.add('active');
        } else {
            showSection('upload');
        }
    } else if (section === 'favorites') {
        showFavorites();
        elements.favoritesSection.style.display = 'block';
        document.querySelector('.nav-item[onclick="showSection(\'favorites\')"]').classList.add('active');
    }
}

function showFavorites() {
    const container = document.getElementById('favoritesContainer');
    
    if (favorites.length === 0) {
        container.innerHTML = '<p>お気に入りに登録されているアイテムはありません。</p>';
        return;
    }
    
    container.innerHTML = '';
    
    favorites.forEach((item, index) => {
        const card = createCard(item, index);
        card.querySelector('.card-favorite').onclick = (e) => {
            e.stopPropagation();
            favorites.splice(index, 1);
            localStorage.setItem('favorites', JSON.stringify(favorites));
            showFavorites();
        };
        container.appendChild(card);
    });
}

// テーマ切り替え
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeToggle(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeToggle(newTheme);
}

function updateThemeToggle(theme) {
    elements.themeToggle.textContent = theme === 'light' ? '🌙 ダークモード' : '☀️ ライトモード';
}

// キーボードショートカット
function handleKeyboardShortcuts(e) {
    if (e.key === 'Escape') {
        closeModal();
    } else if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 'f':
                e.preventDefault();
                elements.searchInput.focus();
                break;
        }
    }
}

// ユーティリティ関数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}