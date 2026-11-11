// Prépare la vidéo du hero de l'accueil à partir du clip source (voir docs/assets.md, section « Vidéo »).
// 1. Boucle sans raccord de 8 s : extrait de 9 s pris à 1,5 s, la dernière seconde est fondue dans la première
//    (l'image 0 de la boucle est donc aussi l'image qui suit sa dernière image).
// 2. Quatre variantes sans piste audio : WebM VP9 et MP4 H.264, en 1080p et 720p, chacune ≤ 3 Mo.
// 3. Affiche (image LCP) = image 0 de la boucle, JPEG progressif sRGB sans métadonnées ; next/image en produit
//    les déclinaisons AVIF/WebP et le srcset.
// ffmpeg n'est pas une dépendance du projet : indiquer son chemin (variable FFMPEG ou ffmpeg dans le PATH).
// Usage : FFMPEG=/chemin/ffmpeg node scripts/assets/hero-video.mjs <clip_source.mp4> <dossier_temporaire>
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const [source, workDir] = process.argv.slice(2);
if (!source || !workDir) {
  console.error("Usage : FFMPEG=/chemin/ffmpeg node scripts/assets/hero-video.mjs <clip_source.mp4> <dossier_temporaire>");
  process.exit(1);
}
const ffmpeg = process.env.FFMPEG || "ffmpeg";
const VIDEO_DIR = "public/videos";
const POSTER = "public/images/hero/cote-aerienne-poster.jpg";
const MAX_BYTES = 3_000_000;

const START = 1.5; // secondes ignorées au début du clip
const LOOP = 8; // durée de la boucle
const FADE = 1; // fondu de raccord

const run = (args) => execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });

await fs.mkdir(workDir, { recursive: true });
await fs.mkdir(VIDEO_DIR, { recursive: true });
await fs.mkdir(path.dirname(POSTER), { recursive: true });

// Maître quasi sans perte (intermédiaire, jamais publié).
const master = path.join(workDir, "hero-master.mp4");
run([
  "-ss", String(START), "-t", String(LOOP + FADE), "-i", source,
  "-filter_complex",
  `[0:v]split[a][b];[a]trim=0:${FADE},setpts=PTS-STARTPTS[head];[b]trim=${FADE}:${LOOP + FADE},setpts=PTS-STARTPTS[body];` +
    `[body][head]xfade=transition=fade:duration=${FADE}:offset=${LOOP - FADE},format=yuv420p[v]`,
  "-map", "[v]", "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "10", master,
]);

const variants = [
  { file: "cote-aerienne-1080.webm", scale: null, codec: "vp9", crf: "38" },
  { file: "cote-aerienne-1080.mp4", scale: null, codec: "h264", crf: "27.5", level: "4.1" },
  { file: "cote-aerienne-720.webm", scale: "1280:720", codec: "vp9", crf: "36" },
  { file: "cote-aerienne-720.mp4", scale: "1280:720", codec: "h264", crf: "25", level: "4.0" },
];

const report = [];
for (const v of variants) {
  const out = path.join(VIDEO_DIR, v.file);
  const vf = v.scale ? ["-vf", `scale=${v.scale}:flags=lanczos`] : [];
  if (v.codec === "h264") {
    run(["-i", master, "-an", ...vf, "-c:v", "libx264", "-preset", "veryslow", "-tune", "film", "-crf", v.crf, "-profile:v", "high", "-level:v", v.level, "-pix_fmt", "yuv420p", "-g", "50", "-movflags", "+faststart", "-map_metadata", "-1", out]);
  } else {
    const log = path.join(workDir, `vp9-${v.file}`);
    const common = ["-i", master, "-an", ...vf, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", v.crf, "-row-mt", "1", "-tile-columns", "2", "-g", "50", "-pix_fmt", "yuv420p", "-passlogfile", log];
    run([...common, "-deadline", "good", "-cpu-used", "2", "-pass", "1", "-f", "null", process.platform === "win32" ? "NUL" : "/dev/null"]);
    run([...common, "-deadline", "good", "-cpu-used", "1", "-pass", "2", "-map_metadata", "-1", out]);
  }
  const { size } = await fs.stat(out);
  if (size > MAX_BYTES) throw new Error(`${v.file} : ${size} octets, au-dessus du budget de ${MAX_BYTES}`);
  report.push({ file: v.file, bytes: size });
}

// Affiche : image 0 de la boucle, extraite du maître.
const frame = path.join(workDir, "hero-poster.png");
run(["-i", master, "-frames:v", "1", frame]);
const info = await sharp(frame).toColorspace("srgb").jpeg({ quality: 80, mozjpeg: true, progressive: true }).toFile(POSTER);
report.push({ file: path.basename(POSTER), bytes: info.size, width: info.width, height: info.height });

console.log(JSON.stringify(report, null, 2));
