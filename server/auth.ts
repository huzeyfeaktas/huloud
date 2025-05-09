import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // SESSION_SECRET ortam değişkeni yoksa varsayılan bir değer kullan
  const sessionSecret = process.env.SESSION_SECRET || 'huloud-gizli-anahtar-degistirin';
  
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 hafta
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Kullanıcı kaydı API'si
  app.post("/api/register", async (req, res, next) => {
    try {
      // Kullanıcı adı veya e-posta zaten var mı kontrol et
      const existingByUsername = await storage.getUserByUsername(req.body.username);
      if (existingByUsername) {
        return res.status(400).json({ 
          message: "Bu kullanıcı adı zaten kullanımda." 
        });
      }

      const existingByEmail = await storage.getUserByEmail(req.body.email);
      if (existingByEmail) {
        return res.status(400).json({ 
          message: "Bu e-posta adresi zaten kullanımda." 
        });
      }

      // Şifreyi hash'le
      const hashedPassword = await hashPassword(req.body.password);

      // Kullanıcı oluştur
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

      // Oluşturulan kullanıcıyla giriş yap
      req.login(user, (err) => {
        if (err) return next(err);
        // Şifreyi gizle
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  // Kullanıcı girişi API'si
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error, user: SelectUser) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: "Kullanıcı adı veya şifre yanlış." });
      }
      
      req.login(user, (err) => {
        if (err) return next(err);
        // Şifreyi gizle
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  // Kullanıcı çıkışı API'si
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Mevcut kullanıcı bilgilerini getir
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Oturum açılmamış." });
    }
    // Şifreyi gizle
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    res.json(userWithoutPassword);
  });

  // Kullanıcı bilgilerini güncelle
  app.patch("/api/user", (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Oturum açılmamış." });
    }

    // Şifre değişikliği varsa
    if (req.body.password) {
      // Yeni implementasyon gerekecek
      // Şifre değiştirme işlemleri burada yapılacak
    }

    // Diğer kullanıcı bilgilerini güncelle
    // Bu fonksiyon henüz implement edilmedi, storage.ts'ye eklenecek
    
    res.status(200).json({ message: "Kullanıcı bilgileri güncellendi." });
  });
}