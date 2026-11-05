export interface PrefectureStat {
  name: string;
  region: string;
  population: number;
  area: number;
}

export interface CityPoint {
  name: string;
  prefecture: string;
  lat: number;
  lon: number;
}

export interface WorldCity {
  name: string;
  country: string;
  timeZone: string;
  lat: number;
  lon: number;
}

export const PREFECTURE_DATA_NOTE =
  '人口は2020年国勢調査、面積は国土地理院の公表値を参考にした概算です。最新の値は各自治体・統計機関の公表資料をご確認ください。';

export const PREFECTURE_STATS: PrefectureStat[] = [
  { name: '北海道', region: '北海道', population: 5224614, area: 83424 },
  { name: '青森県', region: '東北', population: 1237984, area: 9646 },
  { name: '岩手県', region: '東北', population: 1210534, area: 15275 },
  { name: '宮城県', region: '東北', population: 2301996, area: 7282 },
  { name: '秋田県', region: '東北', population: 959502, area: 11638 },
  { name: '山形県', region: '東北', population: 1068027, area: 9323 },
  { name: '福島県', region: '東北', population: 1833152, area: 13784 },
  { name: '茨城県', region: '関東', population: 2867009, area: 6097 },
  { name: '栃木県', region: '関東', population: 1933146, area: 6408 },
  { name: '群馬県', region: '関東', population: 1939110, area: 6362 },
  { name: '埼玉県', region: '関東', population: 7344765, area: 3798 },
  { name: '千葉県', region: '関東', population: 6284480, area: 5157 },
  { name: '東京都', region: '関東', population: 14047594, area: 2194 },
  { name: '神奈川県', region: '関東', population: 9237337, area: 2416 },
  { name: '新潟県', region: '中部', population: 2201272, area: 12584 },
  { name: '富山県', region: '中部', population: 1034814, area: 4247 },
  { name: '石川県', region: '中部', population: 1132526, area: 4186 },
  { name: '福井県', region: '中部', population: 766863, area: 4190 },
  { name: '山梨県', region: '中部', population: 809974, area: 4465 },
  { name: '長野県', region: '中部', population: 2048011, area: 13562 },
  { name: '岐阜県', region: '中部', population: 1978742, area: 10621 },
  { name: '静岡県', region: '中部', population: 3633202, area: 7777 },
  { name: '愛知県', region: '中部', population: 7542415, area: 5173 },
  { name: '三重県', region: '近畿', population: 1770254, area: 5774 },
  { name: '滋賀県', region: '近畿', population: 1413610, area: 4017 },
  { name: '京都府', region: '近畿', population: 2578087, area: 4612 },
  { name: '大阪府', region: '近畿', population: 8837685, area: 1905 },
  { name: '兵庫県', region: '近畿', population: 5465002, area: 8401 },
  { name: '奈良県', region: '近畿', population: 1324473, area: 3691 },
  { name: '和歌山県', region: '近畿', population: 922584, area: 4725 },
  { name: '鳥取県', region: '中国', population: 553407, area: 3507 },
  { name: '島根県', region: '中国', population: 671126, area: 6708 },
  { name: '岡山県', region: '中国', population: 1888432, area: 7114 },
  { name: '広島県', region: '中国', population: 2799702, area: 8479 },
  { name: '山口県', region: '中国', population: 1342059, area: 6112 },
  { name: '徳島県', region: '四国', population: 719559, area: 4147 },
  { name: '香川県', region: '四国', population: 950244, area: 1877 },
  { name: '愛媛県', region: '四国', population: 1334841, area: 5676 },
  { name: '高知県', region: '四国', population: 691527, area: 7104 },
  { name: '福岡県', region: '九州', population: 5135214, area: 4986 },
  { name: '佐賀県', region: '九州', population: 811442, area: 2441 },
  { name: '長崎県', region: '九州', population: 1312317, area: 4131 },
  { name: '熊本県', region: '九州', population: 1738301, area: 7409 },
  { name: '大分県', region: '九州', population: 1123852, area: 6341 },
  { name: '宮崎県', region: '九州', population: 1069576, area: 7735 },
  { name: '鹿児島県', region: '九州', population: 1588256, area: 9187 },
  { name: '沖縄県', region: '沖縄', population: 1467480, area: 2281 },
];

export const JAPAN_CITIES: CityPoint[] = [
  { name: '札幌', prefecture: '北海道', lat: 43.0618, lon: 141.3545 },
  { name: '函館', prefecture: '北海道', lat: 41.7687, lon: 140.7288 },
  { name: '青森', prefecture: '青森県', lat: 40.8222, lon: 140.7474 },
  { name: '盛岡', prefecture: '岩手県', lat: 39.7019, lon: 141.1545 },
  { name: '仙台', prefecture: '宮城県', lat: 38.2682, lon: 140.8694 },
  { name: '秋田', prefecture: '秋田県', lat: 39.7186, lon: 140.1024 },
  { name: '山形', prefecture: '山形県', lat: 38.2404, lon: 140.3633 },
  { name: '福島', prefecture: '福島県', lat: 37.7608, lon: 140.4747 },
  { name: '水戸', prefecture: '茨城県', lat: 36.3667, lon: 140.4667 },
  { name: '宇都宮', prefecture: '栃木県', lat: 36.5551, lon: 139.8828 },
  { name: '前橋', prefecture: '群馬県', lat: 36.3911, lon: 139.0608 },
  { name: 'さいたま', prefecture: '埼玉県', lat: 35.8617, lon: 139.6455 },
  { name: '千葉', prefecture: '千葉県', lat: 35.6074, lon: 140.1065 },
  { name: '東京', prefecture: '東京都', lat: 35.6762, lon: 139.6503 },
  { name: '横浜', prefecture: '神奈川県', lat: 35.4437, lon: 139.638 },
  { name: '新潟', prefecture: '新潟県', lat: 37.9161, lon: 139.0364 },
  { name: '富山', prefecture: '富山県', lat: 36.6953, lon: 137.2113 },
  { name: '金沢', prefecture: '石川県', lat: 36.5613, lon: 136.6562 },
  { name: '福井', prefecture: '福井県', lat: 36.0641, lon: 136.2196 },
  { name: '甲府', prefecture: '山梨県', lat: 35.6642, lon: 138.5684 },
  { name: '長野', prefecture: '長野県', lat: 36.6486, lon: 138.1948 },
  { name: '岐阜', prefecture: '岐阜県', lat: 35.4233, lon: 136.7606 },
  { name: '静岡', prefecture: '静岡県', lat: 34.9756, lon: 138.3828 },
  { name: '名古屋', prefecture: '愛知県', lat: 35.1815, lon: 136.9066 },
  { name: '津', prefecture: '三重県', lat: 34.7303, lon: 136.5086 },
  { name: '大津', prefecture: '滋賀県', lat: 35.0045, lon: 135.8686 },
  { name: '京都', prefecture: '京都府', lat: 35.0116, lon: 135.7681 },
  { name: '大阪', prefecture: '大阪府', lat: 34.6937, lon: 135.5023 },
  { name: '神戸', prefecture: '兵庫県', lat: 34.6901, lon: 135.1955 },
  { name: '奈良', prefecture: '奈良県', lat: 34.6851, lon: 135.8048 },
  { name: '和歌山', prefecture: '和歌山県', lat: 34.2305, lon: 135.1708 },
  { name: '鳥取', prefecture: '鳥取県', lat: 35.5011, lon: 134.2351 },
  { name: '松江', prefecture: '島根県', lat: 35.4723, lon: 133.0505 },
  { name: '岡山', prefecture: '岡山県', lat: 34.6551, lon: 133.9195 },
  { name: '広島', prefecture: '広島県', lat: 34.3853, lon: 132.4553 },
  { name: '山口', prefecture: '山口県', lat: 34.1859, lon: 131.4714 },
  { name: '徳島', prefecture: '徳島県', lat: 34.0703, lon: 134.5548 },
  { name: '高松', prefecture: '香川県', lat: 34.3428, lon: 134.0466 },
  { name: '松山', prefecture: '愛媛県', lat: 33.8392, lon: 132.7657 },
  { name: '高知', prefecture: '高知県', lat: 33.5597, lon: 133.5311 },
  { name: '福岡', prefecture: '福岡県', lat: 33.5904, lon: 130.4017 },
  { name: '佐賀', prefecture: '佐賀県', lat: 33.2494, lon: 130.2988 },
  { name: '長崎', prefecture: '長崎県', lat: 32.7503, lon: 129.8777 },
  { name: '熊本', prefecture: '熊本県', lat: 32.8031, lon: 130.7079 },
  { name: '大分', prefecture: '大分県', lat: 33.2396, lon: 131.6093 },
  { name: '宮崎', prefecture: '宮崎県', lat: 31.9111, lon: 131.4239 },
  { name: '鹿児島', prefecture: '鹿児島県', lat: 31.5966, lon: 130.5571 },
  { name: '那覇', prefecture: '沖縄県', lat: 26.2124, lon: 127.6809 },
];

export const WORLD_CITIES: WorldCity[] = [
  { name: '東京', country: '日本', timeZone: 'Asia/Tokyo', lat: 35.6762, lon: 139.6503 },
  { name: 'ソウル', country: '韓国', timeZone: 'Asia/Seoul', lat: 37.5665, lon: 126.978 },
  { name: '北京', country: '中国', timeZone: 'Asia/Shanghai', lat: 39.9042, lon: 116.4074 },
  { name: 'シンガポール', country: 'シンガポール', timeZone: 'Asia/Singapore', lat: 1.3521, lon: 103.8198 },
  { name: 'バンコク', country: 'タイ', timeZone: 'Asia/Bangkok', lat: 13.7563, lon: 100.5018 },
  { name: 'デリー', country: 'インド', timeZone: 'Asia/Kolkata', lat: 28.6139, lon: 77.209 },
  { name: 'ドバイ', country: 'UAE', timeZone: 'Asia/Dubai', lat: 25.2048, lon: 55.2708 },
  { name: 'モスクワ', country: 'ロシア', timeZone: 'Europe/Moscow', lat: 55.7558, lon: 37.6173 },
  { name: 'ロンドン', country: 'イギリス', timeZone: 'Europe/London', lat: 51.5074, lon: -0.1278 },
  { name: 'パリ', country: 'フランス', timeZone: 'Europe/Paris', lat: 48.8566, lon: 2.3522 },
  { name: 'ベルリン', country: 'ドイツ', timeZone: 'Europe/Berlin', lat: 52.52, lon: 13.405 },
  { name: 'カイロ', country: 'エジプト', timeZone: 'Africa/Cairo', lat: 30.0444, lon: 31.2357 },
  { name: 'ニューヨーク', country: 'アメリカ', timeZone: 'America/New_York', lat: 40.7128, lon: -74.006 },
  { name: 'ロサンゼルス', country: 'アメリカ', timeZone: 'America/Los_Angeles', lat: 34.0522, lon: -118.2437 },
  { name: 'サンパウロ', country: 'ブラジル', timeZone: 'America/Sao_Paulo', lat: -23.5505, lon: -46.6333 },
  { name: 'ホノルル', country: 'アメリカ', timeZone: 'Pacific/Honolulu', lat: 21.3069, lon: -157.8583 },
  { name: 'シドニー', country: 'オーストラリア', timeZone: 'Australia/Sydney', lat: -33.8688, lon: 151.2093 },
  { name: 'オークランド', country: 'ニュージーランド', timeZone: 'Pacific/Auckland', lat: -36.8509, lon: 174.7645 },
];

export const CITY_DATA_NOTE =
  '都市の緯度経度は中心部の代表点をもとにした概算です。距離は地球を球体とみなした大円距離で、実際の道路距離・鉄道距離とは異なります。';
