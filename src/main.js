import '../style/main.scss';
import { HandDetector } from './detector.js';
import { Renderer } from './renderer.js';

async function init() {
    const loadingOverlay = document.getElementById('loading-overlay');
    try {
        const detector = new HandDetector();
        await detector.init();
        console.log("System Ready");

        // Hide overlay on success
        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            loadingOverlay.addEventListener('transitionend', () => {
                loadingOverlay.style.display = 'none';
                console.log("Loading overlay hidden");
            });
        }

        const renderer = new Renderer();
        const fingerCursors = document.querySelectorAll('.finger-cursor');
        const cartIcon = document.getElementById('cart-icon');
        const debugDot = document.getElementById('debug-dot');
        let cartCounter = 0;

        // State for drag and drop
        let isPinching = false;
        let draggedItem = null;
        let activePlaceholder = null;
        let dragOffset = { x: 0, y: 0 };
        let originalPosition = { top: 0, left: 0 };

        function animate() {
            const fingerLandmarks = detector.detect();
            renderer.render(fingerLandmarks);

            if (fingerLandmarks && fingerLandmarks.length >= 21) {
                fingerCursors.forEach(cursor => cursor.style.display = 'block');
                if (debugDot) debugDot.style.display = 'block';

                const thumbTip = fingerLandmarks[4];
                const indexTip = fingerLandmarks[8];

                const indexTipPixels = {
                    x: (1 - indexTip.x) * window.innerWidth,
                    y: indexTip.y * window.innerHeight,
                };

                const fingertipIndices = [4, 8, 12, 16, 20];
                fingertipIndices.forEach((landmarkIndex, cursorIndex) => {
                    const point = fingerLandmarks[landmarkIndex];
                    const cursor = fingerCursors[cursorIndex];
                    if (point && cursor) {
                        const pixelX = (1 - point.x) * window.innerWidth;
                        const pixelY = point.y * window.innerHeight;
                        cursor.style.transform = `translate(${pixelX}px, ${pixelY}px)`;
                    }
                });

                if (debugDot) {
                    debugDot.style.left = `${indexTipPixels.x}px`;
                    debugDot.style.top = `${indexTipPixels.y}px`;
                }

                const distance = Math.sqrt(Math.pow(thumbTip.x - indexTip.x, 2) + Math.pow(thumbTip.y - indexTip.y, 2));
                const currentlyPinching = distance < 0.08;
                const indexCursor = fingerCursors[1];

                if (currentlyPinching && !isPinching) {
                    isPinching = true;
                    if (indexCursor) indexCursor.classList.add('is-pinching');

                    if (draggedItem === null) {
                        // FIX 1: Change 'const' to 'let' to allow reassignment
                        let elementUnderFinger = document.elementFromPoint(indexTipPixels.x, indexTipPixels.y);
                        let productCard = elementUnderFinger?.closest('.product-card');
                        if (!productCard) {
                            elementUnderFinger = document.elementFromPoint(indexTipPixels.x, indexTipPixels.y + 10);
                            productCard = elementUnderFinger?.closest('.product-card');
                        }

                        if (productCard && !productCard.classList.contains('dropped-in-cart')) {
                            draggedItem = productCard;
                            const rect = draggedItem.getBoundingClientRect();
                            originalPosition = { top: rect.top, left: rect.left };
                            dragOffset = { x: indexTipPixels.x - rect.left, y: indexTipPixels.y - rect.top };
                            activePlaceholder = document.createElement('div');
                            activePlaceholder.classList.add('product-placeholder');
                            activePlaceholder.style.width = `${rect.width}px`;
                            activePlaceholder.style.height = `${rect.height}px`;
                            draggedItem.parentNode.insertBefore(activePlaceholder, draggedItem);
                            draggedItem.classList.add('is-dragging');
                            draggedItem.style.top = `${originalPosition.top}px`;
                            draggedItem.style.left = `${originalPosition.left}px`;
                        }
                    }
                } else if (!currentlyPinching && isPinching) {
                    isPinching = false;
                    if (indexCursor) indexCursor.classList.remove('is-pinching');

                    if (draggedItem) {
                        const itemRect = draggedItem.getBoundingClientRect();
                        const cartRect = cartIcon.getBoundingClientRect();
                        const isOverCart = !(itemRect.right < cartRect.left || itemRect.left > cartRect.right || itemRect.bottom < cartRect.top || itemRect.top > cartRect.bottom);

                        if (isOverCart) {
                            cartCounter++;
                            console.log(`Item added to cart! Total: ${cartCounter}`);
                            
                            // 1. Tính toán tâm giỏ hàng
                            const cartCenterX = cartRect.left + cartRect.width / 2;
                            const cartCenterY = cartRect.top + cartRect.height / 2;
                            
                            // 2. Kích hoạt hiệu ứng "Hút"
                            draggedItem.classList.remove('is-dragging');
                            draggedItem.classList.add('is-sucking');
                            
                            // 3. Gán tọa độ đích (Tâm giỏ hàng)
                            // Trừ đi một nửa kích thước SP để tâm SP trùng tâm giỏ
                            draggedItem.style.left = `${cartCenterX - itemRect.width / 2}px`;
                            draggedItem.style.top = `${cartCenterY - itemRect.height / 2}px`;
                            
                            // 4. Dọn dẹp sau khi hút xong
                            const currentItem = draggedItem; // Giữ tham chiếu an toàn
                            const currentPlaceholder = activePlaceholder;
                            
                            currentItem.addEventListener('transitionend', function handler(event) {
                                if (event.propertyName === 'transform' || event.propertyName === 'left') {
                                    currentItem.remove(); // Xóa SP khỏi DOM
                                    if (currentPlaceholder) currentPlaceholder.remove();
                                    console.log("Vacuum complete");
                                    currentItem.removeEventListener('transitionend', handler);
                                }
                            });
                        } else {
                            const placeholderRect = activePlaceholder.getBoundingClientRect();
                            draggedItem.classList.remove('is-dragging');
                            draggedItem.style.top = `${placeholderRect.top}px`;
                            draggedItem.style.left = `${placeholderRect.left}px`;
                            draggedItem.addEventListener('transitionend', function handler(event) {
                                if (event.target === this) {
                                    this.style.top = '';
                                    this.style.left = '';
                                    this.removeEventListener('transitionend', handler);
                                }
                            }, { once: true });
                        }
                        if (activePlaceholder) activePlaceholder.remove();
                        activePlaceholder = null;
                        draggedItem = null;
                    }
                }

                if (isPinching && draggedItem) {
                    draggedItem.style.top = `${indexTipPixels.y - dragOffset.y}px`;
                    draggedItem.style.left = `${indexTipPixels.x - dragOffset.x}px`;
                }
            } else {
                if (draggedItem) {
                    console.log("Hand lost during drag. Returning item.");
                    const placeholderRect = activePlaceholder.getBoundingClientRect();
                    draggedItem.classList.remove('is-dragging');
                    draggedItem.style.top = `${placeholderRect.top}px`;
                    draggedItem.style.left = `${placeholderRect.left}px`;
                    draggedItem.addEventListener('transitionend', function handler(event) {
                        if (event.target === this) {
                            this.style.top = '';
                            this.style.left = '';
                            this.removeEventListener('transitionend', handler);
                        }
                    }, { once: true });
                    if (activePlaceholder) activePlaceholder.remove();
                    activePlaceholder = null;
                    draggedItem = null;
                    isPinching = false;
                }
                fingerCursors.forEach(cursor => {
                    cursor.style.display = 'none';
                    cursor.classList.remove('is-pinching');
                });
                if (debugDot) debugDot.style.display = 'none';
            }
            requestAnimationFrame(animate);
        }
        animate();

    } catch (error) {
        console.error("Failed to initialize the application:", error);
        // Safety net to prevent getting stuck on a black screen
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
}

// Start the application and catch any initialization errors.
init();