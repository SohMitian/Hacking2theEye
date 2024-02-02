const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
let overlayContext = overlay.getContext('2d');
let detectedImage = new Image(); // 画像を事前に読み込むための変数
detectedImage.src = './image/img_mark_01.png'; // 修正: 正しいファイル拡張子

// 画像選択イベントリスナー
document.getElementById('imageSelector').addEventListener('change', function () {
  detectedImage.src = this.value; // 選択された画像のパスに更新
  console.log('Image changed to: ' + detectedImage.src);
});

// 利用可能なカメラを取得してドロップダウンリストを更新
async function updateCameraList() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoDevices = devices.filter(device => device.kind === 'videoinput');

  const cameraSelect = document.getElementById('cameraSelect');
  cameraSelect.innerHTML = videoDevices.map(device => 
    `<option value="${device.deviceId}">${device.label || 'Camera ' + (cameraSelect.length + 1)}</option>`
  ).join('');
}

// 選択されたカメラでビデオストリームを開始
async function startCamera(deviceId) {
  const constraints = {
    video: { deviceId: deviceId ? { exact: deviceId } : undefined }
  };

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  video.srcObject = stream;
  video.play();
}

document.getElementById('cameraSelect').addEventListener('change', function() {
  startCamera(this.value);
});

const init = async () => {
  // Webカメラ初期化
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      width: 400,
      height: 400
    }
  });

  await updateCameraList(); // カメラリストを更新
  startCamera(document.getElementById('cameraSelect').value); // 最初のカメラでビデオストリームを開始

  video.srcObject = stream;
  video.onloadedmetadata = () => {
    video.play(); // 追加: ビデオの再生を開始
    onPlay(); // 追加: 顔認識処理を開始
  };

  // オーバーレイ用のキャンバス設定
  overlay.width = video.offsetWidth;
  overlay.height = video.offsetHeight;

  // モデル読み込み
  await faceapi.nets.tinyFaceDetector.load("weights/");
};



const onPlay = () => {
  const message = document.getElementById('message');
  const inputSize = 512;
  const scoreThreshold = 0.5;
  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize,
    scoreThreshold
  });

  const detectInterval = setInterval(async () => {
    // 顔検出処理
    const result = await faceapi.detectSingleFace(video, options);
    overlayContext.clearRect(0, 0, overlay.width, overlay.height);
    if (result) {
      message.textContent = "認識されています";
      const resizeRatioW = video.offsetWidth / video.videoWidth;
      const resizeRatioH = video.offsetHeight / video.videoHeight;

      const x = result.box.x * resizeRatioW;
      const y = result.box.y * resizeRatioH;
      const width = result.box.width * resizeRatioW;
      const height = result.box.height * resizeRatioH;

      if (detectedImage.complete && detectedImage.naturalHeight !== 0) {
        // GIFかどうかをチェックし、処理を分岐
        if (detectedImage.src.endsWith('.gif')) {
          
          // GIFアニメーションの処理
          gifler(detectedImage.src).frames(overlay, (ctx, frame) => {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // ここでフレームごとにキャンバスをクリア
            ctx.drawImage(frame.buffer, x - 40, y - 40, width + 80, height + 80);
          }).then(animator => {
            giflerAnimator = animator;
            animator.animateInCanvas(overlay, false);
            // giflerAnimator.stop();
          });
          overlayContext.clearRect(0, 0, 1000, 1000); // ここでフレームごとにキャンバスをクリア

        } else {
          overlayContext.drawImage(detectedImage, x - 40, y - 40, width + 80, height + 80);
        }

      } else {
        message.textContent = "認識されていません";
      }
    }
  }, 500);
};

init();
