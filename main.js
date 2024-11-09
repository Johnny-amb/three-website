import * as THREE from './build/three.module.js';
import { OrbitControls } from './jsm/controls/OrbitControls.js';
import { OBJLoader } from './jsm/loaders/OBJLoader.js';

//グローバル変数
let scene, camera, renderer, pointLight, controls, texture, object;

window.addEventListener('load', init);

function init() {

    //シーンを作成
    scene = new THREE.Scene();
    //カメラを作成
    //perspectiveCamera(視野角、アスペクト比、開始距離、終了距離)
    //innerWidthは画面の横幅、innerHeightは画面の縦幅
    camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        1000);

    //カメラの位置を設定(カメラの初期値は(0,0,0)であるため)
    camera.position.set(0, 0, 1000);

    //レンダラーを作成
    renderer = new THREE.WebGLRenderer({ alpha: true });

    //レンダラーのサイズを設定
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    //レンダラーをbodyに追加
    document.body.appendChild(renderer.domElement);

    //ジオメトリを作成（骨格
    //SphereGeometry(半径、横ポリゴン数、縦ポリゴン数)
    let geometry = new THREE.SphereGeometry(100, 16, 16);

    const manager = new THREE.LoadingManager( loadModel );

    const textureLoader = new THREE.TextureLoader( manager );
    const texture = textureLoader.load( './textures/earth.jpg' );
    texture.colorSpace = THREE.SRGBColorSpace;

    // モデルのロードをmanagerの管理下に置きます
    const objLoader = new OBJLoader( manager );
    objLoader.load(
        './models/Yacht_With_Interior(FBX_OBJ)/model.obj',
        function(obj) {
            object = obj;
        },
        undefined,
        function(error) {
            console.log('モデルの読み込みに失敗しました。' + error);
        }
    );

    function loadModel() {
        if (object) {
            object.traverse( function ( child ) {
                if ( child.isMesh ) child.material.map = texture;
            } );

            object.position.y = - 0.95;
            object.scale.setScalar( 0.01 );
            scene.add( object );
        }
        animate(); // テクスチャとモデルのロード完了後にアニメーションを開始
    }

    //マテリアルを作成(colorは色、mapはテクスチャー)
    let ballmaterial = new THREE.MeshPhysicalMaterial({color: 0xffffff, map: texture});

    //メッシを作成（骨格とマテリアルを組み合わせたもの）
    let ballmesh = new THREE.Mesh(geometry, ballmaterial);

    //シーンにメッシュを追加
    //scene.add(ballmesh);
    //平行光源を追加(色、強さ)
    let directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    //ポイント光源を追加(色、強さ、距離)
    pointLight = new THREE.PointLight(0xffffff, 200, 1000, 1);

    scene.add(pointLight);

    //ポイント光源がどこにあるのかを特定する
    let pointLightHelper = new THREE.PointLightHelper(pointLight, 20);
    scene.add(pointLightHelper);

    //マウス操作ができるようにする
    controls = new OrbitControls(camera, renderer.domElement);

    //ブラウザのリサイズに対応
    window.addEventListener('resize', onWindowResize);

    animate();
}

//ブラウザのリサイズに対応
function onWindowResize() {
    //レンダラーのサイズを随時更新する
    renderer.setSize(window.innerWidth, window.innerHeight);
    //カメラのアスペクト比を随時更新する
    camera.aspect = window.innerWidth / window.innerHeight;
    //カメラの射影行列を随時更新する
    camera.updateProjectionMatrix();
}

function animate() {
    //ポイント光源をの周りを巡回させる
    pointLight.position.set(
        200 * Math.sin(Date.now() / 500),
        200 * Math.sin(Date.now() / 1000),
        200 * Math.cos(Date.now() / 500)
    );


    //レンダリング
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}




