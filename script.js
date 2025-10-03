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
let filterLabelMap = {};

const DATASET_FILES = {
    job: 'data/就職.csv',
    school: 'data/進学.csv'
};

const DATASET_LABELS = {
    job: '就職',
    school: '進学'
};

function generateMediumCodes(start, end) {
    const codes = [];
    for (let i = start; i <= end; i++) {
        codes.push(i.toString().padStart(2, '0'));
    }
    return codes;
}

const INDUSTRY_MAJOR_DEFINITIONS = [
    { code: 'A', name: '農業,林業', mediumCodes: generateMediumCodes(1, 2) },
    { code: 'B', name: '漁業', mediumCodes: generateMediumCodes(3, 3) },
    { code: 'C', name: '鉱業,採石業,砂利採取業', mediumCodes: generateMediumCodes(4, 5) },
    { code: 'D', name: '建設業', mediumCodes: generateMediumCodes(6, 8) },
    { code: 'E', name: '製造業', mediumCodes: generateMediumCodes(9, 32) },
    { code: 'F', name: '電気・ガス・熱供給・水道業', mediumCodes: generateMediumCodes(33, 35) },
    { code: 'G', name: '情報通信業', mediumCodes: generateMediumCodes(36, 39) },
    { code: 'H', name: '運輸業,郵便業', mediumCodes: generateMediumCodes(40, 49) },
    { code: 'I', name: '卸売業,小売業', mediumCodes: generateMediumCodes(50, 60) },
    { code: 'J', name: '金融業,保険業', mediumCodes: generateMediumCodes(61, 63) },
    { code: 'K', name: '不動産業,物品賃貸業', mediumCodes: generateMediumCodes(64, 70) },
    { code: 'L', name: '学術研究,専門・技術サービス業', mediumCodes: generateMediumCodes(71, 73) },
    { code: 'M', name: '宿泊業,飲食サービス業', mediumCodes: generateMediumCodes(74, 75) },
    { code: 'N', name: '生活関連サービス業,娯楽業', mediumCodes: generateMediumCodes(76, 79) },
    { code: 'O', name: '教育,学習支援業', mediumCodes: generateMediumCodes(80, 80) },
    { code: 'P', name: '医療,福祉', mediumCodes: generateMediumCodes(81, 83) },
    { code: 'Q', name: '複合サービス事業', mediumCodes: generateMediumCodes(84, 84) },
    { code: 'R', name: 'サービス業(他に分類されないもの)', mediumCodes: generateMediumCodes(85, 90) },
    { code: 'S', name: '公務', mediumCodes: generateMediumCodes(91, 91) },
    { code: 'T', name: '分類不能の産業', mediumCodes: generateMediumCodes(92, 99) }
].map(def => ({
    ...def,
    label: `${def.code}:${def.name}`
}));

const INDUSTRY_MAJOR_LABEL_TO_MEDIUMS = {};
const INDUSTRY_MEDIUM_TO_MAJOR = {};

INDUSTRY_MAJOR_DEFINITIONS.forEach(def => {
    INDUSTRY_MAJOR_LABEL_TO_MEDIUMS[def.label] = def.mediumCodes;
    def.mediumCodes.forEach(code => {
        INDUSTRY_MEDIUM_TO_MAJOR[code] = {
            majorCode: def.code,
            majorName: def.name,
            majorLabel: def.label
        };
    });
});

const INDUSTRY_MAJOR_OPTIONS = INDUSTRY_MAJOR_DEFINITIONS.map(def => def.label);

const JOB_CLASSIFICATION_MAJOR_DEFINITIONS = [
    { code: '01', name: '管理的職業', mediumCodes: [] },
    { code: '02', name: '研究・技術の職業', mediumCodes: ['09', '10'] },
    { code: '03', name: '法務・経営・文化芸術等の専門的職業', mediumCodes: [] },
    { code: '04', name: '医療・看護・保健の職業', mediumCodes: ['28'] },
    { code: '05', name: '保育・教育の職業', mediumCodes: [] },
    { code: '06', name: '事務的職業', mediumCodes: ['31', '33', '34', '36', '37', '38', '39', '40', '42'] },
    { code: '07', name: '販売・営業の職業', mediumCodes: ['45', '48', '63'] },
    { code: '08', name: '福祉・介護の職業', mediumCodes: ['50'] },
    { code: '09', name: 'サービスの職業', mediumCodes: ['11', '53', '55', '56', '58'] },
    { code: '10', name: '警備・保安の職業', mediumCodes: ['59', '62'] },
    { code: '11', name: '農林漁業の職業', mediumCodes: [] },
    { code: '12', name: '製造・修理・塗装・製図等の職業', mediumCodes: ['07', '67', '68', '69', '70', '71', '72', '73', '74', '75', '76', '78', '79', '80', '81', '99'] },
    { code: '13', name: '配送・輸送・機械運転の職業', mediumCodes: ['82', '83', '84', '87', '88', '89'] },
    { code: '14', name: '建設・土木・電気工事の職業', mediumCodes: ['08', '91', '92', '94'] },
    { code: '15', name: '運搬・清掃・包装・選別等の職業', mediumCodes: ['95', '96', '97', '98'] }
].map(def => ({
    ...def,
    label: `${def.code}:${def.name}`
}));

const JOB_MAJOR_LABEL_TO_MEDIUMS = {};
const JOB_MEDIUM_TO_MAJOR = {};

JOB_CLASSIFICATION_MAJOR_DEFINITIONS.forEach(def => {
    JOB_MAJOR_LABEL_TO_MEDIUMS[def.label] = def.mediumCodes.map(code => code.toString().padStart(2, '0'));
    def.mediumCodes.forEach(code => {
        const normalizedCode = code.toString().padStart(2, '0');
        JOB_MEDIUM_TO_MAJOR[normalizedCode] = {
            majorCode: def.code,
            majorName: def.name,
            majorLabel: def.label
        };
    });
});

const JOB_MAJOR_OPTIONS = JOB_CLASSIFICATION_MAJOR_DEFINITIONS.map(def => def.label);

function getAvailableIndustryMajorOptions() {
    const source = originalData.length ? originalData : currentData;
    const majorsWithData = new Set();

    source.forEach(row => {
        if (row['産業大分類']) {
            majorsWithData.add(row['産業大分類']);
            return;
        }

        const info = getIndustryClassification(row['産業分類コード']);
        if (info && info.majorLabel) {
            majorsWithData.add(info.majorLabel);
        }
    });

    if (majorsWithData.size === 0) {
        return [...INDUSTRY_MAJOR_OPTIONS];
    }

    return INDUSTRY_MAJOR_OPTIONS.filter(option => majorsWithData.has(option));
}

function getIndustryClassification(code) {
    if (code === undefined || code === null) {
        return null;
    }

    const raw = code.toString().trim();
    if (!raw) {
        return null;
    }

    const smallCode = raw.padStart(3, '0');
    const mediumCode = smallCode.slice(0, 2);
    const majorInfo = INDUSTRY_MEDIUM_TO_MAJOR[mediumCode] || null;

    return {
        smallCode,
        mediumCode,
        majorCode: majorInfo ? majorInfo.majorCode : '',
        majorName: majorInfo ? majorInfo.majorName : '',
        majorLabel: majorInfo ? majorInfo.majorLabel : ''
    };
}

function getAvailableJobMajorOptions() {
    const source = originalData.length ? originalData : currentData;
    const majorsWithData = new Set();

    source.forEach(row => {
        if (row['職種大分類']) {
            majorsWithData.add(row['職種大分類']);
            return;
        }

        const info = getJobClassification(row['職業分類コード']);
        if (info && info.majorLabel) {
            majorsWithData.add(info.majorLabel);
        }
    });

    if (majorsWithData.size === 0) {
        return JOB_CLASSIFICATION_MAJOR_DEFINITIONS
            .filter(def => def.mediumCodes.length > 0)
            .map(def => def.label);
    }

    return JOB_MAJOR_OPTIONS.filter(option => majorsWithData.has(option));
}

function getJobClassification(code) {
    if (code === undefined || code === null) {
        return null;
    }

    const raw = code.toString().trim();
    if (!raw) {
        return null;
    }

    const mediumCode = raw.padStart(2, '0');
    const majorInfo = JOB_MEDIUM_TO_MAJOR[mediumCode] || null;

    return {
        mediumCode,
        majorCode: majorInfo ? majorInfo.majorCode : '',
        majorName: majorInfo ? majorInfo.majorName : '',
        majorLabel: majorInfo ? majorInfo.majorLabel : ''
    };
}

let datasetCache = {};

const PREFECTURE_ORDER = [
    '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
    '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
    '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
    '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
    '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
    '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
    '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
];

const AUTH_PASSWORD = 'visionwell1001';
let isAuthenticated = false;

function getFieldValue(item, fields) {
    if (!item) return '';

    if (!Array.isArray(fields)) {
        fields = [fields];
    }

    for (const field of fields) {
        if (field && Object.prototype.hasOwnProperty.call(item, field)) {
            const value = item[field];
            if (value !== undefined && value !== null && value !== '') {
                return value;
            }
        }
    }

    return '';
}

function normalizeNumber(value) {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    if (typeof value === 'number') {
        return isNaN(value) ? null : value;
    }

    const cleaned = value.toString().replace(/[^0-9.-]/g, '');
    if (!cleaned) {
        return null;
    }

    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
}

function formatCurrency(value, unit = '円') {
    const num = normalizeNumber(value);
    if (num === null) {
        return '-';
    }

    if (num >= 10000) {
        const man = num / 10000;
        if (man >= 10) {
            return `${Math.round(man)}万円`;
        }
        return `${man.toFixed(1)}万円`;
    }

    return `${num.toLocaleString()}${unit}`;
}

function formatPercentage(value) {
    const num = normalizeNumber(value);
    if (num === null) {
        return '-';
    }
    return `${num}%`;
}

function formatDeviation(value) {
    const num = normalizeNumber(value);
    if (num === null) {
        return '-';
    }
    return num.toFixed(1);
}

function truncateText(text, maxLength = 80) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}…`;
}

function splitPhrases(text) {
    if (!text) return [];
    return text
        .replace(/\s+/g, ' ')
        .split(/[、,。．\.・\n\r]/)
        .map(part => part.trim())
        .filter(Boolean);
}

function extractCityFromAddress(address) {
    if (!address) return '';

    let normalized = address.replace(/[0-9０-９-−ー]/g, '').replace(/\s+/g, '');
    const prefecture = PREFECTURE_ORDER.find(pref => normalized.startsWith(pref));
    if (prefecture) {
        normalized = normalized.slice(prefecture.length);
    }

    const suffixes = ['市', '区', '町', '村'];
    for (const suffix of suffixes) {
        const index = normalized.indexOf(suffix);
        if (index >= 0) {
            return normalized.slice(0, index + 1);
        }
    }

    const gunIndex = normalized.indexOf('郡');
    if (gunIndex >= 0) {
        const rest = normalized.slice(gunIndex);
        const match = rest.match(/郡[^市区町村]*[町村]/);
        if (match) {
            return normalized.slice(0, gunIndex + match[0].length);
        }
        return normalized.slice(0, gunIndex + 1);
    }

    return normalized.slice(0, Math.min(normalized.length, 6));
}

function deriveEmploymentType(item, remarks) {
    const text = (remarks || '').replace(/\s+/g, '');
    const candidates = [
        { regex: /正社員/, label: '正社員' },
        { regex: /契約社員/, label: '契約社員' },
        { regex: /派遣社員|派遣/, label: '派遣社員' },
        { regex: /パート|アルバイト/, label: 'パート・アルバイト' },
        { regex: /嘱託|臨時/, label: '嘱託・臨時' }
    ];

    for (const candidate of candidates) {
        if (candidate.regex.test(text)) {
            return candidate.label;
        }
    }

    return '情報なし';
}

function deriveWorkingHours(item, remarks) {
    const shift = (item['交代制'] || '').trim();
    if (/有|あり/.test(shift)) return '交代制あり';
    if (/無|なし/.test(shift)) return '日勤中心';

    const text = (remarks || '').replace(/\s+/g, '');
    if (/フレックスタイム|フレックス/.test(text)) return 'フレックスタイム制';
    if (/夜勤/.test(text)) return '夜勤あり';
    if (/シフト|交代/.test(text)) return 'シフト勤務';
    if (/日勤/.test(text)) return '日勤のみ';

    return '情報なし';
}

function deriveQualificationInfo(remarks) {
    const text = remarks || '';
    const phrases = splitPhrases(text);
    const matches = phrases.filter(phrase => /資格|免許/.test(phrase));

    if (matches.length > 0) {
        return {
            summary: matches[0],
            detail: matches.slice(0, 3).join('、')
        };
    }

    if (/資格不要|資格不問|未経験可/.test(text)) {
        const label = '資格不問・未経験可';
        return { summary: label, detail: label };
    }

    return { summary: '情報なし', detail: '' };
}

function deriveBenefitInfo(remarks) {
    const text = remarks || '';
    const summaryLabels = [];
    const keywordLabels = [
        { regex: /寮|社宅/, label: '寮・社宅あり' },
        { regex: /住宅手当|家賃補助/, label: '住宅手当あり' },
        { regex: /交通費|通勤手当/, label: '交通費支給' },
        { regex: /食堂|まかない/, label: '社員食堂あり' },
        { regex: /資格支援|資格取得|受験費/, label: '資格取得支援あり' },
        { regex: /育児|産休|育休/, label: '育児支援あり' }
    ];

    keywordLabels.forEach(({ regex, label }) => {
        if (regex.test(text) && !summaryLabels.includes(label)) {
            summaryLabels.push(label);
        }
    });

    const phrases = splitPhrases(text);
    const detailMatches = phrases.filter(phrase => /福利厚生|手当|寮|社宅|制度|支援|食堂|保険|休暇/.test(phrase));

    const summary = summaryLabels.slice(0, 2).join('・') || detailMatches[0] || '情報なし';

    return {
        summary,
        detail: detailMatches.slice(0, 4).join('、')
    };
}

function deriveHolidayPolicy(item, remarks) {
    const text = (remarks || '').replace(/\s+/g, '');
    if (/完全週休?2/.test(text)) return '完全週休2日制';
    if (/週休?2/.test(text)) return '週休2日制';
    if (/シフト/.test(text)) return 'シフト制';
    if (/交代制/.test(text)) return '交代制';

    const holidayCount = normalizeNumber(item['休日日数']);
    if (holidayCount !== null) {
        if (holidayCount >= 120) return '年間休日120日以上';
        if (holidayCount >= 110) return '年間休日110日以上';
        if (holidayCount >= 100) return '年間休日100日以上';
        return `${holidayCount}日`;
    }

    return '情報なし';
}

function deriveBonusAvailability(item, remarks) {
    const bonusBasic = normalizeNumber(item['賞与(基本給、円)']);
    const bonusAverage = normalizeNumber(item['賞与(平均、万円)']);
    const text = remarks || '';
    const hasRaise = /昇給/.test(text);

    if ((bonusBasic && bonusBasic > 0) || (bonusAverage && bonusAverage > 0)) {
        return hasRaise ? '昇給・賞与あり' : '賞与あり';
    }

    if (hasRaise) {
        return '昇給あり';
    }

    return '情報なし';
}

function deriveTrainingInfo(remarks) {
    const text = remarks || '';
    const phrases = splitPhrases(text);
    const matches = phrases.filter(phrase => /研修|OJT|教育|講習|メンター|サポート/.test(phrase));

    if (matches.length > 0) {
        const first = matches[0];
        const summary = /充実|豊富/.test(first) ? '研修充実' : '研修あり';
        return { summary, detail: matches.slice(0, 3).join('、') };
    }

    if (/OJT/.test(text)) {
        return { summary: 'OJTあり', detail: 'OJTによる育成を実施' };
    }

    return { summary: '情報なし', detail: '' };
}

function deriveJobDescriptionInfo(remarks, businessContent) {
    const text = remarks || '';
    const phrases = splitPhrases(text);
    const matches = phrases.filter(phrase => /仕事内容|業務|担当|作業|サポート|サービス/.test(phrase));

    const summarySource = matches[0] || businessContent || '';
    const detail = matches.slice(0, 4).join('、') || businessContent || '';

    return {
        summary: summarySource,
        detail
    };
}

function deriveApplicationInfo(remarks) {
    const text = remarks || '';
    const phrases = splitPhrases(text);
    const matches = phrases.filter(phrase => /応募|歓迎|経験|資格|免許|可/.test(phrase));

    const summary = matches[0] || '';
    return {
        summary,
        detail: matches.slice(0, 4).join('、')
    };
}

function combineAccess(item) {
    const line = (item['鉄道路線'] || '').trim();
    const station = (item['最寄駅'] || '').trim();
    if (line && station) {
        return `${line} / ${station}`;
    }
    return station || line || '';
}

function formatEmployeeCount(value) {
    const num = normalizeNumber(value);
    if (num === null) return '情報なし';
    return `${Math.round(num).toLocaleString()}名`;
}

// DOM要素
const elements = {
    dataSection: document.getElementById('dataSection'),
    filterContent: document.getElementById('filterContent'),
    activeFilterTags: document.getElementById('activeFilterTags'),
    searchInput: document.getElementById('searchInput'),
    favoriteFilter: document.getElementById('favoriteFilter'),
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
    setupDatasetTabs();
    loadDefaultDatasets();
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
    // 検索
    elements.searchInput.addEventListener('input', debounce(performSearch, 300));
    if (elements.favoriteFilter) {
        elements.favoriteFilter.addEventListener('change', applyFiltersAndSearch);
    }

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

function setupDatasetTabs() {
    const tabs = document.querySelectorAll('.dataset-tabs .nav-item');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const dataset = tab.dataset.dataset;
            if (!dataset) {
                return;
            }
            activateDataset(dataset);
        });
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

// データ表示設定
function setupDataView() {
    setupFilters();
    setupSortOptions();
    applyFiltersAndSearch();
}

function restoreFilterSelections() {
    Object.entries(currentFilters).forEach(([field, value]) => {
        const fieldId = field.replace(/[()]/g, '').replace(/\s+/g, '_');

        if (value && typeof value === 'object') {
            const minInput = document.getElementById(`filter_${fieldId}_min`);
            const maxInput = document.getElementById(`filter_${fieldId}_max`);

            if (minInput && value.min !== undefined) {
                minInput.value = value.min;
            }
            if (maxInput && value.max !== undefined) {
                maxInput.value = value.max;
            }
        } else {
            const select = document.getElementById(`filter_${fieldId}`);
            if (select) {
                select.value = value;
            }

            const searchInput = document.getElementById(`filter_search_${fieldId}`);
            if (searchInput && typeof value === 'string') {
                searchInput.value = value;
            }
        }
    });
}

function isFilterActive(field) {
    if (!currentFilters[field]) {
        return false;
    }

    const value = currentFilters[field];

    if (Array.isArray(value)) {
        return value.length > 0;
    }

    if (typeof value === 'object') {
        return Object.values(value).some(v => v !== undefined && v !== null && v !== '');
    }

    return value !== '' && value !== null && value !== undefined;
}

function updateFilterGroupToggleIcon(group) {
    const toggleButton = group.querySelector('.filter-group-title[data-toggle-group]');
    if (!toggleButton) {
        return;
    }

    const icon = toggleButton.querySelector('.toggle-icon');
    if (!icon) {
        return;
    }

    icon.textContent = group.classList.contains('collapsed') ? '＋' : '−';
    toggleButton.setAttribute('aria-expanded', group.classList.contains('collapsed') ? 'false' : 'true');
}

function expandActiveFilterGroups() {
    document.querySelectorAll('.filter-priority-group.collapsed').forEach(group => {
        const fields = Array.from(group.querySelectorAll('.filter-group'))
            .map(element => element.dataset.field)
            .filter(Boolean);

        const hasActiveFilter = fields.some(field => isFilterActive(field));
        if (hasActiveFilter) {
            group.classList.remove('collapsed');
        }

        updateFilterGroupToggleIcon(group);
    });
}

function initializeFilterGroupToggleIcons() {
    document.querySelectorAll('.filter-priority-group').forEach(group => {
        updateFilterGroupToggleIcon(group);
    });
}

function setupFilters() {
    const filterConfig = getFilterConfig(currentDataType);

    // 優先度でソート
    const sortedFilters = filterConfig.sort((a, b) => a.priority - b.priority);

    let filterHTML = '';
    let currentPriority = null;
    filterLabelMap = {};

    sortedFilters.forEach(filter => {
        filterLabelMap[filter.field] = filter.label;
        // 優先度グループの区切り
        if (filter.priority !== currentPriority) {
            if (currentPriority !== null) {
                filterHTML += '</div></div>'; // 前のグループを閉じる
            }
            const groupTitle = getFilterGroupTitle(currentDataType, filter.priority);
            const isDetailGroup = filter.priority === 2;
            const collapsedClass = isDetailGroup ? ' collapsed' : '';
            filterHTML += `<div class="filter-priority-group priority-${filter.priority}${collapsedClass}" data-priority="${filter.priority}">`;
            if (groupTitle) {
                if (isDetailGroup) {
                    filterHTML += `<button type="button" class="filter-group-title" data-toggle-group aria-expanded="false">${groupTitle}<span class="toggle-icon">＋</span></button>`;
                } else {
                    filterHTML += `<div class="filter-group-title">${groupTitle}</div>`;
                }
            }
            filterHTML += '<div class="filter-group-content">';
            currentPriority = filter.priority;
        }

        filterHTML += createFilterHTML(filter);
    });

    if (currentPriority !== null) {
        filterHTML += '</div></div>'; // 最後のグループを閉じる
    }

    if (!filterLabelMap['産業大分類']) {
        filterLabelMap['産業大分類'] = '🌐 産業大分類';
    }

    if (!filterLabelMap['職種大分類']) {
        filterLabelMap['職種大分類'] = '🧭 職種大分類';
    }

    elements.filterContent.innerHTML = filterHTML;

    restoreFilterSelections();
    expandActiveFilterGroups();
    initializeFilterGroupToggleIcons();
    // イベントリスナーを設定
    setupFilterEventListeners();
    updateDependentFilters();
}

function getFilterGroupTitle(dataType, priority) {
    if (dataType === 'school') {
        if (priority === 1) return '🎯 通常検索';
        if (priority === 2) return '💡 詳細条件';
        if (priority === 3) return '📎 サポート情報';
    } else {
        if (priority === 1) return '🎯 基本条件';
        if (priority === 2) return '💡 詳細条件';
        if (priority === 3) return '📎 その他の条件';
    }
    return '';
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
        case 'industry_classification': {
            const majorOptions = getAvailableIndustryMajorOptions();
            const selectedMajor = currentFilters['産業大分類'] || '';
            const majorFieldId = '産業大分類'.replace(/[()]/g, '').replace(/\s+/g, '_');
            html += `
                <div class="industry-classification-filter">
                    <div class="industry-major-select">
                        <label for="filter_${majorFieldId}">大分類</label>
                        <select id="filter_${majorFieldId}"
                                onchange="handleIndustryMajorFilterChange(this.value)">
                            <option value="">大分類を選択</option>
                            ${majorOptions.map(opt => `<option value="${opt}"${opt === selectedMajor ? ' selected' : ''}>${opt}</option>`).join('')}
                        </select>
                    </div>
                </div>
            `;
            break;
        }

        case 'job_classification': {
            const majorOptions = getAvailableJobMajorOptions();
            const selectedMajor = currentFilters['職種大分類'] || '';
            const majorFieldId = '職種大分類'.replace(/[()]/g, '').replace(/\s+/g, '_');
            html += `
                <div class="job-classification-filter">
                    <div class="job-major-select">
                        <label for="filter_${majorFieldId}">大分類</label>
                        <select id="filter_${majorFieldId}"
                                onchange="handleJobMajorFilterChange(this.value)">
                            <option value="">大分類を選択</option>
                            ${majorOptions.map(opt => `<option value="${opt}"${opt === selectedMajor ? ' selected' : ''}>${opt}</option>`).join('')}
                        </select>
                    </div>
                </div>
            `;
            break;
        }

        case 'select':
            const options = filter.options || getUniqueValues(filter.field);
            html += `
                <select id="filter_${fieldId}" onchange="updateFilter('${filter.field}', this.value)">
                    <option value="">選択してください</option>
                    ${options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                </select>
            `;
            break;

        case 'select_searchable':
            const searchableOptions = filter.options || getUniqueValues(filter.field);
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
                        <button type="button" class="salary-btn" onclick="setSalaryRange('${filter.field}', 0, 150000)">15万以下</button>
                        <button type="button" class="salary-btn" onclick="setSalaryRange('${filter.field}', 150000, 200000)">15万〜20万</button>
                        <button type="button" class="salary-btn" onclick="setSalaryRange('${filter.field}', 200000, 250000)">20万〜25万</button>
                        <button type="button" class="salary-btn" onclick="setSalaryRange('${filter.field}', 250000, 300000)">25万〜30万</button>
                    </div>
                    <div class="salary-custom-range">
                        <input type="number" id="filter_${fieldId}_min" placeholder="最低月給"
                               min="0" max="500000" step="10000"
                               onchange="updateRangeFilter('${filter.field}', 'min', this.value)">
                        <span>円 〜</span>
                        <input type="number" id="filter_${fieldId}_max" placeholder="最高月給"
                               min="0" max="500000" step="10000"
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
    document.querySelectorAll('.filter-group-title[data-toggle-group]').forEach(button => {
        button.addEventListener('click', function() {
            const group = this.closest('.filter-priority-group');
            if (!group) {
                return;
            }

            group.classList.toggle('collapsed');
            updateFilterGroupToggleIcon(group);
        });
    });

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

function enhanceJobRecord(item) {
    const record = { ...item };
    const remarks = record['備考'] || '';

    const industryInfo = getIndustryClassification(record['産業分類コード']);
    if (industryInfo) {
        record['産業分類コード'] = industryInfo.smallCode;
        record['産業中分類コード'] = industryInfo.mediumCode;
        record['産業大分類'] = industryInfo.majorLabel || '';
        record['産業大分類コード'] = industryInfo.majorCode || '';
        record['産業大分類名'] = industryInfo.majorName || '';
    }

    const jobClassificationInfo = getJobClassification(record['職業分類コード']);
    if (jobClassificationInfo) {
        record['職業分類コード'] = jobClassificationInfo.mediumCode;
        record['職種大分類'] = jobClassificationInfo.majorLabel || '';
        record['職種大分類コード'] = jobClassificationInfo.majorCode || '';
        record['職種大分類名'] = jobClassificationInfo.majorName || '';
    }

    record['勤務地(市区町村)'] = extractCityFromAddress(record['所在地'] || record['就業場所'] || '');
    record['交通アクセス'] = combineAccess(record);
    record['基本給'] = record['給与(円)'];

    const qualificationInfo = deriveQualificationInfo(remarks);
    record['資格・免許'] = qualificationInfo.summary;
    record['資格・免許詳細'] = qualificationInfo.detail;

    const benefitInfo = deriveBenefitInfo(remarks);
    record['福利厚生'] = benefitInfo.summary;
    record['福利厚生詳細'] = benefitInfo.detail;
    record['主要福利厚生'] = benefitInfo.summary !== '情報なし' ? benefitInfo.summary : '';

    record['雇用形態'] = deriveEmploymentType(record, remarks);
    record['就業時間'] = deriveWorkingHours(record, remarks);
    record['休日制度'] = deriveHolidayPolicy(record, remarks);
    record['昇給・賞与'] = deriveBonusAvailability(record, remarks);

    const trainingInfo = deriveTrainingInfo(remarks);
    record['研修制度'] = trainingInfo.summary;
    record['研修制度詳細'] = trainingInfo.detail;

    const jobInfo = deriveJobDescriptionInfo(remarks, record['事業内容']);
    record['仕事内容詳細'] = jobInfo.detail;
    record['仕事内容サマリー'] = jobInfo.summary;

    const applicationInfo = deriveApplicationInfo(remarks);
    record['応募条件メモ'] = applicationInfo.detail || applicationInfo.summary;

    const highlightSource = [
        jobInfo.summary,
        benefitInfo.summary !== '情報なし' ? benefitInfo.summary : '',
        applicationInfo.summary
    ].find(text => text && text.trim());
    record['求人ハイライト'] = highlightSource || '';

    return record;
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
                label: '🗾 勤務地(都道府県)',
                type: 'select',
                priority: 1,
                description: '働きたい都道府県を選択'
            },
            {
                field: '職種大分類',
                label: '🧭 職種大分類',
                type: 'job_classification',
                priority: 1,
                description: '職種の大区分で絞り込み'
            },
            {
                field: '産業分類コード',
                label: '🏭 産業分類',
                type: 'industry_classification',
                priority: 1,
                description: '産業の大分類で絞り込み'
            },
            {
                field: '給与(円)',
                label: '💰 基本給',
                type: 'salary_range',
                priority: 1,
                description: '希望する基本給の目安を入力',
                min: 0,
                max: 500000,
                step: 10000
            },
            {
                field: '従業員数(全体)',
                label: '👥 従業員数',
                type: 'company_size',
                priority: 2,
                description: '企業規模で絞り込み'
            },
            {
                field: '資格・免許',
                label: '🎓 資格・免許',
                type: 'select_searchable',
                priority: 2,
                description: '必要な資格・免許で検索'
            },
            {
                field: '福利厚生',
                label: '🎁 福利厚生',
                type: 'select_searchable',
                priority: 2,
                description: '寮・社宅や手当など福利厚生で絞り込み'
            },
            {
                field: '休日制度',
                label: '📅 休日制度',
                type: 'select',
                priority: 2,
                description: '週休制度など休日の取り方を選択',
                options: ['完全週休2日制', '週休2日制', 'シフト制', '交代制', '年間休日120日以上', '年間休日110日以上', '年間休日100日以上', '情報なし']
            },
            {
                field: '交通アクセス',
                label: '🚃 交通アクセス',
                type: 'select_searchable',
                priority: 2,
                description: '最寄駅や路線で通勤のしやすさを確認'
            },
            {
                field: '休日日数',
                label: '📆 年間休日数',
                type: 'range',
                priority: 2,
                description: '年間休日数の希望範囲を入力',
                min: 60,
                max: 150,
                step: 5
            },
            {
                field: '昇給・賞与',
                label: '💹 昇給・賞与',
                type: 'select',
                priority: 2,
                description: '昇給・賞与の有無で絞り込み',
                options: ['昇給・賞与あり', '賞与あり', '昇給あり', '情報なし']
            },
            {
                field: '研修制度',
                label: '📘 研修制度',
                type: 'select',
                priority: 2,
                description: '研修や教育体制の充実度で選択',
                options: ['研修充実', '研修あり', 'OJTあり', '情報なし']
            }
        ];
    } else {
        return [
            {
                field: '都道府県',
                label: '🗾 都道府県',
                type: 'select',
                priority: 1,
                description: '通学したい地域を選んでください'
            },
            {
                field: '校種',
                label: '🎓 学校種別',
                type: 'select',
                priority: 1,
                description: '大学・短大・専門学校などを選べます'
            },
            {
                field: '学部名',
                label: '📚 学部・系統',
                type: 'select_searchable',
                priority: 1,
                description: '学びたい学部・系統名で絞り込み'
            },
            {
                field: '学科名',
                label: '🔬 学科・コース',
                type: 'select_searchable',
                priority: 1,
                description: '気になる学科やコース名で検索'
            },
            {
                field: '選考方法',
                label: '📝 入試方法',
                type: 'select',
                priority: 1,
                description: '一般・推薦・AOなど入試形式で絞り込み'
            },
            {
                field: '偏差値',
                label: '📈 偏差値目安',
                type: 'range',
                priority: 2,
                description: '志望レベルに合わせて目安偏差値を指定',
                min: 35,
                max: 80
            },
            {
                field: '年間学費',
                label: '💸 年間学費',
                type: 'range',
                priority: 2,
                description: '年間にかかる学費の目安を入力',
                min: 0,
                max: 2000000,
                step: 50000
            },
            {
                field: '人数枠',
                label: '👥 募集人数',
                type: 'range',
                priority: 2,
                description: '定員規模で絞り込み',
                min: 0,
                max: 500
            },
            {
                field: '特待生制度',
                label: '🎁 特待生・奨学金',
                type: 'select',
                priority: 2,
                description: '特待生制度や奨学金の有無'
            },
            {
                field: '取得可能資格',
                label: '📜 取得可能資格',
                type: 'select_searchable',
                priority: 2,
                description: '目指したい資格で絞り込み'
            },
            {
                field: '就職率',
                label: '💼 就職率',
                type: 'range',
                priority: 2,
                description: '就職率や進路実績を確認',
                min: 0,
                max: 100,
                step: 1
            },
            {
                field: '寮・住環境',
                label: '🏠 寮・住環境',
                type: 'select',
                priority: 2,
                description: '学生寮や住まいサポート情報'
            },
            {
                field: 'オープンキャンパス情報',
                label: '🎪 オープンキャンパス',
                type: 'select',
                priority: 2,
                description: 'イベント情報から選択'
            }
        ];
    }
}

function getUniqueValues(field) {
    const values = currentData
        .map(row => row[field])
        .filter(val => val && val.toString().trim());

    const uniqueValues = [];
    values.forEach(value => {
        if (!uniqueValues.includes(value)) {
            uniqueValues.push(value);
        }
    });

    if (field === '都道府県') {
        const prefectureValues = PREFECTURE_ORDER.filter(pref => uniqueValues.includes(pref));
        const otherValues = uniqueValues
            .filter(value => !PREFECTURE_ORDER.includes(value))
            .sort((a, b) => a.localeCompare(b, 'ja'));
        return [...prefectureValues, ...otherValues];
    }

    if (field === '産業分類コード') {
        const normalized = Array.from(new Set(
            uniqueValues.map(value => value.toString().padStart(3, '0'))
        ));
        return normalized.sort((a, b) => a.localeCompare(b, 'ja'));
    }

    if (field === '産業中分類コード') {
        const normalized = Array.from(new Set(
            uniqueValues.map(value => value.toString().padStart(2, '0'))
        ));
        return normalized.sort((a, b) => a.localeCompare(b, 'ja'));
    }

    if (field === '産業大分類') {
        return getAvailableIndustryMajorOptions();
    }

    if (field === '職業分類コード') {
        const normalized = Array.from(new Set(
            uniqueValues.map(value => value.toString().padStart(2, '0'))
        ));
        return normalized.sort((a, b) => a.localeCompare(b, 'ja'));
    }

    if (field === '職種大分類') {
        return getAvailableJobMajorOptions();
    }

    return uniqueValues
        .sort((a, b) => a.localeCompare(b, 'ja'))
        .slice(0, 100); // 最大100個まで
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
            { field: '学科名', label: '学科名' },
            { field: '偏差値', label: '偏差値' },
            { field: '年間学費', label: '年間学費' }
        ];
    }
}

// フィルタ・検索・ソート処理
function updateDependentFilters() {
    if (currentDataType !== 'job') {
        return false;
    }

    const industryChanged = updateIndustryFilterOptions();
    const jobChanged = updateJobClassificationFilterOptions();
    return industryChanged || jobChanged;
}

function updateIndustryFilterOptions() {
    const majorSelect = document.getElementById('filter_産業大分類');
    if (!majorSelect) {
        return false;
    }

    const majorSelection = currentFilters['産業大分類'] || '';
    const options = getAvailableIndustryMajorOptions();

    majorSelect.innerHTML = '<option value="">大分類を選択</option>' +
        options.map(opt => `<option value="${opt}">${opt}</option>`).join('');

    if (majorSelection && options.includes(majorSelection)) {
        majorSelect.value = majorSelection;
        return false;
    }

    majorSelect.value = '';
    if (majorSelection && currentFilters['産業大分類']) {
        delete currentFilters['産業大分類'];
        return true;
    }

    return false;
}

function handleIndustryMajorFilterChange(majorLabel) {
    updateFilter('産業大分類', majorLabel);
}

function updateJobClassificationFilterOptions() {
    const majorSelect = document.getElementById('filter_職種大分類');
    if (!majorSelect) {
        return false;
    }

    const majorSelection = currentFilters['職種大分類'] || '';
    const options = getAvailableJobMajorOptions();

    majorSelect.innerHTML = '<option value="">大分類を選択</option>' +
        options.map(opt => `<option value="${opt}">${opt}</option>`).join('');

    let changed = false;

    if (majorSelection && options.includes(majorSelection)) {
        majorSelect.value = majorSelection;
    } else {
        majorSelect.value = '';
        if (majorSelection && currentFilters['職種大分類']) {
            delete currentFilters['職種大分類'];
            changed = true;
        }
    }

    const mediumChanged = updateJobMediumFilterOptions(majorSelect.value);
    return changed || mediumChanged;
}

function handleJobMajorFilterChange(majorLabel) {
    updateFilter('職種大分類', majorLabel);
}

function updateJobMediumFilterOptions(selectedMajor) {
    const select = document.getElementById('filter_職業分類コード');
    if (!select) {
        return false;
    }

    const allOptions = getUniqueValues('職業分類コード');
    let filteredOptions = [...allOptions];

    if (selectedMajor && JOB_MAJOR_LABEL_TO_MEDIUMS[selectedMajor]) {
        const allowedCodes = JOB_MAJOR_LABEL_TO_MEDIUMS[selectedMajor];
        if (allowedCodes.length > 0) {
            filteredOptions = allOptions.filter(code => allowedCodes.includes(code));

            if (filteredOptions.length === 0) {
                filteredOptions = [...allowedCodes];
            }
        }
    }

    const previousValue = select.value;
    select.innerHTML = '<option value="">選択してください</option>' +
        filteredOptions.map(opt => `<option value="${opt}">${opt}</option>`).join('');

    if (previousValue && filteredOptions.includes(previousValue)) {
        select.value = previousValue;
        return false;
    }

    if (previousValue && currentFilters['職業分類コード']) {
        delete currentFilters['職業分類コード'];
        return true;
    }

    select.value = '';
    return false;
}

function updateFilter(field, value) {
    if (value) {
        currentFilters[field] = value;
    } else {
        delete currentFilters[field];
    }
    updateDependentFilters();
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
                const label = filterLabelMap[field] || field;
                tagsHTML += `<span class="filter-tag" onclick="removeFilter('${field}')">${label}: ${range} ×</span>`;
            }
        } else {
            const label = filterLabelMap[field] || field;
            tagsHTML += `<span class="filter-tag" onclick="removeFilter('${field}')">${label}: ${value} ×</span>`;
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
                const rawValue = row[field];
                const val = normalizeNumber(rawValue);
                if (val === null) return false;

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

    if (isFavoritesOnly()) {
        const favoriteStrings = new Set(favorites.map(item => JSON.stringify(item)));
        data = data.filter(item => favoriteStrings.has(JSON.stringify(item)));
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
            <div class="card-title-group">
                <h3 class="card-title">${cardData.title}</h3>
                ${cardData.subtitle ? `<p class="card-subtitle">${cardData.subtitle}</p>` : ''}
            </div>
            <button class="card-favorite ${isFavorite ? 'active' : ''}" data-index="${index}">
                ${isFavorite ? '★' : '☆'}
            </button>
        </div>
        ${cardData.image ? `
            <div class="card-image">
                <img src="${cardData.image}" alt="${cardData.title}のイメージ" loading="lazy" onerror="this.closest('.card-image').style.display='none';">
            </div>
        ` : ''}
        <div class="card-content">
            ${cardData.fields.map(field => `
                <div class="card-field">
                    <span class="card-field-label">${field.label}:</span>
                    <span class="card-field-value">${field.value}</span>
                </div>
            `).join('')}
        </div>
        ${cardData.description ? `<p class="card-description">${cardData.description}</p>` : ''}
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
        const prefecture = item['都道府県'] || '';
        const city = item['勤務地(市区町村)'] || '';
        const location = [prefecture, city].filter(Boolean).join(' ') || item['所在地'] || '-';
        const salary = formatSalary(item['給与(円)']);
        const employmentType = item['雇用形態'] && item['雇用形態'] !== '情報なし' ? item['雇用形態'] : '-';
        const access = item['交通アクセス'] || item['最寄駅'] || '-';
        const employeeCount = formatEmployeeCount(item['従業員数(全体)']);
        const benefits = item['主要福利厚生']
            ? truncateText(item['主要福利厚生'], 40)
            : '詳細で確認';
        const highlight = truncateText(item['求人ハイライト'] || item['仕事内容サマリー'] || item['事業内容'] || '', 80);

        return {
            title: item['事業所名'] || '不明',
            subtitle: item['職種'] || '',
            image: getFieldValue(item, ['企業画像URL', '画像URL']),
            fields: [
                { label: '勤務地', value: location },
                { label: '基本給', value: salary },
                { label: '雇用形態', value: employmentType },
                { label: '最寄駅・交通', value: access },
                { label: '従業員数', value: employeeCount },
                { label: '主要な福利厚生', value: benefits }
            ],
            description: highlight,
            tags: [
                prefecture,
                employmentType !== '-' ? employmentType : null,
                item['昇給・賞与'] && item['昇給・賞与'] !== '情報なし' ? item['昇給・賞与'] : null,
                item['研修制度'] && item['研修制度'] !== '情報なし' ? item['研修制度'] : null
            ].filter(tag => tag)
        };
    } else {
        const prefecture = getFieldValue(item, ['都道府県']);
        const faculty = getFieldValue(item, ['学部名']);
        const department = getFieldValue(item, ['学科名']);
        const tuition = formatCurrency(getFieldValue(item, ['年間学費', '初年度納入金', '学費']));
        const deviation = formatDeviation(getFieldValue(item, ['偏差値', '評定']));
        const feature = truncateText(getFieldValue(item, ['特徴', '備考', '学校紹介', '汎用']));
        const exam = getFieldValue(item, ['選考方法']);

        return {
            title: item['学校名'] || '不明',
            subtitle: [faculty, department].filter(Boolean).join(' / '),
            image: getFieldValue(item, ['学校画像', '学校画像URL', '画像URL']),
            fields: [
                { label: '所在地', value: prefecture || item['要録用所在地'] || '-' },
                { label: '偏差値', value: deviation === '-' ? '情報なし' : deviation },
                { label: '年間学費', value: tuition },
                { label: '入試方法', value: exam || '-' }
            ],
            description: feature,
            tags: [
                prefecture,
                getFieldValue(item, ['校種']),
                getFieldValue(item, ['国公私'])
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

    refreshAfterFavoriteChange();
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
        alert('詳細表示でエラーが発生しました。データを再読み込みしてください。');
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
    refreshAfterFavoriteChange();
}

function isFavoritesOnly() {
    return elements.favoriteFilter && elements.favoriteFilter.checked;
}

function refreshAfterFavoriteChange() {
    if (isFavoritesOnly()) {
        applyFiltersAndSearch();
    } else {
        updateCards();
    }
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
        const keyInfo = [];
        const salary = formatSalary(item['給与(円)']);
        const location = [item['都道府県'] || '', item['勤務地(市区町村)'] || '']
            .filter(Boolean)
            .join(' ') || item['所在地'] || item['就業場所'] || '';
        const employmentType = item['雇用形態'] && item['雇用形態'] !== '情報なし' ? item['雇用形態'] : '';
        const holidays = item['休日日数'] ? `${item['休日日数']}日` : (item['休日制度'] && item['休日制度'] !== '情報なし' ? item['休日制度'] : '');
        const bonus = item['昇給・賞与'] && item['昇給・賞与'] !== '情報なし' ? item['昇給・賞与'] : '';
        const access = item['交通アクセス'] || item['最寄駅'] || '';

        if (salary && salary !== '-') keyInfo.push({ icon: '💰', label: '基本給', value: salary });
        if (location) keyInfo.push({ icon: '📍', label: '勤務地', value: location });
        if (employmentType) keyInfo.push({ icon: '🧾', label: '雇用形態', value: employmentType });
        if (holidays) keyInfo.push({ icon: '📅', label: '休日', value: holidays });
        if (bonus) keyInfo.push({ icon: '💹', label: '昇給・賞与', value: bonus });
        if (access) keyInfo.push({ icon: '🚃', label: '最寄り', value: access });

        return {
            title: item['事業所名'] || '不明',
            subtitle: item['職種'] || '',
            keyInfo,
            sections: [
                {
                    title: '🏢 企業基本情報',
                    icon: '🏢',
                    fields: [
                        { label: '企業名', value: item['事業所名'] || '-', important: true },
                        { label: 'フリガナ', value: item['事業所名フリガナ'] || '-' },
                        { label: '所在地', value: item['所在地'] || item['就業場所'] || '-', important: true },
                        { label: '従業員数（全体）', value: formatEmployeeCount(item['従業員数(全体)']) },
                        { label: '従業員数（就業場所）', value: formatEmployeeCount(item['従業員数(就業場所)']) },
                        { label: '資本金', value: item['資本金(億円)'] ? `${item['資本金(億円)']}億円` : '-' },
                        { label: '代表連絡先', value: item['採用担当TEL'] || '-', important: true }
                    ]
                },
                {
                    title: '🧾 職務内容詳細',
                    icon: '🧾',
                    fields: [
                        { label: '職種', value: item['職種'] || '-', important: true },
                        { label: '仕事内容', value: item['仕事内容詳細'] || item['仕事内容サマリー'] || '-', multiline: true },
                        { label: '職種分類', value: item['職種分類'] || '-' },
                        { label: '職業分類コード', value: item['職業分類コード'] || '-' },
                        { label: '職種大分類', value: item['職種大分類'] || '-' },
                        { label: '産業大分類', value: item['産業大分類'] || '-' },
                        { label: '産業分類コード', value: item['産業分類コード'] || '-' },
                        { label: '就業場所', value: item['就業場所'] || item['所在地'] || '-' }
                    ]
                },
                {
                    title: '💼 労働条件',
                    icon: '💼',
                    fields: [
                        { label: '雇用形態', value: employmentType || '-', important: true },
                        { label: '就業時間', value: item['就業時間'] || '-', important: true },
                        { label: '休日制度', value: item['休日制度'] || '-' },
                        { label: '年間休日', value: item['休日日数'] ? `${item['休日日数']}日` : '-' },
                        { label: '基本給', value: salary, highlight: true, important: true },
                        { label: '昇給・賞与', value: bonus || '-' },
                        { label: '賞与（基本給換算）', value: item['賞与(基本給、円)'] ? `${item['賞与(基本給、円)']}円` : '-' },
                        { label: '賞与（平均）', value: item['賞与(平均、万円)'] ? `${item['賞与(平均、万円)']}万円` : '-' }
                    ]
                },
                {
                    title: '✅ 応募条件',
                    icon: '✅',
                    fields: [
                        { label: '必要資格・免許', value: item['資格・免許'] || '-', important: true },
                        { label: '資格・免許詳細', value: item['資格・免許詳細'] || '-', multiline: true },
                        { label: '応募条件メモ', value: item['応募条件メモ'] || '-', multiline: true },
                        { label: '募集対象', value: getMentionTarget(item) }
                    ]
                },
                {
                    title: '🎁 福利厚生',
                    icon: '🎁',
                    fields: [
                        { label: '主要な福利厚生', value: item['主要福利厚生'] || '-', important: true },
                        { label: '福利厚生詳細', value: item['福利厚生詳細'] || '-', multiline: true },
                        { label: '交通アクセス', value: access || '-' }
                    ]
                },
                {
                    title: '🏢 会社の特徴・事業内容',
                    icon: '🏢',
                    fields: [
                        { label: '事業内容', value: item['事業内容'] || '-', multiline: true },
                        { label: '企業からのメッセージ', value: item['備考'] || '-', multiline: true }
                    ]
                },
                {
                    title: '📘 研修制度',
                    icon: '📘',
                    fields: [
                        { label: '研修制度', value: item['研修制度'] || '-', important: true },
                        { label: '研修制度詳細', value: item['研修制度詳細'] || '-', multiline: true }
                    ]
                },
                {
                    title: '📞 応募方法・連絡先',
                    icon: '📞',
                    fields: [
                        { label: '応募先郵便番号', value: item['応募先郵便番号'] || '-' },
                        { label: '応募先住所', value: item['応募先'] || '-', multiline: true },
                        { label: '採用担当部署', value: item['採用担当部署'] || '-' },
                        { label: '採用担当者', value: item['採用担当者'] || '-' },
                        { label: '電話番号', value: item['採用担当TEL'] || '-', important: true },
                        { label: 'FAX', value: item['採用担当FAX'] || '-' }
                    ]
                }
            ],
            memo: '',
            additionalInfo: ''
        };
    } else {
        // 進学データの重要情報
        const keyInfo = [];
        const schoolType = getFieldValue(item, ['校種']);
        const establishment = getFieldValue(item, ['国公私']);
        const deviation = formatDeviation(getFieldValue(item, ['偏差値', '評定']));
        const tuition = formatCurrency(getFieldValue(item, ['年間学費', '初年度納入金', '学費']));
        const employment = formatPercentage(getFieldValue(item, ['就職率']));
        if (schoolType) keyInfo.push({ icon: '🎓', label: '校種', value: schoolType });
        if (establishment) keyInfo.push({ icon: '🏛️', label: '設置', value: establishment });
        if (deviation !== '-') keyInfo.push({ icon: '📈', label: '偏差値', value: deviation });
        if (tuition !== '-') keyInfo.push({ icon: '💸', label: '学費', value: tuition });
        if (employment !== '-') keyInfo.push({ icon: '💼', label: '就職率', value: employment });

        return {
            title: item['学校名'] || '不明',
            subtitle: `${item['学部名'] || ''}${item['学科名'] ? ' ' + item['学科名'] : ''}`,
            keyInfo: keyInfo,
            sections: [
                {
                    title: '🏫 基本情報',
                    icon: '🏫',
                    fields: [
                        { label: '学校名', value: item['学校名'] || '-', important: true },
                        { label: 'フリガナ', value: item['学校名ふりがな'] || '-' },
                        { label: '校種', value: schoolType || '-', important: true },
                        { label: '国公私立', value: establishment || '-', important: true },
                        { label: '所在地', value: item['要録用所在地'] || item['所在地'] || '-' },
                        { label: 'アクセス', value: getFieldValue(item, ['アクセス', '最寄駅', '最寄り駅']) },
                        { label: '設立年', value: getFieldValue(item, ['設立年', '創立']) }
                    ]
                },
                {
                    title: '📚 学部・学科詳細',
                    icon: '📚',
                    fields: [
                        { label: '学部名', value: item['学部名'] || '-', important: true },
                        { label: '学科名', value: item['学科名'] || '-', important: true },
                        { label: 'コース', value: item['コース'] || '-' },
                        { label: '専攻', value: item['専攻'] || '-' },
                        { label: '分野', value: item['分野'] || '-' },
                        { label: 'カリキュラム', value: getFieldValue(item, ['カリキュラム', '学びの特色', '学習内容']), multiline: true },
                        { label: '取得可能資格', value: getFieldValue(item, ['取得可能資格', '目標資格']), multiline: true }
                    ]
                },
                {
                    title: '📝 入試情報',
                    icon: '📝',
                    fields: [
                        { label: '選考方法', value: item['選考方法'] || '-', important: true },
                        { label: '募集人数', value: item['人数枠'] ? `${item['人数枠']}名` : '-', important: true },
                        { label: '指定校推薦', value: item['指定校有無'] || '-' },
                        { label: '出願条件', value: item['出願条件'] || '-', multiline: true },
                        { label: '資格条件', value: item['出願条件(資格)'] || '-', multiline: true },
                        { label: '評定平均', value: item['評定'] || '-', important: true },
                        { label: '欠席基準', value: item['欠席'] || '-' },
                        { label: '試験日', value: formatExamDate(item) },
                        { label: '受付期間', value: item['受付期間'] || '-' }
                    ]
                },
                {
                    title: '💴 学費・奨学金',
                    icon: '💴',
                    fields: [
                        { label: '年間学費', value: tuition, important: true },
                        { label: '初年度納入金', value: formatCurrency(item['初年度納入金']) },
                        { label: '入学金', value: formatCurrency(item['入学金']) },
                        { label: '授業料', value: formatCurrency(item['授業料']) },
                        { label: '特待生制度', value: getFieldValue(item, ['特待生制度', '奨学金']) || '-' },
                        { label: '奨学金・支援', value: getFieldValue(item, ['奨学金情報', '学費サポート']) || '-', multiline: true }
                    ]
                },
                {
                    title: '💼 就職・進路',
                    icon: '💼',
                    fields: [
                        { label: '就職率', value: employment !== '-' ? employment : '-' },
                        { label: '主な就職先', value: getFieldValue(item, ['主な就職先', '就職先']) || '-', multiline: true },
                        { label: '進学実績', value: getFieldValue(item, ['進学実績', '主な進学先']) || '-', multiline: true },
                        { label: 'キャリアサポート', value: getFieldValue(item, ['キャリアサポート', '進路支援']) || '-', multiline: true }
                    ]
                },
                {
                    title: '🏠 施設・環境',
                    icon: '🏠',
                    fields: [
                        { label: 'キャンパス設備', value: getFieldValue(item, ['キャンパス設備', '学内設備']) || '-', multiline: true },
                        { label: '寮・住環境', value: getFieldValue(item, ['寮・住環境', '学生寮', '住まいサポート']) || '-' },
                        { label: 'クラブ・サークル', value: getFieldValue(item, ['クラブ活動', '部活動']) || '-', multiline: true },
                        { label: '留学・国際交流', value: getFieldValue(item, ['留学制度', '国際交流']) || '-', multiline: true },
                        { label: 'オープンキャンパス', value: getFieldValue(item, ['オープンキャンパス情報']) || '-' }
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
    if (item['求人ＭＦ'] && item['求人ＭＦ'] !== '0' && targets.length === 0) targets.push('男女問わず');

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
async function activateDataset(type) {
    if (!type) {
        return;
    }

    if (currentDataType === type && currentData.length > 0) {
        setActiveDatasetTab(type);
        return;
    }

    if (datasetCache[type]) {
        applyDataset(type);
        return;
    }

    await loadSampleData(type);
}

async function loadSampleData(type) {
    try {
        await ensureDataset(type);
        applyDataset(type);
    } catch (error) {
        console.error(error);
        alert(`データの読み込みに失敗しました: ${error.message}`);
    }
}

async function loadDefaultDatasets() {
    try {
        await Promise.all([
            ensureDataset('job'),
            ensureDataset('school')
        ]);
        applyDataset('job');
    } catch (error) {
        console.error(error);
        alert(`標準データの読み込みに失敗しました: ${error.message}`);
    }
}

async function ensureDataset(type) {
    if (datasetCache[type]) {
        return datasetCache[type];
    }

    const data = await fetchDatasetFile(type);

    if (data.length === 0) {
        throw new Error('サンプルデータが空です。');
    }

    const processed = preprocessDataset(data, type);
    datasetCache[type] = processed;
    return processed;
}

async function fetchDatasetFile(type) {
    const filename = DATASET_FILES[type];

    if (!filename) {
        throw new Error('不明なデータセットです。');
    }

    const response = await fetch(filename);

    if (!response.ok) {
        throw new Error('サンプルデータの読み込みに失敗しました。');
    }

    const buffer = await response.arrayBuffer();
    let text;

    try {
        // UTF-8でデコード（失敗した場合は例外を投げる）
        const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
        text = utf8Decoder.decode(buffer);
    } catch (utf8Error) {
        try {
            // Shift_JISで再デコード
            const sjisDecoder = new TextDecoder('shift_jis');
            text = sjisDecoder.decode(buffer);
        } catch (sjisError) {
            throw new Error('サンプルデータの文字コードを認識できませんでした。');
        }
    }

    return parseCSV(text);
}

function preprocessDataset(data, type) {
    if (type === 'job') {
        return data.map(enhanceJobRecord);
    }
    return data;
}

function applyDataset(type) {
    const data = datasetCache[type];

    if (!data) {
        throw new Error('データが読み込まれていません。');
    }

    originalData = data;
    currentData = data;
    currentDataType = type;
    currentFilters = {};
    filteredData = [];
    sortField = '';
    sortOrder = 'asc';
    currentPage = 1;

    if (elements.searchInput) {
        elements.searchInput.value = '';
        elements.searchInput.placeholder = type === 'job'
            ? '企業名や職種、気になるキーワードで検索...'
            : '学校名や特徴で検索...';
    }
    updateActiveFilterTags();

    setupDataView();
    if (elements.dataSection) {
        elements.dataSection.style.display = 'block';
    }
    setActiveDatasetTab(type);

    if (elements.sortOrder) {
        elements.sortOrder.textContent = '⬆️';
    }

    if (elements.sortSelect) {
        elements.sortSelect.value = '';
    }

}

function setActiveDatasetTab(type) {
    const tabs = document.querySelectorAll('.dataset-tabs .nav-item');

    tabs.forEach(tab => {
        if (tab.dataset.dataset === type) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
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