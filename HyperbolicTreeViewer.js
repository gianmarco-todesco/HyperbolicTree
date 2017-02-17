
var canvas, engine, scene, camera, light;
var globe;
var data;
var model = null;
var ball;
var circle;

var selection = [];
var sballNextId = 1;

var globeRadius = 20;
var goldenRatio = 0.6180339887498949;

var nextLabelId = 1;

var migrationIndex = -1;

var ii = 0;
var dataFile = "data.json";

//
// Create the wireframe globe
//
function makeGlobe(scene) {
    var globe = [];
    var lines, line, lineSystem;
    var R = globeRadius;
    var m = 200;
    var cssn = [];

    for(var i=0;i<m;i++) {
        var phi = Math.PI*2*i/(m-1);
        var cs = Math.cos(phi), sn = Math.sin(phi);
        cssn.push([R*cs,R*sn]);
    }
    
    lines = [];
    // equatore
    line = [];
    for(var i=0;i<m;i++) { line.push(new BABYLON.Vector3(cssn[i][0],0,cssn[i][1]));}
    lines.push(line);
    // meridiano fondamentale
    line = [];
    for(var i=0;i<m;i++) { line.push(new BABYLON.Vector3(cssn[i][0],cssn[i][1],0));}
    lines.push(line);
    
    lineSystem = BABYLON.MeshBuilder.CreateLineSystem("globe1", {lines: lines}, scene);
    lineSystem.color = new BABYLON.Color3(0.7,0.7,0.7);
    lineSystem.alpha = 0.3;
    lineSystem.isPickable = false;
    globe.push(lineSystem);
    
    var n = 8;
    lines = [];
    // meridiani
    for(var i=1; i<n; i++) {
        var phi = 2*Math.PI*i/n;
        var cs = Math.cos(phi), sn = Math.sin(phi);
        line = [];    
        for(var j=0; j<m; j++) {
            var x = cssn[j][0], y = cssn[j][1];
            line.push(new BABYLON.Vector3(cs*x,y,sn*x));
        }
        lines.push(line);
    }
    // paralleli
    for(var i=-2;i<=2;i++) {
        if(i==0) continue;
        var theta = Math.PI*(i+3)/6;
        var cs = Math.cos(theta), sn = Math.sin(theta);
        line = [];    
        for(var j=0; j<m; j++) {
            var x = cssn[j][0], y = cssn[j][1];
            line.push(new BABYLON.Vector3(sn*x,R*cs,sn*y));
        }
        lines.push(line);        
    }
    lineSystem = BABYLON.MeshBuilder.CreateLineSystem("globe2", {lines: lines}, scene);
    lineSystem.color = new BABYLON.Color3(0.5,0.5,0.5);
    lineSystem.alpha = 0.1;
    lineSystem.isPickable = false;
    globe.push(lineSystem);

    return globe;
}

//
// Create the outline circle
//
function makeCircle(scene) {
    var lines = [];
    var m = 100;
    for(var i=0;i<m;i++) {
        var phi = Math.PI*2*i/(m-1);
        var cs = Math.cos(phi), sn = Math.sin(phi);
        lines.push(new BABYLON.Vector3(cs,sn,0));
    }
        
    var circle = BABYLON.MeshBuilder.CreateLines("circle", {points: lines}, scene);
    circle.color = new BABYLON.Color3(0.6,0.7,0.8);
    circle.alpha = 0.7;
    return circle;
}

//
// Align the outline circle to the camera
// 
function updateCircle() {
    var p = camera.position;
    var d = p.length();
    if(d<globeRadius*1.1) 
        circle.visibility = false;
    else {
        circle.visibility = true;
        var r = globeRadius*d/Math.sqrt(d*d-globeRadius*globeRadius);
        circle.lookAt(p);
        circle.scaling.x=circle.scaling.y=circle.scaling.z=r;    
    }
}

//
// Load a json file asynchronously (if ok: call onSuccess(parsed_json) )
//
function asyncLoad(fn, onSuccess) {            
    var xhr = new XMLHttpRequest();
    xhr.open("GET", fn, true);
    xhr.overrideMimeType("application/json");
    xhr.onload = function(e) {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                onSuccess(JSON.parse(xhr.responseText));
            } else {
                console.error(xhr.statusText);
            }
        }
    };
    xhr.onerror = function (e) {
        console.error(xhr.statusText);
    };
    xhr.send(null);
}; 

//
// Load (asynchronously) the data and build the tree 
// (the actual tree builder is appendDataItems)
//
function loadData() {
    asyncLoad(dataFile, function(node) {
        data = [];
        appendDataItems(data, -1, BABYLON.Matrix.Identity(), node);
        console.log(data.length + " items");
        if(model) model.dispose();
        model = new TreeModel(scene, ball, data);
    });
}

//
// build the tree (or a tree branch)
// array    : the vector to be filled with data
// parentId : the vectorIndex of the parent (-1 for the root)
// matrix   : the 4x4 matrix for the (sub)tree
// srcNode  : the node in the json data  
function appendDataItems(array, parentId, matrix, srcNode) {
    var id = array.length;
    var item = {
        id:id,
        parentId:parentId,
        matrix:matrix,
        name:srcNode.name,
        imageUrl:srcNode.image        
    };
    array.push(item);
    var m = srcNode.children.length;
    if(m>0) {
        if(m>1) {
            for(var i=0; i<m; i++) {
                var theta = 0.4 + 0.03 * i;
                var phi = 2*Math.PI*goldenRatio*i;

                var r = srcNode.children[i].children.length>1 ? 0.4 : 0.25
                
                var mat2 = BABYLON.Matrix.RotationY(phi).multiply(matrix);
                mat2 = BABYLON.Matrix.RotationX(theta).multiply(mat2);
                mat2 = makeH3Translation(1,r).multiply(mat2);
                
                appendDataItems(array, id, mat2, srcNode.children[i]);
            }
         } else {

                var mat2 = makeH3Translation(1,0.5).multiply(matrix);                
                appendDataItems(array, id, mat2, srcNode.children[0]);         
         }    
    }
}

//
// Create a 4x4 matrix representing a H3 translation
//            
function makeH3Translation(i, d) {
    var cshd = Math.cosh(d);
    var snhd = Math.sinh(d);
    switch(i) { 
        case 0: return BABYLON.Matrix.FromValues(
            cshd,0,0,snhd,
            0,1,0,0,
            0,0,1,0,
            snhd,0,0,cshd
        ); break;
        case 1: return BABYLON.Matrix.FromValues(
            1,0,0,0,
            0,cshd,0,snhd,
            0,0,1,0,
            0,snhd,0,cshd
        ); break;
        case 2: return BABYLON.Matrix.FromValues(
            1,0,0,0,
            0,1,0,0,
            0,0,cshd,snhd,
            0,0,snhd,cshd
        ); break;
    } 
}

//
// TreeModel class
// contains: instances, lines, matrix (the current matrix), selection, labels
// ...
function TreeModel(scene, ball, data) {
    this.instances = [];
    this.lines = [];
    this.selection = [];
    this.labels = [];
    var index = 0;
    var q = new BABYLON.Vector3(0,0.01,0);
    var me = this;
    
    data.forEach(function(item) {    
        var inst = ball.createInstance("i"+index); index++;        
        inst.dataItem = item;        
        me.instances.push(inst);
    });
    console.log(me.instances.length);
    this.instances.forEach(function(inst) {        
        if(inst.dataItem.parentId>=0) {
            me.lines.push([me.instances[inst.dataItem.parentId].position, inst.position]);
        }        
    });
    
    var lineSystem = me.lineSystem = BABYLON.MeshBuilder.CreateLineSystem(
        "lineSystem2", 
        {lines: me.lines, updatable:true}, 
        scene);
    lineSystem.color = new BABYLON.Color3(0.6,0.6,0.6);
    lineSystem.alpha = 0.1;
    lineSystem.isPickable = false;    
    this.setTransformation(BABYLON.Matrix.Identity());
}

TreeModel.prototype.dispose = function() {
    this.instances.forEach(function(inst) { inst.dispose(); });
    this.instances = [];
    if(this.lineSystem) {
        this.lineSystem.dispose();
        this.lineSystem = null;
    }
    this.labels = [];
}

TreeModel.prototype.setTransformation = function(gmat) {
    this.matrix = gmat;
    var r = globeRadius, r2 = globeRadius*globeRadius;
    gmat = gmat.multiply(BABYLON.Matrix.Scaling(r, r, r));
    this.instances.forEach(function(inst) {
        var item = inst.dataItem;
        var matrix = item.matrix.multiply(gmat);        
        BABYLON.Vector3.TransformCoordinatesToRef(BABYLON.Vector3.Zero(), matrix, inst.position);  
        var u = 1.0 - inst.position.length()/r;
        var sc = 30.0 * Math.pow(u,1); // /(1.0  + 10.0*u);        
        inst.scaling.x = inst.scaling.y = inst.scaling.z = sc;                   
    });
    BABYLON.MeshBuilder.CreateLineSystem(null, {lines:this.lines, instance:this.lineSystem}, null);    
    this.lineSystem.refreshBoundingInfo();
    // ii = 0;
}

TreeModel.prototype.pick = function(mousex, mousey) {        
    var worldMatrix = BABYLON.Matrix.Identity();
    var transformMatrix = scene.getTransformMatrix();
    var viewport = scene.activeCamera.viewport;
    var closest = -1;
    var closestDistance2 = 0;
    for(var i=0; i<this.instances.length; i++) {
        
        var position = this.instances[i].position;
        var p = BABYLON.Vector3.Project(position, worldMatrix, transformMatrix, viewport);
        var dx = p.x - mousex, dy = p.y - mousey, dz = p.z + 1.0;
        if(dz<0) continue;
        dxy2 = dx*dx+dy*dy;
        if(dxy2>0.001) continue;
        var distance2 = dx*dx+dy*dy+dz*dz*0.01;
        if(closest < 0 || distance2<closestDistance2) {
            closest = i;
            closestDistance2 = distance2;
        }
    }
    return closest;
}
 
TreeModel.prototype.selectItem = function(itemIndex) {
    if(itemIndex<0 || itemIndex>=this.instances.length) return;
    var inst = this.instances[itemIndex];
    if(inst.selectionBall) return;
    var i = sballNextId++;
    var sball = BABYLON.Mesh.CreateSphere("sball" + i, 8, 0.025, scene);
    sball.material = new BABYLON.StandardMaterial("sballMat" + i, scene);
    sball.material.diffuseColor = new BABYLON.Color3(0.1, 0.8, 0.7);
    sball.position = inst.position;
    sball.scaling = inst.scaling;
    inst.selectionBall = sball;
    this.selection.push(sball);    
}


TreeModel.prototype.unselectItem = function(itemIndex) {
    if(itemIndex<0 || itemIndex>=this.instances.length) return;
    var inst = this.instances[itemIndex];
    if(!inst.selectionBall) return;
    var k = this.selection.indexOf(inst.selectionBall);
    if(k>=0) this.selection.splice(k,1);
    inst.selectionBall.dispose();
    delete inst.selectionBall;
}

TreeModel.prototype.isSelected = function(itemIndex) {
    return 0<=itemIndex && itemIndex<this.instances.length && this.instances[itemIndex].selectionBall;
}

TreeModel.prototype.selectNone = function() {
    this.instances.forEach(function(inst) { if(inst.selectionBall) delete  inst.selectionBall; });
    this.selection.forEach(function(sball) { sball.dispose(); });
    this.selection = [];
}


TreeModel.prototype.showLabel = function(index) {
    if(index<0 || index>=this.instances.length) return;
    var inst = this.instances[index];
    if(inst.label) { 
        inst.label.worldSpaceCanvasNode.visibility = true; 
    } else {
        var label = inst.label = createLabel(scene, inst.dataItem);
        var labelNode = label.worldSpaceCanvasNode;
        labelNode.position = inst.position;
        // labelNode.parent = inst;
    }
    this.labels.push(inst.label);
}

TreeModel.prototype.hideLabel = function(index) {
    if(index<0 || index>=this.instances.length) return;
    var inst = this.instances[index];
    if(!inst.label) return;
    inst.label.worldSpaceCanvasNode.visibility  = false;
    var k = this.labels.indexOf(inst.label);
    if(k>=0) this.labels.splice(k, 1);        
}


TreeModel.prototype.orientLabels = function() {
    // var qr= new BABYLON.Quaternion(), sc = new BABYLON.Vector3(), tr = new BABYLON.Vector3();
    for(var i=0; i<this.labels.length; i++) {
        var label = this.labels[i];
        var labelNode = label.worldSpaceCanvasNode;    
        var e2 = labelNode.position.subtract(camera.position).normalize();
        var e0 = camera.getDirection(new BABYLON.Vector3(1,0,0));
        e0 = e0.subtract(e2.scale(BABYLON.Vector3.Dot(e0,e2))).normalize();
        var e1 = BABYLON.Vector3.Cross(e2,e0);
        var mat = BABYLON.Matrix.FromValues(e0.x,e1.x,e2.x,0, e0.y,e1.y,e2.y,0, e0.z,e1.z,e2.z,0, 0,0,0,1);
        mat.invert();
        mat = BABYLON.Matrix.Translation(140,-150,0).multiply(mat);
        label.worldSpaceCanvasNode.setPivotMatrix(mat);
    }

}

TreeModel.prototype.migrateToCenter = function(p, t) {

    var dist = p.length()/globeRadius;
    if(dist>=1.0) return;
    
    var angle = -Math.atanh(dist) * t;
    
    var phi = Math.atan2(p.z,p.x);
    var theta = Math.acos(p.y/p.length());

    var rot = BABYLON.Matrix.RotationY(phi).multiply(BABYLON.Matrix.RotationZ(theta));
    var invRot = rot.clone().invert();
    
    var mat = this.matrix.multiply(rot).multiply(makeH3Translation(1,angle)).multiply(invRot);
    
    this.setTransformation(mat);
}


var targetRadius = 3;
var radiusSpeed = 0;


function onTick() {
    if(model && ii<model.instances.length) {
        while(ii<model.instances.length) {
            var inst = model.instances[ii];
            if(inst.position.length()<15 && !inst.label) break;
            ii++;
        }
        if(ii<model.instances.length) {
            model.showLabel(ii);
            ii++;
        }
    }
/*
    if(migrationEnabled && selection != []) {
        var p = selection[0].position;
        if(p.length()<0.3) {
            migrationEnabled = false;
        }
        migrateToCenter(p, 0.01);
    }
  */  
    /*
    if(radiusSpeed != 0.0) {
        var r = camera.radius + radiusSpeed;
        if(radiusSpeed>0.0 && r>targetRadius) { r = targetRadius;  radiusSpeed = 0.0; }
        else if(radiusSpeed<0.0 && r<targetRadius) { r = targetRadius;  radiusSpeed = 0.0; }
        camera.radius = r;
        r = 3.0 / camera.radius;
        circle.scaling.x = circle.scaling.y = circle.scaling.z = r;
    }
    
    if(Math.abs(targetRadius - camera.radius)>0.0) {
        var maxSpeed = 0.2;
        if(targetRadius > camera.radius) {
            radiusSpeed+=0.01;
            if(radiusSpeed>maxSpeed) radiusSpeed = maxSpeed;
        }
        else {
            radiusSpeed-=0.01;
            if(radiusSpeed<-maxSpeed) radiusSpeed = -maxSpeed;
        }    
    }
    */

    
}


//
// create a label for the 'item' node
//
function createLabel(scene, item) {

    var texture = new BABYLON.Texture(
        item.imageUrl,
//        "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Squid_colors_2.jpg/220px-Squid_colors_2.jpg", // item.imageUrl,
        scene, true, false, BABYLON.Texture.NEAREST_SAMPLINGMODE);
    texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
    texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;


    var label = new BABYLON.WorldSpaceCanvas2D(scene, new BABYLON.Size(250, 300), {
        id: "wsc" + nextLabelId++,
        worldPosition: new BABYLON.Vector3(0, 0, 0),
        worldRotation: BABYLON.Quaternion.RotationYawPitchRoll(0,0, 0),
        renderScaleFactor: 16,
        enableInteraction: true,
        backgroundFill: "#C0C0C088",
        backgroundRoundRadius: 10,
        backgroundBorder: "#000000FF",
        backgroundBorderThickNess: 2.0, 
        children: [
            new BABYLON.Rectangle2D({
                id : "r1", x : 10, y: 260, width: 230, height: 30, fill: "#40C040FF", 
                roundRadius: 10,
                children: [
                    new BABYLON.Text2D(item.name, { 
                        fontName: "20pt Verdana", 
                        marginAlignment: "h: center, v: center",
                        defaultFontColor: new BABYLON.Color4(0,0,0,1), 
                        })
                ]
            })  ,          	            
            new BABYLON.Text2D("#"+item.id, { 
                x:10, y: 240, 
                fontName: "14pt Arial", 
            }),
            new BABYLON.Rectangle2D({
                id: "r2", x:10, y:10, width:230, height:200,
                children: [
                    new BABYLON.Sprite2D(texture, {
                        id: "sprite1_", invertY:true, 
                        marginAlignment: "h: center, v: center",        
                    })
                ]
            })
        ]
    });



    
    var r = 0.015;
    label.worldSpaceCanvasNode.scaling = new BABYLON.Vector3(r,r,r);

/*    
    canvas.worldSpaceCanvasNode.parent = model.instances[3];
    */
    return label;
}

function onItemClick(index) {
    // var inst = model.instances[index];
    if(model.isSelected(index)) {
       model.unselectItem(index); 
       model.hideLabel(index);
       
    } else {
       model.selectItem(index); 
       model.showLabel(index);

       if(model.instances[index].position.length()>7) {
            migrationIndex = index;
       }
    }
}

var lastx, lasty;
    
//
// initialize (main function)
//
function initialize(renderCanvas) {
    canvas = renderCanvas;
    engine = new BABYLON.Engine(canvas, true);
    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color3(.2, .2, .2);

    camera = new BABYLON.ArcRotateCamera("camera1", 0.3, 0.5, 50, new BABYLON.Vector3(0, 0, 0), scene);
    camera.attachControl(canvas, true);
    camera.inputs.attached.keyboard.detachControl();

/*
    camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 1, -15), scene);
    camera.attachControl(canvas, false);
    // camera.inputs.attached.keyboard.detachControl();
    */
  
    var light = new BABYLON.PointLight("light1", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = .5;
    light.parent = camera;
    
    globe = makeGlobe(scene);

    ball = BABYLON.Mesh.CreateSphere("ball", 8, 0.02, scene);
    ball.material = new BABYLON.StandardMaterial("ballMaterial", scene);
    ball.material.diffuseColor = new BABYLON.Color3(1.0, 0.2, 0.7);
    ball.scaling.x = ball.scaling.y = ball.scaling.z = 0.01;

    myball = BABYLON.Mesh.CreateSphere("myballx", 8, 0.02, scene);
    myball.position = new BABYLON.Vector3(1,0,0);
    myball.material = new BABYLON.StandardMaterial("myballx", scene);
    myball.material.diffuseColor = new BABYLON.Color3(1.0, 0.0, 0.0);

    myball = BABYLON.Mesh.CreateSphere("myballz", 8, 0.02, scene);
    myball.position = new BABYLON.Vector3(0,0,1);
    myball.material = new BABYLON.StandardMaterial("myballz", scene);
    myball.material.diffuseColor = new BABYLON.Color3(0.0, 0.0, 1.0);
    
    circle = makeCircle(scene);
    circle.isPickable = false;

    
    $("#renderCanvas").mousedown(function(e) { lastx = e.pageX; lasty = e.pageY; console.log(lastx,lasty); });
    $("#renderCanvas").mouseup(function(e) { 
        var dx = Math.abs(lastx - e.pageX);
        var dy = Math.abs(lasty - e.pageY);
        console.log("up",dx,dy);
        if(dx*dx+dy*dy<10) {
        
            var posX = e.pageX - $(this).offset().left,
                posY = e.pageY - $(this).offset().top;
            var mousex = posX/canvas.width;
            var mousey = posY/canvas.height;
            
            var index = model.pick(mousex, mousey);
            if(0<=index && index<model.instances.length) {
                onItemClick(index);
            }            
        }
    });

/*    
    scene.onPointerDown = function(e,pickResult) {
        if(model) {
            var mousex = (e.clientX - canvas.offsetLeft)/canvas.width;
            var mousey = (e.clientY - canvas.offsetTop)/canvas.height;        
            var index = model.pick(mousex, mousey);
            if(0<=index && index<model.instances.length) {
                onItemClick(index);
            }            
        }
  */
  
        
/*    
        console.log(e,pickResult);
        if(pickResult && pickResult.pickedMesh) { 
            console.log(pickResult.pickedMesh.id); 
            var id = pickResult.pickedMesh.id;
            if(id[0]=='i')
            {
                var index = parseInt(id.substr(1));
                if(0<=index && index<model.instances.length) onInstanceClicked(index);
            }
        }
*/

/*
        var mousex = (e.clientX - canvas.offsetLeft)/canvas.width;
        var mousey = (e.clientY - canvas.offsetTop)/canvas.height;
        
        var worldMatrix = BABYLON.Matrix.Identity();
        var transformMatrix = scene.getTransformMatrix();
        var viewport = scene.activeCamera.viewport;
        selectNone();
        var closest = -1;
        var closestDistance2 = 0;
        for(var i=0; i<model.instances.length; i++) {
            
            var position = model.instances[i].position;
            var p = BABYLON.Vector3.Project(position, worldMatrix, transformMatrix, viewport);
            var dx = p.x - mousex, dy = p.y - mousey, dz = p.z + 1.0;
            if(dz<0) continue;
            dxy2 = dx*dx+dy*dy;
            if(dxy2>0.001) continue;
            var distance2 = dx*dx+dy*dy+dz*dz*0.01;
            if(closest < 0 || distance2<closestDistance2) {
                closest = i;
                closestDistance2 = distance2;
            }
        }
        if(closest>=0)
        {
            selectItem(closest);
        }
            
        
    */
        
    // }
                
    engine.runRenderLoop(function () { 
        // foo();
        if(!!model && 0<=migrationIndex && migrationIndex<model.instances.length) {
            model.migrateToCenter(model.instances[migrationIndex].position,0.05);
            if(model.instances[migrationIndex].position.length()<3.5) {
                migrationIndex = -1;
            }
        }

        if(model) model.orientLabels();
        
        
        onTick();
        updateCircle();
        scene.render();
    });
    window.addEventListener("resize", function () {
        engine.resize();
    });
    
    window.addEventListener("keydown", function(e) {
        if(e.keyCode == 38) {
            console.log("up");
            camera.inertialRadiusOffset += 0.5;
        }
        else if(e.keyCode == 40) {
            console.log("dn");
            camera.inertialRadiusOffset -= 0.5;
            // updateModel(model, makeH3Translation(1,-0.01).multiply(model.matrix));
        }
        else console.log(e, e.key);
        
        /*
        if(e.key == "ArrowRight") {        
            updateModel(model, makeH3Translation(1,0.01).multiply(model.matrix));
        }
        else if(e.key == "ArrowLeft") {        
            updateModel(model, makeH3Translation(1,-0.01).multiply(model.matrix));
        }
        else if(e.key == "ArrowUp") {
            targetRadius -= 0.5;
            if(targetRadius<0.3) targetRadius=0.3;
        }
        else if(e.key == "ArrowDown") {
            targetRadius += 0.5;
        }
        */
        
        
        
    }, false);
//            element.addEventListener("keyup", this._onKeyUp, false);


    loadData();
    
}

var vvvStr = null;
var vvv=null;
            

            
            