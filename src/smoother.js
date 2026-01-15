// src/smoother.js

/**
 * Hàm nội suy tuyến tính giúp làm mượt chuyển động
 * @param {number} start - Giá trị hiện tại
 * @param {number} end - Giá trị đích từ AI
 * @param {number} factor - Tốc độ đuổi theo (0.1 đến 0.2 là mượt nhất)
 */
export const lerp = (start, end, factor) => {
    return start + (end - start) * factor;
};

export class PointSmoother {
    constructor(factor = 0.15) {
        this.factor = factor;
        this.x = null;
        this.y = null;
    }

    smooth(targetX, targetY) {
        if (this.x === null || this.y === null) {
            this.x = targetX;
            this.y = targetY;
        } else {
            this.x = lerp(this.x, targetX, this.factor);
            this.y = lerp(this.y, targetY, this.factor);
        }
        return { x: this.x, y: this.y };
    }
}