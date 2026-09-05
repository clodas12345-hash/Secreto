# 📱 Como Gerar o Aplicativo Nativo (.APK / Android Studio)

O projeto **GKD Secreto** já está 100% configurado com **Capacitor Mobile** para ser compilado como aplicativo nativo Android (.apk / .aab) e iOS.

---

### Passo 1: Exportar o Código do AI Studio
1. No menu superior direito do Google AI Studio, clique em **Export** (ou **Download ZIP** / **Export to GitHub**).
2. Extraia o arquivo ZIP na sua máquina.

---

### Passo 2: Instalar Dependências e Gerar a Pasta Android
Abra o terminal na pasta do projeto e execute:

```bash
# 1. Instalar as dependências
npm install

# 2. Gerar o build otimizado da aplicação
npm run build

# 3. Adicionar a plataforma Android nativa (executar apenas na primeira vez)
npx cap add android

# 4. Sincronizar os arquivos compilados com o Android nativo
npx cap sync
```

---

### Passo 3: Abrir no Android Studio e Gerar o .APK
Com o [Android Studio](https://developer.android.com/studio) instalado no seu computador:

```bash
npx cap open android
```

1. O **Android Studio** será aberto com o projeto nativo carregado.
2. No menu superior do Android Studio, clique em:
   👉 **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
3. Quando o processo terminar, clique em **"locate"** no canto inferior direito para pegar o seu arquivo **`app-debug.apk`** pronto para instalar em qualquer celular Android via WhatsApp, cabo USB ou Drive!

---

### 📦 Para Publicar na Google Play Store:
No Android Studio, clique em:
👉 **Build** > **Generate Signed Bundle / APK** > **Android App Bundle (.aab)**.
