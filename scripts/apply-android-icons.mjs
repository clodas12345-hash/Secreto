import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const CANDIDATE_SOURCES = [
  'assets/icon.png',
  'assets/logo.png',
  'assets/icon-foreground.png',
  'assets/icon-only.png',
  'public/app-icon.png',
  'public/icon.png',
  'resources/icon.png',
  'icon.png'
];

const ANDROID_RES_DIR = 'android/app/src/main/res';

const mipmaps = [
  { name: 'mipmap-mdpi', legacySize: 48, adaptiveSize: 108 },
  { name: 'mipmap-hdpi', legacySize: 72, adaptiveSize: 162 },
  { name: 'mipmap-xhdpi', legacySize: 96, adaptiveSize: 216 },
  { name: 'mipmap-xxhdpi', legacySize: 144, adaptiveSize: 324 },
  { name: 'mipmap-xxxhdpi', legacySize: 192, adaptiveSize: 432 },
];

function findSourceIcon() {
  for (const candidate of CANDIDATE_SOURCES) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

async function renderSafeZoneIcon(sourcePath, canvasSize, outputPath) {
  const maxLogoSize = Math.round(canvasSize * 0.6);

  const resizedLogoBuffer = await sharp(sourcePath)
    .resize(maxLogoSize, maxLogoSize, {
      fit: 'inside',
      withoutEnlargement: false
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{ input: resizedLogoBuffer, gravity: 'center' }])
    .png()
    .toFile(outputPath);
}

async function applyAndroidIcons() {
  const sourceIcon = findSourceIcon();
  if (!sourceIcon) {
    console.error('Erro: Nenhum arquivo de icone fonte encontrado.');
    process.exit(1);
  }

  console.log(`Aplicando icones Android a partir de: ${sourceIcon}`);

  for (const mipmap of mipmaps) {
    const dirPath = path.join(ANDROID_RES_DIR, mipmap.name);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const foregroundPath = path.join(dirPath, 'ic_launcher_foreground.png');
    const launcherPath = path.join(dirPath, 'ic_launcher.png');
    const roundPath = path.join(dirPath, 'ic_launcher_round.png');

    await renderSafeZoneIcon(sourceIcon, mipmap.adaptiveSize, foregroundPath);
    await renderSafeZoneIcon(sourceIcon, mipmap.legacySize, launcherPath);
    await renderSafeZoneIcon(sourceIcon, mipmap.legacySize, roundPath);

    console.log(`Gerados icones em ${mipmap.name} (foreground: ${mipmap.adaptiveSize}px, launcher/round: ${mipmap.legacySize}px)`);
  }

  console.log('Todos os icones Android foram aplicados com margem de zona segura (60%).');
}

applyAndroidIcons().catch((err) => {
  console.error('Erro ao aplicar icones Android:', err);
  process.exit(1);
});
