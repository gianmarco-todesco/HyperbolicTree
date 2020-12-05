"use strict";

class Viewer {

    constructor(canvasId) {
        // canvas, engine, scene
        this.canvas = document.getElementById(canvasId);
        let engine = this.engine = new BABYLON.Engine(this.canvas, true);
        let scene = this.scene = new BABYLON.Scene(this.engine);
        scene.ambientColor = new BABYLON.Color3(0.3,0.3,0.3);

    	// camera
        let camera = this.camera = new BABYLON.ArcRotateCamera('cam',
            -0.9,1.8, // alfa,beta
            0.8, // radius 
            new BABYLON.Vector3(0,0,0), scene);
        this.attachControl();
        camera.minZ = 0.001;
        camera.maxZ = 10;
        // camera.wheelPrecision = 50;

	    // light
        this.light = new BABYLON.PointLight('light1', new BABYLON.Vector3(0.1,0.2,0), scene);
        this.light.parent = this.camera;

        this.buildScene();

        window.addEventListener('resize', function() { engine.resize(); });    
    }
    
    runRenderLoop() {
        let scene = this.scene;
        this.engine.runRenderLoop(function() { scene.render(); });
    }

    attachControl() {
        let camera = this.camera;
        let canvas = this.canvas;
        camera.attachControl(canvas,true);
        camera.inputs.remove(camera.inputs.attached.keyboard);
        camera.inputs.remove(camera.inputs.attached.mousewheel);
    }

    buildScene() {
        let globe = this.globe = new GlobeModel(this.scene, 1);
        let camera = this.camera;
        this.scene.registerBeforeRender(() => globe.updateOutlineCircle(camera));    
    }

    toWorldMatrix(localMatrix) {
        let mat = this.camera.getWorldMatrix().getRotationMatrix();
        let imat = mat.clone().invert();
    
        return imat.multiply(localMatrix).multiply(mat);
    }
}


class GlobeModel {
    constructor(scene, radius) {
        this.globeRadius = radius;
        this.lineColor = new BABYLON.Color3(0.7,0.8,0.9);
        this.outlineCircleColor = new BABYLON.Color3(0.6,0.7,0.8);
        this.makeGrid(scene, 32, 32);
        this.makeOutlineCircle(scene);
        const me = this;    
    }

    makeGrid(scene, nx, ny) {
        const m = 200;
        let lines, line;
        let lineSystem;
        let R = this.globeRadius;
        let cssn = [];
    
        for(let i=0;i<m;i++) {
            let phi = Math.PI*2*i/(m-1);
            let cs = Math.cos(phi), sn = Math.sin(phi);
            cssn.push([R*cs,R*sn]);
        }
        
        lines = [];
        // equatore
        line = [];
        for(let i=0;i<m;i++) {
            line.push(new BABYLON.Vector3(cssn[i][0],0,cssn[i][1]));
        }
        lines.push(line);
        // meridiano fondamentale
        line = [];
        for(let i=0;i<m;i++) { 
            line.push(new BABYLON.Vector3(cssn[i][0],cssn[i][1],0));
        }
        lines.push(line);
    
        lineSystem = this.lineSystem1 = BABYLON.MeshBuilder.CreateLineSystem(
            "globe1", {lines: lines}, scene);
        lineSystem.color = this.lineColor;
        lineSystem.alpha = 0.2;
        lineSystem.isPickable = false;

        lines = [];
        // meridiani
        for(var i=1; i<nx; i++) {
            var phi = Math.PI*i/nx;
            var cs = Math.cos(phi), sn = Math.sin(phi);
            line = [];    
            for(var j=0; j<m; j++) {
                var x = cssn[j][0], y = cssn[j][1];
                line.push(new BABYLON.Vector3(cs*x,y,sn*x));
            }
            lines.push(line);
        }
        // paralleli
        for(var i=1;i<ny;i++) {
            var theta = Math.PI*i/ny;
            var cs = Math.cos(theta), sn = Math.sin(theta);
            line = [];    
            for(var j=0; j<m; j++) {
                var x = cssn[j][0], y = cssn[j][1];
                line.push(new BABYLON.Vector3(sn*x,R*cs,sn*y));
            }
            lines.push(line);        
        }
        lineSystem = this.lineSystem2 = BABYLON.MeshBuilder.CreateLineSystem(
            "globe2", {lines: lines}, scene);
        lineSystem.color = this.lineColor;
        lineSystem.alpha = 0.1;
        lineSystem.isPickable = false;
    }

        
    makeOutlineCircle(scene) {
        let lines = [];
        let m = 100;
        for(let i=0;i<m;i++) {
            let phi = Math.PI*2*i/(m-1);
            let cs = Math.cos(phi), sn = Math.sin(phi);
            lines.push(new BABYLON.Vector3(cs,sn,0));
        }
            
        let circle = this.outlineCircle = BABYLON.MeshBuilder.CreateLines(
            "circle", {points: lines}, scene);
        circle.color = new BABYLON.Color3(0.6,0.7,0.8);
        circle.alpha = 0.7;
    }
        
    updateOutlineCircle(camera) {
        const globeRadius = this.globeRadius;
        let circle = this.outlineCircle;
        let p = camera.position;
        let d = p.length();
        if(d<globeRadius*1.1) 
            circle.visibility = false;
        else {
            circle.visibility = true;
            var r = globeRadius*d/Math.sqrt(d*d-globeRadius*globeRadius);
            circle.lookAt(p);
            circle.scaling.x = circle.scaling.y = circle.scaling.z = r;    
        }        
    }
};
