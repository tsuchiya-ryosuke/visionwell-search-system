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

const DEFAULT_PREFECTURE = '愛知県';

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

const DEFAULT_ACADEMIC_GROUP_LABEL = 'その他・総合';
const ACADEMIC_GROUP_PATTERNS = [
    { label: '医療・看護・福祉', keywords: ['医学', '医療', '看護', '福祉', '保健', 'リハビリ', 'リハビリテーション', '薬学', '薬剤', '臨床', '健康', '栄養', '作業療法', '理学療法', '診療', '検査', '放射線', '救急', 'リハ', '医療技術', '医療福祉', '医療保健'] },
    { label: '教育・保育', keywords: ['教育', '教職', '保育', '幼児', '児童', '子ども', 'こども', '養護', '初等', '中等', '特別支援'] },
    { label: '経済・経営・商', keywords: ['経済', '経営', '商学', '商業', '会計', 'ビジネス', '流通', 'マーケティング', 'マネジメント', '金融', '観光マネジメント', 'ホスピタリティ', '国際経営'] },
    { label: '人文・社会・国際', keywords: ['文学', '文芸', '人文', '外国語', '英語', '言語', '国際', '教養', '人間', '社会', '社会学', '心理', 'コミュニケーション', 'メディア', '観光', '文化', '歴史', '地域', '現代', 'グローバル', '日本', 'アジア', 'リベラルアーツ'] },
    { label: '法・政治・政策', keywords: ['法学', '法律', '政治', '政策', '公共', '行政', '国際関係', 'リーガル'] },
    { label: '理工・情報', keywords: ['理工', '理学', '工学', '情報', '科学', 'サイエンス', 'テクノロジー', '機械', '電気', '電子', '建築', '土木', '環境', '数理', '数学', '物理', '化学', '生命科学', '工業', 'システム', 'データ', 'AI', 'コンピュータ', '材料', '航空', '宇宙', 'エネルギー', '制御', '通信', 'ロボット', '応用理', '応用化学'] },
    { label: '芸術・スポーツ', keywords: ['芸術', '美術', '音楽', '舞台', '映像', 'デザイン', 'アート', '造形', 'スポーツ', '体育', 'ダンス', '表現', 'パフォーマンス'] },
    { label: '生活・家政・食', keywords: ['家政', '生活', '食物', '食', 'フード', '調理', '製菓', '住居', '人間生活', 'ライフデザイン', '衣'] },
    { label: '農学・生命・自然', keywords: ['農', '生命', 'バイオ', '食農', '水産', '動物', '獣医', '植物', '農芸', '園芸', '酪農', '森林', '自然', '海洋', 'アグリ', '資源', '里山'] }
];

const DEFAULT_EXAM_METHOD_GROUP_LABEL = 'その他';
const EXAM_METHOD_GROUP_PATTERNS = [
    { label: '書類選考', keywords: ['書類'] },
    { label: '小論文・作文・プレゼン', keywords: ['小論文', '作文', 'プレゼン', '講義レポート', 'レポート', '発表'] },
    { label: '面接・口頭', keywords: ['面接', '口頭試問', 'グループ面接'] },
    { label: '学科・筆記・適性', keywords: ['学科', '学力', '筆記', '適性', '検査', 'テスト'] },
    { label: '活動評価・その他', keywords: ['課外活動', '活動評価', '課題', '評価'] }
];

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

function escapeHtml(text) {
    if (text === null || text === undefined) {
        return '';
    }

    return text.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function buildGroupedOptions(values, classifier, groupOrder, defaultLabel = '') {
    const grouped = new Map();

    values.forEach(value => {
        if (!value) {
            return;
        }

        const groupLabel = classifier(value) || defaultLabel || DEFAULT_ACADEMIC_GROUP_LABEL;
        if (!grouped.has(groupLabel)) {
            grouped.set(groupLabel, new Set());
        }

        grouped.get(groupLabel).add(value);
    });

    const orderedLabels = groupOrder && groupOrder.length
        ? groupOrder
        : Array.from(grouped.keys()).sort((a, b) => a.localeCompare(b, 'ja'));

    return orderedLabels
        .filter(label => grouped.has(label))
        .map(label => ({
            label,
            options: Array.from(grouped.get(label))
                .sort((a, b) => a.localeCompare(b, 'ja'))
        }));
}

function classifyAcademicGroup(name) {
    if (!name) {
        return DEFAULT_ACADEMIC_GROUP_LABEL;
    }

    const normalized = name.toString().replace(/\s+/g, '');

    for (const pattern of ACADEMIC_GROUP_PATTERNS) {
        if (pattern.keywords.some(keyword => normalized.includes(keyword))) {
            return pattern.label;
        }
    }

    return DEFAULT_ACADEMIC_GROUP_LABEL;
}

function getAcademicGroupedOptions(field) {
    const values = getUniqueValues(field);
    const order = [...ACADEMIC_GROUP_PATTERNS.map(pattern => pattern.label), DEFAULT_ACADEMIC_GROUP_LABEL];
    return buildGroupedOptions(values, classifyAcademicGroup, order, DEFAULT_ACADEMIC_GROUP_LABEL);
}

function classifyExamMethodGroup(value) {
    if (!value) {
        return DEFAULT_EXAM_METHOD_GROUP_LABEL;
    }

    const normalized = value.toString().replace(/\s+/g, '');

    for (const pattern of EXAM_METHOD_GROUP_PATTERNS) {
        if (pattern.keywords.some(keyword => normalized.includes(keyword))) {
            return pattern.label;
        }
    }

    return DEFAULT_EXAM_METHOD_GROUP_LABEL;
}

function getExamMethodGroupedOptions() {
    const values = getUniqueValues('選考方法');
    const order = [...EXAM_METHOD_GROUP_PATTERNS.map(pattern => pattern.label), DEFAULT_EXAM_METHOD_GROUP_LABEL];
    return buildGroupedOptions(values, classifyExamMethodGroup, order, DEFAULT_EXAM_METHOD_GROUP_LABEL);
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

const PREFECTURE_CITY_FALLBACK = {
    '埼玉': [
        'さいたま市', '川越市', '熊谷市', '川口市', '行田市', '秩父市', '所沢市', '飯能市',
        '加須市', '本庄市', '東松山市', '春日部市', '狭山市', '羽生市', '鴻巣市', '深谷市',
        '上尾市', '草加市', '越谷市', '蕨市', '戸田市', '入間市', '朝霞市', '志木市',
        '和光市', '新座市', '桶川市', '久喜市', '北本市', '八潮市', '富士見市', '三郷市',
        '蓮田市', '坂戸市', '幸手市', '鶴ヶ島市', '日高市', '吉川市', 'ふじみ野市', '白岡市',
        '伊奈町', '三芳町', '毛呂山町', '越生町', '滑川町', '嵐山町', '小川町', '川島町',
        '吉見町', '鳩山町', 'ときがわ町', '横瀬町', '皆野町', '長瀞町', '小鹿野町', '東秩父村',
        '美里町', '神川町', '上里町', '寄居町', '宮代町', '杉戸町', '松伏町'
    ],
    '東京': [
        '千代田区', '中央区', '港区', '新宿区', '文京区', '台東区', '墨田区', '江東区', '品川区', '目黒区',
        '大田区', '世田谷区', '渋谷区', '中野区', '杉並区', '豊島区', '北区', '荒川区', '板橋区', '練馬区',
        '足立区', '葛飾区', '江戸川区', '八王子市', '立川市', '武蔵野市', '三鷹市', '青梅市', '府中市', '昭島市',
        '調布市', '町田市', '小金井市', '小平市', '日野市', '東村山市', '国分寺市', '国立市', '福生市', '狛江市',
        '東大和市', '清瀬市', '東久留米市', '武蔵村山市', '多摩市', '稲城市', '羽村市', 'あきる野市', '西東京市',
        '瑞穂町', '日の出町', '檜原村', '奥多摩町', '大島町', '利島村', '新島村', '神津島村', '三宅村', '御蔵島村',
        '八丈町', '青ヶ島村', '小笠原村'
    ],
    '大阪': [
        '大阪市', '堺市', '岸和田市', '豊中市', '池田市', '吹田市', '泉大津市', '高槻市', '貝塚市', '守口市',
        '枚方市', '茨木市', '八尾市', '泉佐野市', '富田林市', '寝屋川市', '河内長野市', '松原市', '大東市', '和泉市',
        '箕面市', '柏原市', '羽曳野市', '門真市', '摂津市', '高石市', '藤井寺市', '東大阪市', '泉南市', '四條畷市',
        '交野市', '大阪狭山市', '阪南市', '島本町', '豊能町', '能勢町', '忠岡町', '熊取町', '田尻町', '岬町',
        '太子町', '河南町', '千早赤阪村'
    ],
    '京都': [
        '京都市', '福知山市', '舞鶴市', '綾部市', '宇治市', '宮津市', '亀岡市', '城陽市', '向日市', '長岡京市',
        '八幡市', '京田辺市', '京丹後市', '南丹市', '木津川市', '大山崎町', '久御山町', '井手町', '宇治田原町',
        '笠置町', '和束町', '精華町', '南山城村', '京丹波町', '伊根町', '与謝野町'
    ],
    '兵庫': [
        '神戸市', '姫路市', '尼崎市', '明石市', '西宮市', '洲本市', '芦屋市', '伊丹市', '相生市', '豊岡市',
        '加古川市', '赤穂市', '西脇市', '宝塚市', '三木市', '高砂市', '川西市', '小野市', '三田市', '加西市',
        '丹波篠山市', '養父市', '朝来市', '淡路市', '宍粟市', '加東市', 'たつの市', '猪名川町', '多可町', '稲美町',
        '播磨町', '市川町', '福崎町', '神河町', '太子町', '上郡町', '佐用町', '香美町', '新温泉町'
    ],
    '千葉': [
        '千葉市', '銚子市', '市川市', '船橋市', '館山市', '木更津市', '松戸市', '野田市', '茂原市', '成田市',
        '佐倉市', '東金市', '旭市', '習志野市', '柏市', '勝浦市', '市原市', '流山市', '八千代市', '我孫子市',
        '鴨川市', '鎌ケ谷市', '君津市', '富津市', '浦安市', '四街道市', '袖ケ浦市', '八街市', '印西市', '白井市',
        '富里市', '南房総市', '匝瑳市', '香取市', '山武市', 'いすみ市', '酒々井町', '栄町', '神崎町', '多古町',
        '東庄町', '九十九里町', '芝山町', '横芝光町', '一宮町', '睦沢町', '長生村', '白子町', '長柄町', '長南町',
        '大多喜町', '御宿町', '鋸南町'
    ],
    '奈良': [
        '奈良市', '大和高田市', '大和郡山市', '天理市', '橿原市', '桜井市', '五條市', '御所市', '生駒市', '香芝市',
        '葛城市', '宇陀市', '山添村', '平群町', '三郷町', '斑鳩町', '安堵町', '川西町', '三宅町', '田原本町',
        '曽爾村', '御杖村', '高取町', '明日香村', '上牧町', '王寺町', '広陵町', '河合町', '吉野町', '大淀町',
        '下市町', '黒滝村', '天川村', '野迫川村', '十津川村', '下北山村', '上北山村', '川上村', '東吉野村'
    ],
    '岐阜': [
        '岐阜市', '大垣市', '高山市', '多治見市', '関市', '中津川市', '美濃市', '瑞浪市', '羽島市', '恵那市',
        '美濃加茂市', '土岐市', '各務原市', '可児市', '山県市', '瑞穂市', '飛騨市', '本巣市', '郡上市', '下呂市',
        '海津市', '岐南町', '笠松町', '養老町', '垂井町', '関ケ原町', '神戸町', '輪之内町', '安八町', '揖斐川町',
        '大野町', '池田町', '北方町', '坂祝町', '富加町', '川辺町', '七宗町', '八百津町', '白川町', '東白川村',
        '御嵩町', '白川村'
    ],
    '愛知': [
        '名古屋市', '豊橋市', '岡崎市', '一宮市', '瀬戸市', '半田市', '春日井市', '豊川市', '津島市', '碧南市',
        '刈谷市', '豊田市', '安城市', '西尾市', '蒲郡市', '犬山市', '常滑市', '江南市', '小牧市', '稲沢市',
        '新城市', '東海市', '大府市', '知多市', '知立市', '尾張旭市', '高浜市', '岩倉市', '豊明市', '日進市',
        '田原市', '愛西市', '清須市', '北名古屋市', '弥富市', 'みよし市', 'あま市', '長久手市', '東郷町', '豊山町',
        '大口町', '扶桑町', '大治町', '蟹江町', '飛島村', '阿久比町', '東浦町', '南知多町', '美浜町', '武豊町',
        '幸田町', '設楽町', '東栄町', '豊根村'
    ],
    '石川': [
        '金沢市', '七尾市', '小松市', '輪島市', '珠洲市', '加賀市', '羽咋市', 'かほく市', '白山市', '能美市',
        '野々市市', '川北町', '津幡町', '内灘町', '志賀町', '宝達志水町', '中能登町', '穴水町', '能登町'
    ],
    '神奈川': [
        '横浜市', '川崎市', '相模原市', '横須賀市', '平塚市', '鎌倉市', '藤沢市', '小田原市', '茅ヶ崎市', '逗子市',
        '三浦市', '秦野市', '厚木市', '大和市', '伊勢原市', '海老名市', '座間市', '南足柄市', '綾瀬市', '葉山町',
        '寒川町', '大磯町', '二宮町', '中井町', '大井町', '松田町', '山北町', '開成町', '箱根町', '真鶴町',
        '湯河原町', '愛川町', '清川村'
    ],
    '福岡': [
        '北九州市', '福岡市', '大牟田市', '久留米市', '直方市', '飯塚市', '田川市', '柳川市', '八女市', '筑後市',
        '大川市', '行橋市', '豊前市', '中間市', '小郡市', '筑紫野市', '春日市', '大野城市', '宗像市', '太宰府市',
        '古賀市', '福津市', 'うきは市', '宮若市', '嘉麻市', '朝倉市', 'みやま市', '糸島市', '那珂川市', '宇美町',
        '篠栗町', '志免町', '須恵町', '新宮町', '久山町', '粕屋町', '芦屋町', '水巻町', '岡垣町', '遠賀町',
        '小竹町', '鞍手町', '桂川町', '筑前町', '東峰村', '大刀洗町', '大木町', '広川町', '香春町', '添田町',
        '糸田町', '川崎町', '大任町', '赤村', '福智町', '苅田町', 'みやこ町', '吉富町', '上毛町', '築上町'
    ],
    '群馬': [
        '前橋市', '高崎市', '桐生市', '伊勢崎市', '太田市', '沼田市', '館林市', '渋川市', '藤岡市', '富岡市',
        '安中市', 'みどり市', '榛東村', '吉岡町', '上野村', '神流町', '下仁田町', '南牧村', '甘楽町', '中之条町',
        '長野原町', '嬬恋村', '草津町', '高山村', '東吾妻町', '片品村', '川場村', '昭和村', 'みなかみ町', '玉村町',
        '板倉町', '明和町', '千代田町', '大泉町', '邑楽町'
    ],
    '長野': [
        '長野市', '松本市', '上田市', '岡谷市', '飯田市', '諏訪市', '須坂市', '小諸市', '伊那市', '駒ヶ根市',
        '中野市', '大町市', '飯山市', '茅野市', '塩尻市', '佐久市', '千曲市', '東御市', '安曇野市', '小海町',
        '川上村', '南牧村', '南相木村', '北相木村', '佐久穂町', '軽井沢町', '御代田町', '立科町', '青木村', '長和町',
        '下諏訪町', '富士見町', '原村', '辰野町', '箕輪町', '飯島町', '南箕輪村', '中川村', '宮田村', '松川町',
        '高森町', '阿南町', '阿智村', '平谷村', '根羽村', '下條村', '売木村', '天龍村', '泰阜村', '喬木村',
        '豊丘村', '大鹿村', '上松町', '南木曽町', '木曽町', '木祖村', '王滝村', '大桑村', '山ノ内町', '木島平村',
        '野沢温泉村', '信濃町', '小川村', '飯綱町', '栄村'
    ],
    '静岡': [
        '静岡市', '浜松市', '沼津市', '熱海市', '三島市', '富士宮市', '伊東市', '島田市', '富士市', '磐田市',
        '焼津市', '掛川市', '藤枝市', '御殿場市', '袋井市', '下田市', '裾野市', '湖西市', '伊豆市', '御前崎市',
        '菊川市', '伊豆の国市', '牧之原市', '東伊豆町', '河津町', '南伊豆町', '松崎町', '西伊豆町', '函南町', '清水町',
        '長泉町', '小山町', '吉田町', '川根本町', '森町'
    ],
    '三重': [
        '津市', '四日市市', '伊勢市', '松阪市', '桑名市', '鈴鹿市', '名張市', '尾鷲市', '亀山市', '鳥羽市',
        '熊野市', 'いなべ市', '志摩市', '伊賀市', '木曽岬町', '東員町', '菰野町', '朝日町', '川越町', '多気町',
        '明和町', '大台町', '玉城町', '度会町', '大紀町', '南伊勢町', '紀北町', '御浜町', '紀宝町'
    ]
};

function normalizePrefectureName(name) {
    if (!name) {
        return '';
    }

    const trimmed = name.toString().trim();
    if (!trimmed) {
        return '';
    }

    if (trimmed === '北海道') {
        return '北海道';
    }

    return trimmed.replace(/(都|道|府|県)$/u, '');
}

function formatPrefectureDisplayName(name) {
    const normalized = normalizePrefectureName(name);
    if (!normalized) {
        return '';
    }

    if (normalized === '北海道') {
        return '北海道';
    }

    if (normalized === '東京') {
        return '東京都';
    }

    if (normalized === '京都') {
        return '京都府';
    }

    if (normalized === '大阪') {
        return '大阪府';
    }

    if (/(都|道|府|県)$/u.test(normalized)) {
        return normalized;
    }

    return `${normalized}県`;
}

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

function sanitizePositiveNumber(value) {
    const num = normalizeNumber(value);
    if (num === null || isNaN(num) || num <= 0) {
        return null;
    }
    return num;
}

function formatNumberWithPrecision(num, decimals = 2) {
    const fixed = num.toFixed(decimals);
    if (!fixed.includes('.')) {
        return fixed;
    }
    return fixed.replace(/0+$/, '').replace(/\.$/, '');
}

function formatBonusMonthsValue(num) {
    if (num === null) {
        return null;
    }
    const decimals = num >= 10 ? 1 : 2;
    return `${formatNumberWithPrecision(num, decimals)}か月分`;
}

function formatBonusAmountValue(num) {
    if (num === null) {
        return null;
    }
    const decimals = num >= 100 ? 0 : num >= 10 ? 1 : 2;
    return `${formatNumberWithPrecision(num, decimals)}万円`;
}

function getBonusValues(item) {
    return {
        monthsValue: sanitizePositiveNumber(item['賞与(基本給、円)']),
        amountValue: sanitizePositiveNumber(item['賞与(平均、万円)'])
    };
}

function getBonusDetail(item) {
    const { monthsValue, amountValue } = getBonusValues(item);
    const monthsText = formatBonusMonthsValue(monthsValue);
    const amountText = formatBonusAmountValue(amountValue);

    const parts = [];
    if (monthsText) {
        parts.push(`基本給換算 ${monthsText}`);
    }
    if (amountText) {
        parts.push(`平均 ${amountText}`);
    }

    return {
        monthsValue,
        amountValue,
        monthsText,
        amountText,
        displayText: parts.length ? parts.join(' / ') : null
    };
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

function formatAverageRating(value) {
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
    const { monthsValue, amountValue } = getBonusValues(item);
    const text = remarks || '';
    const hasRaise = /昇給/.test(text);

    if (monthsValue !== null || amountValue !== null) {
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

        if (Array.isArray(value)) {
            const container = getGroupedMultiSelectContainer(field);
            if (container) {
                const optionCheckboxes = container.querySelectorAll('.multi-select-options input[type="checkbox"]');
                optionCheckboxes.forEach(checkbox => {
                    checkbox.checked = value.includes(checkbox.value);
                });
                updateGroupedMultiSelectHeaderState(field);
            }
        } else if (value && typeof value === 'object') {
            if (value.type === 'text') {
                const input = document.getElementById(`filter_${fieldId}`);
                if (input) {
                    input.value = value.raw;
                }
                return;
            }
            const minInput = document.getElementById(`filter_${fieldId}_min`);
            const maxInput = document.getElementById(`filter_${fieldId}_max`);

            if (minInput && value.min !== undefined) {
                minInput.value = value.min;
            }
            if (maxInput && value.max !== undefined) {
                maxInput.value = value.max;
            }
        } else {
            const element = document.getElementById(`filter_${fieldId}`);
            if (element) {
                element.value = value;
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

function setupFilters() {
    const filterConfig = getFilterConfig(currentDataType);

    // 優先度でソート
    const sortedFilters = filterConfig.sort((a, b) => a.priority - b.priority);

    filterLabelMap = {};
    const basicFilters = [];
    const detailFilters = [];

    sortedFilters.forEach(filter => {
        filterLabelMap[filter.field] = filter.label;
        const isBasic = filter.priority === 1;
        const filterMarkup = createFilterHTML(filter, { isCompact: isBasic });

        if (isBasic) {
            basicFilters.push(filterMarkup);
        } else {
            detailFilters.push({ filter, html: filterMarkup });
        }
    });

    if (!filterLabelMap['産業大分類']) {
        filterLabelMap['産業大分類'] = '🌐 業界ジャンル';
    }

    if (!filterLabelMap['職種大分類']) {
        filterLabelMap['職種大分類'] = '🧭 しごとのジャンル';
    }

    const activeDetailCount = detailFilters.filter(({ filter }) => isFilterActive(filter.field)).length;
    const detailSection = detailFilters.length
        ? `
            <details class="filter-details"${activeDetailCount ? ' open' : ''}>
                <summary>
                    <span>詳細条件を設定</span>
                    ${activeDetailCount ? `<span class="detail-counter">${activeDetailCount}件選択中</span>` : ''}
                </summary>
                <div class="filter-details-grid">
                    ${detailFilters.map(item => item.html).join('')}
                </div>
            </details>
        `
        : '';

    const filterHTML = `
        <form id="filterForm" class="filter-form" onsubmit="handleFilterSubmit(event)">
            <div class="filter-basic-grid">
                ${basicFilters.join('')}
                <div class="filter-actions">
                    <button type="submit" class="btn btn-primary">検索</button>
                </div>
            </div>
            ${detailSection}
        </form>
    `;

    elements.filterContent.innerHTML = filterHTML;

    restoreFilterSelections();
    setupFilterEventListeners();
    const dependenciesChanged = updateDependentFilters();
    if (dependenciesChanged) {
        updateActiveFilterTags();
    }
}

function getCompactLabel(label) {
    if (!label) {
        return '';
    }
    return label.replace(/^[^\u3040-\u30FF\u4E00-\u9FFF0-9A-Za-z]+/, '').trim();
}

function createFilterHTML(filter, options = {}) {
    const { isCompact = false } = options;
    const fieldId = filter.field.replace(/[()]/g, '').replace(/\s+/g, '_');
    const wrapperClasses = ['filter-field'];
    if (isCompact) {
        wrapperClasses.push('filter-field--compact');
    }
    if (['grouped_multi_select', 'salary_range', 'company_size', 'select_searchable'].includes(filter.type)) {
        wrapperClasses.push('filter-field--full');
    }

    const labelText = filter.compactLabel || getCompactLabel(filter.label);
    const placeholder = filter.placeholder || `${labelText || '条件'}を選択`;
    const showLabel = !isCompact || ['salary_range', 'company_size', 'grouped_multi_select', 'select_searchable', 'text'].includes(filter.type);
    const showDescription = !isCompact && filter.description;
    const labelMarkup = showLabel ? `<label class="field-label" for="filter_${fieldId}">${labelText}</label>` : '';
    const staticLabelMarkup = showLabel ? `<div class="field-label">${labelText}</div>` : '';
    const descriptionMarkup = showDescription ? `<p class="field-description">${filter.description}</p>` : '';
    const ariaLabelAttr = showLabel ? '' : ` aria-label="${labelText}"`;

    let html = `<div class="${wrapperClasses.join(' ')}" data-field="${filter.field}">`;

    switch (filter.type) {
        case 'industry_classification': {
            const majorOptions = getAvailableIndustryMajorOptions();
            const selectedMajor = currentFilters['産業大分類'] || '';
            const majorFieldId = '産業大分類'.replace(/[()]/g, '').replace(/\s+/g, '_');
            const industryLabel = showLabel ? `<label class="field-label" for="filter_${majorFieldId}">${labelText}</label>` : '';
            html += `
                ${industryLabel}
                <select id="filter_${majorFieldId}"${ariaLabelAttr}
                        onchange="handleIndustryMajorFilterChange(this.value)">
                    <option value="">${placeholder}</option>
                    ${majorOptions.map(opt => `<option value="${opt}"${opt === selectedMajor ? ' selected' : ''}>${opt}</option>`).join('')}
                </select>
                ${descriptionMarkup}
            `;
            break;
        }

        case 'grouped_multi_select': {
            const showGroupOnly = Boolean(filter.showGroupOnly);
            const groups = typeof filter.getOptions === 'function'
                ? filter.getOptions()
                : [];
            const availableValues = new Set();
            groups.forEach(group => {
                (group.options || []).forEach(option => availableValues.add(option));
            });

            const previousSelections = Array.isArray(currentFilters[filter.field])
                ? currentFilters[filter.field]
                : [];
            const sanitizedSelections = previousSelections.filter(value => availableValues.has(value));

            if (previousSelections.length && sanitizedSelections.length !== previousSelections.length) {
                if (sanitizedSelections.length) {
                    currentFilters[filter.field] = sanitizedSelections;
                } else {
                    delete currentFilters[filter.field];
                }
            }

            const selectedValues = Array.isArray(currentFilters[filter.field])
                ? currentFilters[filter.field]
                : sanitizedSelections;

            const searchPlaceholder = filter.searchPlaceholder || 'キーワードで検索';

            html += `
                ${staticLabelMarkup}
                ${descriptionMarkup}
            `;

            if (groups.length === 0) {
                html += `
                    <div class="grouped-multi-select" data-field="${filter.field}">
                        <p class="empty-options">選択肢が見つかりません</p>
                    </div>
                `;
                break;
            }

            const containerClasses = ['grouped-multi-select'];
            if (showGroupOnly) {
                containerClasses.push('grouped-multi-select--group-only');
            }

            html += `
                <div class="${containerClasses.join(' ')}" data-field="${filter.field}">
                    ${showGroupOnly ? '' : `
                    <div class="multi-select-search">
                        <input type="text" id="filter_search_${fieldId}" placeholder="${escapeHtml(searchPlaceholder)}"
                               oninput="filterGroupedMultiSelectOptions('${filter.field}', this.value)">
                    </div>`}
                    <div class="multi-select-groups">
                        ${groups.map(group => {
                            const encodedGroupOptions = encodeURIComponent(JSON.stringify(group.options || []));
                            const groupClasses = ['multi-select-group'];
                            if (showGroupOnly) {
                                groupClasses.push('multi-select-group--group-only');
                            }
                            const optionContainerClasses = ['multi-select-options'];
                            if (showGroupOnly) {
                                optionContainerClasses.push('multi-select-options--hidden');
                            }
                            return `
                                <div class="${groupClasses.join(' ')}" data-group-label="${escapeHtml(group.label)}">
                                    <label class="multi-select-group-header">
                                        <input type="checkbox" class="multi-select-group-toggle"
                                               data-group-options="${encodedGroupOptions}"
                                               onchange="toggleMultiSelectGroup('${filter.field}', this)">
                                        <span>${escapeHtml(group.label)}</span>
                                    </label>
                                    <div class="${optionContainerClasses.join(' ')}">
                                        ${(group.options || []).map(option => {
                                            const safeValue = escapeHtml(option);
                                            const isChecked = selectedValues.includes(option);
                                            return `
                                                <label class="multi-select-option">
                                                    <input type="checkbox" value="${safeValue}" ${isChecked ? 'checked' : ''}
                                                           onchange="toggleMultiSelectOption('${filter.field}', this.value, this.checked)">
                                                    <span>${safeValue}</span>
                                                </label>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
            break;
        }

        case 'text': {
            const currentValue = currentFilters[filter.field] && typeof currentFilters[filter.field] === 'object'
                && currentFilters[filter.field].type === 'text'
                ? currentFilters[filter.field].raw
                : (currentFilters[filter.field] || '');
            html += `
                ${labelMarkup}
                <input type="text" id="filter_${fieldId}"${ariaLabelAttr}
                       placeholder="${escapeHtml(placeholder)}"
                       value="${escapeHtml(currentValue)}"
                       oninput="updateTextFilter('${filter.field}', this.value)">
                ${descriptionMarkup}
            `;
            break;
        }

        case 'job_classification': {
            const majorOptions = getAvailableJobMajorOptions();
            const selectedMajor = currentFilters['職種大分類'] || '';
            const majorFieldId = '職種大分類'.replace(/[()]/g, '').replace(/\s+/g, '_');
            const jobLabel = showLabel ? `<label class="field-label" for="filter_${majorFieldId}">${labelText}</label>` : '';
            html += `
                ${jobLabel}
                <select id="filter_${majorFieldId}"${ariaLabelAttr}
                        onchange="handleJobMajorFilterChange(this.value)">
                    <option value="">${placeholder}</option>
                    ${majorOptions.map(opt => `<option value="${opt}"${opt === selectedMajor ? ' selected' : ''}>${opt}</option>`).join('')}
                </select>
                ${descriptionMarkup}
            `;
            break;
        }

        case 'select': {
            const options = filter.options || getUniqueValues(filter.field);
            html += `
                ${labelMarkup}
                <select id="filter_${fieldId}"${ariaLabelAttr} onchange="updateFilter('${filter.field}', this.value)">
                    <option value="">${placeholder}</option>
                    ${options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                </select>
                ${descriptionMarkup}
            `;
            break;
        }

        case 'prefecture_city': {
            const prefectureField = filter.dependsOn || '都道府県';
            const selectedPrefecture = currentFilters[prefectureField] || '';
            const selectedCity = currentFilters[filter.field] || '';
            const cityOptions = selectedPrefecture
                ? getCityOptions(filter.field, prefectureField, selectedPrefecture)
                : [];
            const defaultPlaceholder = filter.placeholder || '市区町村を選択してください';
            const cityPlaceholder = selectedPrefecture ? defaultPlaceholder : '先に都道府県を選択';
            const cityDisabled = selectedPrefecture ? '' : 'disabled';
            html += `
                ${labelMarkup}
                <select id="filter_${fieldId}"${ariaLabelAttr}
                        data-filter-type="prefecture_city"
                        data-city-field="${filter.field}"
                        data-prefecture-field="${prefectureField}"
                        onchange="updateFilter('${filter.field}', this.value)"
                        ${cityDisabled}>
                    <option value="">${cityPlaceholder}</option>
                    ${cityOptions.map(opt => `<option value="${opt}"${opt === selectedCity ? ' selected' : ''}>${opt}</option>`).join('')}
                </select>
                ${descriptionMarkup}
            `;
            break;
        }

        case 'select_searchable': {
            const searchableOptions = filter.options || getUniqueValues(filter.field);
            const searchLabel = showLabel ? `<label class="field-label" for="filter_search_${fieldId}">${labelText}</label>` : '';
            html += `
                ${searchLabel}
                ${descriptionMarkup}
                <div class="searchable-select">
                    <input type="text" id="filter_search_${fieldId}" placeholder="検索して選択..."
                           oninput="filterSelectOptions('${filter.field}', this.value)">
                    <select id="filter_${fieldId}" onchange="updateFilter('${filter.field}', this.value)" size="5" style="display:none;">
                        <option value="">${placeholder}</option>
                        ${searchableOptions.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                    </select>
                </div>
            `;
            break;
        }

        case 'range': {
            const min = filter.min || 0;
            const max = filter.max || 100;
            const step = filter.step || 1;
            html += `
                ${staticLabelMarkup}
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
                ${descriptionMarkup}
            `;
            break;
        }

        case 'salary_range': {
            html += `
                ${staticLabelMarkup}
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
                ${descriptionMarkup}
            `;
            break;
        }

        case 'company_size': {
            html += `
                ${staticLabelMarkup}
                <div class="company-size-filter">
                    <div class="size-buttons">
                        <button type="button" class="size-btn" onclick="setCompanySize('${filter.field}', 1, 50)">小企業<br>(〜50人)</button>
                        <button type="button" class="size-btn" onclick="setCompanySize('${filter.field}', 51, 300)">中企業<br>(51〜300人)</button>
                        <button type="button" class="size-btn" onclick="setCompanySize('${filter.field}', 301, 999999)">大企業<br>(301人〜)</button>
                    </div>
                </div>
                ${descriptionMarkup}
            `;
            break;
        }
    }

    html += '</div>';
    return html;
}
    
function setupFilterEventListeners() {
    document.querySelectorAll('.searchable-select input').forEach(input => {
        input.addEventListener('focus', function() {
            const select = this.nextElementSibling;
            select.style.display = 'block';
        });

        input.addEventListener('blur', function() {
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

function enhanceSchoolRecord(item) {
    const record = { ...item };
    const normalizedPrefecture = normalizePrefectureName(record['都道府県']);
    if (normalizedPrefecture) {
        record['都道府県'] = formatPrefectureDisplayName(normalizedPrefecture);
    }
    const baseAddress = record['要録用所在地'] || record['所在地'] || '';
    record['所在地(市区町村)'] = extractCityFromAddress(baseAddress);
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

function getGroupedMultiSelectContainer(field) {
    return Array.from(document.querySelectorAll('.grouped-multi-select'))
        .find(container => container.dataset.field === field) || null;
}

function updateGroupedMultiSelectHeaderState(field) {
    const container = getGroupedMultiSelectContainer(field);
    if (!container) {
        return;
    }

    container.querySelectorAll('.multi-select-group').forEach(groupElement => {
        const headerCheckbox = groupElement.querySelector('.multi-select-group-toggle');
        if (!headerCheckbox) {
            return;
        }

        const optionCheckboxes = Array.from(groupElement.querySelectorAll('.multi-select-options input[type="checkbox"]'));
        if (optionCheckboxes.length === 0) {
            headerCheckbox.checked = false;
            headerCheckbox.indeterminate = false;
            return;
        }

        const checkedCount = optionCheckboxes.filter(checkbox => checkbox.checked).length;
        headerCheckbox.checked = checkedCount > 0 && checkedCount === optionCheckboxes.length;
        headerCheckbox.indeterminate = checkedCount > 0 && checkedCount < optionCheckboxes.length;
    });
}

function toggleMultiSelectOption(field, value, isChecked) {
    const normalizedValue = value;
    const currentSelections = Array.isArray(currentFilters[field]) ? [...currentFilters[field]] : [];
    const valueIndex = currentSelections.indexOf(normalizedValue);

    if (isChecked) {
        if (valueIndex === -1) {
            currentSelections.push(normalizedValue);
        }
        currentFilters[field] = currentSelections;
    } else {
        if (valueIndex !== -1) {
            currentSelections.splice(valueIndex, 1);
        }

        if (currentSelections.length > 0) {
            currentFilters[field] = currentSelections;
        } else {
            delete currentFilters[field];
        }
    }

    updateGroupedMultiSelectHeaderState(field);
    updateDependentFilters();
    updateActiveFilterTags();
    applyFiltersAndSearch();
}

function toggleMultiSelectGroup(field, checkboxElement) {
    if (!checkboxElement) {
        return;
    }

    const datasetValue = checkboxElement.dataset.groupOptions || '';
    let options = [];

    if (datasetValue) {
        try {
            const parsed = JSON.parse(decodeURIComponent(datasetValue));
            if (Array.isArray(parsed)) {
                options = parsed;
            }
        } catch (error) {
            console.error('Failed to parse group options for field:', field, error);
        }
    }

    if (options.length === 0) {
        checkboxElement.checked = false;
        checkboxElement.indeterminate = false;
        return;
    }

    const shouldCheck = checkboxElement.checked;
    const existingSelections = Array.isArray(currentFilters[field]) ? currentFilters[field] : [];
    const selectionSet = new Set(existingSelections);

    if (shouldCheck) {
        options.forEach(option => selectionSet.add(option));
    } else {
        options.forEach(option => selectionSet.delete(option));
    }

    const updatedSelections = Array.from(selectionSet);
    if (updatedSelections.length > 0) {
        currentFilters[field] = updatedSelections;
    } else {
        delete currentFilters[field];
    }

    const groupElement = checkboxElement.closest('.multi-select-group');
    if (groupElement) {
        const optionCheckboxes = groupElement.querySelectorAll('.multi-select-options input[type="checkbox"]');
        optionCheckboxes.forEach(optionCheckbox => {
            optionCheckbox.checked = shouldCheck;
        });
    }

    updateGroupedMultiSelectHeaderState(field);
    updateDependentFilters();
    updateActiveFilterTags();
    applyFiltersAndSearch();
}

function filterGroupedMultiSelectOptions(field, searchTerm) {
    const container = getGroupedMultiSelectContainer(field);
    if (!container) {
        return;
    }

    const normalizedTerm = searchTerm.trim().toLowerCase();
    const optionElements = container.querySelectorAll('.multi-select-option');

    optionElements.forEach(optionElement => {
        const labelText = optionElement.textContent.trim().toLowerCase();
        const matches = !normalizedTerm || labelText.includes(normalizedTerm);
        optionElement.style.display = matches ? '' : 'none';
    });

    container.querySelectorAll('.multi-select-group').forEach(groupElement => {
        const hasVisibleOption = Array.from(groupElement.querySelectorAll('.multi-select-option'))
            .some(optionElement => optionElement.style.display !== 'none');
        groupElement.style.display = hasVisibleOption ? '' : 'none';
    });
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

function getCityOptions(cityField, prefectureField, selectedPrefecture) {
    const source = originalData.length ? originalData : currentData;
    const citySet = new Set();
    const normalizedSelectedPrefecture = normalizePrefectureName(selectedPrefecture);

    source.forEach(row => {
        const prefecture = normalizePrefectureName(row[prefectureField] || '');
        const city = row[cityField] || '';

        if (!city) {
            return;
        }

        if (!normalizedSelectedPrefecture || prefecture === normalizedSelectedPrefecture) {
            citySet.add(city);
        }
    });

    const fallbackCities = normalizedSelectedPrefecture
        ? (PREFECTURE_CITY_FALLBACK[normalizedSelectedPrefecture] || [])
        : [];

    if (citySet.size === 0 && fallbackCities.length > 0) {
        return [...new Set(fallbackCities)].sort((a, b) => a.localeCompare(b, 'ja'));
    }

    return Array.from(citySet).sort((a, b) => a.localeCompare(b, 'ja'));
}

function getFilterConfig(dataType) {
    if (dataType === 'job') {
        return [
            {
                field: '都道府県',
                label: '🗾 勤務地(都道府県)',
                type: 'select',
                priority: 1,
                description: '働きたい都道府県を選択',
                placeholder: '勤務地を選択'
            },
            {
                field: '勤務地(市区町村)',
                label: '🏙️ 勤務地(市区町村)',
                type: 'prefecture_city',
                priority: 1,
                description: '選択した都道府県内の市区町村を選択',
                dependsOn: '都道府県',
                placeholder: '市区町村を選択'
            },
            {
                field: '職種大分類',
                label: '🧭 しごとのジャンル',
                type: 'job_classification',
                priority: 1,
                description: '気になるお仕事ジャンルで絞り込み',
                placeholder: '職種を選択'
            },
            {
                field: '産業分類コード',
                label: '🏭 業界ジャンル',
                type: 'industry_classification',
                priority: 1,
                description: '興味のある業界ジャンルで絞り込み',
                placeholder: '業界を選択'
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
                field: '学校名',
                label: '🏫 学校名',
                type: 'text',
                priority: 1,
                description: '学校名を直接入力して検索できます',
                placeholder: '学校名を入力'
            },
            {
                field: '都道府県',
                label: '🗾 都道府県',
                type: 'select',
                priority: 1,
                description: '通学したい地域を選んでください',
                placeholder: '都道府県を選択'
            },
            {
                field: '校種',
                label: '🎓 学校種別',
                type: 'select',
                priority: 1,
                description: '大学・短大・専門学校などを選べます',
                placeholder: '学校種別を選択'
            },
            {
                field: '学部名',
                label: '📚 学部・系統',
                type: 'grouped_multi_select',
                priority: 1,
                description: '学びたい学部・系統名で絞り込み',
                getOptions: () => getAcademicGroupedOptions('学部名'),
                searchPlaceholder: '学部名を検索',
                showGroupOnly: true
            },
            {
                field: '学科名',
                label: '🔬 学科・コース',
                type: 'grouped_multi_select',
                priority: 1,
                description: '気になる学科やコース名で検索',
                getOptions: () => getAcademicGroupedOptions('学科名'),
                searchPlaceholder: '学科・コース名を検索',
                showGroupOnly: true
            },
            {
                field: '偏差値',
                label: '📈 平均評定（1〜5）',
                type: 'range',
                priority: 2,
                description: '志望レベルに合わせて平均評定(1〜5)の目安を指定',
                min: 1,
                max: 5,
                step: 0.1
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
        const normalizedMap = new Map();

        uniqueValues.forEach(value => {
            const normalized = normalizePrefectureName(value);
            if (!normalized) {
                return;
            }
            if (!normalizedMap.has(normalized)) {
                normalizedMap.set(normalized, formatPrefectureDisplayName(normalized));
            }
        });

        const ordered = [];
        PREFECTURE_ORDER.forEach(pref => {
            const normalized = normalizePrefectureName(pref);
            if (normalizedMap.has(normalized)) {
                ordered.push(formatPrefectureDisplayName(normalized));
                normalizedMap.delete(normalized);
            }
        });

        const remaining = Array.from(normalizedMap.values())
            .sort((a, b) => a.localeCompare(b, 'ja'));

        return [...ordered, ...remaining];
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
            { field: '偏差値', label: '平均評定（1〜5）' }
        ];
    }
}

// フィルタ・検索・ソート処理
function updateDependentFilters() {
    const cityChanged = updatePrefectureCityFilterOptions();

    if (currentDataType === 'job') {
        const industryChanged = updateIndustryFilterOptions();
        const jobChanged = updateJobClassificationFilterOptions();
        return cityChanged || industryChanged || jobChanged;
    }

    return cityChanged;
}

function updatePrefectureCityFilterOptions() {
    const selects = document.querySelectorAll('select[data-filter-type="prefecture_city"]');

    if (selects.length === 0) {
        return false;
    }

    let filtersChanged = false;

    selects.forEach(select => {
        const cityField = select.dataset.cityField;
        const prefectureField = select.dataset.prefectureField;

        if (!cityField || !prefectureField) {
            return;
        }

        const selectedPrefecture = currentFilters[prefectureField] || '';
        const selectedCity = currentFilters[cityField] || '';
        const previousValue = select.value || selectedCity;

        if (!selectedPrefecture) {
            select.innerHTML = '<option value="">先に都道府県を選択</option>';
            select.value = '';
            select.disabled = true;

            if (currentFilters[cityField]) {
                delete currentFilters[cityField];
                filtersChanged = true;
            }
            return;
        }

        const options = getCityOptions(cityField, prefectureField, selectedPrefecture);

        select.disabled = false;
        select.innerHTML = '<option value="">市区町村を選択してください</option>' +
            options.map(opt => `<option value="${opt}">${opt}</option>`).join('');

        const valueToRestore = selectedCity || previousValue;

        if (valueToRestore && options.includes(valueToRestore)) {
            select.value = valueToRestore;
        } else {
            select.value = '';
            if (currentFilters[cityField]) {
                delete currentFilters[cityField];
                filtersChanged = true;
            }
        }
    });

    return filtersChanged;
}

function updateIndustryFilterOptions() {
    const majorSelect = document.getElementById('filter_産業大分類');
    if (!majorSelect) {
        return false;
    }

    const majorSelection = currentFilters['産業大分類'] || '';
    const options = getAvailableIndustryMajorOptions();

    majorSelect.innerHTML = '<option value="">業界を選択</option>' +
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

    majorSelect.innerHTML = '<option value="">職種を選択</option>' +
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

function updateTextFilter(field, rawValue) {
    const trimmed = rawValue.trim();

    if (trimmed) {
        currentFilters[field] = {
            type: 'text',
            value: trimmed,
            raw: rawValue
        };
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
        if (Array.isArray(value)) {
            if (value.length === 0) {
                return;
            }
            const label = filterLabelMap[field] || field;
            const joined = value.join('、');
            tagsHTML += `<span class="filter-tag" onclick="removeFilter('${field}')">${label}: ${joined} ×</span>`;
        } else if (value && typeof value === 'object') {
            if (value.type === 'text') {
                const label = filterLabelMap[field] || field;
                const textValue = value.value || '';
                if (textValue) {
                    tagsHTML += `<span class="filter-tag" onclick="removeFilter('${field}')">${label}: ${textValue} ×</span>`;
                }
            } else if (value.min !== undefined || value.max !== undefined) {
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

function handleFilterSubmit(event) {
    event.preventDefault();
    performSearch();
}

function performSearch() {
    applyFiltersAndSearch();
}

function applyFiltersAndSearch() {
    let data = [...originalData];

    // フィルタ適用
    Object.entries(currentFilters).forEach(([field, value]) => {
        if (value && typeof value === 'object' && value.type === 'text') {
            const textValue = value.value.trim().toLowerCase();
            if (!textValue) {
                return;
            }
            data = data.filter(row => {
                const target = (row[field] || '').toString().toLowerCase();
                return target.includes(textValue);
            });
        } else if (Array.isArray(value)) {
            const selections = value.filter(item => item !== null && item !== undefined && item !== '');
            if (selections.length === 0) {
                return;
            }
            data = data.filter(row => selections.includes(row[field]));
        } else if (value && typeof value === 'object') {
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
            if (field === '都道府県') {
                const normalizedTarget = normalizePrefectureName(value);
                data = data.filter(row => normalizePrefectureName(row[field]) === normalizedTarget);
            } else {
                data = data.filter(row => row[field] === value);
            }
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
        const averageRating = formatAverageRating(getFieldValue(item, ['偏差値', '評定']));
        const feature = truncateText(getFieldValue(item, ['特徴', '備考', '学校紹介', '汎用']));
        const exam = getFieldValue(item, ['選考方法']);

        return {
            title: item['学校名'] || '不明',
            subtitle: [faculty, department].filter(Boolean).join(' / '),
            image: getFieldValue(item, ['学校画像', '学校画像URL', '画像URL']),
            fields: [
                { label: '所在地', value: prefecture || item['要録用所在地'] || '-' },
                { label: '平均評定（1〜5）', value: averageRating === '-' ? '情報なし' : averageRating },
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
        const bonusDetails = getBonusDetail(item);
        const access = item['交通アクセス'] || item['最寄駅'] || '';

        const bonusDetailFields = [];
        if (bonusDetails.monthsText) {
            bonusDetailFields.push({ label: '賞与（月数換算）', value: bonusDetails.monthsText });
        }
        if (bonusDetails.amountText) {
            bonusDetailFields.push({ label: '賞与（平均額）', value: bonusDetails.amountText });
        }
        if (bonusDetailFields.length === 0) {
            bonusDetailFields.push({ label: '賞与', value: '-' });
        }

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
                        { label: 'しごとのジャンル', value: item['職種大分類'] || '-' },
                        { label: '業界ジャンル', value: item['産業大分類'] || '-' },
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
                        ...bonusDetailFields
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
        const averageRating = formatAverageRating(getFieldValue(item, ['偏差値', '評定']));
        const employment = formatPercentage(getFieldValue(item, ['就職率']));
        if (schoolType) keyInfo.push({ icon: '🎓', label: '校種', value: schoolType });
        if (establishment) keyInfo.push({ icon: '🏛️', label: '設置', value: establishment });
        if (averageRating !== '-') keyInfo.push({ icon: '📈', label: '平均評定（1〜5）', value: averageRating });
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
                        { label: '平均評定（1〜5）', value: item['評定'] || '-', important: true },
                        { label: '欠席基準', value: item['欠席'] || '-' },
                        { label: '試験日', value: formatExamDate(item) },
                        { label: '受付期間', value: item['受付期間'] || '-' }
                    ]
                },
                {
                    title: '💴 学費・奨学金',
                    icon: '💴',
                    fields: [
                        { label: '初年度納入金', value: formatCurrency(item['初年度納入金']), important: true },
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
    if (type === 'school') {
        return data.map(enhanceSchoolRecord);
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

    const normalizedDefaultPrefecture = normalizePrefectureName(DEFAULT_PREFECTURE);
    const hasDefaultPrefecture = data.some(row => normalizePrefectureName(row['都道府県']) === normalizedDefaultPrefecture);
    if (hasDefaultPrefecture) {
        currentFilters['都道府県'] = DEFAULT_PREFECTURE;
    }

    if (elements.searchInput) {
        elements.searchInput.value = '';
        elements.searchInput.placeholder = type === 'job'
            ? '企業名や職種、気になるキーワードで検索...'
            : '学校名や特徴で検索...';
    }

    setupDataView();
    updateActiveFilterTags();
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
