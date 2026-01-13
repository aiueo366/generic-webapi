let params = null;
let t = 0;
let audio = null;
//nununu

function setup() {
  createCanvas(800, 800, WEBGL);
  frameRate(60);
  noStroke();
}

function draw() {
  if (!params) {
    background(0);
    push();
    resetMatrix();
    fill(255);
    textAlign(CENTER, CENTER);
    text("Waiting for audio analysis...", width / 2, height / 2);
    pop();
    return;
  }

  background(params.backgroundColor);

  orbitControl();

  ambientLight(80);
  directionalLight(255, 255, 255, 0.5, 1, -0.5);

  const count = floor(map(params.shapeDensity, 0, 1, 5, 40));
  const speed = params.motionSpeed * 0.05;
  const spread = 300;

  for (let i = 0; i < count; i++) {
    push();

    const angle = TWO_PI * i / count + t * speed * 10;
    const radius = map(params.energy || 0.5, 0, 1, 80, spread);

    const x = cos(angle) * radius;
    const y = sin(angle) * radius;
    const z = map(noise(i, t), 0, 1, -200, 200);

    translate(x, y, z);

    apply3DMotion(i);

    const c = color(params.colorPalette[i % 3]);
    ambientMaterial(c);

    draw3DShape(i);

    pop();
  }

  t += speed;
}

function apply3DMotion(i) {
  switch (params.motionType) {
    case 'linear':
      rotateY(t + i * 0.1);
      break;
    case 'rotational':
      rotateX(t * 2);
      rotateZ(t);
      break;
    case 'flow':
      rotateX(noise(i, t) * TWO_PI);
      rotateY(noise(i + 10, t) * TWO_PI);
      break;
    case 'static':
    default:
      break;
  }
}

function draw3DShape(i) {
  const size = map(noise(i, t), 0, 1, 15, 60);

  switch (params.shapeType) {
    case 'circle':
      sphere(size);
      break;
    case 'line':
      box(size * 0.3, size * 2, size * 0.3);
      break;
    case 'polygon':
      cone(size * 0.7, size * 1.5);
      break;
    case 'organic':
      torus(size * 0.8, size * 0.25);
      break;
  }
}

// 外部から visualParams を流し込む
window.setVisualParams = function (p) {
  params = p;
};




//確認
fetch('/api/visual-params', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    bpm: 128,
    energy: 0.82,
    brightness: 0.67,
    mood: "uplifting",
    dynamics: 0.6,
    rhythmComplexity: 0.4
  })
})
.then(r => r.json())
.then(data => {
  console.log('visualParams:', data);
});

// テスト用（AIを通さず表示確認）
// window.onload = () => {
//   setVisualParams({
//     colorPalette: ["#ff6f61", "#ffd166", "#118ab2"],
//     backgroundColor: "#0b132b",
//     shapeType: "circle",
//     motionType: "linear",
//     motionSpeed: 0.7,
//     shapeDensity: 0.6,
//     lineWeight: 2,
//     noiseAmount: 0.4
//   });
// };

document.getElementById('audioUpload').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  console.log('mp3 selected:', file.name);

  const formData = new FormData();
  formData.append('audio', file);

  // ① ダミー音声解析
  const audioRes = await fetch('/api/analyze-audio', {
    method: 'POST',
    body: formData
  });

  const audioFeatures = await audioRes.json();
  console.log('audioFeatures:', audioFeatures);

  // ② OpenAI に投げる
  const visualRes = await fetch('/api/visual-params', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(audioFeatures)
  });

  const visualParams = await visualRes.json();
  console.log('visualParams:', visualParams);

  // ③ p5.js に反映
  setVisualParams(visualParams);
});

let visualParams = null;

function setVisualParams(params) {
  visualParams = params;
}


window.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('audioUpload');
  if (!input) return;

  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // すでに再生中なら止める
    if (audio) {
      audio.pause();
      audio = null;
    }

    const url = URL.createObjectURL(file);
    audio = new Audio(url);
    audio.loop = true;   // ループ再生（好みで）
    audio.volume = 0.8;

    audio.play();
    console.log('audio playing:', file.name);
  });
});


// なな