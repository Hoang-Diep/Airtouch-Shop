# ✨ Magic Fingers AI - Interactive Particle System

Dự án sử dụng AI (MediaPipe) để theo dõi 5 đầu ngón tay và hiển thị chúng dưới dạng các đốm sáng (Radial Gradient) với hiệu ứng đuôi (Trail) mượt mà trên trình duyệt.

## 🚀 Công nghệ sử dụng
- **Bundler:** Vite
- **AI Engine:** MediaPipe Hand Landmarker (`@mediapipe/tasks-vision`)
- **Rendering:** Canvas 2D API
- **Styling:** SCSS (Sass)
- **Algorithm:** Exponential Smoothing (Lerp) cho chuyển động mượt mà.

## 🛠️ Cấu trúc Logic
1. **Detection:** Nhận diện 21 khớp xương tay, trích xuất 5 tọa độ đầu ngón tay (ID: 4, 8, 12, 16, 20).
2. **Smoothing:** Áp dụng Lerp để khử nhiễu (jitter) từ dữ liệu camera.
3. **Rendering:** - Vẽ lớp phủ `rgba(0, 0, 0, 0.15)` để tạo hiệu ứng lưu ảnh (Trail).
   - Vẽ Radial Gradient cho mỗi ngón tay với 5 màu Neon riêng biệt.

## 📂 Cấu trúc thư mục
```
magic-fingers-ai/
├── index.html
├── package-lock.json
├── package.json
├── style/
│   ├── main.scss           # Entry point cho style
│   ├── _variables.scss     # Định nghĩa 5 màu Neon cho 5 ngón
│   └── _layout.scss        # Fullscreen canvas và ẩn webcam
├── src/
│   ├── main.js             # Khởi tạo App & Vòng lặp (Loop)
│   ├── detector.js         # Cấu hình MediaPipe Hand Landmarker
│   ├── renderer.js         # Logic vẽ Gradient & hiệu ứng Trail
│   └── smoother.js         # Hàm Lerp làm mượt tọa độ
└── public/
│   └── models/             # File hand_landmarker.task
└── node_modules/
```

- `src/detector.js`: Khởi tạo và xử lý dữ liệu từ MediaPipe.
- `src/renderer.js`: Quản lý Canvas, vẽ quầng sáng và hiệu ứng Trail.
- `src/smoother.js`: Hàm toán học giúp chuyển động êm ái.
- `style/`: Quản lý giao diện và bảng màu Neon bằng SCSS.

## ⚡ Hướng dẫn cài đặt
1. Cài đặt Node.js.
2. Khởi tạo và cài đặt dependencies:
   ```bash
   npm install
   npm add @mediapipe/tasks-vision
   npm add -D sass
   npm run dev
   ```
3. Tải file model hand_landmarker.task bỏ vào thư mục public/models/.

## 🎨 Quy tắc hiển thị
- **Ngón cái (ID 4)**: Pink Neon
- **Ngón trỏ (ID 8)**: Spring Green
- **Ngón giữa (ID 12)**: Deep Sky Blue
- **Ngón áp út (ID 16)**: Gold
- **Ngón út (ID 20)**: Purple
- **Trail**: Hiệu ứng mờ dần tạo cảm giác dài khoảng 50px.

---

## Phát triển thêm

### Website Nhật Bản
- Tạo 1 web site có bản đồ Nhật
- Khi hover vào từng tỉnh → Hiển thị hiệu ứng hover
- Bấm vào 1 tỉnh bất kỳ → Map sẽ zoom ở vị trí tỉnh này & hiển thị thông tin tỉnh này.

### Website bán hàng
- Người dùng kéo thả sản phẩm vào menu để mua hàng