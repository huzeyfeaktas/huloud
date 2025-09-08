# Huloud - Kişisel Bulut Depolama Sistemi

![Huloud Logo](./generated-icon.png)

Huloud, kişisel dosyalarınızı güvenli bir şekilde depolamanızı, organize etmenizi ve erişmenizi sağlayan modern bir bulut depolama çözümüdür. React ve Express.js teknolojileri kullanılarak geliştirilmiş, kullanıcı dostu arayüzü ve güçlü özellikleri ile öne çıkar.

## 📱 Uygulama Görselleri

### Ana Sayfa - Dosya Yönetimi
![1](https://github.com/user-attachments/assets/eca4041b-8545-4be9-962b-c1678f74b363)

*Mobil uyumlu ana sayfa - dosyalarınızı kolayca görüntüleyin ve yönetin*

### Kullanıcı Kayıt Sistemi
![6](https://github.com/user-attachments/assets/3ce37e15-02f5-48e4-a0ad-2ccc2536ac4f)

*Güvenli kullanıcı kayıt sistemi - hesap oluşturma ve giriş işlemleri*

## ✨ Özellikler

### 🔐 Güvenlik
- **Kullanıcı Kimlik Doğrulama**: Güvenli giriş ve kayıt sistemi
- **Oturum Yönetimi**: Express-session ile güvenli oturum kontrolü
- **Şifre Güvenliği**: Scrypt algoritması ile şifre hashleme
- **Yetkilendirme**: Kullanıcı bazlı dosya erişim kontrolü

### 📁 Dosya Yönetimi
![5](https://github.com/user-attachments/assets/e918be32-e244-45ff-a763-65859ebb1c2a)


- **Dosya Yükleme**: Sürükle-bırak ile kolay dosya yükleme
- **Klasör Yapısı**: Hiyerarşik klasör organizasyonu
- **Dosya Türleri**: Resim, video, belge ve diğer dosya türleri desteği
- **Dosya Önizleme**: Desteklenen dosya türleri için önizleme
- **Arama**: Dosya ve klasör arama özelliği
- **Sıralama**: Boyut, tarih ve isim bazlı sıralama

### 🎨 Kullanıcı Arayüzü
![2](https://github.com/user-attachments/assets/97391073-3de3-485c-ada9-eb6d90c2b15a)
![7](https://github.com/user-attachments/assets/908118c2-6b46-400a-812e-56be88f8bbf6)

- **Modern Tasarım**: Tailwind CSS ile şık ve modern arayüz
- **Responsive**: Mobil ve masaüstü uyumlu tasarım
- **Dark/Light Mode**: Tema değiştirme özelliği
- **Drag & Drop**: Sürükle-bırak ile dosya yükleme
- **Context Menu**: Sağ tık menüsü ile hızlı işlemler

### 📊 Depolama Yönetimi
![4](https://github.com/user-attachments/assets/f781fa24-025d-4e65-99c7-7ec29aa5e5ae)
- **Depolama İstatistikleri**: Kullanılan ve boş alan görüntüleme
- **Kullanıcı Kotası**: Kullanıcı bazlı depolama limitleri
- **Sistem Bilgileri**: Disk kullanım durumu
- **Flash Drive Desteği**: Harici depolama cihazları desteği

### 👥 Yönetim Paneli
- **Kullanıcı Yönetimi**: Admin paneli ile kullanıcı kontrolü
- **Sistem Ayarları**: Ağ ve depolama yapılandırması
- **İstatistikler**: Sistem kullanım raporları

## 🛠️ Teknolojiler

### Frontend
- **React 18**: Modern React hooks ve bileşenler
- **TypeScript**: Tip güvenliği ve geliştirici deneyimi
- **Tailwind CSS**: Utility-first CSS framework
- **Vite**: Hızlı geliştirme ve build aracı
- **React Query**: Server state yönetimi
- **Wouter**: Hafif routing çözümü
- **Lucide React**: Modern ikonlar
- **React Hook Form**: Form yönetimi
- **Sonner**: Toast bildirimleri

### Backend
- **Node.js**: JavaScript runtime
- **Express.js**: Web framework
- **TypeScript**: Tip güvenliği
- **Drizzle ORM**: Modern ORM çözümü
- **Passport.js**: Kimlik doğrulama
- **Multer**: Dosya yükleme
- **Express Session**: Oturum yönetimi

### Veritabanı
- **Neon Database**: PostgreSQL bulut veritabanı
- **JSON Storage**: Yerel dosya depolama

### Geliştirme Araçları
- **ESLint**: Kod kalitesi
- **Prettier**: Kod formatlama
- **PostCSS**: CSS işleme
- **Autoprefixer**: CSS vendor prefix

## 🚀 Kurulum

### Gereksinimler
- Node.js 18+ 
- npm veya yarn
- PostgreSQL veritabanı (Neon Database önerilen)

### Hızlı Başlangıç

1. **Projeyi klonlayın**
```bash
git clone <repository-url>
cd CloudStorageSync
```

2. **Bağımlılıkları yükleyin**
```bash
npm install
```

3. **Veritabanını ayarlayın**
```bash
npm run db:push
```

4. **Uygulamayı başlatın**
```bash
npm run dev
```

### Manuel Kurulum

1. **Ortam değişkenlerini ayarlayın**
```bash
cp .env.example .env
```

2. **Veritabanı bağlantısını yapılandırın**
`.env` dosyasında `DATABASE_URL` değişkenini ayarlayın

3. **Depolama klasörünü oluşturun**
```bash
mkdir storage
mkdir storage/users
```

4. **Uygulamayı production modunda çalıştırın**
```bash
npm run build
npm start
```

## 📖 Kullanım

### İlk Giriş
1. Uygulamayı başlattıktan sonra `http://localhost:3000` adresine gidin
2. "Yeni Hesap Oluşturun" seçeneğini tıklayın
3. Kullanıcı bilgilerinizi girin ve hesabınızı oluşturun
4. Giriş yaparak dosyalarınızı yüklemeye başlayın

### Dosya İşlemleri
- **Dosya Yükleme**: "Yükle" butonuna tıklayın veya dosyaları sürükleyip bırakın
- **Klasör Oluşturma**: "Yeni Klasör" butonunu kullanın
- **Dosya Silme**: Dosyaya sağ tıklayıp "Sil" seçeneğini seçin
- **Dosya İndirme**: Dosyaya tıklayarak indirin
- **Dosya Paylaşma**: Paylaşım linkini oluşturun

### Admin Paneli
Admin yetkisine sahip kullanıcılar:
- Tüm kullanıcıları görüntüleyebilir
- Sistem ayarlarını değiştirebilir
- Depolama istatistiklerini inceleyebilir

### Uzaktan Erişim
Uygulamayı ağ üzerinden erişilebilir hale getirmek için:
1. `storage/config.json` dosyasını düzenleyin
2. `allowRemoteAccess: true` olarak ayarlayın
3. Uygulamayı yeniden başlatın

## ⚙️ Yapılandırma

### Ortam Değişkenleri
```env
DATABASE_URL=postgresql://username:password@host:port/database
SESSION_SECRET=your-secret-key
PORT=3000
NODE_ENV=development
```

### Yapılandırma Dosyası
`storage/config.json` dosyası ile sistem ayarlarını yapılandırabilirsiniz:

```json
{
  "network": {
    "allowRemoteAccess": false,
    "port": 3000,
    "ssl": {
      "enabled": false,
      "cert": "",
      "key": ""
    },
    "domain": "localhost"
  },
  "storage": {
    "deviceId": "default"
  }
}
```

## 🐳 Docker ile Çalıştırma

```dockerfile
# Dockerfile örneği
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```bash
docker build -t huloud .
docker run -p 3000:3000 -v $(pwd)/storage:/app/storage huloud
```

## 🔧 Sistem Gereksinimleri

### Minimum
- **RAM**: 512 MB
- **Disk**: 1 GB boş alan
- **CPU**: 1 core
- **Ağ**: 10 Mbps

### Önerilen
- **RAM**: 2 GB+
- **Disk**: 10 GB+ boş alan
- **CPU**: 2+ cores
- **Ağ**: 100 Mbps+

## 📁 Proje Yapısı

```
CloudStorageSync/
├── client/                 # Frontend React uygulaması
│   ├── src/
│   │   ├── components/     # React bileşenleri
│   │   ├── pages/         # Sayfa bileşenleri
│   │   ├── hooks/         # Custom hooks
│   │   └── lib/           # Yardımcı kütüphaneler
│   └── index.html
├── server/                # Backend Express uygulaması
│   ├── auth.ts           # Kimlik doğrulama
│   ├── routes.ts         # API rotaları
│   ├── db.ts             # Veritabanı bağlantısı
│   ├── config.ts         # Sistem yapılandırması
│   └── services/         # İş mantığı servisleri
├── shared/               # Paylaşılan tipler ve şemalar
│   └── schema.ts
├── storage/              # Dosya depolama
│   ├── users/           # Kullanıcı dosyaları
│   └── config.json      # Sistem yapılandırması
└── package.json
```

## 🔌 API Dokümantasyonu

### Kimlik Doğrulama
- `POST /api/auth/register` - Kullanıcı kaydı
- `POST /api/auth/login` - Kullanıcı girişi
- `POST /api/auth/logout` - Kullanıcı çıkışı
- `GET /api/auth/me` - Mevcut kullanıcı bilgileri

### Dosya İşlemleri
- `GET /api/files` - Dosya listesi
- `POST /api/files/upload` - Dosya yükleme
- `DELETE /api/files/:id` - Dosya silme
- `PUT /api/files/:id` - Dosya güncelleme
- `GET /api/files/:id/download` - Dosya indirme

### Klasör İşlemleri
- `POST /api/folders` - Klasör oluşturma
- `GET /api/folders/:id` - Klasör içeriği
- `DELETE /api/folders/:id` - Klasör silme
- `PUT /api/folders/:id` - Klasör yeniden adlandırma

### Sistem
- `GET /api/system/stats` - Sistem istatistikleri
- `GET /api/system/config` - Sistem yapılandırması
- `PUT /api/system/config` - Yapılandırma güncelleme

## 🚀 Deployment

### Systemd Servisi (Linux)

```ini
[Unit]
Description=Huloud Cloud Storage
After=network.target

[Service]
Type=simple
User=huloud
WorkingDirectory=/opt/huloud
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### PM2 ile Çalıştırma

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

## 🤝 Katkıda Bulunma

1. Bu repository'yi fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

### Geliştirme Kuralları
- TypeScript kullanın
- ESLint kurallarına uyun
- Test yazın
- Commit mesajlarını anlamlı yazın
- Dokümantasyonu güncelleyin

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 🙏 Teşekkürler

- React ekibine modern frontend framework için
- Express.js topluluğuna güçlü backend çözümü için
- Tailwind CSS ekibine harika CSS framework için
- Tüm açık kaynak katkıda bulunanlara

## 📞 İletişim

Sorularınız veya önerileriniz için:
- GitHub Issues kullanın
- Pull Request gönderin
- Dokümantasyonu inceleyin

---


**Huloud** - Dosyalarınızı güvenle saklayın, her yerden erişin! 🚀

