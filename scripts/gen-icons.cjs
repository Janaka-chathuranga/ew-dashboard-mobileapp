// One-off: build square app-icon assets from the wide logo.png.
// iOS icon must be opaque (no alpha) → brand background + centred logo.
// Android adaptive foreground is transparent (its colour comes from
// adaptiveIcon.backgroundColor) and the logo is kept inside the safe zone.
const Jimp = require("jimp-compact");
const path = require("path");

const DIR = path.join(__dirname, "..", "assets", "images");
const SRC = path.join(DIR, "logo.png");
const WHITE = 0xffffffff; // logo is green → white background gives clean contrast
const SIZE = 1024;

(async () => {
  const place = async (bgColor, widthRatio, outName) => {
    const canvas = new Jimp(SIZE, SIZE, bgColor);
    const logo = await Jimp.read(SRC);
    const targetW = Math.round(SIZE * widthRatio);
    logo.resize(targetW, Jimp.AUTO);
    const x = Math.round((SIZE - logo.bitmap.width) / 2);
    const y = Math.round((SIZE - logo.bitmap.height) / 2);
    canvas.composite(logo, x, y);
    await canvas.writeAsync(path.join(DIR, outName));
    console.log("wrote", outName, `${logo.bitmap.width}x${logo.bitmap.height} logo`);
  };

  // iOS / general icon: opaque white square, logo ~72% wide.
  await place(WHITE, 0.72, "icon.png");
  // Android adaptive foreground: transparent, logo ~58% wide (inside safe zone).
  await place(0x00000000, 0.58, "adaptive-icon.png");
})();
