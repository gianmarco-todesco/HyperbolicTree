"use strict";

const H3 = {
    makeH3Translation : (i, d) => {
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
            default:
                throw "makeH3Translation:bad direction:" + i;
        } 
    },

    
    TransformCoordinates : (p, mat) => {
        let q = mat._m;
        return new BABYLON.Vector4(
            q[0]*p.x + q[4]*p.y + q[8]*p.z + q[12]*1,
            q[1]*p.x + q[5]*p.y + q[9]*p.z + q[13]*1,
            q[2]*p.x + q[6]*p.y + q[10]*p.z + q[14]*1,
            q[3]*p.x + q[7]*p.y + q[11]*p.z + q[15]*1);    
    },

    toBall : (p, mat) => {
        let p1 = H3.TransformCoordinates(p,mat);
        let p2 = p1.scale(1/p1.w);
        let s2 = Math.min(1.0, p2.x*p2.x+p2.y*p2.y+p2.z*p2.z);
        let k = 1/(1+Math.sqrt(1-s2));
        return new BABYLON.Vector3(p2.x*k,p2.y*k,p2.z*k);
    }


}

BABYLON.Effect.ShadersStore["H3VertexShader"]= `
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

BABYLON.Effect.ShadersStore["H3FragmentShader"]= `
    precision mediump float;
    varying vec3 v_normal;
    void main() {
        vec3 normal = normalize(v_normal);
        float v = abs(normal.z);

        gl_FragColor = vec4(vec3(0.9,0.6,0.3) * v, 1.0);
        // gl_FragColor = vec4(1.0,0.5,0.02,1.0);
    }
`;

