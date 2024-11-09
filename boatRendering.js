import * as THREE from './build/three.module.js';
import { Water } from './jsm/objects/Water.js';
import { Sky } from './jsm/objects/Sky.js';
import { GUI } from './jsm/libs/lil-gui.module.min.js';
import { OrbitControls } from './jsm/controls/OrbitControls.js';
import { OBJLoader } from './jsm/loaders/OBJLoader.js';
import { MTLLoader } from './jsm/loaders/MTLLoader.js';


//グローバル変数
let water, sun, boat;
let previousPosition = new THREE.Vector3(); // 前回の位置を保存するためのベクトル
let heading, speed;
let Zigzag, Spiral, propulsionArrow;

//方位角
heading = 180;
//スピード
speed = 0;
//PatternSteer
Zigzag = 0;
Spiral = 0;

let boatDataText = '';
const boatDataElem = document.getElementById('boatData');

window.addEventListener("DOMContentLoaded", init);

function init() {

    // シーンを作成
    const scene = new THREE.Scene();

    // カメラを作成
    const camera = new THREE.PerspectiveCamera(
        50,
        innerWidth / innerHeight,
        0.1,
        1000
    );

    //カメラポジション
    camera.position.set(0, 5, 20);
    camera.rotation.x = 0;  // x軸に対して回転
    camera.rotation.y = 0;  // y軸に対して回転
    camera.rotation.z = 0;  // z軸に対して回転

    const cameraOffset = new THREE.Vector3(0, 10, 20); // カメラのオフセット位置

    // レンダラーを作成
    const renderer = new THREE.WebGLRenderer({
        antialias: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(innerWidth, innerHeight);

    container.appendChild( renderer.domElement );

    sun = new THREE.Vector3();

    // Water

    const waterGeometry = new THREE.PlaneGeometry( 10000, 10000 );

    water = new Water(
        waterGeometry,
        {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: new THREE.TextureLoader().load( 'textures/waternormals.jpg', function ( texture ) {

                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

            } ),
            sunDirection: new THREE.Vector3(),
            sunColor: 0xffffff,
            waterColor: 0x001e0f,
            distortionScale: 3.7,
            fog: scene.fog !== undefined
        }
    );

    water.rotation.x = - Math.PI / 2;
    scene.add( water );

    // Skybox
    const sky = new Sky();
    sky.scale.setScalar( 10000 );
    scene.add( sky );

    const skyUniforms = sky.material.uniforms;

    skyUniforms[ 'turbidity' ].value = 10;
    skyUniforms[ 'rayleigh' ].value = 2;
    skyUniforms[ 'mieCoefficient' ].value = 0.005;
    skyUniforms[ 'mieDirectionalG' ].value = 0.8;

    const parameters = {
        elevation: 2,
        azimuth: 180
    };

    const pmremGenerator = new THREE.PMREMGenerator( renderer );
    const sceneEnv = new THREE.Scene();

    let renderTarget;

    function updateSun() {

        const phi = THREE.MathUtils.degToRad( 90 - parameters.elevation );
        const theta = THREE.MathUtils.degToRad( parameters.azimuth );

        sun.setFromSphericalCoords( 1, phi, theta );

        sky.material.uniforms[ 'sunPosition' ].value.copy( sun );
        water.material.uniforms[ 'sunDirection' ].value.copy( sun ).normalize();

        if ( renderTarget !== undefined ) renderTarget.dispose();

        sceneEnv.add( sky );
        renderTarget = pmremGenerator.fromScene( sceneEnv );
        scene.add( sky );

        scene.environment = renderTarget.texture;

    }

    updateSun();

    //GUI 
    const gui = new GUI();

    const waterUniforms = water.material.uniforms;

    const folderWater = gui.addFolder( 'Water' );
    folderWater.add( waterUniforms.distortionScale, 'value', 0, 8, 0.1 ).name( 'distortionScale' );
    folderWater.add( waterUniforms.size, 'value', 0.1, 10, 0.1 ).name( 'size' );
    folderWater.open();

    const folderSky = gui.addFolder( 'Sky' );
    folderSky.add( parameters, 'elevation', 0, 90, 0.1 ).onChange( updateSun );
    folderSky.add( parameters, 'azimuth', - 180, 180, 0.1 ).onChange( updateSun );
    folderSky.open();

    //マウス操作ができるようにする
    const controls = new OrbitControls(camera, renderer.domElement);

    // 環境光源を作成
    const ambientLight = new THREE.AmbientLight(0xffffff);
    ambientLight.intensity = 0.2;
    scene.add(ambientLight);

    // 平行光源を作成
    const directionalLight = new THREE.DirectionalLight(0xffffff);
    directionalLight.intensity = 0.5;
    directionalLight.position.set(1, 3, 1);
    scene.add(directionalLight);

    // ボートモデルの読み込み
    /* MTLファイルとObjファイルの読み込み */  
    const objLoader = new OBJLoader();
    const mtlLoader = new MTLLoader();
    mtlLoader.load('/models/Yacht_With_Interior(FBX_OBJ)/model.mtl',function(materials){
        materials.preload();
        objLoader.setMaterials(materials);
        objLoader.load('/models/Yacht_With_Interior(FBX_OBJ)/model.obj',function (obj){
                boat = obj;
                scene.add(boat);
                boat.position.set(0, 0.2, 0);
                //(ピッチ, ヨー, ロール)
                boat.rotation.set(0, Math.PI, 0);
                previousPosition.copy(boat.position); // 初期位置を保存
        }); 
    });

    //デバッグ用 座標軸の表示（R: x軸、G:  y軸、B: z軸）
    const size = 10;
    scene.add(new THREE.AxesHelper(size));

    //進行方向ベクトル表示
    const propulsionArrow = new THREE.ArrowHelper(
        new THREE.Vector3(0, 0, -1),
        new THREE.Vector3(),
        5,
        0x00ff00
    );
    
    scene.add(propulsionArrow);

    // 航跡を描画するためのライン
    const traceGeometry = new THREE.BufferGeometry();
    const traceLineSegments = new THREE.Line(traceGeometry, new THREE.LineBasicMaterial({ color: 0xff0000 }));
    scene.add(traceLineSegments);

    const tracePoints = [];

    animate();

    function animate() {
        
        const time = performance.now() * 0.001;

        if (boat) {
            //振幅
            const amplitude = 5;
            //速さ
            const frequency = 1.0;
            //スパイラルの広がる速度
            const growthRate = 0.05;

            if(Zigzag == 1){
                // ジグザグの動き
                boat.position.x = Math.sin(time * frequency) * amplitude;
                boat.position.z -= 0.01;
            } else if(Spiral == 1){
                // スパイラルの動き
                const radius = time * growthRate;
                boat.position.x = radius * Math.cos(time * 5);
                boat.position.z = radius * Math.sin(time * 5);
            } else {
                // do nothing
            }

            updateBoatPosition(heading, speed);
            //camera.position.z -= 0.01;
            //boat.position.z = Math.cos(time * frequency) * amplitude * 0.5;
            
            boatDataText =
                        'speed:' +
                        speed.toFixed(2) +
                        ' hdg:' +
                        heading.toFixed(2);
            boatDataElem.innerText = boatDataText;

            // 進行方向のベクトルを計算
            const direction = new THREE.Vector3().subVectors(boat.position, previousPosition);
            
            if (direction.length() > 0.001) {
                // ベクトルに基づいて回転を設定 (進行方向に船首を向ける)
                const angle = Math.atan2(direction.x, direction.z);
                boat.rotation.y = angle; // y軸の回転を更新

                // 推進方向の矢印の位置と向きを更新
                propulsionArrow.position.copy(boat.position);
                propulsionArrow.setDirection(direction.normalize());
            }
            
            // カメラの位置を更新
            updateCameraPosition();

            //航跡を残す
            updateBoatTrace();

            previousPosition.copy(boat.position); // 前回の位置を更新
        }
        
        //海を動かす
        water.material.uniforms[ 'time' ].value += 1.0 / 60.0;

        // カメラのコントロールを有効にする
        //controls.update();

        renderer.render(scene, camera); // レンダリング
        requestAnimationFrame(animate);
    }

    //ブラウザのリサイズに対応
    window.addEventListener('resize', onWindowResize);

    //ブラウザのリサイズに対応
    function onWindowResize() {
        //レンダラーのサイズを随時更新する
        renderer.setSize(window.innerWidth, window.innerHeight);
        //カメラのアスペクト比を随時更新する
        camera.aspect = window.innerWidth / window.innerHeight;
        //カメラの射影行列を随時更新する
        camera.updateProjectionMatrix();
    }

    function updateBoatTrace() {
        // ボートの現在位置を航跡に追加
        tracePoints.push(
            previousPosition.clone().add(new THREE.Vector3(0, 0.5, 0)),
            boat.position.clone().add(new THREE.Vector3(0, 0.5, 0))
        );

        // 航跡の頂点データを更新
        traceGeometry.setFromPoints(tracePoints);
        traceLineSegments.geometry.attributes.position.needsUpdate = true;
    }

    // 船の移動/船首変更関数
    function updateBoatPosition(heading, speed) {
        const headingInRadians = heading * (Math.PI / 180);
        const directionX = Math.sin(headingInRadians);
        const directionZ = Math.cos(headingInRadians);

        boat.rotation.y = headingInRadians;
        boat.position.x += directionX * speed;
        boat.position.z += directionZ * speed;
    }

    function updateCameraPosition() {
        // オブジェクトの位置にカメラのオフセットを追加
        camera.position.copy(boat.position).add(cameraOffset);
        
        // カメラが常にオブジェクトを向くように設定
        camera.lookAt(boat.position);
    }

      //キーボード入力
      const onKeyDown = function (event) {
        switch (event.code) {
            case 'KeyW':
                //前進
                speed += 0.01;
            break
            case 'KeyA':
                //左旋回
                heading -= 1;
            break
            case 'KeyS':
                //出力停止
                speed = 0;
            break
            case 'KeyD':
                //右旋回
                heading += 1;
            break
            case 'KeyX':
                //後進
                speed -= 0.01;
            break
            case 'KeyQ':
                //Zigzag    
                if (Zigzag >= 1) {
                    
                    Zigzag = 0;
                }else{
                    
                    Zigzag = 1;
                }
            
            break
            case 'KeyE':
                //CourceHold   
                        
            break
            case 'KeyR':
                //Spiral
                if (Spiral >= 1) {
                    Spiral = 0;
                }else{
                    Spiral = 1;
                }
            break
            
        }
    }
    document.addEventListener('keydown', onKeyDown, false)
}
