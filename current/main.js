let circle;

let viewer;
let tree;

window.addEventListener("DOMContentLoaded", function() {

    viewer = new Viewer('c');
    tree = new TreeModel(viewer.scene);    
    
    viewer.runRenderLoop();

    viewer.scene.onKeyboardObservable.add((kbInfo) => {
        switch (kbInfo.type) {
            case BABYLON.KeyboardEventTypes.KEYDOWN:
                if(kbInfo.event.key == "ArrowUp") hTranslate(2,-0.1);
                else if(kbInfo.event.key == "ArrowDown") hTranslate(2,0.1);
                else if(kbInfo.event.key == "ArrowLeft") rotate(-0.1);
                else if(kbInfo.event.key == "ArrowRight") rotate(0.1);
                else if(kbInfo.event.key == "w") hTranslate(1,-0.1);
                else if(kbInfo.event.key == "z") hTranslate(1,0.1);
                else if(kbInfo.event.key == "a") hTranslate(0,0.1);
                else if(kbInfo.event.key == "s") hTranslate(0, -0.1);
                else console.log(kbInfo.event.key);
                break;
            case BABYLON.KeyboardEventTypes.KEYUP:
                break;
        }
    });
});

function hTranslate(direction, amount) {
    tree.transform(viewer.toWorldMatrix(H3.makeH3Translation(direction, amount)));
}

function rotate(angle) {
    tree.transform(viewer.toWorldMatrix(BABYLON.Matrix.RotationY(angle)));
}

/*
hMatrix = BABYLON.Matrix.Identity();
function hTranslate(direction, hDistance) {
    hMatrix = hMatrix.multiply(H3.makeH3Translation(direction, hDistance));
    shaderMaterial.setMatrix("hMatrix", hMatrix);
}
*/

function rfoo(angle) {
    let mat = camera.getWorldMatrix().getRotationMatrix();
    let imat = mat.clone().invert();
    
    hMatrix = hMatrix
        .multiply(imat)
        .multiply(BABYLON.Matrix.RotationY(angle))
        .multiply(mat);        
    shaderMaterial.setMatrix("hMatrix", hMatrix);

}

function foo(dir, amount) {
    let mat = camera.getWorldMatrix().getRotationMatrix();
    let imat = mat.clone().invert();
    
    hMatrix = hMatrix
        .multiply(imat)
        .multiply(makeH3Translation(dir, amount))
        .multiply(mat);        
    shaderMaterial.setMatrix("hMatrix", hMatrix);
}
BABYLON.Effect.ShadersStore["customVertexShader"]= `
    uniform mat4 worldViewProjection;
    uniform mat4 worldInverseTranspose;
    uniform mat4 world;
    
    uniform mat4 hMatrix;
    attribute vec4 position;
    attribute vec3 normal;
    attribute vec4 extra1, extra2;
    //attribute vec4 position_du;
    //attribute vec4 position_dv;
    varying vec3 v_normal;

    vec4 toBall(vec4 p) {  
        vec4 p2 = p * (1.0/p.w);
        float s2 = min(1.0, p2.x*p2.x + p2.y*p2.y + p2.z*p2.z);
        float k = 1.0 / (1.0 + sqrt(1.0 - s2));
        
        return vec4(p2.xyz*k,1.0);
    }

    void main() {
        // vec4 p = toBall(extra);
        vec4 p = toBall(hMatrix * extra1);
        vec4 p2 = toBall(hMatrix * extra2);

        // vec4 p1 = toBall(hMatrix * (position );
        // vec4 p_du = toBall(hMatrix * position_du);
        // vec4 p_dv = toBall(hMatrix * position_dv);
        // vec3 normal = normalize(cross((p_du-p).xyz, (p_dv-p).xyz));

        vec4 q = worldViewProjection * p;
        vec4 q2 = worldViewProjection * p2;

        v_normal = normalize(q2.xyz - q.xyz);
        gl_Position = worldViewProjection * p;
        
    }
`;

BABYLON.Effect.ShadersStore["customFragmentShader"]= `
    precision mediump float;
    varying vec3 v_normal;
    void main() {
        vec3 normal = normalize(v_normal);
        float v = abs(normal.z);

        gl_FragColor = vec4(vec3(0.9,0.6,0.3) * v, 1.0);
        // gl_FragColor = vec4(1.0,0.5,0.02,1.0);
    }
`;



function makeH3Translation2(i, d) {
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


class ModelBuilder2 {
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
        this.matrix =makeH3Translation(direction, hDistance).multiply(this.matrix);
    }

    addBranch(d,n) {
        let m = this.m;
        let r = 0.03;
        for(let i=0; i<n; i++) {
            let y = d * i/(n-1);
            let mat = makeH3Translation(1,y).multiply(this.matrix);
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

    _addModel(level) {
        let branchLength = 1.8;
        let count = 1;
        this.addBranch(branchLength,10);
        if(level > 0) {
            this.pushMatrix();
            this.hTranslate(1,branchLength);
            let i1 = level == 5 ? 2 : 4;
            for(let i=0; i<i1; i++) {
                this.pushMatrix();
                this.rotateY(i*Math.PI/2);
                this.rotateZ(Math.PI/2);
                count += this._addModel(level-1);
                this.popMatrix();    
            }
            this.popMatrix();        
        }
        return count;
    }

    addModel() {
        let count = this._addModel(5);
        console.log(count);
    }

    makeMesh() {
        var mesh = new BABYLON.Mesh("custom", scene);
        var vertexData = new BABYLON.VertexData();
        vertexData.positions = this.positions;
        vertexData.indices = this.indices;   
        vertexData.applyToMesh(mesh);
    
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

function makeModel() {
    let mb = new ModelBuilder();
    mb.addModel();
    return mb.makeMesh();
}
function makeModel_old() {
    var customMesh = new BABYLON.Mesh("custom", scene);

    let positions = [];
    let indices = [];

    let mat = BABYLON.Matrix.Identity(); 
    

    let c = [[-1,-1,-1],[ 1,-1,-1],[-1, 1,-1],[ 1, 1,-1],[-1,-1,1],[ 1,-1,1],[-1, 1,1],[ 1, 1,1]]
        .map(([x,y,z]) => new BABYLON.Vector3(x,y,z).scale(0.1));
    let ii = [[0,1,3,2],[4,6,7,5], [1,0,4,5], [3,1,5,7], [2,3,7,6], [0,2,6,4]].flatMap(([a,b,c,d])=>[a,b,c,a,c,d]);


    let k = 0;

    let extra1 = [];
    let extra2 = [];

    
    for(let i=0;i<10;i++)
    {
        c.map(p=>BABYLON.Vector3.TransformCoordinates(p,mat)).forEach(p => {
            positions.push(0,0,0);
            extra1.push(p.x,p.y,p.z,1);
        });
        c.map(p=>p.scale(1.5))
            .map(p=>BABYLON.Vector3.TransformCoordinates(p,mat))            
            .forEach(p => {
                extra2.push(p.x,p.y,p.z,1);
        });
        ii.map(i=>i+k).forEach(i=>indices.push(i));

        k += 8;
        mat = mat.multiply(makeH3Translation(0,0.4));    
    }

    
    

    // positions = [-1,-1,-1, 1,-1,-1, -1,1,-1, 1,1,-1, -1,-1,1, 1,-1,1, -1,1,1, 1,1,1];
    // indices = [0,1,3,0,3,2];
    var vertexData = new BABYLON.VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;   
    vertexData.applyToMesh(customMesh);

    let buffer = new BABYLON.Buffer(engine, extra1, false, 4);
    customMesh.setVerticesBuffer(buffer.createVertexBuffer("extra1", 0, 4));
    buffer = new BABYLON.Buffer(engine, extra2, false, 4);
    customMesh.setVerticesBuffer(buffer.createVertexBuffer("extra2", 0, 4));       

    return customMesh;
}


function animate() {
    updateCircle();
}