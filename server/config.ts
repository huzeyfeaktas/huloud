import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM'de __dirname yerine kullanılacak çözüm
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Yapılandırma için varsayılan değerler
const defaultConfig = {
  network: {
    enableRemoteAccess: false,
    port: 8080,
    useSSL: false,
    domain: '',
  },
  storage: {
    selectedDeviceId: 'disk-1'
  }
};

// Windows ortamında düzgün çalışması için yapılandırma dosyası yolları
let configPath: string;

// Process.cwd() ve __dirname yol çözümleme için kullanılır
try {
  // Önce varsayılan yolu dene
  const defaultPath = path.resolve(__dirname, '../storage/config.json');
  // Dosyanın bulunduğu dizin
  const configDir = path.dirname(defaultPath);
  
  // Dizin kontrol et
  if (fs.existsSync(configDir) || fs.mkdirSync(configDir, { recursive: true })) {
    configPath = defaultPath;
  } else {
    // Alternatif yol kullan
    configPath = path.resolve(process.cwd(), './storage/config.json');
  }
} catch (error) {
  // Hata durumunda alternatif yol kullan
  configPath = path.resolve(process.cwd(), './storage/config.json');
  console.log("Alternatif yapılandırma dosyası yolu kullanılıyor:", configPath);
}

// Yapılandırma dosyasını oluştur veya yükle
function ensureConfigFile() {
  try {
    // storage klasörünün varlığını kontrol et - Windows uyumlu
    const storageDir = path.resolve(__dirname, '../storage');
    if (!fs.existsSync(storageDir)) {
      try {
        fs.mkdirSync(storageDir, { recursive: true });
        console.log("Storage klasörü oluşturuldu:", storageDir);
      } catch (err) {
        console.error("Storage klasörü oluşturulamadı:", err);
        // Alternatif klasör yolu deneme
        const altStorageDir = path.resolve(process.cwd(), './storage');
        console.log("Alternatif klasör yolu deneniyor:", altStorageDir);
        fs.mkdirSync(altStorageDir, { recursive: true });
      }
    }
    
    // Yapılandırma dosyasının varlığını kontrol et
    if (!fs.existsSync(configPath)) {
      // Dosya yoksa varsayılan yapılandırma ile oluştur
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
      console.log("Yapılandırma dosyası oluşturuldu:", configPath);
    }
  } catch (error) {
    console.error('Yapılandırma dosyası oluşturulurken hata:', error);
  }
}

// Yapılandırmayı oku
function readConfig() {
  ensureConfigFile();
  try {
    const configData = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('Yapılandırma dosyası okunurken hata:', error);
    return defaultConfig;
  }
}

// Yapılandırmayı kaydet
function writeConfig(config: any) {
  ensureConfigFile();
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Yapılandırma dosyası yazılırken hata:', error);
    return false;
  }
}

// Ağ ayarlarını al
export function getNetworkConfig() {
  const config = readConfig();
  return config.network;
}

// Ağ ayarlarını güncelle
export function updateNetworkConfig(networkSettings: any) {
  const config = readConfig();
  config.network = { ...config.network, ...networkSettings };
  return writeConfig(config);
}

// Seçili depolama aygıtını al
export function getSelectedStorageDevice() {
  const config = readConfig();
  return config.storage.selectedDeviceId;
}

// Seçili depolama aygıtını güncelle
export function updateSelectedStorageDevice(deviceId: string) {
  const config = readConfig();
  config.storage.selectedDeviceId = deviceId;
  return writeConfig(config);
}

// İlk çalıştırma sırasında yapılandırma dosyasını oluştur
ensureConfigFile();

export default {
  getNetworkConfig,
  updateNetworkConfig,
  getSelectedStorageDevice,
  updateSelectedStorageDevice
};