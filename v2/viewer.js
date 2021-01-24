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
            -0.41,  1.14, // alfa,beta
            0.8, // radius 
            new BABYLON.Vector3(0,0,0), scene);
        this.attachControl();

        
        camera.minZ = 0.001;
        camera.maxZ = 10;
        // camera.wheelPrecision = 50;

	    // light
        this.light = new BABYLON.PointLight('light1', 
            new BABYLON.Vector3(0.1,0.2,0), scene);
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


    
    createLabel() {
        let scene = this.scene;
        let a = BABYLON.MeshBuilder.CreatePlane('label', {width:0.3, height:0.07}, scene);
        a.position.y = 0.25;
        a.bakeCurrentTransformIntoVertices();
        a.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        a.material = new BABYLON.StandardMaterial('mat', scene);
        a.material.useAlphaFromDiffuseTexture = true;
        let tw=256, th=64;
        let dt = a.material.diffuseTexture = new BABYLON.DynamicTexture('txt', {
            width:tw, 
            height:th,
            format:BABYLON.Engine.TEXTUREFORMAT_RGBA
        }, scene);
        dt.hasAlpha = true;
        dt.getContext().clearRect(0,0,dt.width,dt.height);

        // dt.drawText("Grass", 5, 44, font, "white", "transparent", true, true);
        let ctx = dt.getContext();
        ctx.font = "bold 50px Calibri";

        a.setText = (t) => {
            ctx.clearRect(0,0,tw,th);
            let w = ctx.measureText(t).width;
            ctx.fillStyle = "white";
            ctx.fillText(t, (tw-w)/2, 50);
            
            ctx.fillStyle = "rgba(255,255,0,0.5)";
            ctx.fillRect(0,0,100,100);
            
            dt.update();
        }

        return a;
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
        let globe = new BABYLON.Mesh('globe', scene);
        globe.parent = this.world;
        const m = 200;
        let line;
        let lineSystem;
        let R = 1;
        let color = new BABYLON.Color3(0.7,0.7,0.7);
        // let lightColor = new BABYLON.Color3(0.5,0.5,0.5);

        const thetaLow = Math.PI/ny;
        const thetaHigh = Math.PI*(ny-1)/ny;
        

        const strongLines = [];
        const lightLines = [];

        // equatore
        line = [];
        for(let i=0;i<m;i++) {
            let phi = Math.PI*2*i/(m-1);
            line.push(new BABYLON.Vector3(R*Math.cos(phi),0,R*Math.sin(phi)));
        }
        strongLines.push(line);

        // meridiani
        for(let i=0; i<2*nx; i++) {
            let phi = 2*Math.PI*i/(2*nx);
            let cs = Math.cos(phi), sn = Math.sin(phi);
            line = [];    
            for(let j=0; j<m; j++) {
                let theta = thetaLow * j/(m-1) + thetaHigh * (m-1-j)/(m-1);
                let d = R*Math.sin(theta), y =R*Math.cos(theta);
                line.push(new BABYLON.Vector3(cs*d,y,sn*d));
            }
            if((i*2)%nx == 0)
                strongLines.push(line);
            else
                lightLines.push(line);
        }

        // paralleli
        for(let i=1;i<ny;i++) {
            if(i*2==ny) continue; 
            let theta = Math.PI*i/ny;
            let cs = Math.cos(theta), sn = Math.sin(theta);
            let r = sn*R;
            line = [];    
            for(let j=0; j<m; j++) {
                let phi = Math.PI*2*j/(m-1);
                line.push(new BABYLON.Vector3(Math.cos(phi)*r,R*cs,Math.sin(phi)*r));
            }
            lightLines.push(line);        
        }
        
        lineSystem = this.lineSystem1 = BABYLON.MeshBuilder.CreateLineSystem(
            "globe1", {lines: strongLines}, scene);
        lineSystem.color = color;
        lineSystem.parent = globe;
        lineSystem.alpha = 0.2;
        lineSystem.isPickable = false;

        lineSystem = this.lineSystem2 = BABYLON.MeshBuilder.CreateLineSystem(
            "globe2", {lines: lightLines}, scene);
        lineSystem.parent = globe;
        lineSystem.color = color;
        lineSystem.alpha = 0.1;
        lineSystem.isPickable = false;
        
        return globe;
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
            let r = globeRadius*d/Math.sqrt(d*d-globeRadius*globeRadius);
            circle.lookAt(p);
            circle.scaling.x = circle.scaling.y = circle.scaling.z = r;    
        }        
    }
};


function createAxes(scene) {

    let Color4 = BABYLON.Color4;
    let Vector3 = BABYLON.Vector3;
     
    let m = 50;
    let r = 5;
    let pts = [];
    let colors = [];
    let c1 = new Color4(0.7,0.7,0.7,0.5);
    let c2 = new Color4(0.5,0.5,0.5,0.25);
    let cRed   = new Color4(0.8,0.1,0.1);
    let cGreen = new Color4(0.1,0.8,0.1);
    let cBlue  = new Color4(0.1,0.1,0.8);
    
    let color = c1;
    function line(x0,y0,z0, x1,y1,z1) { 
        pts.push([new Vector3(x0,y0,z0), new Vector3(x1,y1,z1)]); 
        colors.push([color,color]); 
    }
    
    for(let i=0;i<=m;i++) {
        if(i*2==m) continue;
        color = (i%5)==0 ? c1 : c2;
        let x = -r+2*r*i/m;        
        line(x,0,-r, x,0,r);
        line(-r,0,x, r,0,x);
    }
    
    let r1 = r + 1;
    let a1 = 0.2;
    let a2 = 0.5;
    
    // x axis
    color = cRed;
    line(-r1,0,0, r1,0,0); 
    line(r1,0,0, r1-a2,0,a1);
    line(r1,0,0, r1-a2,0,-a1);
        
    // z axis
    color = cBlue;
    line(0,0,-r1, 0,0,r1); 
    line(0,0,r1, a1,0,r1-a2);
    line(0,0,r1,-a1,0,r1-a2);
    
    // y axis
    color = cGreen;
    line(0,-r1,0, 0,r1,0); 
    line(0,r1,0, a1,r1-a2,0);
    line(0,r1,0,-a1,r1-a2,0);
    line(0,r1,0, 0,r1-a2,a1);
    line(0,r1,0, 0,r1-a2,-a1);
    
    const lines = BABYLON.MeshBuilder.CreateLineSystem(
        "lines", {
                lines: pts,
                colors: colors,
                
        }, 
        scene);
    lines.isPickable = false;
    return lines;  
}
