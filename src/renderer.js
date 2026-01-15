import { PointSmoother } from './smoother.js';

/**
 * Handles rendering the finger tracking points onto a 2D canvas.
 */
export class Renderer {
    constructor() {
        this.canvas = document.getElementById('canvas');
        if (!this.canvas) {
            console.error('Canvas element not found!');
            return;
        }
        this.ctx = this.canvas.getContext('2d', { alpha: true });
        
        // 4. Each spot should have a distinct neon color
        this.colors = ['#ff0055', '#00ff99', '#00d4ff', '#ffcc00', '#9d00ff'];
        
        // 5. Use the PointSmoother class for each of the 5 points
        this.smoothers = Array(5).fill(null).map(() => new PointSmoother(0.2));

        window.addEventListener('resize', this.resize.bind(this), false);
        this.resize();
    }

    /**
     * 1. Initialize a full-screen canvas and handle window resize.
     */
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    /**
     * 3. Draw 5 glowing spots using createRadialGradient.
     * @param {number} x - The x coordinate on the canvas.
     * @param {number} y - The y coordinate on the canvas.
     * @param {string} color - The hex color code for the spot.
     */
    _drawSpot(x, y, color) {
        const radius = 50; // Tăng size cho "đã"
        const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
        
        // Cách phối màu này sẽ tạo cảm giác phát sáng cực mạnh
        gradient.addColorStop(0, '#ffffff');    // Tâm trắng rực
        gradient.addColorStop(0.2, color);      // Màu Neon chính
        gradient.addColorStop(1, 'transparent'); // Mờ dần

        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
    }

    /**
     * The main render loop function.
     * @param {Array<Object>} points - An array of normalized {x, y} points from the detector.
     */
    render(points) {
        // FIX 4: Ensure canvas is cleared for transparency during debugging
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (!points || points.length === 0) return;

        // We only want to draw the 5 fingertips, even though we receive all 21 points.
        const fingerTipIndices = [4, 8, 12, 16, 20];

        fingerTipIndices.forEach((tipIndex, i) => {
            const point = points[tipIndex];
            if (!point) return;

            // Invert the X-axis because the video feed is often mirrored
            const targetX = 1 - point.x;

            // Use the i-th smoother for the i-th fingertip
            const smoothedPoint = this.smoothers[i].smooth(targetX, point.y);

            // Map the normalized coordinates to the actual pixel width/height
            const pixelX = smoothedPoint.x * this.canvas.width;
            const pixelY = smoothedPoint.y * this.canvas.height;
            
            // Draw the corresponding glowing spot
            this._drawSpot(pixelX, pixelY, this.colors[i]);
        });
    }
}