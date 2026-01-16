import * as THREE from 'three';

/**
 * Handles rendering the finger tracking points in a 3D space using Three.js.
 */
export class Renderer {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 10; // Pull the camera back to see the scene

        this.renderer = new THREE.WebGLRenderer({
            alpha: true, // Allow transparent background
            antialias: true,
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.fingertips = [];
        this._setupScene();

        window.addEventListener('resize', this.resize.bind(this), false);
    }

    _setupScene() {
        // Add ambient light so the whole scene isn't dark
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);

        // Define a gradient of colors from gold to white
        const colors = [
            new THREE.Color(0xFFD700), // Gold
            new THREE.Color(0xFFE57A),
            new THREE.Color(0xFFF2B4),
            new THREE.Color(0xFFFCEC),
            new THREE.Color(0xFFFFFF), // White
        ];

        for (let i = 0; i < 5; i++) {
            // Create a premium-looking material
            const material = new THREE.MeshStandardMaterial({
                color: colors[i % colors.length],
                metalness: 0.8,
                roughness: 0.2,
                emissive: colors[i % colors.length], // Make it glow
                emissiveIntensity: 0.5
            });

            const sphere = new THREE.Mesh(sphereGeometry, material);
            
            // Add a point light to each sphere to cast light and enhance the glow
            const pointLight = new THREE.PointLight(colors[i % colors.length], 2, 10);
            pointLight.position.set(0, 0, 0);
            sphere.add(pointLight); // Attach light to the sphere

            this.scene.add(sphere);
            this.fingertips.push(sphere);
        }
    }

    /**
     * Handles window resize events to keep the viewport correct.
     */
    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * The main render loop function.
     */
    render() {
        this.renderer.render(this.scene, this.camera);
    }
}