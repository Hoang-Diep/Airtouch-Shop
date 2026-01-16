import '../style/main.scss';
import { HandDetector } from './detector.js';
import { Renderer } from './renderer.js';
import { PointSmoother, lerp } from './smoother.js';

// --- Helper Functions ---
const get3DDistance = (p1, p2) => {
    return Math.sqrt(
        Math.pow(p1.x - p2.x, 2) +
        Math.pow(p1.y - p2.y, 2) +
        Math.pow(p1.z - p2.z, 2)
    );
};

// FIX: Use 2D distance for pinch detection to avoid Z-axis jitter
const get2DDistance = (p1, p2) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

const WORLD_SCALE = { x: 14, y: 10 };
function mapLandmarkToWorld(landmark) {
    const x = (1 - landmark.x) * WORLD_SCALE.x - WORLD_SCALE.x / 2;
    const y = -(landmark.y * WORLD_SCALE.y - WORLD_SCALE.y / 2);
    const z = landmark.z * -15;
    return { x, y, z };
}

async function init() {
    // --- Constants ---
    const PINCH_START_THRESHOLD_RATIO = 0.4;
    const PINCH_RELEASE_THRESHOLD_RATIO = 0.6;
    const SCROLL_SENSITIVITY = 2.0;
    const SCROLL_DEADZONE_Y = 0.005;
    const SCROLL_LERP_FACTOR = 0.15;

    const loadingOverlay = document.getElementById('loading-overlay');
    try {
        const detector = new HandDetector();
        await detector.init();
        console.log("System Ready");

        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            loadingOverlay.addEventListener('transitionend', () => {
                loadingOverlay.style.display = 'none';
            });
        }

        const renderer = new Renderer();
        const smoothers = Array(5).fill(null).map(() => new PointSmoother(0.2));
        
        const fingerCursors = document.querySelectorAll('.finger-cursor');
        const cartIcon = document.getElementById('cart-icon');
        const cartBadge = document.getElementById('cart-badge');
        const debugDot = document.getElementById('debug-dot');
        let cartCounter = 0;

        // --- State Variables ---
        let isPinching = false;
        let draggedItem = null;
        let activePlaceholder = null;
        let dragOffset = { x: 0, y: 0 };
        
        let targetScrollVelocity = 0;
        let currentScrollVelocity = 0;
        let lastAnchorY = 0;

        function animate() {
            const fingerLandmarks = detector.detect();
            const fingertipIndices = [4, 8, 12, 16, 20];

            if (fingerLandmarks && fingerLandmarks.length > 0) {
                fingertipIndices.forEach((tipIndex, i) => {
                    const landmark = fingerLandmarks[tipIndex];
                    if (!landmark) return;
                    const smoother = smoothers[i];
                    const smoothedPoint = smoother.smooth(landmark.x, landmark.y);
                    if (renderer.fingertips[i]) {
                        const pos = mapLandmarkToWorld({ ...landmark, x: smoothedPoint.x, y: smoothedPoint.y });
                        renderer.fingertips[i].position.set(pos.x, pos.y, pos.z);
                    }
                    const cursor = fingerCursors[i];
                    if (cursor) {
                        const pixelX = (1 - smoothedPoint.x) * window.innerWidth;
                        const pixelY = smoothedPoint.y * window.innerHeight;
                        cursor.style.transform = `translate(${pixelX}px, ${pixelY}px)`;
                    }
                });
            }

            if (fingerLandmarks && fingerLandmarks.length >= 21) {
                fingerCursors.forEach(cursor => cursor.style.display = 'block');
                if (debugDot) debugDot.style.display = 'block';

                const smoothedIndex = smoothers[1];
                const indexTipPixels = {
                    x: (1 - smoothedIndex.x) * window.innerWidth,
                    y: smoothedIndex.y * window.innerHeight,
                };

                if (debugDot) {
                    debugDot.style.left = `${indexTipPixels.x}px`;
                    debugDot.style.top = `${indexTipPixels.y}px`;
                }
                
                const wrist = fingerLandmarks[0];
                const thumbTip = fingerLandmarks[4];
                const indexMcp = fingerLandmarks[5];
                const indexTip = fingerLandmarks[8];
                const middleMcp = fingerLandmarks[9];
                const middleTip = fingerLandmarks[12];
                
                // FIX: Use stable 3D distance for hand scale, but jittery 2D for pinch
                const handScale = get3DDistance(wrist, middleMcp);
                const pinchDistance = get2DDistance(thumbTip, indexTip);
                
                let currentlyPinching;
                if (isPinching) {
                    currentlyPinching = pinchDistance < (handScale * PINCH_RELEASE_THRESHOLD_RATIO);
                } else {
                    currentlyPinching = pinchDistance < (handScale * PINCH_START_THRESHOLD_RATIO);
                }

                if (currentlyPinching && !isPinching) {
                    isPinching = true;
                    fingerCursors[1]?.classList.add('is-pinching');
                    // FIX: Restore drag start logic
                    if (draggedItem === null) {
                        let elementUnderFinger = document.elementFromPoint(indexTipPixels.x, indexTipPixels.y);
                        let productCard = elementUnderFinger?.closest('.product-card');
                        if (!productCard && elementUnderFinger) {
                            elementUnderFinger = document.elementFromPoint(indexTipPixels.x, indexTipPixels.y + 10);
                            productCard = elementUnderFinger?.closest('.product-card');
                        }

                        if (productCard && !productCard.classList.contains('dropped-in-cart')) {
                            draggedItem = productCard;
                            const rect = draggedItem.getBoundingClientRect();
                            dragOffset = { x: indexTipPixels.x - rect.left, y: indexTipPixels.y - rect.top };
                            activePlaceholder = document.createElement('div');
                            activePlaceholder.classList.add('product-placeholder');
                            activePlaceholder.style.width = `${rect.width}px`;
                            activePlaceholder.style.height = `${rect.height}px`;
                            draggedItem.parentNode.insertBefore(activePlaceholder, draggedItem);
                            draggedItem.classList.add('is-dragging');
                            draggedItem.style.top = `${rect.top}px`;
                            draggedItem.style.left = `${rect.left}px`;
                        }
                    }
                } else if (!currentlyPinching && isPinching) {
                    isPinching = false;
                    fingerCursors[1]?.classList.remove('is-pinching');
                    // FIX: Restore drag release logic
                    if (draggedItem) {
                        const itemRect = draggedItem.getBoundingClientRect();
                        const cartRect = cartIcon.getBoundingClientRect();
                        const isOverCart = !(itemRect.right < cartRect.left || itemRect.left > cartRect.right || itemRect.bottom < cartRect.top || itemRect.top > cartRect.bottom);

                        if (isOverCart) {
                            cartCounter++;
                            if (cartBadge) {
                                cartBadge.innerText = cartCounter;
                                if (!cartBadge.classList.contains('is-visible')) {
                                    cartBadge.classList.add('is-visible');
                                }
                                cartBadge.classList.add('pop');
                                cartBadge.addEventListener('animationend', () => cartBadge.classList.remove('pop'), { once: true });
                            }
                            if (cartIcon) {
                                cartIcon.classList.add('shake');
                                cartIcon.addEventListener('animationend', () => cartIcon.classList.remove('shake'), { once: true });
                            }
                            const cartCenterX = cartRect.left + cartRect.width / 2;
                            const cartCenterY = cartRect.top + cartRect.height / 2;
                            draggedItem.classList.remove('is-dragging');
                            draggedItem.classList.add('is-sucking');
                            draggedItem.style.left = `${cartCenterX - itemRect.width / 2}px`;
                            draggedItem.style.top = `${cartCenterY - itemRect.height / 2}px`;
                            const currentItem = draggedItem;
                            currentItem.addEventListener('transitionend', function handler(event) {
                                if (event.propertyName === 'transform' || event.propertyName === 'opacity') {
                                    currentItem.remove();
                                    if (activePlaceholder) activePlaceholder.remove();
                                    currentItem.removeEventListener('transitionend', handler);
                                }
                            });
                        } else {
                            const placeholderRect = activePlaceholder.getBoundingClientRect();
                            draggedItem.classList.remove('is-dragging');
                            draggedItem.style.top = `${placeholderRect.top}px`;
                            draggedItem.style.left = `${placeholderRect.left}px`;
                            draggedItem.addEventListener('transitionend', () => {
                                draggedItem.style.top = '';
                                draggedItem.style.left = '';
                            }, { once: true });
                        }
                        if (activePlaceholder && !draggedItem.classList.contains('is-sucking')) {
                            activePlaceholder.remove();
                        }
                        activePlaceholder = null;
                        draggedItem = null;
                    }
                }

                // --- Virtual Trackpad Physics Logic ---
                const indexFingerExtended = indexTip.y < indexMcp.y;
                const middleFingerExtended = middleTip.y < middleMcp.y;
                const scrollGestureActive = indexFingerExtended && middleFingerExtended && !isPinching && !draggedItem;

                if (scrollGestureActive) {
                    const currentAnchorY = middleMcp.y;
                    if (lastAnchorY === 0) {
                        lastAnchorY = currentAnchorY;
                    }
                    let deltaY = currentAnchorY - lastAnchorY;
                    if (Math.abs(deltaY) < SCROLL_DEADZONE_Y) {
                        deltaY = 0;
                    }
                    targetScrollVelocity = deltaY * window.innerHeight * SCROLL_SENSITIVITY;
                    lastAnchorY = currentAnchorY;
                } else {
                    targetScrollVelocity = 0;
                    lastAnchorY = 0;
                }
                
                if (isPinching && draggedItem) {
                    draggedItem.style.top = `${indexTipPixels.y - dragOffset.y}px`;
                    draggedItem.style.left = `${indexTipPixels.x - dragOffset.x}px`;
                }

            } else {
                // FIX: Restore hand lost logic for dragged items
                if (draggedItem) {
                    const placeholderRect = activePlaceholder.getBoundingClientRect();
                    draggedItem.classList.remove('is-dragging');
                    draggedItem.style.top = `${placeholderRect.top}px`;
                    draggedItem.style.left = `${placeholderRect.left}px`;
                    draggedItem.addEventListener('transitionend', () => {
                        draggedItem.style.top = '';
                        draggedItem.style.left = '';
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

                targetScrollVelocity = 0;
                currentScrollVelocity = 0;
                lastAnchorY = 0;
            }

            // --- Physics Update (runs every frame) ---
            currentScrollVelocity = lerp(currentScrollVelocity, targetScrollVelocity, SCROLL_LERP_FACTOR);
            if (Math.abs(currentScrollVelocity) < 0.01) {
                currentScrollVelocity = 0;
            }
            if (currentScrollVelocity !== 0) {
                window.scrollBy(0, currentScrollVelocity);
            }

            renderer.render();
            requestAnimationFrame(animate);
        }
        animate();

    } catch (error) {
        console.error("Failed to initialize the application:", error);
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
}

init();