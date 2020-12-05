class TreeModel {
    constructor(scene) {
        let mb = new H3ModelBuilder();
        mb.addModel(5);
        this.nodes = mb.nodes;
        let mesh = this.mesh = mb.makeMesh(scene);
        let material = this.material = this.createH3Material("shader", scene);
        mesh.material = material;
        this.hMatrix = BABYLON.Matrix.Identity();
        material.setMatrix("hMatrix", this.hMatrix);
        this.balls = [];
        this.createNodes(scene);
    }

    setHMatrix(hMatrix) {
        this.hMatrox = hMatrix;
        this.material.setMatrix("hMatrix", this.hMatrix);
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
        return material;
    }

    updateNodesPositions() {
        let hMatrix = this.hMatrix;
        this.nodes.forEach(nd => {
            nd.p = H3.toBall(nd.p1, hMatrix);
            let p2 = H3.toBall(nd.p2, hMatrix);
            nd.r = BABYLON.Vector3.Distance(nd.p, p2);
            nd.s = nd.r * 10;
        })
    }

    createNodes(scene) {
        this.updateNodesPositions();
        let ball = BABYLON.MeshBuilder.CreateIcoSphere('a',{
            radius:0.2,
            subdivisions:5,
            flat:false
        }, scene);
        let material = ball.material = new BABYLON.StandardMaterial('m',scene);
        material.diffuseColor.set(0.7,0.7,0.7);
        ball.registerInstancedBuffer("color", 4);
        this.balls = [];
        this.nodes.forEach((nd,i) => {
            let b = i==0 ? ball : ball.createInstance('i'+i);
            b.position.copyFrom(nd.p);
            let s = nd.s;
            b.scaling.set(s,s,s);
            this.balls.push(b);
            b._node = nd;
            b.instancedBuffers.color = 
                i%2 == 0 ? new BABYLON.Color4(0.8,0.5,0.1,1.0)
                : new BABYLON.Color4(0.1,0.5,0.8,1.0);
            b.nodeIndex = i;
        });
        
    }


    transform(matrix) {
        this.hMatrix = this.hMatrix.multiply(matrix);
        this.material.setMatrix("hMatrix", this.hMatrix);
        this.updateNodesPositions();
        this.balls.forEach((b,i) => {
            let nd = b._node;
            b.position.copyFrom(nd.p);
            let s = nd.s;
            b.scaling.set(s,s,s);
        });
    }

    selectNode(nodeIndex) {
        if(0<=nodeIndex && nodeIndex<this.balls.length) {
            let ball = this.balls[nodeIndex];
            ball.instancedBuffers.color = new BABYLON.Color4(0.8,0.4,0.1,1.0);
        }
    }
}


class H3ModelBuilder {
    constructor() {
        this.positions = [];
        this.indices = [];
        this.extra1 = [];
        this.extra2 = [];  
        this.matrix = BABYLON.Matrix.Identity();    
        this.matrixStack = [];
        this.m = 7;
        this.cssn = [];
        this.k = 0;
        for(let j=0;j<this.m;j++) {
            let phi = Math.PI*2*j/this.m;
            this.cssn.push([Math.cos(phi), Math.sin(phi)]);
        }
        this.nodes = [];
        this.small = new BABYLON.Vector3(0,0.1,0);
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

    addBranch(d,n) {
        let m = this.m;
        let r = 0.03;
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
                this.extra1.push(p.x/p.w,p.y/p.w,p.z/p.w,1);
                let s = 1.1;
                p = new BABYLON.Vector4(
                    (q[0]*x + q[4]*0 + q[8]*z)*s + q[12]*1,
                    (q[1]*x + q[5]*0 + q[9]*z)*s + q[13]*1,
                    (q[2]*x + q[6]*0 + q[10]*z)*s + q[14]*1,
                    (q[3]*x + q[7]*0 + q[11]*z)*s + q[15]*1);
                this.extra2.push(p.x/p.w,p.y/p.w,p.z/p.w,1);
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

    addNode() {
        let p1 = BABYLON.Vector3.TransformCoordinates(
            BABYLON.Vector3.Zero(), this.matrix);
        let p2 = BABYLON.Vector3.TransformCoordinates(
            this.small, this.matrix);
            
        this.nodes.push({p1,p2});
    }

    _addModel(level) {
        let branchLength = 1.8;
        let count = 1;
        this.addBranch(branchLength,10);
        this.pushMatrix();
        this.hTranslate(1,branchLength);
        this.addNode();
        if(level > 0) {
            for(let i=0; i<4; i++) {
                this.pushMatrix();
                this.rotateY(i*Math.PI/2);
                this.rotateZ(Math.PI/2);
                count += this._addModel(level-1);
                this.popMatrix();    
            }
        }
        this.popMatrix();        
        return count;
    }

    addModel(level) {
        this.pushMatrix();
        this.hTranslate(1,-1.6);
        this.addNode();
        let count = this._addModel(level);
        this.hTranslate(1,1.8);
        
        
        this.popMatrix();
        console.log("node count = " + count);
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
}
