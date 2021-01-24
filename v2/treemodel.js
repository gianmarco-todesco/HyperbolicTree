class TreeModel {

    constructor(hMaterial, scene) {
        this.scene = scene;        
        this.nodeColor = new BABYLON.Color4(0.02,0.6,0.7,1.0);
        this.selectedNodeColor = new BABYLON.Color4(0.9,0.8,0.1,1.0);
        this.material = hMaterial;
        this.nodes = [];     
        // this.hMatrix = BABYLON.Matrix.Identity();
        this.hMatrix = BABYLON.Matrix.RotationX(-Math.PI/2);
        this.material.setMatrix("hMatrix", this.hMatrix);
        
        scene.registerBeforeRender(() => {
            if(this.animation) {
                let ret = this.animation.tick();
                if(!ret) this.animation = null;
            }
            this.updateLabels();            
        });
    }

    /*
    setHMatrix(hMatrix) {
        this.hMatrox = hMatrix;
        
    }
    */


    updateNodesPositions() {
        let hMatrix = this.hMatrix;
        this.nodes.forEach(nd => {
            nd.p = H3.toBall(nd.p1, hMatrix);
            let p2 = H3.toBall(nd.p2, hMatrix);
            nd.r = BABYLON.Vector3.Distance(nd.p, p2);
            nd.s = nd.r * 10;
        })
    }

    transform(matrix) {
        this.hMatrix = this.hMatrix.multiply(matrix);
        this.material.setMatrix("hMatrix", this.hMatrix);
        this.updateNodesPositions();
        this.nodes.forEach((nd,i) => {
            let b = nd.ball;
            b.position.copyFrom(nd.p);
            let s = nd.s;
            b.scaling.set(s,s,s);
        });
    }

    moveNodeToCenter(node) {
        if(this.animation) return;
        this.animation = new NodeToCenterAnimation(this,node);        
    }

    _getNode(nodeIndex) { 
        return 0<=nodeIndex && nodeIndex<this.balls.length 
            ? this.balls[nodeIndex] : null;
    }
    _setNodeColor(ball, color) {
        ball.instancedBuffers.color.copyFrom(color);
    }
    selectNode(nodeIndex) {
        let ball = this._getNode(nodeIndex);
        if(ball) { 
            ball.isSelected = true; 
            this._setNodeColor(ball, this.selectedNodeColor);
        }
    }
    unselectNode(nodeIndex) {
        let ball = this._getNode(nodeIndex);
        if(ball) { 
            ball.isSelected = false; 
            this._setNodeColor(ball, this.nodeColor);
        }
    }
    isSelected(nodeIndex) {
        let ball = this._getNode(nodeIndex);
        return ball && ball.isSelected;
    }
    selectNone() {
        const me = this;
        this.balls.filter(b=>b.isSelected).forEach(b => {
            b.isSelected = false;
            me._setNodeColor(b, me.nodeColor);
        });
    }

    selectSubTree(nodeIndex) {

    }
    pickNodeIndex(mousex, mousey) {
        let r = this.scene.pick(mousex, mousey);
        if(r.hit && r.pickedMesh) {
            let mesh = r.pickedMesh;
            if(mesh.nodeIndex != undefined) return mesh.nodeIndex;
        }
        return -1;
    }


    createLabel(node) {
        const scene = this.scene;
        if(node.label) return;
        let label = node.label = BABYLON.MeshBuilder.CreatePlane('label', {
            width:0.9, 
            height:0.9}, 
            scene);
        label.position.set(0,0.5,-0.1);
        label.bakeCurrentTransformIntoVertices();
        label.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        label.parent = node.ball;

        label.material = new BABYLON.StandardMaterial('mat', scene);
        label.material.useAlphaFromDiffuseTexture = true;
        label.material.specularColor.set(0,0,0);
        let tw=512, th=512;
        let dt = label.material.diffuseTexture = new BABYLON.DynamicTexture('txt', {
            width:tw, 
            height:th,
            format:BABYLON.Engine.TEXTUREFORMAT_RGBA
        }, scene);
        dt.hasAlpha = true;
        dt.getContext().clearRect(0,0,dt.width,dt.height);

        let ctx = dt.getContext();
        ctx.clearRect(0,0,tw,th);

        // draw round rect
        const mrg = 10;
        const r = 20;
        let x0 = mrg, y0 = mrg, x1 = tw-mrg, y1 = th-mrg;
        ctx.beginPath();
        ctx.moveTo(x0+r,y0);
        ctx.lineTo(x1-r,y0);
        ctx.quadraticCurveTo(x1,y0,x1,y0+r);
        ctx.lineTo(x1,y1-r);
        ctx.quadraticCurveTo(x1,y1,x1-r,y1);
        ctx.lineTo(x0+r,y1);
        ctx.quadraticCurveTo(x0,y1,x0,y1-r);
        ctx.lineTo(x0,y0+r);
        ctx.quadraticCurveTo(x0,y0,x0+r,y0);
        ctx.closePath();
        ctx.fillStyle = "rgba(100,150,170,0.5)";
        ctx.strokeStyle = "black";
        ctx.lineWidth = 10;
        ctx.fill();
        ctx.stroke();
                        
        ctx.font = "bold 50px Calibri";

        let text = node.data.name;

        let wmax = tw-4*mrg;
        let w = ctx.measureText(text).width;
        let x = (tw-w)/2;
        //if(w > wmax) { 
        //    ctx.save(); 
        //    ctx.scale(wmax/w,1);
        //}
        ctx.fillStyle = "white";
        ctx.fillText(text, x, y0 + 50);
        let y2 = 3*mrg + 50; 
        //ctx.fillStyle = "rgba(255,255,0,0.5)";
        //ctx.fillRect(0,0,100,100);
        
        dt.update();

        var img = new Image();
        img.crossOrigin = "anonymous";
        img.src = node.data.image;

        let imgRect = { 
            x : x0 + mrg, 
            y : y2, 
            width : (x1-x0-2*mrg), 
            height : y1-mrg-y2
        };
        //ctx.fillStyle = "red";
        //ctx.fillRect(imgRect.x, imgRect.y, imgRect.width, imgRect.height);

        img.onload = function() {
            if(img.width>0 && img.height>0) {
                let sx = imgRect.width / img.width;
                let sy = imgRect.height / img.height;
                let sc = Math.min(sx,sy);
                let lx = img.width * sc;
                let ly = img.height * sc;
                
                ctx.drawImage(this, 
                    0, 0, img.width, img.height, 
                    imgRect.x + (imgRect.width - lx)*0.5,
                    imgRect.y + (imgRect.height - ly)*0.5,
                    lx,ly);
                dt.update();
    
            }
        }
    }

    updateLabels() {
        let t0 = performance.now();
        this.nodes.forEach(nd => nd.dist = nd.ball.position.length());
        let arr = this.nodes.map(nd=>nd).sort((a,b)=>a.dist-b.dist);
        // console.log(performance.now()-t0);
        for(let i=0; i<20 && i<arr.length;i++) {
            if(!arr[i].label)
                this.createLabel(arr[i]);
        }
    }
}


class NodeToCenterAnimation {
    constructor(treeModel, node) {
        this.treeModel = treeModel;
        this.node = node;
        let rot = this.getMatrixFromVector(node.position);
        let rotinv = rot.clone().invert();
        let htransl = H3.makeH3Translation(2,-0.05);

        let matrix = rot.multiply(htransl).multiply(rotinv);
        this.matrix = matrix;
    }

    tick() {
        let d = this.node.position.length();
        if(d < 0.1) return false;
        this.treeModel.transform(this.matrix);
        return true;
    }

    getMatrixFromVector(v) {
        let e2 = v.clone().normalize();
        let e1;
        let ax = Math.abs(e2.x);
        let ay = Math.abs(e2.y);
        let az = Math.abs(e2.z);
        if(ax>ay) e1 = ay>az ? BABYLON.Axis.Z : BABYLON.Axis.Y;
        else e1 = ax>az ? BABYLON.Axis.Z : BABYLON.Axis.X;
        e1 = e1.subtract(e2.scale(BABYLON.Vector3.Dot(e1,e2))).normalize();
        let e0 = BABYLON.Vector3.Cross(e1,e2).normalize();
        let rot = BABYLON.Matrix.FromArray([
            e0.x,e1.x,e2.x,0,
            e0.y,e1.y,e2.y,0,
            e0.z,e1.z,e2.z,0,
            0,0,0,1            
        ]);
        return rot;
    }

};

class TreeModelBuilder {

    constructor() {
        this.m = 7;
        this.cssn = [];
        for(let j=0;j<this.m;j++) {
            let phi = Math.PI*2*j/this.m;
            this.cssn.push([Math.cos(phi), Math.sin(phi)]);
        }
        // Vector 'small' controls the size of nodes
        this.small = new BABYLON.Vector3(0,0.05,0);
    }

    build(data, scene) {

        this.positions = [];
        this.indices = [];
        this.extra1 = [];
        this.extra2 = [];  
        this.matrix = BABYLON.Matrix.Identity();    
        this.matrixStack = [];
        this.nodes = [];
        this.k = 0;
        let material = this.createH3Material("shader", scene);
        this.model = new TreeModel(material, scene);

        this.pushMatrix();
        this.rotateZ(Math.PI/2);
        this.hTranslate(1,-1.6);
        this.model.root = this.addNode(data, null);
        let count = this._addModel(data, this.model.root);
        this.hTranslate(1,1.8);
        this.popMatrix();

        console.log("node count = " + count);

        this.model.nodes = this.nodes;
        this.model.mesh = this.makeMesh(scene);

        this.model.mesh.material = material;
        // material.setMatrix("hMatrix", this.model.hMatrix);

        this.createNodes(scene);

        return this.model;
    }

    pushMatrix() {
        this.matrixStack.push(this.matrix.clone());
    }
    popMatrix() {
        if(this.matrixStack.length>0) {
            this.matrix = this.matrixStack.pop();
        }
    }

    rotateX(angle) {
        this.matrix = BABYLON.Matrix.RotationX(angle).multiply(this.matrix);
    } 
    rotateY(angle) {
        this.matrix = BABYLON.Matrix.RotationY(angle).multiply(this.matrix);
    } 
    rotateZ(angle) {
        this.matrix = BABYLON.Matrix.RotationZ(angle).multiply(this.matrix);
    } 
    hTranslate(direction, hDistance) {
        this.matrix = H3.makeH3Translation(direction, hDistance).multiply(this.matrix);
    }

    
    // add a branch. d=length; n=number of elements
    addBranch(d,n) {
        let m = this.m;
        let r = 0.02;
        for(let i=0; i<n; i++) {
            let y = d * i/(n-1);
            let mat = H3.makeH3Translation(1,y).multiply(this.matrix);
            for(let j=0; j<m; j++) {
                let x = this.cssn[j][0] * r;
                let z = this.cssn[j][1] * r;
                let q = mat._m;
                let p = new BABYLON.Vector4(
                    q[0]*x + q[4]*0 + q[8]*z + q[12]*1,
                    q[1]*x + q[5]*0 + q[9]*z + q[13]*1,
                    q[2]*x + q[6]*0 + q[10]*z + q[14]*1,
                    q[3]*x + q[7]*0 + q[11]*z + q[15]*1);
                this.positions.push(0,0,0);
                //this.extra1.push(p.x/p.w,p.y/p.w,p.z/p.w,1);
                this.extra1.push(p.x,p.y,p.z,p.w);
                let s = 1.1;
                p = new BABYLON.Vector4(
                    (q[0]*x + q[4]*0 + q[8]*z)*s + q[12]*1,
                    (q[1]*x + q[5]*0 + q[9]*z)*s + q[13]*1,
                    (q[2]*x + q[6]*0 + q[10]*z)*s + q[14]*1,
                    (q[3]*x + q[7]*0 + q[11]*z)*s + q[15]*1);
                //this.extra2.push(p.x/p.w,p.y/p.w,p.z/p.w,1);
                this.extra2.push(p.x,p.y,p.z,p.w);
            }
        }
        let k = this.k;
        for(let i=0; i+1<n; i++) {
            for(let j=0; j<m; j++) {
                let j1 = (j+1)%m;
                this.indices.push(k+i*m+j,k+i*m+j1,k+(i+1)*m+j1);
                this.indices.push(k+i*m+j,k+(i+1)*m+j1,k+(i+1)*m+j);
            }
        }
        this.k += n*m;        
    }

    // add a new node
    addNode(nodeData, parentNode) {
        let p1 = BABYLON.Vector3.TransformCoordinates(
            BABYLON.Vector3.Zero(), this.matrix);
        let p2 = BABYLON.Vector3.TransformCoordinates(
            this.small, this.matrix);
        let newNode = { 
            p1, p2, 
            parent: parentNode, 
            children:[], 
            data: {
                name: nodeData.name,
                image: nodeData.image
            } 
        };           
        this.nodes.push(newNode);
        if(parentNode != null) parentNode.children.push(newNode);
        return newNode;
    }

    _addModel(data, parentNode) {
        let branchLength = 1.5; // 1.8;
        let count = 1;
        this.addBranch(branchLength,10);
        this.pushMatrix();
        this.hTranslate(1,branchLength);
        let node = this.addNode(data, parentNode);
        // if(level > 0) {
        let m = data.children.length;
        for(let i=0; i<m; i++) {
            this.pushMatrix();
            this.rotateY(i*Math.PI*2/m);
            this.rotateZ(1.1);
            count += this._addModel(data.children[i], node);
            this.popMatrix();    
        }
        this.popMatrix();        
        return count;
    }

    makeMesh(scene) {
        var mesh = new BABYLON.Mesh("mesh", scene);
        var vertexData = new BABYLON.VertexData();
        vertexData.positions = this.positions;
        vertexData.indices = this.indices;   
        vertexData.applyToMesh(mesh);
        let engine = scene._engine;
        let buffer = new BABYLON.Buffer(engine, this.extra1, false, 4);
        mesh.setVerticesBuffer(buffer.createVertexBuffer("extra1", 0, 4));
        buffer = new BABYLON.Buffer(engine, this.extra2, false, 4);
        mesh.setVerticesBuffer(buffer.createVertexBuffer("extra2", 0, 4));  
        
        mesh._boundingInfo = new BABYLON.BoundingInfo(
            new BABYLON.Vector3(-1, -1, -1), 
            new BABYLON.Vector3(1, 1, 1));

        return mesh;
    }

    createH3Material(name, scene) {
        let material =  new BABYLON.ShaderMaterial(name, scene, {
            vertex: "H3",
            fragment: "H3",
        },
        {
            attributes: ["position", "normal", "uv", "extra1", "extra2"],
            uniforms: [
                "world", "worldView", "worldViewProjection", 
                "view", "projection",
                "hMatrix"
            ]
        });
        material.setMatrix("hMatrix", BABYLON.Matrix.Identity());
        window.material = material;
        return material;
    }

    createNodes(scene) {
        this.model.updateNodesPositions();

        let ball = BABYLON.MeshBuilder.CreateIcoSphere('a',{
            radius:0.2,
            subdivisions:5,
            flat:false
        }, scene);
        let material = ball.material = new BABYLON.StandardMaterial('m',scene);
        material.diffuseColor.set(1,1,1);
        ball.registerInstancedBuffer("color", 4);
        let balls = this.model.balls = [];
        const me = this;
        let nodeColor = this.model.nodeColor;

        this.model.nodes.forEach((nd,i) => {
            let b = i==0 ? ball : ball.createInstance('i'+i);
            b.position.copyFrom(nd.p);
            let s = nd.s;
            b.scaling.set(s,s,s);
            balls.push(b);
            // b._node = nd;
            nd.ball = b;
            b.instancedBuffers.color = nodeColor.clone();
            b.nodeIndex = i;
            b.node = nd;
            b.isSelected = false;
        });        
    }

    
}
